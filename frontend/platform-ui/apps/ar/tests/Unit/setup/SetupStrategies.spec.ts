import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const context = reactive({ companyUuid: 'c-1', companyName: 'Novonesis' as string | null, saleFileVersionId: 73 as number | null })
vi.mock('@/stores/context', () => ({ useContextStore: () => context }))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}))

// Strategies go to the real API now (SETUP_STRATEGIES_API_MOCKED = false): these specs keep the mock.
vi.mock('@/modules/setup/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/setup/api')>()
  const { mockSetupStrategiesApi } = await import('@/modules/setup/api/setupStrategies.mock')
  const { mockCashFlowBasisApi } = await import('@/modules/setup/api/cashFlowBasis.mock')
  return { ...actual, setupApi: mockSetupStrategiesApi, cashFlowBasisApi: mockCashFlowBasisApi }
})

import { HttpError } from '@/api/http'
import { setupApi } from '@/modules/setup/api'
import { resetCashFlowBasisMock } from '@/modules/setup/api/cashFlowBasis.mock'
import { resetSetupStrategiesMock } from '@/modules/setup/api/setupStrategies.mock'
import SetupStrategies from '@/modules/setup/components/SetupStrategies.vue'
import { mountInSetup, type SetupHost } from './setupTestHarness'

let host: SetupHost | null = null

async function mountStrategies(): Promise<SetupHost> {
  host = mountInSetup(SetupStrategies)
  await vi.runAllTimersAsync()
  await flushPromises()
  return host
}

const find = (selector: string) => host!.wrapper.find(selector)
const strategyRow = (key: string) => find(`[data-test="strategy-${key}"]`)
/** The design-system ToggleSwitch is Kendo's Switch: a `role="switch"` span with aria state. */
const toggle = (key: string) => find(`[data-test="strategy-${key}"] [role="switch"]`)
const isOn = (key: string) => toggle(key).attributes('aria-checked') === 'true'
const isDisabled = (key: string) => toggle(key).attributes('aria-disabled') === 'true'
const saveButton = () => find('[data-test="section-save"]')
const input = (dataTest: string) => find(`[data-test="${dataTest}"] input`)
const fieldError = (dataTest: string) => find(`[data-test="${dataTest}"] .setup-number-field__error`)

async function flip(key: string): Promise<void> {
  await toggle(key).trigger('click')
  await flushPromises()
}

async function openMoreSettings(key: string): Promise<void> {
  await find(`[data-test="more-${key}"] .setup-more-settings__toggle`).trigger('click')
}

async function clickSave(): Promise<void> {
  await saveButton().trigger('click')
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
}

