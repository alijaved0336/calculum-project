import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { MOCK_PEER_GROUP_DEFAULTS } from '@/modules/setup/api/setupStrategies.mock'
import type { CombinationGroup, StrategySetting } from '@/modules/setup/api'
import SetupPeerGroupSettingsModal, { type PeerGroupSettings } from '@/modules/setup/components/SetupPeerGroupSettingsModal.vue'
import { combinationGroupsError, emptyGroup, hasDuplicateGroups, moveGroup, sortByEnabledAttributes } from '@/modules/setup/utils/combinationGroups'
import { i18n } from './setupTestHarness'

const stubs = {
  CustomDialog: {
    props: ['visible', 'title'],
    emits: ['close'],
    template: '<div v-if="visible" class="dialog" :data-title="title"><slot /><slot name="actions" /></div>',
  },
  CustomButton: {
    props: ['text', 'disabled'],
    emits: ['click'],
    template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ text }}</button>',
  },
}

const defaults = (): CombinationGroup[] => structuredClone(MOCK_PEER_GROUP_DEFAULTS)

function mountModal(overrides: Partial<StrategySetting> = {}, disabled = false) {
  const setting: StrategySetting = {
    key: 'peerGroupStandard', allowed: true, companyAllowed: true, metric: 'Q1', minOccurrences: 30,
    combinationGroups: defaults(), combinationGroupsSource: 'default', defaultCombinationGroups: defaults(),
    ...overrides,
  }
  return mount(SetupPeerGroupSettingsModal, { props: { setting, disabled }, global: { plugins: [i18n()], stubs } })
}

type Wrapper = ReturnType<typeof mountModal>
const at = (wrapper: Wrapper, dataTest: string) => wrapper.find(`[data-test="${dataTest}"]`)
const cards = (wrapper: Wrapper) => wrapper.findAll('[data-test="pg-group"]')
const isOn = (wrapper: Wrapper, card: number, pill: string) =>
  cards(wrapper)[card].find(`[data-test="pg-${pill}"]`).attributes('aria-pressed') === 'true'
const saved = (wrapper: Wrapper) => wrapper.emitted('save')?.[0]?.[0] as PeerGroupSettings | undefined
const saveDisabled = (wrapper: Wrapper) => at(wrapper, 'pg-save').attributes('disabled') !== undefined
const setOccurrences = (wrapper: Wrapper, value: string) => at(wrapper, 'pg-min-occurrences').find('input').setValue(value)

