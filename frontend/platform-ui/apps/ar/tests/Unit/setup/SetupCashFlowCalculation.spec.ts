import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const context = reactive({ companyUuid: 'c-1', companyName: 'Novonesis' as string | null, saleFileVersionId: 73 as number | null })
vi.mock('@/stores/context', () => ({ useContextStore: () => context }))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}))

// The lock's status poll goes to the real strategies API: keep it on its mock here.
vi.mock('@/modules/setup/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/setup/api')>()
  const { mockSetupStrategiesApi } = await import('@/modules/setup/api/setupStrategies.mock')
  const { mockCashFlowBasisApi } = await import('@/modules/setup/api/cashFlowBasis.mock')
  return { ...actual, setupApi: mockSetupStrategiesApi, cashFlowBasisApi: mockCashFlowBasisApi }
})

import { HttpError } from '@/api/http'
import { cashFlowBasisApi } from '@/modules/setup/api'
import { resetCashFlowBasisMock } from '@/modules/setup/api/cashFlowBasis.mock'
import { resetSetupStrategiesMock } from '@/modules/setup/api/setupStrategies.mock'
import SetupCashFlowCalculation from '@/modules/setup/components/SetupCashFlowCalculation.vue'
import { mountInSetup, type SetupHost } from './setupTestHarness'

let host: SetupHost | null = null
const find = (selector: string) => host!.wrapper.find(selector)
const radio = (basis: string) => find(`[data-test="basis-${basis}"] input[type="radio"]`)
const isChecked = (basis: string) => (radio(basis).element as HTMLInputElement).checked
const saveButton = () => find('[data-test="section-save"]')
const cancelButton = () => find('[data-test="section-cancel"]')
/** CustomDialog renders outside the section (teleported to body). */
const inBody = (selector: string) => {
  const element = document.body.querySelector(selector)
  return element ? new DOMWrapper(element) : null
}

async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
}

async function mountSection(): Promise<void> {
  host = mountInSetup(SetupCashFlowCalculation)
  await settle()
}

async function choose(basis: string): Promise<void> {
  await radio(basis).setValue(true)
  await flushPromises()
}

async function clickSave(): Promise<void> {
  await saveButton().trigger('click')
  await flushPromises()
}

async function accept(): Promise<void> {
  await inBody('[data-test="basis-confirm-accept"]')!.trigger('click')
  await settle()
}

