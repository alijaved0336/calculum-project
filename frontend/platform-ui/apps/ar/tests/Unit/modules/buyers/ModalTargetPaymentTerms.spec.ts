import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import en from '@ada/design-system/locales/languages/en.json'
import { HttpError } from '@/api/http'

const saveTargetPaymentTerms = vi.fn()
const clearTargetPaymentTerms = vi.fn()
vi.mock('@/api', () => ({
  saveTargetPaymentTerms: (...args: unknown[]) => saveTargetPaymentTerms(...args),
  clearTargetPaymentTerms: (...args: unknown[]) => clearTargetPaymentTerms(...args),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}))

// Only reached by the "all except a few" id lookup - the grid itself is stubbed below.
const fetchGraphqlGridPage = vi.fn()
vi.mock('@/utils/graphqlGridQuery', () => ({
  fetchGraphqlGridPage: (...args: unknown[]) => fetchGraphqlGridPage(...args),
}))
vi.mock('@/services/graphql/apolloClient', () => ({ apolloClient: {} }))

// The card's own sale-line grid, in its selectable mode: reports its line count and selection
// back the way the real one does (`update:total` / `update:selection`).
vi.mock('@/modules/buyers/components/customerCard/OpportunityListBuyers.vue', () => ({
  default: {
    name: 'OpportunityListBuyers',
    props: ['versionUuid', 'buyerId', 'role', 'selectable', 'selection', 'height'],
    emits: ['update:total', 'update:selection', 'update:filter'],
    template: '<div class="lines-stub" />',
  },
}))

import ModalTargetPaymentTerms from '@/modules/buyers/components/customerCard/ModalTargetPaymentTerms.vue'

const VERSION_UUID = '1653c234-9318-4707-a6c3-33f4b427126c'
const MESSAGES = en.arCustomerCard.opportunity.target
const NO_FILTER = '{"logic":"and","filters":[]}'

async function mountModal(props: Record<string, unknown> = {}, total = 3) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } })
  const view = mount(ModalTargetPaymentTerms, {
    props: { versionUuid: VERSION_UUID, partyId: 1500, role: 'Counterparty', ...props },
    global: { plugins: [i18n] },
    attachTo: document.body,
  })
  const grid = view.findComponent({ name: 'OpportunityListBuyers' })
  if (grid.exists()) {
    grid.vm.$emit('update:total', total)
  }
  await flushPromises()
  return view
}

const linesGrid = (view: VueWrapper) => view.findComponent({ name: 'OpportunityListBuyers' })

