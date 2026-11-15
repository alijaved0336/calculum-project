import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const context = reactive<{ companyUuid: string | null; hasCompany: boolean }>({
  companyUuid: null,
  hasCompany: false,
})
vi.mock('@/stores/context', () => ({ useContextStore: () => context }))

const fetchCashFlowImpactLimits = vi.fn()
const saveCashFlowImpactLimits = vi.fn()
vi.mock('@/modules/setup/api/cashFlowImpactLimits', () => ({
  fetchCashFlowImpactLimits: (...args: unknown[]) => fetchCashFlowImpactLimits(...args),
  saveCashFlowImpactLimits: (...args: unknown[]) => saveCashFlowImpactLimits(...args),
}))

import { HttpError } from '@/api/http'
import SetupCashFlowImpactLimits from '@/modules/setup/components/SetupCashFlowImpactLimits.vue'

function selectCompany(uuid: string | null): void {
  context.companyUuid = uuid
  context.hasCompany = uuid !== null
}

const ALL_DEFAULT = [
  { tier: 'Low', fromAmount: null, toAmount: null, isDefault: true },
  { tier: 'Medium', fromAmount: null, toAmount: null, isDefault: true },
  { tier: 'High', fromAmount: null, toAmount: null, isDefault: true },
]

const AN_OVERRIDE = [
  { tier: 'Low', fromAmount: 0, toAmount: 10_000, isDefault: false },
  { tier: 'Medium', fromAmount: 10_000, toAmount: 50_000, isDefault: false },
  { tier: 'High', fromAmount: 50_000, toAmount: null, isDefault: false },
]

let mounted: VueWrapper[] = []

/**
 * `context` is a single reactive object shared across every test in this file (matching
 * `SignoutView.spec.ts`'s own store-mocking style), and the component's `watch(() =>
 * context.companyUuid, load)` stays live for as long as its instance is mounted. An un-unmounted
 * wrapper from an earlier test is still watching, so a later test's `selectCompany` call fires
 * that stale instance's `load()` too — every test must go through this helper so `afterEach` can
 * unmount them all before the next test mutates `context` again.
 */
function mountComponent(): VueWrapper {
  const wrapper = mount(SetupCashFlowImpactLimits)
  mounted.push(wrapper)
  return wrapper
}

/**
 * UC-SET-03 step 1/2/3: an admin reviews the current thresholds, sees which are defaults and
 * which are overrides, edits them, and the refusal (A1) reads back on screen.
 */
