import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

import { fetchOpportunityOverviewChart, fetchOpportunityOverviewSummary } from '@/api'
import { HttpError } from '@/api/http'

/**
 * The two Opportunity Overview clients.
 *
 * The route is asserted literally rather than built from a helper, on purpose: it has changed twice
 * already — Ada-Platform renamed `program-overview` to `opportunity-overview` when the program
 * concept came out of AR, then dropped the version segment when both endpoints became POSTs taking
 * the filter envelope — and a spec that composed the path the same way the client does would have
 * stayed green through every one of those.
 */

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

/** The request the client actually made, parsed. */
function requestOf(fetch: ReturnType<typeof vi.fn>) {
  const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
  return { url, method: init.method, body: JSON.parse(init.body as string) }
}

describe('api.fetchOpportunityOverviewSummary', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(body: unknown, status = 200) {
    const fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('posts the filter envelope to the summary route, with a default rate of 1', async () => {
    const fetch = stubFetch({ saleFileVersionId: 7, status: 'ready' })

    await fetchOpportunityOverviewSummary(VERSION)

    const { url, method, body } = requestOf(fetch)
    expect(url).toContain('/api/opportunity-overview/summary')

    // No version in the path. The whole point of the envelope is that the version is named once, and
    // a route segment carrying it too is a second name that can disagree with the first.
    expect(url).not.toContain(VERSION)
    expect(method).toBe('POST')
    expect(body.filters.targetSaleFileVersionUuid).toBe(VERSION)
    expect(body.filters.currencyRate).toBe(1)
  })

  it('sends the three unapplied narrowings as empty rather than omitting them', async () => {
    const fetch = stubFetch({ saleFileVersionId: 7, status: 'ready' })

    await fetchOpportunityOverviewSummary(VERSION)

    // The server tells an EMPTY filter (accepted) from a real one (a 400, because applying it needs
    // a field map that does not exist yet). Sending the empty shapes AP sends keeps this call on the
    // accepted side of that line, and pins the exact strings — `{"filters":[],"logic":"and"}` is a
    // composite, not a blank, and a naive is-it-blank check on either side would refuse it.
    const { body } = requestOf(fetch)
    expect(body.filters.telerikFilter).toBe('{"filters":[],"logic":"and"}')
    expect(body.filters.chartsFilter).toBe('[]')
    expect(body.filters.searchText).toBe('')
    expect(body.filters.fullDisabled).toBe(false)
  })

  it('sends the rate and the exclusion flag it is given', async () => {
    const fetch = stubFetch({ saleFileVersionId: 7, status: 'ready' })

    await fetchOpportunityOverviewSummary(VERSION, 2.5, true)

    const { body } = requestOf(fetch)
    expect(body.filters.currencyRate).toBe(2.5)

    // The one filter field besides the rate that the server actually applies: true counts the
    // excluded lines too.
    expect(body.filters.fullDisabled).toBe(true)
  })

  it('returns the body as-is, nulls included', async () => {
    // A version that was never calculated. The nulls have to survive the client untouched: turning
    // them into zeros here is exactly the "we looked and there is nothing" claim the backend is
    // careful not to make.
    stubFetch({
      saleFileVersionId: 7,
      status: 'processed',
      paymentTerms: { contractual: null, actual: null, opportunity: null, expected: null },
      cashFlow: { opportunity: null, expected: null },
      economicProfit: { opportunity: null, expected: null },
      salesAndEntities: { salesVolume: null, parentCount: null, buyerCount: null, saleLineCount: null },
    })

    const result = await fetchOpportunityOverviewSummary(VERSION)

    expect(result.status).toBe('processed')
    expect(result.paymentTerms.contractual).toBeNull()
    expect(result.salesAndEntities.buyerCount).toBeNull()
  })

  it('propagates an HttpError rather than swallowing it', async () => {
    stubFetch({ error: 'nope' }, 403)

    await expect(fetchOpportunityOverviewSummary(VERSION)).rejects.toBeInstanceOf(HttpError)
  })

  it('marks a 403 as forbidden, which is what the view branches on', async () => {
    stubFetch({ error: 'no module' }, 403)

    // The whole reason the backend answers 403 instead of 401: the two need different treatment,
    // and the view can only tell them apart if this survives the client.
    await expect(fetchOpportunityOverviewSummary(VERSION)).rejects.toMatchObject({ isForbidden: true })
  })
})

describe('api.fetchOpportunityOverviewChart', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(body: unknown) {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('posts the measure and dimension beside the filters, not inside them', async () => {
    const fetch = stubFetch({ points: [] })

    await fetchOpportunityOverviewChart(VERSION, 'cashFlowOpportunity', 'industry')

    const { url, method, body } = requestOf(fetch)
    expect(url).toContain('/api/opportunity-overview/chart')
    expect(method).toBe('POST')

    // Siblings of `filters`, mirroring the server: what to compute and what to narrow are different
    // questions, and folding them together is how a measure ends up being filtered on.
    expect(body.measure).toBe('cashFlowOpportunity')
    expect(body.dimension).toBe('industry')
    expect(body.filters.measure).toBeUndefined()
    expect(body.filters.targetSaleFileVersionUuid).toBe(VERSION)
    expect(body.filters.currencyRate).toBe(1)
  })

  it('keeps a null dimension name instead of dropping the point', async () => {
    // A buyer whose country never resolved to a region, a line in no currency. Dropping those rows
    // would make the bars sum to less than the card above them with nothing explaining the gap.
    stubFetch({ points: [{ name: null, value: 42 }, { name: 'EMEA', value: 58 }] })

    const result = await fetchOpportunityOverviewChart(VERSION, 'volume', 'region')

    expect(result.points).toHaveLength(2)
    expect(result.points[0].name).toBeNull()
  })
})