/** CalculumModal teleports to <body>, so the modal's own nodes are looked up there. */
const byTestId = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid="${id}"]`)

async function typeDays(value: string) {
  const input = byTestId('target-days-input') as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event('input'))
  await flushPromises()
}

async function click(id: string) {
  const host = byTestId(id)
  const button = host?.tagName === 'BUTTON' ? host : host?.querySelector('button')
  button?.click()
  await flushPromises()
}

async function select(view: VueWrapper, selection: { all: boolean; ids: number[] }) {
  linesGrid(view).vm.$emit('update:selection', selection)
  await flushPromises()
}

describe('ModalTargetPaymentTerms (AB#20657)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = ''
    saveTargetPaymentTerms.mockReset().mockResolvedValue(undefined)
    clearTargetPaymentTerms.mockReset().mockResolvedValue(undefined)
    fetchGraphqlGridPage.mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
  })

  it("lists the party's lines through OpportunityListBuyers, selectable, all selected (AC-02)", async () => {
    const view = await mountModal({ role: 'Parent' })

    expect(linesGrid(view).props()).toMatchObject({
      versionUuid: VERSION_UUID,
      buyerId: '1500',
      role: 'Parent',
      selectable: true,
      selection: { all: true, ids: [] },
    })
  })

  it('saves on the whole buyer when every line stays selected (AC-03)', async () => {
    const view = await mountModal()
    await typeDays('60')
    await click('target-save')

    expect(saveTargetPaymentTerms).toHaveBeenCalledWith(VERSION_UUID, 1500, { level: 'SaleLine', partyId: 1500, role: 'Counterparty', all: true, saleLineIds: null, telerikFilter: NO_FILTER, value: 60 })
    expect(view.emitted('saved')).toEqual([[{ cleared: false }]])
  })

  it('saves on the picked lines only, across pages (AC-04)', async () => {
    const view = await mountModal({}, 30)
    await select(view, { all: false, ids: [11, 27] })
    await typeDays('45')
    await click('target-save')

    expect(saveTargetPaymentTerms).toHaveBeenCalledWith(VERSION_UUID, 1500, { level: 'SaleLine', partyId: 1500, role: 'Counterparty', all: false, saleLineIds: [11, 27], telerikFilter: NO_FILTER, value: 45 })
  })

  it('saves on every line but the unticked ones, looking the full id list up first', async () => {
    fetchGraphqlGridPage.mockResolvedValue({ items: [{ saleLineId: 11 }, { saleLineId: 12 }, { saleLineId: 13 }], total: 3 })
    const view = await mountModal({ role: 'Parent' })
    await select(view, { all: true, ids: [12] })
    await typeDays('50')
    await click('target-save')

    const [, , options] = fetchGraphqlGridPage.mock.calls[0]
    expect(options.where).toEqual({ parentId: { eq: 1500 } })
    expect(saveTargetPaymentTerms).toHaveBeenCalledWith(VERSION_UUID, 1500, { level: 'SaleLine', partyId: 1500, role: 'Parent', all: false, saleLineIds: [11, 13], telerikFilter: NO_FILTER, value: 50 })
  })

  it('clears the selected lines on a Parent (AC-05, AC-10)', async () => {
    const view = await mountModal({ role: 'Parent', initialTarget: 60 })
    await click('target-clear')

    expect(clearTargetPaymentTerms).toHaveBeenCalledWith(VERSION_UUID, 1500, { level: 'SaleLine', partyId: 1500, role: 'Parent', all: true, saleLineIds: null, telerikFilter: NO_FILTER })
    expect(view.emitted('saved')).toEqual([[{ cleared: true }]])
  })

  describe('with filters applied in the grid', () => {
    const VOLUME_FILTER = { logic: 'and' as const, filters: [{ field: 'volume', operator: 'gt', value: 100 }] }

    it('sends them as telerikFilter alongside all: true', async () => {
      const view = await mountModal()
      linesGrid(view).vm.$emit('update:filter', VOLUME_FILTER)
      await typeDays('60')
      await click('target-save')

      expect(saveTargetPaymentTerms).toHaveBeenCalledWith(VERSION_UUID, 1500, {
        level: 'SaleLine', partyId: 1500, role: 'Counterparty', all: true, saleLineIds: null, telerikFilter: JSON.stringify(VOLUME_FILTER), value: 60,
      })
    })

    it('sends them alongside all: false and the picked ids', async () => {
      const view = await mountModal()
      linesGrid(view).vm.$emit('update:filter', VOLUME_FILTER)
      await select(view, { all: false, ids: [12] })
      await click('target-clear')

      expect(clearTargetPaymentTerms).toHaveBeenCalledWith(VERSION_UUID, 1500, {
        level: 'SaleLine', partyId: 1500, role: 'Counterparty', all: false, saleLineIds: [12], telerikFilter: JSON.stringify(VOLUME_FILTER),
      })
    })

    it('looks the full id list up under the same filters for an "all except a few" selection', async () => {
      fetchGraphqlGridPage.mockResolvedValue({ items: [{ saleLineId: 11 }, { saleLineId: 12 }], total: 2 })
      const view = await mountModal({}, 2)
      linesGrid(view).vm.$emit('update:filter', VOLUME_FILTER)
      await select(view, { all: true, ids: [12] })
      await typeDays('30')
      await click('target-save')

      expect(fetchGraphqlGridPage.mock.calls[0][2].where).toEqual({ and: [{ buyerId: { eq: 1500 } }, { and: [{ volume: { gt: 100 } }] }] })
      expect(saveTargetPaymentTerms).toHaveBeenCalledWith(VERSION_UUID, 1500, {
        level: 'SaleLine', partyId: 1500, role: 'Counterparty', all: false, saleLineIds: [11], telerikFilter: JSON.stringify(VOLUME_FILTER), value: 30,
      })
    })
  })

  it('shows the loading while the request is in flight, and hands the OK answer back to close', async () => {
    let answer: () => void = () => {}
    saveTargetPaymentTerms.mockReturnValue(new Promise<void>((resolve) => { answer = resolve }))
    const view = await mountModal()
    await typeDays('60')
    await click('target-save')

    expect(byTestId('loading-component')).not.toBeNull()
    expect(view.emitted('saved')).toBeUndefined()

    answer()
    await flushPromises()

    expect(byTestId('loading-component')).toBeNull()
    expect(view.emitted('saved')).toEqual([[{ cleared: false }]])
  })

  it('pre-fills the current target (AF-4)', async () => {
    await mountModal({ initialTarget: 60 })

    expect((byTestId('target-days-input') as HTMLInputElement).value).toBe('60')
  })

  it.each(['400', '12.5', '-5', ''])('refuses %j without calling the API (AC-11)', async (raw) => {
    await mountModal()
    await typeDays(raw)
    await click('target-save')

    expect(saveTargetPaymentTerms).not.toHaveBeenCalled()
    expect(byTestId('target-error')?.textContent?.trim()).toBe(MESSAGES.invalidValue)
  })

  it('refuses a save with no line selected (AC-11)', async () => {
    const view = await mountModal()
    await select(view, { all: false, ids: [] })
    await typeDays('30')
    await click('target-save')

    expect(saveTargetPaymentTerms).not.toHaveBeenCalled()
    expect(byTestId('target-error')?.textContent?.trim()).toBe(MESSAGES.noLineSelected)
  })

  it('unticks and reticks every line from the "all sale lines" box', async () => {
    const view = await mountModal()
    const box = document.body.querySelector<HTMLInputElement>('[data-testid="target-lines"] input[type="checkbox"]')
    box?.click()
    await flushPromises()
    expect(linesGrid(view).props('selection')).toEqual({ all: false, ids: [] })

    box?.click()
    await flushPromises()
    expect(linesGrid(view).props('selection')).toEqual({ all: true, ids: [] })
  })

  it('still shows the lines for a single-line buyer, and saves on the buyer', async () => {
    const view = await mountModal({}, 1)
    expect(linesGrid(view).isVisible()).toBe(true)

    await typeDays('30')
    await click('target-save')
    expect(saveTargetPaymentTerms).toHaveBeenCalledWith(VERSION_UUID, 1500, { level: 'SaleLine', partyId: 1500, role: 'Counterparty', all: true, saleLineIds: null, telerikFilter: NO_FILTER, value: 30 })
  })

  it("targets the card's open Sale Line tab without any grid", async () => {
    const view = await mountModal({ activeSaleLineId: 42 })

    expect(linesGrid(view).exists()).toBe(false)
    await typeDays('20')
    await click('target-save')
    expect(saveTargetPaymentTerms).toHaveBeenCalledWith(VERSION_UUID, 1500, { level: 'SaleLine', partyId: 1500, role: 'Counterparty', all: false, saleLineIds: [42], telerikFilter: NO_FILTER, value: 20 })
  })

  it.each([
    [409, MESSAGES.recalculating],
    [403, MESSAGES.forbidden],
    [500, MESSAGES.saveError],
  ])('keeps the window open with the reason when the save answers %i (EF-3/EF-4/EF-5)', async (status, message) => {
    saveTargetPaymentTerms.mockRejectedValue(new HttpError(status, '/x', ''))
    const view = await mountModal()
    await typeDays('60')
    await click('target-save')

    expect(view.emitted('saved')).toBeUndefined()
    expect(byTestId('target-error')?.textContent?.trim()).toBe(message)
    expect(toastError).toHaveBeenCalledWith(message)
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  describe('toasts', () => {
    it('confirms a save with a success toast', async () => {
      await mountModal()
      await typeDays('60')
      await click('target-save')

      expect(toastSuccess).toHaveBeenCalledWith(MESSAGES.saved)
      expect(toastError).not.toHaveBeenCalled()
    })

    it('confirms a clear with a success toast', async () => {
      await mountModal()
      await click('target-clear')

      expect(toastSuccess).toHaveBeenCalledWith(MESSAGES.cleared)
    })

    it('reports a refused clear with an error toast', async () => {
      clearTargetPaymentTerms.mockRejectedValue(new HttpError(409, '/x', ''))
      await mountModal()
      await click('target-clear')

      expect(toastError).toHaveBeenCalledWith(MESSAGES.recalculating)
      expect(toastSuccess).not.toHaveBeenCalled()
    })

    it('says "could not be cleared", not "saved", when a clear fails for any other reason', async () => {
      clearTargetPaymentTerms.mockRejectedValue(new HttpError(500, '/x', ''))
      await mountModal()
      await click('target-clear')

      expect(toastError).toHaveBeenCalledWith(MESSAGES.clearError)
      expect(byTestId('target-error')?.textContent?.trim()).toBe(MESSAGES.clearError)
    })

    it('raises no toast for a value refused before any request (EF-1)', async () => {
      await mountModal()
      await typeDays('400')
      await click('target-save')

      expect(toastSuccess).not.toHaveBeenCalled()
      expect(toastError).not.toHaveBeenCalled()
    })
  })
})