/** AB#20839 (#20824): Peer Group Standard's More Settings popup. */
describe('SetupPeerGroupSettingsModal', () => {
  it('opens with 30 occurrences, 1Q selected and the seven groups (AC-01)', () => {
    const wrapper = mountModal()
    expect(at(wrapper, 'pg-modal').attributes('data-title')).toBe('Peer Group Standard')
    expect((at(wrapper, 'pg-min-occurrences').find('input').element as HTMLInputElement).value).toBe('30')
    expect(wrapper.findAll('[data-test^="pg-metric-"]').map((pill) => pill.text())).toEqual(['Min', 'Avg', '1Q', '3Q', 'Max'])
    expect(at(wrapper, 'pg-metric-Q1').attributes('aria-pressed')).toBe('true')
    expect(cards(wrapper)).toHaveLength(7)
    expect(at(wrapper, 'pg-warning').exists()).toBe(false)
  })

  it('shows Buyer, Transaction and Supplier in that order, with the role-faithful cards 4 and 7 (AC-02)', () => {
    const wrapper = mountModal()
    expect(cards(wrapper)[0].findAll('.pg__section-label').map((label) => label.text())).toEqual(['Buyer', 'Transaction', 'Supplier'])
    const on = (card: number) => ['buyer-country', 'buyer-region', 'buyer-industry', 'buyer-creditRating', 'transaction-commodity',
      'transaction-buyerLeverage', 'supplier-country', 'supplier-region', 'supplier-industry', 'supplier-creditRating']
      .filter((pill) => isOn(wrapper, card, pill))
    expect(on(3)).toEqual(['buyer-country', 'buyer-region', 'buyer-industry', 'transaction-buyerLeverage', 'supplier-region', 'supplier-industry'])
    expect(on(6)).toEqual(['buyer-industry', 'supplier-region'])
  })

  it('toggles an attribute pill', async () => {
    const wrapper = mountModal()
    await cards(wrapper)[6].find('[data-test="pg-buyer-country"]').trigger('click')
    expect(isOn(wrapper, 6, 'buyer-country')).toBe(true)
  })

  it('deletes, adds, sorts and restores, numbering the cards from the top (AC-03)', async () => {
    const wrapper = mountModal()
    const priorities = () => wrapper.findAll('[data-test="pg-priority"]').map((p) => p.text())

    await cards(wrapper)[6].find('[data-test="pg-delete"]').trigger('click')
    expect(priorities()).toEqual(['1', '2', '3', '4', '5', '6'])

    await at(wrapper, 'pg-add').trigger('click')
    await cards(wrapper)[6].find('[data-test="pg-buyer-industry"]').trigger('click')
    expect(cards(wrapper)).toHaveLength(7)

    await at(wrapper, 'pg-sort').trigger('click')
    const counts = cards(wrapper).map((card) => card.findAll('[aria-pressed="true"]').length)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))

    await at(wrapper, 'pg-restore').trigger('click')
    await at(wrapper, 'pg-save').trigger('click')
    expect(saved(wrapper)?.combinationGroups).toEqual(defaults())
  })

  it('reorders a dragged card above another', async () => {
    const wrapper = mountModal()
    await cards(wrapper)[5].find('[data-test="pg-handle"]').trigger('mouseenter')
    await cards(wrapper)[5].trigger('dragstart', { dataTransfer: { setData: () => undefined } })
    await cards(wrapper)[4].trigger('dragenter')
    await cards(wrapper)[4].trigger('drop')
    await at(wrapper, 'pg-save').trigger('click')
    const groups = saved(wrapper)!.combinationGroups
    expect(groups[4]).toEqual(defaults()[5])
    expect(groups[5]).toEqual(defaults()[4])
  })

  it('blocks Save with a warning for an empty group, two identical groups and no group (AC-04)', async () => {
    const wrapper = mountModal()

    await at(wrapper, 'pg-add').trigger('click')
    expect(at(wrapper, 'pg-warning').text()).toContain('no attributes selected')
    expect(saveDisabled(wrapper)).toBe(true)

    await cards(wrapper)[7].find('[data-test="pg-buyer-industry"]').trigger('click')
    await cards(wrapper)[7].find('[data-test="pg-supplier-region"]').trigger('click')
    expect(at(wrapper, 'pg-warning').text()).toContain('exact same attributes')
    expect(saveDisabled(wrapper)).toBe(true)

    while (cards(wrapper).length > 0) await cards(wrapper)[0].find('[data-test="pg-delete"]').trigger('click')
    expect(at(wrapper, 'pg-warning').text()).toContain('No combination groups')
    expect(saveDisabled(wrapper)).toBe(true)
  })

  it('accepts 1 to 9,999 whole occurrences (AC-04)', async () => {
    const wrapper = mountModal()
    for (const [value, message] of [['0', 'from 1 to 9,999'], ['12.5', 'whole number'], ['10000', 'from 1 to 9,999'], ['', 'whole number']]) {
      await setOccurrences(wrapper, value)
      expect(at(wrapper, 'pg-min-occurrences').find('.setup-number-field__error').text()).toContain(message)
      expect(saveDisabled(wrapper)).toBe(true)
    }
    await setOccurrences(wrapper, '1')
    expect(saveDisabled(wrapper)).toBe(false)
  })

  it('emits the stored values, not the labels, and closes (AC-05)', async () => {
    const wrapper = mountModal()
    await setOccurrences(wrapper, '50')
    await at(wrapper, 'pg-metric-Q3').trigger('click')
    await at(wrapper, 'pg-save').trigger('click')
    expect(saved(wrapper)).toEqual({ metric: 'Q3', minOccurrences: 50, combinationGroups: defaults() })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('closes on Cancel without asking when nothing changed', async () => {
    const wrapper = mountModal()
    await at(wrapper, 'pg-cancel').trigger('click')
    expect(at(wrapper, 'pg-unsaved').exists()).toBe(false)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('asks Discard or Save on Cancel after a change; Discard closes without saving (AC-05)', async () => {
    const wrapper = mountModal()
    await at(wrapper, 'pg-metric-Q3').trigger('click')
    await at(wrapper, 'pg-cancel').trigger('click')
    expect(at(wrapper, 'pg-unsaved').exists()).toBe(true)
    await at(wrapper, 'pg-unsaved-discard').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it("saves from the confirmation's Save", async () => {
    const wrapper = mountModal()
    await at(wrapper, 'pg-metric-MAX').trigger('click')
    await at(wrapper, 'pg-cancel').trigger('click')
    await at(wrapper, 'pg-unsaved-save').trigger('click')
    expect(saved(wrapper)?.metric).toBe('MAX')
  })

  it('disables every input, pill, handle and Save while Setup is locked, leaving Cancel (AC-12)', () => {
    const wrapper = mountModal({}, true)
    expect(at(wrapper, 'pg-min-occurrences').find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('.pg__pill').every((pill) => pill.attributes('disabled') !== undefined)).toBe(true)
    expect(cards(wrapper).every((card) => card.attributes('draggable') === 'false')).toBe(true)
    for (const action of ['pg-add', 'pg-sort', 'pg-restore', 'pg-save']) expect(at(wrapper, action).attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('[data-test="pg-delete"]').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    expect(at(wrapper, 'pg-cancel').attributes('disabled')).toBeUndefined()
  })
})

describe('combination group helpers', () => {
  const withFlags = (buyerIndustry: boolean, commodity: boolean): CombinationGroup => {
    const group = emptyGroup()
    group.buyer.industry = buyerIndustry
    group.transaction.commodity = commodity
    return group
  }

  it('finds the first reason the groups cannot be saved', () => {
    expect(combinationGroupsError([])).toBe('arSetup.peerGroup.warnings.noGroups')
    expect(combinationGroupsError([withFlags(true, false), emptyGroup()])).toBe('arSetup.peerGroup.warnings.emptyGroup')
    expect(combinationGroupsError([withFlags(true, false), withFlags(true, false)])).toBe('arSetup.peerGroup.warnings.duplicateGroups')
    expect(combinationGroupsError(defaults())).toBeUndefined()
    expect(hasDuplicateGroups(defaults())).toBe(false)
  })

  it('sorts most attributes first, keeping ties in order', () => {
    const one = withFlags(true, false)
    const otherOne = withFlags(false, true)
    const two = withFlags(true, true)
    expect(sortByEnabledAttributes([one, two, otherOne])).toEqual([two, one, otherOne])
  })

  it('moves a group without touching the original list', () => {
    const groups = defaults()
    expect(moveGroup(groups, 5, 4)[4]).toBe(groups[5])
    expect(groups[4]).toEqual(defaults()[4])
  })
})
