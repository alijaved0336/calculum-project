import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

const fetchVersionStatus = vi.fn()
const recalculateVersion = vi.fn()

vi.mock('@/api', () => ({
  fetchVersionStatus: (...args: unknown[]) => fetchVersionStatus(...args),
  recalculateVersion: (...args: unknown[]) => recalculateVersion(...args),
}))

vi.mock('@ada/auth', () => ({ authLogin: vi.fn() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

const routerBack = vi.fn()
vi.mock('@/router', () => ({ router: { back: (...args: unknown[]) => routerBack(...args) } }))

const openMatch = vi.fn()
const openVersionErrors = vi.fn()
vi.mock('@/modules/match/MatchRouting', () => ({
  match: 'Match',
  customerCard: 'CustomerCard',
  versionProgress: 'VersionProgress',
  versionErrors: 'VersionErrors',
  openMatch: (...args: unknown[]) => openMatch(...args),
  openCustomerCard: vi.fn(),
  openVersionProgress: vi.fn(),
  openVersionErrors: (...args: unknown[]) => openVersionErrors(...args),
  backOrOpenMatch: vi.fn(),
}))

vi.mock('@ada/design-system', () => ({
  CalculumLayout: { template: '<div><slot name="slotTop" /><slot name="slotContent" /></div>' },
  CalculumLoadingAr: { template: '<div class="loading" />' },
  ContentBox: { template: '<div><slot name="header-title" /><slot /></div>' },
  ContentBoxBody: { template: '<div><slot /></div>' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  CustomBadge: { props: ['text', 'variant'], template: '<span class="badge">{{ text }}</span>' },
  CustomButton: {
    props: ['text', 'disabled'],
    emits: ['click'],
    template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ text }}</button>',
  },
  BodyText: { template: '<span><slot /></span>' },
}))

import { HttpError } from '@/api/http'
import { POLL_INTERVAL_MS } from '@/composables/useVersionStatusPoll'
import VersionProgressView from '@/modules/match/views/VersionProgressView.vue'
import { statusOf } from '../fixtures/calculationStatus'

const messages = {
  en: {
    arMatch: {
      status: {
        calculating: 'Calculating',
        processing: 'Processing',
        ready: 'Ready',
        processed: 'Processed',
        errorCalculating: 'Calculation error',
        reCalculating: 'Recalculating',
      },
      progress: {
        title: 'Version progress',
        back: 'Back',
        notFound: 'This version does not exist or is not visible to you.',
        loadError: 'The processing status could not be loaded.',
        retry: 'Retry',
        notStarted: 'Not started yet',
        stepOf: 'Step {current} of {total}',
        failed: 'The calculation failed. The step shown above is where it stopped.',
        recalculate: 'Recalculate',
        recalculateRefused: "This version's current status does not allow recalculation.",
        recalculateFailed: 'The recalculation request failed ({status}).',
        recalculateUnreachable: 'The recalculation request could not be sent. Check your connection and try again.',
        parsedAt: 'Parsed at',
        lastRecalculated: 'Last recalculated',
        notAvailable: 'Not available',
      },
      errorsView: {
        title: 'Errors & No Matches',
      },
    },
  },
}

function mountView(versionId = '73') {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(VersionProgressView, { props: { versionId }, global: { plugins: [i18n] } })
}

/**
 * UC-FE-05a end to end at component level. The intermediate states are driven from mock timing,
 * which is the use case's own instruction: live progress jumps 0-to-done in one poll while the
 * 50 step bodies are stubs, and that is not a frontend defect this suite should wait for.
 */
describe('VersionProgressView', () => {
  afterEach(() => {
    vi.useRealTimers()
    fetchVersionStatus.mockReset()
    recalculateVersion.mockReset()
    routerBack.mockReset()
    openMatch.mockReset()
    openVersionErrors.mockReset()
  })

  it('opens the errors view for the current version (UC-VAL-03)', async () => {
    fetchVersionStatus.mockResolvedValue(statusOf('ready'))
    const view = mountView()
    await flushPromises()

    const viewErrors = view.findAll('button').find((b) => b.text() === 'Errors & No Matches')
    await viewErrors?.trigger('click')

    expect(openVersionErrors).toHaveBeenCalledWith(73)
  })

  it('renders the pipeline\'s own "[n/total] StepNN Name" text with a determinate bar', async () => {
    fetchVersionStatus.mockResolvedValue(
      statusOf('calculating', { statusDescription: '[3/12] Step03 Matching', currentStep: 3, totalSteps: 12, currentStepName: 'Matching' }),
    )
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('[3/12] Step03 Matching')
    expect(view.text()).toContain('Step 3 of 12')
    expect(view.find('progress').attributes('value')).toBe('25')
    expect(view.text()).toContain('25%')

    view.unmount()
  })

  it('stays indeterminate for the initial "[0/0] (not started)" text the server cannot decode', async () => {
    fetchVersionStatus.mockResolvedValue(
      statusOf('processing', { statusDescription: '[0/0] (not started)' }),
    )
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('[0/0] (not started)')
    expect(view.text()).not.toContain('Step 0 of 0')
    // A valueless native <progress> is the indeterminate state.
    expect(view.find('progress').exists()).toBe(true)
    expect(view.find('progress').attributes('value')).toBeUndefined()

    view.unmount()
  })

  it('advances through the steps on the polling clock, and stops once the version is ready', async () => {
    vi.useFakeTimers()
    fetchVersionStatus
      .mockResolvedValueOnce(statusOf('calculating', { statusDescription: '[1/50] Step01 Shared classification', currentStep: 1, totalSteps: 50 }))
      .mockResolvedValueOnce(statusOf('calculating', { statusDescription: '[25/50] Step25 Waterfall', currentStep: 25, totalSteps: 50 }))
      .mockResolvedValueOnce(statusOf('ready', { statusDescription: '[50/50] Step50 Summaries', currentStep: 50, totalSteps: 50 }))
    const view = mountView()

    await vi.advanceTimersByTimeAsync(0)
    expect(view.text()).toContain('[1/50] Step01 Shared classification')

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(view.text()).toContain('[25/50] Step25 Waterfall')

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(view.text()).toContain('[50/50] Step50 Summaries')
    expect(view.find('progress').attributes('value')).toBe('100')

    await vi.advanceTimersByTimeAsync(10 * POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(3)

    view.unmount()
  })

  it('shows a failure with a recalculate action, and an accepted request re-enters polling', async () => {
    fetchVersionStatus.mockResolvedValueOnce(
      statusOf('errorCalculating', { isError: true, statusDescription: '[7/50] Step07 Classification' }),
    )
    recalculateVersion.mockResolvedValue({ saleFileVersionId: 73, status: 'recalculateClaimed' })
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('The calculation failed.')
    // No decoded counters on a resting status: no bar at all, because 0% and 100% would each
    // claim a position nobody knows, right above the sentence saying where it stopped.
    expect(view.find('progress').exists()).toBe(false)
    const recalculate = view.findAll('button').find((b) => b.text() === 'Recalculate')
    expect(recalculate).toBeDefined()

    fetchVersionStatus.mockResolvedValueOnce(statusOf('reCalculating'))
    await recalculate?.trigger('click')
    await flushPromises()

    expect(recalculateVersion).toHaveBeenCalledWith(73)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(2)
    expect(view.text()).toContain('Recalculating')

    view.unmount()
  })

  it('deliberately offers no recalculate action on processed (UC-FE-05a A1)', async () => {
    fetchVersionStatus.mockResolvedValue(statusOf('processed'))
    const view = mountView()
    await flushPromises()

    expect(view.findAll('button').some((b) => b.text() === 'Recalculate')).toBe(false)

    view.unmount()
  })

  it("renders the server's own refusal sentence when the claim answers 409", async () => {
    fetchVersionStatus.mockResolvedValue(statusOf('ready'))
    recalculateVersion.mockRejectedValue(
      new HttpError(409, '/recalculate', '{"error":"Status \'calculating\' does not allow recalculation."}'),
    )
    const view = mountView()
    await flushPromises()

    const recalculate = view.findAll('button').find((b) => b.text() === 'Recalculate')
    await recalculate?.trigger('click')
    await flushPromises()

    expect(view.text()).toContain("Status 'calculating' does not allow recalculation.")

    view.unmount()
  })

  it('keeps the panel and shows an inline notice when a mid-poll refresh fails, rather than replacing real progress with an error page', async () => {
    vi.useFakeTimers()
    fetchVersionStatus
      .mockResolvedValueOnce(statusOf('calculating', { statusDescription: '[3/12] Step03 Matching', currentStep: 3, totalSteps: 12 }))
      .mockRejectedValueOnce(new HttpError(500, '/status', ''))
    const view = mountView()

    await vi.advanceTimersByTimeAsync(0)
    expect(view.text()).toContain('[3/12] Step03 Matching')

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(view.text()).toContain('[3/12] Step03 Matching')
    expect(view.text()).toContain('The processing status could not be loaded.')
    expect(view.find('.no-data').exists()).toBe(false)

    view.unmount()
  })

  it('says so when the recalculation request cannot be sent at all', async () => {
    fetchVersionStatus.mockResolvedValue(statusOf('ready'))
    recalculateVersion.mockRejectedValue(new TypeError('Failed to fetch'))
    const view = mountView()
    await flushPromises()

    const recalculate = view.findAll('button').find((b) => b.text() === 'Recalculate')
    await recalculate?.trigger('click')
    await flushPromises()

    expect(view.text()).toContain('The recalculation request could not be sent.')

    view.unmount()
  })

  it('clears the header badge and recalculate button when the URL is edited in place to a malformed id', async () => {
    fetchVersionStatus.mockResolvedValue(statusOf('ready'))
    const view = mountView()
    await flushPromises()
    expect(view.find('.badge').exists()).toBe(true)

    await view.setProps({ versionId: 'abc' })
    await flushPromises()

    expect(view.text()).toContain('This version does not exist or is not visible to you.')
    expect(view.find('.badge').exists()).toBe(false)
    expect(view.findAll('button').some((b) => b.text() === 'Recalculate')).toBe(false)

    view.unmount()
  })

  it('clears the header badge and recalculate button when a 404 arrives mid-poll', async () => {
    // The version was deleted (or access revoked) while the screen watched it. The poller keeps
    // the last payload in its ref; the header must not keep offering a Recalculate that POSTs
    // against a version the API just said is gone.
    vi.useFakeTimers()
    fetchVersionStatus
      .mockResolvedValueOnce(statusOf('calculating', { statusDescription: '[3/12] Step03 Matching', currentStep: 3, totalSteps: 12 }))
      .mockRejectedValueOnce(new HttpError(404, '/status', ''))
    const view = mountView()

    await vi.advanceTimersByTimeAsync(0)
    expect(view.find('.badge').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(view.text()).toContain('This version does not exist or is not visible to you.')
    expect(view.find('.badge').exists()).toBe(false)
    expect(view.findAll('button').some((b) => b.text() === 'Recalculate')).toBe(false)

    view.unmount()
  })

  it('keeps Recalculate disabled until the refreshed status has landed, not merely until the 202', async () => {
    fetchVersionStatus.mockResolvedValueOnce(statusOf('errorCalculating', { isError: true }))
    recalculateVersion.mockResolvedValue({ saleFileVersionId: 73, status: 'recalculateClaimed' })
    const view = mountView()
    await flushPromises()

    // The refetch that follows the 202 is held pending, which is the window where a released
    // button used to allow a second claim.
    let resolveRefetch: (value: unknown) => void = () => {}
    fetchVersionStatus.mockImplementationOnce(() => new Promise((resolve) => { resolveRefetch = resolve }))

    const recalculate = view.findAll('button').find((b) => b.text() === 'Recalculate')
    await recalculate?.trigger('click')
    await flushPromises()

    expect(recalculate?.attributes('disabled')).toBeDefined()

    resolveRefetch(statusOf('reCalculating'))
    await flushPromises()

    // Once the refreshed status lands the button is gone outright: reCalculating admits no claim.
    expect(view.findAll('button').some((b) => b.text() === 'Recalculate')).toBe(false)

    view.unmount()
  })

  it('treats a malformed route segment as not-found without asking the API', async () => {
    const view = mountView('abc')
    await flushPromises()

    expect(view.text()).toContain('This version does not exist or is not visible to you.')
    expect(fetchVersionStatus).not.toHaveBeenCalled()

    view.unmount()
  })
})