describe('SetupCashFlowImpactLimits', () => {
  beforeEach(() => {
    fetchCashFlowImpactLimits.mockReset()
    saveCashFlowImpactLimits.mockReset()
    selectCompany(null)
  })

  afterEach(() => {
    for (const wrapper of mounted) {
      wrapper.unmount()
    }
    mounted = []
  })

  it('asks for a company before fetching anything', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('Select a company')
    expect(fetchCashFlowImpactLimits).not.toHaveBeenCalled()
  })

  it('reads every tier as Default when nothing is configured', async () => {
    selectCompany('company-1')
    fetchCashFlowImpactLimits.mockResolvedValue(ALL_DEFAULT)

    const wrapper = mountComponent()
    await flushPromises()

    expect(fetchCashFlowImpactLimits).toHaveBeenCalledWith('company-1')
    expect(wrapper.text()).toContain('Default')
    expect(wrapper.text()).not.toContain('Override')
    // High never gets a "to" input: the top band has no upper bound.
    expect(wrapper.text()).toContain('and above')
    expect(wrapper.findAll('input[aria-label$="to amount"]')).toHaveLength(2)
  })

  it('reads a configured set as Override, not Default', async () => {
    selectCompany('company-1')
    fetchCashFlowImpactLimits.mockResolvedValue(AN_OVERRIDE)

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('Override')
    expect(wrapper.text()).not.toContain('Default')
  })

  it('saves the typed set, forcing the top tier to an unbounded upper amount', async () => {
    selectCompany('company-1')
    fetchCashFlowImpactLimits.mockResolvedValue(ALL_DEFAULT)
    saveCashFlowImpactLimits.mockResolvedValue(AN_OVERRIDE)

    const wrapper = mountComponent()
    await flushPromises()

    const fromInputs = wrapper.findAll('input[aria-label$="from amount"]')
    await fromInputs[0]!.setValue(0)
    await fromInputs[1]!.setValue(10_000)
    await fromInputs[2]!.setValue(50_000)

    const toInputs = wrapper.findAll('input[aria-label$="to amount"]')
    await toInputs[0]!.setValue(10_000)
    await toInputs[1]!.setValue(50_000)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(saveCashFlowImpactLimits).toHaveBeenCalledWith('company-1', [
      { tier: 'Low', fromAmount: 0, toAmount: 10_000 },
      { tier: 'Medium', fromAmount: 10_000, toAmount: 50_000 },
      { tier: 'High', fromAmount: 50_000, toAmount: null },
    ])
    // The response replaces what's on screen rather than leaving the just-typed values stale.
    expect(wrapper.text()).toContain('Override')
  })

  it('shows A1 refusal messages from a 400 rather than a generic failure', async () => {
    selectCompany('company-1')
    fetchCashFlowImpactLimits.mockResolvedValue(ALL_DEFAULT)
    saveCashFlowImpactLimits.mockRejectedValue(
      new HttpError(400, '/x', JSON.stringify({ errors: ['The Low band runs backwards.'] })),
    )

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('The Low band runs backwards.')
  })

  it('falls back to a generic message when a 400 body is not the expected shape', async () => {
    selectCompany('company-1')
    fetchCashFlowImpactLimits.mockResolvedValue(ALL_DEFAULT)
    saveCashFlowImpactLimits.mockRejectedValue(new HttpError(400, '/x', 'not json'))

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('could not be saved')
  })

  it('falls back to a generic message on a non-400 failure (e.g. a lost session)', async () => {
    selectCompany('company-1')
    fetchCashFlowImpactLimits.mockResolvedValue(ALL_DEFAULT)
    saveCashFlowImpactLimits.mockRejectedValue(new HttpError(403, '/x', ''))

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('could not be saved')
  })

  it('reloads for the newly selected company on a company switch', async () => {
    selectCompany('company-1')
    fetchCashFlowImpactLimits.mockResolvedValue(ALL_DEFAULT)

    mountComponent()
    await flushPromises()

    fetchCashFlowImpactLimits.mockResolvedValue(AN_OVERRIDE)
    selectCompany('company-2')
    await flushPromises()

    expect(fetchCashFlowImpactLimits).toHaveBeenLastCalledWith('company-2')
  })

  it('shows a load failure rather than silently rendering it as "nothing configured"', async () => {
    selectCompany('company-1')
    fetchCashFlowImpactLimits.mockRejectedValue(new HttpError(500, '/x', ''))

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('could not be loaded')
  })

  it('discards a stale load that resolves after a newer company switch already applied', async () => {
    selectCompany('company-1')

    let resolveFirst: ((value: typeof ALL_DEFAULT) => void) | undefined
    let resolveSecond: ((value: typeof AN_OVERRIDE) => void) | undefined

    fetchCashFlowImpactLimits
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )

    const wrapper = mountComponent()
    await flushPromises() // company-1's request is issued and still pending

    selectCompany('company-2')
    await flushPromises() // company-2's request is issued and still pending

    expect(fetchCashFlowImpactLimits).toHaveBeenCalledTimes(2)
    expect(resolveSecond).toBeDefined()

    // The newer request settles first; the stale one settles after.
    resolveSecond?.(AN_OVERRIDE)
    await flushPromises()
    resolveFirst?.(ALL_DEFAULT)
    await flushPromises()

    // Still company-2's data on screen, not overwritten by the late company-1 response.
    expect(wrapper.text()).toContain('Override')
    expect(wrapper.text()).not.toContain('Default')
  })

  it('clears the loading flag when the company is deselected mid-request, not just on success', async () => {
    selectCompany('company-1')
    let resolveFirst: ((value: typeof ALL_DEFAULT) => void) | undefined
    fetchCashFlowImpactLimits.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
    )

    const wrapper = mountComponent()
    await flushPromises() // company-1's request is issued and still pending

    selectCompany(null) // the missing-company branch never awaits fetchCashFlowImpactLimits
    await flushPromises()

    // The stale company-1 request finally settles, after the company was cleared.
    resolveFirst?.(ALL_DEFAULT)
    await flushPromises()

    // No company selected reads as "select a company," not a spinner stuck on forever.
    expect(wrapper.text()).toContain('Select a company')
    expect(wrapper.vm.loading).toBe(false)
  })

  it('omits a tier whose From field was cleared instead of persisting it as zero', async () => {
    selectCompany('company-1')
    fetchCashFlowImpactLimits.mockResolvedValue(AN_OVERRIDE)
    saveCashFlowImpactLimits.mockResolvedValue(ALL_DEFAULT)

    const wrapper = mountComponent()
    await flushPromises()

    const fromInputs = wrapper.findAll('input[aria-label$="from amount"]')
    await fromInputs[2]!.setValue('')

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(saveCashFlowImpactLimits).toHaveBeenCalledWith('company-1', [
      { tier: 'Low', fromAmount: 0, toAmount: 10_000 },
      { tier: 'Medium', fromAmount: 10_000, toAmount: 50_000 },
    ])
  })

  it('sends an empty set when every field is cleared, reverting every tier to default', async () => {
    selectCompany('company-1')
    fetchCashFlowImpactLimits.mockResolvedValue(AN_OVERRIDE)
    saveCashFlowImpactLimits.mockResolvedValue(ALL_DEFAULT)

    const wrapper = mountComponent()
    await flushPromises()

    for (const input of wrapper.findAll('input[aria-label$="from amount"]')) {
      await input.setValue('')
    }

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(saveCashFlowImpactLimits).toHaveBeenCalledWith('company-1', [])
  })
})
