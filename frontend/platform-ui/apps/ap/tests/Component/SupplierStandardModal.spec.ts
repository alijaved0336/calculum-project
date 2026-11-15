/**
 * Component tests for SupplierStandardModal (WI#18682 — Supplier Standard 2.0 gaps)
 *
 * Covers:
 * - AC-01 / AC-03: a combination group with no criteria selected (including the
 *   auto-created default group when the company has no prior customization) can
 *   still be saved.
 * - AC-04: duplicate default combination groups (identical criteria, different
 *   priorityOrder) are filtered out of the rendered list.
 * - AC-05: the new supplier-side attribute pills (country/region/industry/credit
 *   rating) toggle and are included in the emitted save payload.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import SupplierStandardModal from '@/modules/home/views/settings/Modals/SupplierStandardModal.vue'

const mockToast = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}

vi.mock('vue-toastification', () => ({
  useToast: () => mockToast,
}))

const globalStubs = {
  CalculumModal: {
    template: `
      <div class="calculum-modal-stub">
        <slot name="modalContent"></slot>
        <slot name="modalButtons"></slot>
      </div>
    `,
  },
  CalculumConfirmModal: { template: '<div class="calculum-confirm-modal-stub"></div>' },
  Tooltip: { template: '<div><slot></slot></div>' },
  iconDragDrop: { template: '<span class="icon-drag-drop-stub"></span>' },
  iconTrash: { template: '<span class="icon-trash-stub"></span>' },
  iconCheck: { template: '<span class="icon-check-stub"></span>' },
  KRadioButton: { template: '<div class="k-radio-button-stub"></div>' },
}

function makeGroup(overrides: Record<string, boolean | number> = {}) {
  return {
    priorityOrder: 1,
    commodity: false,
    buyer_leverage: false,
    buyer_country: false,
    buyer_region: false,
    buyer_industry: false,
    buyer_credit_rating: false,
    supplier_country: false,
    supplier_region: false,
    supplier_industry: false,
    supplier_credit_rating: false,
    ...overrides,
  }
}

function makeConfig(combinationGroups: ReturnType<typeof makeGroup>[]) {
  return {
    minOccurrences: 5,
    dsoAdjustmentEnabled: false,
    dsoFallbackEnabled: false,
    calculationMethod: '3q',
    includeParentTerms: false,
    includeSisterTerms: false,
    sisterCompanyInclusion: 'exclude',
    combinationGroups,
  }
}

function mountModal(combinationGroups: ReturnType<typeof makeGroup>[]): VueWrapper {
  return mountWithProviders(SupplierStandardModal, {
    props: { data: makeConfig(combinationGroups) },
    global: { stubs: globalStubs },
  })
}

/** Pills render in a fixed order per group card: Commodity, Buyer Leverage, Buyer
 *  Country/Region/Industry/Credit Rating, then Supplier Country/Region/Industry/Credit Rating. */
function findSectionPills(wrapper: VueWrapper, groupIndex: number, sectionLabel: string) {
  const card = wrapper.findAll('.supplier-settings-card')[groupIndex]
  const section = card
    .findAll('.supplier-settings-card-section')
    .find((el) => el.text().includes(sectionLabel))
  return section?.findAll('button.supplier-settings-pill') ?? []
}

function findSaveButton(wrapper: VueWrapper) {
  return wrapper.find('button.btn-primary')
}

