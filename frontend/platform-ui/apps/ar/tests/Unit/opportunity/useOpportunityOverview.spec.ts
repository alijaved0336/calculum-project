import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

const fetchOpportunityOverviewSummary = vi.fn()

vi.mock('@/api', () => ({
  fetchOpportunityOverviewSummary: (...args: unknown[]) => fetchOpportunityOverviewSummary(...args),
}))

vi.mock('@ada/auth', () => ({ authLogin: vi.fn() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

import { HttpError, SessionExpiredError } from '@/api/http'
import { useOpportunityOverview } from '@/modules/opportunity/composables/useOpportunityOverview'
import { useContextStore } from '@/stores/context'

/**
 * Two versions, by uuid: the composable watches the uuid and sends the uuid, because that is what
 * the endpoint's filter envelope names a version by.
 */
const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'
const OTHER_VERSION = '2764d345-a429-5818-b7d4-44f5c5382237'

/** A calculated version's payload, trimmed to what the composable actually reads. */
const calculated = {
  saleFileVersionId: 7,
  status: 'ready',
  paymentTerms: { contractual: 30, actual: 45, opportunity: 20, expected: 25 },
  cashFlow: { opportunity: 1000, expected: 930 },
  economicProfit: { opportunity: 100, expected: 93 },
  salesAndEntities: { salesVolume: 5000, parentCount: 2, buyerCount: 3, saleLineCount: 9 },
}

/** The same version before the pipeline ran: a status, and nulls where the figures go. */
const notCalculated = {
  saleFileVersionId: 7,
  status: 'processed',
  paymentTerms: null,
  cashFlow: { opportunity: null, expected: null },
  economicProfit: { opportunity: null, expected: null },
  salesAndEntities: { salesVolume: null, parentCount: null, buyerCount: null, saleLineCount: null },
}

/** Lets the immediate watcher and its awaited fetch settle before anything is asserted. */
async function settle(): Promise<void> {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('useOpportunityOverview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchOpportunityOverviewSummary.mockReset()
  })

  it('does not fetch while no version is selected', async () => {
    const overview = useOpportunityOverview()
    await settle()

    expect(fetchOpportunityOverviewSummary).not.toHaveBeenCalled()
    expect(overview.loading.value).toBe(false)
    expect(overview.isCalculated.value).toBe(false)
  })

  it('loads for the selected version and reloads when it changes', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()

    useOpportunityOverview()
    context.setVersion(7, VERSION)
    await settle()

    expect(fetchOpportunityOverviewSummary).toHaveBeenCalledWith(VERSION, 1)

    context.setVersion(8, OTHER_VERSION)
    await settle()

    expect(fetchOpportunityOverviewSummary).toHaveBeenCalledWith(OTHER_VERSION, 1)
    expect(fetchOpportunityOverviewSummary).toHaveBeenCalledTimes(2)
  })

  it('treats a version with no payment terms as not calculated, whatever its status says', async () => {
    // The gate is the payload, not `status === 'ready'`. A `processed` version answers 200 with
    // nulls, and so would a status this build has never heard of; both have to reach the
    // placeholder, and only a check on the data covers both.
    fetchOpportunityOverviewSummary.mockResolvedValue(notCalculated)
    const context = useContextStore()

    const overview = useOpportunityOverview()
    context.setVersion(7, VERSION)
    await settle()

    expect(overview.isCalculated.value).toBe(false)
    expect(overview.status.value).toBe('processed')
    expect(overview.loadError.value).toBe(false)
  })

  it('treats a present paymentTerms object whose four figures are all null as not calculated', async () => {
    // Regression for thread 129677: `OpportunityOverviewSummaryResponse` declares `paymentTerms`
    // as always present - only the figures inside it are nullable - so a real server honoring that
    // contract never sends `paymentTerms: null` itself, the way `notCalculated` above does. Without
    // checking the figures instead of the wrapper, `isCalculated` would read true here and the
    // "not calculated" placeholder would be unreachable in production.
    fetchOpportunityOverviewSummary.mockResolvedValue({
      ...notCalculated,
      paymentTerms: { contractual: null, actual: null, opportunity: null, expected: null },
    })
    const context = useContextStore()

    const overview = useOpportunityOverview()
    context.setVersion(7, VERSION)
    await settle()

    expect(overview.isCalculated.value).toBe(false)
  })

  it('treats an unknown status with data as calculated', async () => {
    // The mirror of the case above, and the reason the gate is not a status allow-list: a status
    // renamed on the server must not blank a screen whose data arrived intact.
    fetchOpportunityOverviewSummary.mockResolvedValue({ ...calculated, status: 'somethingNew' })
    const context = useContextStore()

    const overview = useOpportunityOverview()
    context.setVersion(7, VERSION)
    await settle()

    expect(overview.isCalculated.value).toBe(true)
  })

  it('flags a 403 as forbidden rather than as a load error', async () => {
    fetchOpportunityOverviewSummary.mockRejectedValue(new HttpError(403, 'GET /x', 'no module'))
    const context = useContextStore()

    const overview = useOpportunityOverview()
    context.setVersion(7, VERSION)
    await settle()

    // Different message, different affordance: a retry cannot fix a missing module.
    expect(overview.forbidden.value).toBe(true)
    expect(overview.loadError.value).toBe(false)
    expect(overview.loading.value).toBe(false)
  })

  it('flags any other failure as a load error', async () => {
    fetchOpportunityOverviewSummary.mockRejectedValue(new HttpError(500, 'GET /x', 'boom'))
    const context = useContextStore()

    const overview = useOpportunityOverview()
    context.setVersion(7, VERSION)
    await settle()

    expect(overview.loadError.value).toBe(true)
    expect(overview.forbidden.value).toBe(false)
  })

  it('holds the loading state when the session expired, because the page is leaving', async () => {
    fetchOpportunityOverviewSummary.mockRejectedValue(new SessionExpiredError('GET /x'))
    const context = useContextStore()

    const overview = useOpportunityOverview()
    context.setVersion(7, VERSION)
    await settle()

    // Flashing an error over a document that is already navigating to sign-in is worse than a
    // spinner that goes away with the page.
    expect(overview.loading.value).toBe(true)
    expect(overview.loadError.value).toBe(false)
  })

  it('discards a stale response that resolves after the version was cleared (thread 129875)', async () => {
    const context = useContextStore()

    let releaseFirst: (value: unknown) => void = () => {}
    const first = new Promise((resolve) => {
      releaseFirst = resolve
    })
    fetchOpportunityOverviewSummary.mockReturnValueOnce(first)

    const overview = useOpportunityOverview()
    context.setVersion(7, VERSION)
    await nextTick() // request issued and still pending

    context.clearFile() // version cleared while the request is in flight
    await settle()

    expect(overview.overview.value).toBeNull()

    // The stale request for the cleared version resolves late.
    releaseFirst(calculated)
    await settle()

    // Must not have been written back after the deliberate clear.
    expect(overview.overview.value).toBeNull()
  })

  it('lets a stale response lose to a fresher one', async () => {
    const context = useContextStore()

    let releaseFirst: (value: unknown) => void = () => {}
    const first = new Promise((resolve) => {
      releaseFirst = resolve
    })

    fetchOpportunityOverviewSummary
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({ ...calculated, saleFileVersionId: 8 })

    const overview = useOpportunityOverview()
    context.setVersion(7, VERSION)
    await nextTick()

    context.setVersion(8, OTHER_VERSION)
    await settle()

    // The slow first call lands last. Without the load token it would overwrite version 8's data
    // with version 7's, and nothing on screen would look wrong.
    releaseFirst({ ...calculated, saleFileVersionId: 7 })
    await settle()

    expect(overview.overview.value?.saleFileVersionId).toBe(8)
  })
})