/** AB#20702 (impl plan M) + #20717, on the mocked Setup strategies API (#20701 contract). */
describe('SetupStrategies', () => {
  beforeEach(() => {
    toastSuccess.mockReset()
    toastError.mockReset()
    vi.useFakeTimers()
    resetSetupStrategiesMock()
    resetCashFlowBasisMock()
    context.saleFileVersionId = 73
  })

  it('marks Pay on Terms as not calculated under the default Contractual basis, switch still on (AB#20761)', async () => {
    await mountStrategies()
    expect(isOn('payOnTerms')).toBe(true)
    expect(strategyRow('payOnTerms').find('[data-test="pay-on-terms-basis-badge"]').text())
      .toBe('Not calculated with Contractual cash flow basis')
  })

  it('drops the Pay on Terms hint under the Avg. Days Paid basis (AB#20761)', async () => {
    resetCashFlowBasisMock({ stored: { 73: 'Dso' } })
    await mountStrategies()
    expect(find('[data-test="pay-on-terms-basis-badge"]').exists()).toBe(false)
  })

  afterEach(() => {
    host?.wrapper.unmount()
    host = null
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('lists the nine strategies in the Payables order, all on for a version never configured (AC-02)', async () => {
    await mountStrategies()
    // Two independent columns filled left/right in the Payables order.
    const columns = host!.wrapper.findAll('.strategies__column')
      .map((column) => column.findAll('[data-test^="strategy-"]').map((row) => row.attributes('data-test')))
    expect(columns).toEqual([
      ['strategy-payOnTerms', 'strategy-peerGroupStandard', 'strategy-industryRegionStandard', 'strategy-regulatoryTerms', 'strategy-clientStandard'],
      ['strategy-buyerStandard', 'strategy-parentBuyerMin', 'strategy-buyerPolicy', 'strategy-creditLimitMax'],
    ])
    expect(isOn('creditLimitMax')).toBe(true)
  })

  it('disables a strategy the company turned off, with the client-name hint (EF-5)', async () => {
    await mountStrategies()
    expect(isDisabled('buyerPolicy')).toBe(true)
    expect(strategyRow('buyerPolicy').text()).toContain('Not available for Novonesis')
  })

  it('shows the metric subtitles of Buyer Standard and Peer Group Standard, and the Regulatory method (AC-04)', async () => {
    await mountStrategies()
    expect(strategyRow('buyerStandard').text()).toContain('Average (days)')
    expect(strategyRow('peerGroupStandard').text()).toContain('1st Quartile (days)')
    expect(strategyRow('regulatoryTerms').text()).toContain('Limit Only Strict Regulations')
  })

  it('keeps Save disabled until something changes (AF-1)', async () => {
    await mountStrategies()
    expect(saveButton().attributes('disabled')).toBeDefined()
    await flip('creditLimitMax')
    expect(saveButton().attributes('disabled')).toBeUndefined()
  })

  it('starts Buyer Standard with the reduction days empty, and accepts them empty (API defaults)', async () => {
    await mountStrategies()
    await openMoreSettings('buyerStandard')
    expect((input('buyer-min-reduction').element as HTMLInputElement).value).toBe('')
    expect(fieldError('buyer-min-reduction').exists()).toBe(false)
  })

  it('rejects invalid More Settings next to the field and keeps Save disabled (AC-05)', async () => {
    await mountStrategies()
    await openMoreSettings('buyerStandard')
    for (const value of ['3', '12.5', '10000']) {
      await input('buyer-min-occurrences').setValue(value)
      expect(fieldError('buyer-min-occurrences').exists()).toBe(true)
      expect(saveButton().attributes('disabled')).toBeDefined()
    }
    await input('buyer-min-occurrences').setValue('40')
    await input('buyer-min-reduction').setValue('40')
    await input('buyer-max-reduction').setValue('20')
    expect(host!.wrapper.text()).toContain('The minimum reduction cannot be above the maximum reduction.')
    expect(saveButton().attributes('disabled')).toBeDefined()
  })

  it('keeps Save disabled when a stored reduction bound is cleared, instead of silently keeping it (#21163)', async () => {
    await mountStrategies()
    await openMoreSettings('buyerStandard')
    await input('buyer-min-reduction').setValue('5')
    await input('buyer-max-reduction').setValue('30')
    await clickSave()
    await vi.advanceTimersByTimeAsync(15_000)
    await flushPromises()
    await openMoreSettings('buyerStandard')
    expect((input('buyer-min-reduction').element as HTMLInputElement).value).toBe('5')

    await input('buyer-min-reduction').setValue('')
    await input('buyer-max-reduction').setValue('')
    expect(fieldError('buyer-min-reduction').text()).toBe('Enter a whole number of 0 or more.')
    expect(fieldError('buyer-max-reduction').exists()).toBe(true)
    expect(saveButton().attributes('disabled')).toBeDefined()

    await input('buyer-min-reduction').setValue('0')
    await input('buyer-max-reduction').setValue('10')
    expect(fieldError('buyer-min-reduction').exists()).toBe(false)
    expect(saveButton().attributes('disabled')).toBeUndefined()
  })

  it('shows Parent Min at 10 % and keeps the fraction; empty, -1 and 101 are rejected (#20717 AC-01/03)', async () => {
    await mountStrategies()
    await openMoreSettings('parentBuyerMin')
    expect((input('parent-min-volume').element as HTMLInputElement).value).toBe('10')
    for (const value of ['', '-1', '101']) {
      await input('parent-min-volume').setValue(value)
      expect(host!.wrapper.text()).toContain('Enter a number between 0-100.')
      expect(saveButton().attributes('disabled')).toBeDefined()
    }
    const save = vi.spyOn(setupApi, 'saveSetupStrategies')
    await input('parent-min-volume').setValue('25')
    await clickSave()
    const parentMin = save.mock.calls[0][1].find((s) => s.key === 'parentBuyerMin')
    expect(parentMin).toMatchObject({ volumePercentage: 0.25 })
  })

  it('sends the complete set, then locks every input while the version recalculates (AC-09)', async () => {
    await mountStrategies()
    const save = vi.spyOn(setupApi, 'saveSetupStrategies')
    await flip('creditLimitMax')
    await clickSave()
    expect(save.mock.calls[0][1]).toHaveLength(9)
    expect(host!.lock.locked.value).toBe(true)
    expect(isDisabled('payOnTerms')).toBe(true)
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('Settings saved. The sale file is being recalculated.'))

    // Kendo's Switch fires `change` even while disabled: a click on a locked switch must not toggle it.
    await flip('creditLimitMax')
    expect(isOn('creditLimitMax')).toBe(false)
  })

  it('keeps the settings per sale file version (AC-03 / AF-5)', async () => {
    await mountStrategies()
    await flip('creditLimitMax')
    await clickSave()
    await vi.advanceTimersByTimeAsync(15_000)
    context.saleFileVersionId = 74
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(isOn('creditLimitMax')).toBe(true)
    context.saleFileVersionId = 73
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(isOn('creditLimitMax')).toBe(false)
  })

  it('shows EF-3 and starts following the run when the save is refused with 409', async () => {
    await mountStrategies()
    vi.spyOn(setupApi, 'saveSetupStrategies').mockRejectedValueOnce(new HttpError(409, '/x', '{}'))
    await flip('creditLimitMax')
    await saveButton().trigger('click')
    await flushPromises()
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('The sale file is being recalculated. Try again when it finishes.'))
    expect(host!.lock.locked.value).toBe(true)
  })

  it("shows a 400's messages beside their fields, as the API words them", async () => {
    await mountStrategies()
    vi.spyOn(setupApi, 'saveSetupStrategies').mockRejectedValueOnce(new HttpError(400, '/x', JSON.stringify({
      errors: [{ strategy: 'CounterPartyStandard2', field: 'minOccurrences', message: 'Enter a whole number from 5 to 9,999.' }],
    })))
    await flip('creditLimitMax')
    await saveButton().trigger('click')
    await flushPromises()
    await openMoreSettings('buyerStandard')
    expect(fieldError('buyer-min-occurrences').text()).toBe('Enter a whole number from 5 to 9,999.')
  })

  it("shows the save response's warnings once the change is saved (AF-3)", async () => {
    await mountStrategies()
    vi.spyOn(setupApi, 'saveSetupStrategies').mockResolvedValueOnce({ status: 'recalculateClaimed', changes: 1, warnings: ['Heads up from the API.'] })
    await flip('creditLimitMax')
    await clickSave()
    expect(find('[data-test="strategies-warning"]').text()).toBe('Heads up from the API.')
  })

  it('registers with the unsaved-changes registry and discards back to the saved state', async () => {
    await mountStrategies()
    await flip('creditLimitMax')
    const dirty = host!.sections.dirtyIn('payment-terms')
    expect(dirty).toHaveLength(1)
    dirty[0].discard()
    await flushPromises()
    expect(isOn('creditLimitMax')).toBe(true)
    expect(host!.sections.dirtyIn('payment-terms')).toHaveLength(0)
  })

  it("drops a save answered after the version changed: the new version's settings stay the baseline", async () => {
    await mountStrategies()
    let answerSave!: (value: { status: string; changes: number }) => void
    vi.spyOn(setupApi, 'saveSetupStrategies').mockReturnValueOnce(new Promise((resolve) => { answerSave = resolve }) as never)
    await flip('creditLimitMax')
    await saveButton().trigger('click')
    context.saleFileVersionId = 74
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    answerSave({ status: 'recalculateClaimed', changes: 1 })
    await flushPromises()
    expect(isOn('creditLimitMax')).toBe(true)
    expect(host!.sections.dirtyIn('payment-terms')).toHaveLength(0)
    expect(host!.wrapper.text()).not.toContain('Settings saved.')
  })

  it("clears the previous version's save warnings when the version changes", async () => {
    await mountStrategies()
    vi.spyOn(setupApi, 'saveSetupStrategies').mockResolvedValueOnce({ status: 'recalculateClaimed', changes: 1, warnings: ['Heads up from the API.'] })
    await flip('creditLimitMax')
    await clickSave()
    expect(find('[data-test="strategies-warning"]').exists()).toBe(true)
    context.saleFileVersionId = 74
    await vi.runAllTimersAsync()
    await flushPromises()
    expect(find('[data-test="strategies-warning"]').exists()).toBe(false)
  })

  it("keeps loading the new version while the previous version's read answers late, even when it fails", async () => {
    let failOld!: (error: Error) => void
    let answerNew!: (value: unknown) => void
    const fetch = vi.spyOn(setupApi, 'fetchSetupStrategies')
      .mockReturnValueOnce(new Promise((_, reject) => { failOld = reject }) as never)
      .mockReturnValueOnce(new Promise((resolve) => { answerNew = resolve }) as never)
    host = mountInSetup(SetupStrategies)
    await flushPromises()
    context.saleFileVersionId = 74
    await flushPromises()
    expect(fetch).toHaveBeenLastCalledWith(74)

    failOld(new Error('500'))
    await flushPromises()
    expect(find('[role="alert"]').exists()).toBe(false)
    expect(host.wrapper.text()).toContain('…')
    expect(strategyRow('creditLimitMax').exists()).toBe(false)

    fetch.mockRestore()
    const newSettings = setupApi.fetchSetupStrategies(74)
    await vi.runAllTimersAsync()
    answerNew(await newSettings)
    await flushPromises()
    expect(strategyRow('creditLimitMax').exists()).toBe(true)
  })

  /** AB#20839 (#20824): Peer Group Standard's settings open in a popup and save with the section. */
  describe('Peer Group Standard popup', () => {
    // The real CustomDialog is Kendo's Dialog; it renders into the body.
    const inBody = (dataTest: string) => document.body.querySelector<HTMLElement>(`[data-test="${dataTest}"]`)

    async function openPeerGroup(): Promise<void> {
      await openMoreSettings('peerGroupStandard')
      await flushPromises()
    }

    it('opens the popup from More settings and applies its Save to the section (AC-05)', async () => {
      await mountStrategies()
      await openPeerGroup()
      expect(inBody('pg-modal')).not.toBeNull()

      inBody('pg-metric-Q3')!.click()
      await flushPromises()
      inBody('pg-save')!.click()
      await flushPromises()

      expect(inBody('pg-modal')).toBeNull()
      expect(strategyRow('peerGroupStandard').text()).toContain('3rd Quartile (days)')
      expect(saveButton().attributes('disabled')).toBeUndefined()

      const save = vi.spyOn(setupApi, 'saveSetupStrategies')
      await clickSave()
      const sent = save.mock.calls[0][1].find((strategy) => strategy.key === 'peerGroupStandard')
      expect(sent).toMatchObject({ metric: 'Q3', minOccurrences: 30 })
      expect(sent?.combinationGroups).toHaveLength(7)
    })

    it('hides More settings while Peer Group Standard is off (AF-4)', async () => {
      await mountStrategies()
      await flip('peerGroupStandard')
      expect(find('[data-test="more-peerGroupStandard"]').exists()).toBe(false)
    })

    it("shows the backend's refusal of a Peer Group setting under the strategy (EF-2)", async () => {
      await mountStrategies()
      vi.spyOn(setupApi, 'saveSetupStrategies').mockRejectedValueOnce(new HttpError(400, '/x', JSON.stringify({
        errors: [{ strategy: 'PeerGroupStandard2', field: 'combinationGroups[0].buyer.foo', message: "'foo' is not a Buyer attribute." }],
      })))
      await flip('creditLimitMax')
      await clickSave()
      expect(find('[data-test="peer-group-error"]').text()).toBe("'foo' is not a Buyer attribute.")
    })

    it('explains under the strategy why a stored list it cannot save keeps Save off', async () => {
      const read = setupApi.fetchSetupStrategies.bind(setupApi)
      vi.spyOn(setupApi, 'fetchSetupStrategies').mockImplementationOnce(async (versionId) => {
        const response = await read(versionId)
        const peerGroup = response.strategies.find((strategy) => strategy.key === 'peerGroupStandard')!
        peerGroup.combinationGroups = []
        return response
      })
      await mountStrategies()
      expect(find('[data-test="peer-group-error"]').text())
        .toBe('No combination groups are configured. Add at least one group before you can save.')

      await flip('creditLimitMax')
      expect(saveButton().attributes('disabled')).toBeDefined()
    })
  })
})