describe('SupplierStandardModal', () => {
  let wrapper: VueWrapper

  afterEach(() => {
    wrapper?.unmount()
    mockToast.error.mockClear()
  })

  it('AC-01: saves a combination group with no criteria selected', async () => {
    wrapper = mountModal([makeGroup({ priorityOrder: 1 })])

    await findSaveButton(wrapper).trigger('click')

    expect(mockToast.error).not.toHaveBeenCalled()
    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('close')).toBeTruthy()
    const savedConfig = wrapper.emitted('save')![0][0] as any
    expect(savedConfig.combinationGroups).toHaveLength(1)
    expect(savedConfig.combinationGroups[0].commodity).toBe(false)
  })

  it('AC-03: saves the auto-created default group when the company has no prior customization', async () => {
    wrapper = mountModal([])

    // No groups were supplied, so the modal falls back to a single all-false default group.
    expect(wrapper.findAll('.supplier-settings-card')).toHaveLength(1)

    await findSaveButton(wrapper).trigger('click')

    expect(mockToast.error).not.toHaveBeenCalled()
    const savedConfig = wrapper.emitted('save')![0][0] as any
    expect(savedConfig.combinationGroups).toHaveLength(1)
    expect(savedConfig.combinationGroups[0].priorityOrder).toBe(1)
  })

  it('AC-04: filters out combination groups that are exact duplicates of an earlier one', () => {
    wrapper = mountModal([
      makeGroup({ priorityOrder: 1, buyer_leverage: true, buyer_region: true }),
      makeGroup({ priorityOrder: 2, buyer_leverage: true, buyer_region: true }), // duplicate of #1
      makeGroup({ priorityOrder: 3, buyer_country: true }),
    ])

    const cards = wrapper.findAll('.supplier-settings-card')
    expect(cards).toHaveLength(2)
    expect((wrapper.vm as any).supplierStandard.config.combinationGroups.map((g: any) => g.priorityOrder)).toEqual([1, 2])
  })

  it('disables Save (US-02) and, if invoked anyway, blocks it without touching edits, when two groups end up with identical criteria', async () => {
    wrapper = mountModal([
      makeGroup({ priorityOrder: 1, commodity: true }),
      makeGroup({ priorityOrder: 2, buyer_leverage: true }),
    ])
    expect(wrapper.findAll('.supplier-settings-card')).toHaveLength(2) // distinct, nothing deduped yet

    // Edit group #2's criteria until it matches group #1 exactly (commodity only).
    const group2Transactionpills = findSectionPills(wrapper, 1, 'Transaction')
    await group2Transactionpills[1].trigger('click') // Buyer Leverage off
    await group2Transactionpills[0].trigger('click') // Commodity on

    // canSave now folds hasDuplicates in (US-02), so the button itself is disabled - a real
    // click on a disabled <button> never reaches handleSave() at all.
    expect((findSaveButton(wrapper).element as HTMLButtonElement).disabled).toBe(true)

    // Call handleSave() directly to also pin its own defensive ordering (duplicates checked
    // before the generic !canSave branch, which would otherwise reset combinationGroups) - a
    // second line of defense in case anything ever re-enables the button for this case.
    ;(wrapper.vm as any).handleSave()

    expect(mockToast.error).toHaveBeenCalledWith('global.groupAlreadyExists')
    expect(wrapper.emitted('save')).toBeFalsy()
    expect(wrapper.emitted('close')).toBeFalsy()
    // Unsaved edits stay exactly as the Super Admin left them — no revert, no silent drop.
    const groups = (wrapper.vm as any).supplierStandard.config.combinationGroups
    expect(groups).toHaveLength(2)
    expect(groups.every((g: any) => g.commodity === true && g.buyer_leverage === false)).toBe(true)
  })

  it('AC-05: toggling a supplier-attribute pill updates state and is included in the saved payload', async () => {
    wrapper = mountModal([makeGroup({ priorityOrder: 1 })])

    const supplierPills = findSectionPills(wrapper, 0, 'Supplier')
    expect(supplierPills).toHaveLength(4)

    const countryPill = supplierPills[0]
    expect(countryPill.classes()).not.toContain('supplier-settings-pill--selected')

    await countryPill.trigger('click')
    expect(countryPill.classes()).toContain('supplier-settings-pill--selected')
    expect((wrapper.vm as any).supplierStandard.config.combinationGroups[0].supplier_country).toBe(true)

    await findSaveButton(wrapper).trigger('click')
    const savedConfig = wrapper.emitted('save')![0][0] as any
    expect(savedConfig.combinationGroups[0].supplier_country).toBe(true)
  })

  it('explains why Save is disabled when every group has been removed (US-02)', async () => {
    wrapper = mountModal([makeGroup({ priorityOrder: 1, commodity: true })])

    ;(wrapper.vm as any).removeGroup(0)
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as any).supplierStandard.config.combinationGroups).toHaveLength(0)
    expect((findSaveButton(wrapper).element as HTMLButtonElement).disabled).toBe(true)
    expect((wrapper.vm as any).saveDisabledReason).toBeTruthy()
  })
})