/** AB#20761, on the mocked cash flow basis endpoint. */
describe('SetupCashFlowCalculation', () => {
  beforeEach(() => {
    toastSuccess.mockReset()
    toastError.mockReset()
    vi.useFakeTimers()
    resetCashFlowBasisMock()
    resetSetupStrategiesMock()
    context.saleFileVersionId = 73
  })

  afterEach(() => {
    host?.wrapper.unmount()
    host = null
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens a never-configured version on Contractual, listed first, with the Pay on Terms note (AC-01)', async () => {
    await mountSection()
    const options = host!.wrapper.findAll('.cash-flow-basis__option').map((option) => option.attributes('data-test'))
    expect(options).toEqual(['basis-Contractual', 'basis-Dso'])
    expect(isChecked('Contractual')).toBe(true)
    expect(isChecked('Dso')).toBe(false)
    expect(find('[data-test="pay-on-terms-note"]').exists()).toBe(true)
  })

  it('keeps Save disabled until the option changes (AF-3)', async () => {
    await mountSection()
    expect(saveButton().attributes('disabled')).toBeDefined()
    await choose('Dso')
    expect(saveButton().attributes('disabled')).toBeUndefined()
  })

  it('asks before saving, with the text for the direction, and saves Dso on accept (main flow)', async () => {
    const save = vi.spyOn(cashFlowBasisApi, 'saveCashFlowBasis')
    await mountSection()
    await choose('Dso')
    await clickSave()

    expect(inBody('[data-test="basis-confirm-text"]')!.text()).toContain('Pay on Terms will be calculated again')
    expect(save).not.toHaveBeenCalled()

    await accept()
    expect(save).toHaveBeenCalledWith(73, 'Dso')
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('The sale file is being recalculated'))
    expect(find('[data-test="pay-on-terms-note"]').exists()).toBe(false)
  })

  it('words the confirmation for the switch back to Contractual (AF-1)', async () => {
    resetCashFlowBasisMock({ stored: { 73: 'Dso' } })
    await mountSection()
    expect(isChecked('Dso')).toBe(true)
    await choose('Contractual')
    await clickSave()
    expect(inBody('[data-test="basis-confirm-text"]')!.text()).toContain('Pay on Terms will no longer be calculated')
  })

  it('puts the stored option back and saves nothing when the confirmation is cancelled (AF-2, AC-07)', async () => {
    const save = vi.spyOn(cashFlowBasisApi, 'saveCashFlowBasis')
    await mountSection()
    await choose('Dso')
    await clickSave()
    await inBody('[data-test="basis-confirm-cancel"]')!.trigger('click')
    await flushPromises()

    expect(save).not.toHaveBeenCalled()
    expect(isChecked('Contractual')).toBe(true)
    expect(saveButton().attributes('disabled')).toBeDefined()
  })

  it('refuses Dso -> Contractual without contractual terms before asking, and restores Dso (EF-1, AC-06)', async () => {
    resetCashFlowBasisMock({ stored: { 73: 'Dso' }, withoutContractualTerms: [73] })
    const save = vi.spyOn(cashFlowBasisApi, 'saveCashFlowBasis')
    await mountSection()
    await choose('Contractual')
    await clickSave()

    expect(inBody('[data-test="basis-confirm-text"]')).toBeNull()
    expect(save).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Contractual payment terms are not available in this sale file'))
    expect(isChecked('Dso')).toBe(true)
  })

  it('does not flag a default-Contractual version that has no contractual terms (AC-06)', async () => {
    resetCashFlowBasisMock({ withoutContractualTerms: [73] })
    await mountSection()
    expect(isChecked('Contractual')).toBe(true)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('shows the server 422 refusal and restores the stored option', async () => {
    vi.spyOn(cashFlowBasisApi, 'saveCashFlowBasis').mockRejectedValueOnce(new HttpError(422, '/x', '{}'))
    await mountSection()
    await choose('Dso')
    await clickSave()
    await accept()

    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Contractual payment terms are not available in this sale file'))
    expect(isChecked('Contractual')).toBe(true)
  })

  it('reports a 409 as recalculating and follows the run with the Setup lock (EF-2, EF-5)', async () => {
    vi.spyOn(cashFlowBasisApi, 'saveCashFlowBasis').mockRejectedValueOnce(new HttpError(409, '/x', '{}'))
    await mountSection()
    const startAfterSave = vi.spyOn(host!.lock, 'startAfterSave')
    await choose('Dso')
    await clickSave()
    await accept()

    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('The sale file is being recalculated. Try again when it finishes.'))
    expect(startAfterSave).toHaveBeenCalled()
  })

  it('locks the options and Save while the version is being calculated', async () => {
    await mountSection()
    await choose('Dso')
    host!.lock.startAfterSave()
    await flushPromises()

    expect(radio('Contractual').attributes('disabled')).toBeDefined()
    expect(radio('Dso').attributes('disabled')).toBeDefined()
    expect(saveButton().attributes('disabled')).toBeDefined()
  })

  it('registers its unsaved choice on the Cash Flow tab, and Cancel drops it (AF-4)', async () => {
    await mountSection()
    expect(host!.sections.dirtyIn('cash-flow')).toHaveLength(0)
    await choose('Dso')
    expect(host!.sections.dirtyIn('cash-flow')).toHaveLength(1)

    await cancelButton().trigger('click')
    await flushPromises()
    expect(host!.sections.dirtyIn('cash-flow')).toHaveLength(0)
    expect(isChecked('Contractual')).toBe(true)
  })
})
