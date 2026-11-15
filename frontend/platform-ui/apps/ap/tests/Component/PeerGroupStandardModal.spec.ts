/**
 * Component tests for PeerGroupStandardModal (WI#18682 follow-up — block saving
 * duplicate combination groups; US-02 (Sprint 114) — block saving an empty group).
 *
 * Covers:
 * - US-02: unlike Supplier Standard 2.0, a combination group with no criteria
 *   selected is blocked here - Peer Group Standard 2.0 has no forced-identity
 *   floor, so an empty group would match the entire dataset unconditionally,
 *   not "everyone, filtered to this supplier's identity". Confirmed as a real
 *   bug (leadership sign-off 2026-09-14): the two strategies used to share the
 *   exact same `canSave` check.
 * - If two groups end up with identical criteria, Save is blocked with a
 *   toast, and neither `save` nor `close` is emitted — the Super Admin's unsaved
 *   edits are left exactly as they are so they can fix the duplicate themselves.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import PeerGroupStandardModal from '@/modules/home/views/settings/Modals/PeerGroupStandardModal.vue'

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
  iconDragDrop: { template: '<span class="icon-drag-drop-stub"></span>' },
  iconTrash: { template: '<span class="icon-trash-stub"></span>' },
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
    minOccurrences: 30,
    calculationMethod: '3q',
    combinationGroups,
  }
}

function mountModal(combinationGroups: ReturnType<typeof makeGroup>[]): VueWrapper {
  return mountWithProviders(PeerGroupStandardModal, {
    props: { data: makeConfig(combinationGroups) },
    global: { stubs: globalStubs },
  })
}

/** Pills render in a fixed order per group card: Supplier Country/Region/Industry/Credit
 *  Rating, then Commodity/Buyer Leverage, then Buyer Country/Region/Industry/Credit Rating. */
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

describe('PeerGroupStandardModal', () => {
  let wrapper: VueWrapper

  afterEach(() => {
    wrapper?.unmount()
    mockToast.error.mockClear()
  })

  it('disables Save and, if invoked anyway, blocks it without touching edits, when a group has no criteria selected (US-02: no forced-identity floor for PG2.0)', async () => {
    wrapper = mountModal([makeGroup({ priorityOrder: 1 })])

    // A real click on a disabled <button> never reaches handleSave() at all.
    expect((findSaveButton(wrapper).element as HTMLButtonElement).disabled).toBe(true)

    // Call handleSave() directly to also pin its own defensive branching: the empty-group case
    // has its own message and, like duplicates, must not call resetGroups() - the group exists,
    // it's just missing an attribute, so the Super Admin's edits (such as they are) must survive.
    ;(wrapper.vm as any).handleSave()

    expect(mockToast.error).toHaveBeenCalledWith('global.groupMissingAttribute')
    expect(wrapper.emitted('save')).toBeFalsy()
    expect(wrapper.emitted('close')).toBeFalsy()
    expect((wrapper.vm as any).state.config.combinationGroups).toHaveLength(1)
  })

  it('disables Save and, if invoked anyway, blocks it without touching edits, when two groups end up with identical criteria', async () => {
    wrapper = mountModal([
      makeGroup({ priorityOrder: 1, commodity: true }),
      makeGroup({ priorityOrder: 2, buyer_leverage: true }),
    ])
    expect(wrapper.findAll('.supplier-settings-card')).toHaveLength(2)

    // Edit group #2's criteria until it matches group #1 exactly (commodity only).
    const group2TransactionPills = findSectionPills(wrapper, 1, 'Transaction')
    await group2TransactionPills[1].trigger('click') // Buyer Leverage off
    await group2TransactionPills[0].trigger('click') // Commodity on

    expect((findSaveButton(wrapper).element as HTMLButtonElement).disabled).toBe(true)

    // Call handleSave() directly to also pin its own defensive ordering (duplicates checked
    // before the generic !canSave branch, which would otherwise reset combinationGroups).
    ;(wrapper.vm as any).handleSave()

    expect(mockToast.error).toHaveBeenCalledWith('global.groupAlreadyExists')
    expect(wrapper.emitted('save')).toBeFalsy()
    expect(wrapper.emitted('close')).toBeFalsy()
    const groups = (wrapper.vm as any).state.config.combinationGroups
    expect(groups).toHaveLength(2)
    expect(groups.every((g: any) => g.commodity === true && g.buyer_leverage === false)).toBe(true)
  })

  it('explains why Save is disabled when every group has been removed (US-02)', async () => {
    wrapper = mountModal([makeGroup({ priorityOrder: 1, commodity: true })])

    ;(wrapper.vm as any).removeGroup(0)
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as any).state.config.combinationGroups).toHaveLength(0)
    expect((findSaveButton(wrapper).element as HTMLButtonElement).disabled).toBe(true)
    expect((wrapper.vm as any).saveDisabledReason).toBeTruthy()
  })
})
