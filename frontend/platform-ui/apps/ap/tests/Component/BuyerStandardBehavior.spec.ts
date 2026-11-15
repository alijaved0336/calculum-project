/**
 * Mounts Buyer Standard setup to prove that picking a Behavior in the "More Settings"
 * popup reaches the group (AB#19740). The handler used to be bound as a ternary
 * expression that evaluated to the method without calling it, so every group saved
 * as "low limit" whatever the administrator chose. PopupComponent is replaced by a
 * stub that emits the same event the real one does; the view itself is real.
 *
 * The mocks below cut the import chains the view does not need here: FormatData pulls
 * the user/app stores (and through them Firebase), Routing pulls every module router,
 * and the child components pull the same again.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia, defineStore } from 'pinia'
import { createI18n } from 'vue-i18n'
import BuyerStandard from '@/modules/home/views/settings/BuyerStandard.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('@ada/design-system', () => ({
  CalculumLoading: { template: '<div />' },
}))

vi.mock('vue-router', () => ({
  onBeforeRouteLeave: vi.fn(),
}))

vi.mock('@/services/router', () => ({
  default: { currentRoute: ref({ name: 'home' }), push: vi.fn() },
}))

// The view reads Routing.admin.* in its template; Vue's render proxy probes the module
// namespace for __v_isRef, and vitest throws on any export the factory did not return.
vi.mock('@/services/router/Routing', () => ({
  __v_isRef: false,
  admin: { adminCompanyInfo: 'adminCompanyInfo' },
}))

vi.mock('@/utils', () => ({
  ObjectUtils: {
    customFiledPatterns: () => /^CUSTOM_/,
    removeKey: (obj: Record<string, unknown>, key: string) => { delete obj[key] },
  },
  removeIRI: (iri: string) => iri.split('/').pop(),
}))

vi.mock('@/utils/FormatData', () => ({
  __v_isRef: false, // namespace import read from the template, see Routing above
  colorText: () => '#000000',
}))

vi.mock('@/utils/BadgeRelated', () => ({
  __v_isRef: false,
  computeLevelClass: () => '',
}))

vi.mock('@/utils/ColorsGroups', () => ({
  firstGroup: ['#111111', '#222222', '#333333'],
}))

vi.mock('@/composables', () => ({
  useCompany: () => ({ companyActiveId: ref('company-uuid') }),
  useUser: () => ({ useFeatureVirtualCard: ref(false) }),
}))

vi.mock('@/composables/useSMEFeature', () => ({
  default: () => ({ featureSMEEnabled: ref(false) }),
}))

vi.mock('@/modules/adminBackend/components/AdminMenuCompany.vue', () => ({ default: { name: 'AdminMenuCompany', template: '<div />' } }))
vi.mock('@/modules/components/filter/CalculumAnalyzeFilter.vue', () => ({ default: { name: 'CalculumAnalyzeFilter', template: '<div />' } }))
vi.mock('@/modules/components/CalculumModal.vue', () => ({ default: { name: 'CalculumModal', template: '<div />' } }))
vi.mock('@/modules/components/CalculumTooltipIcon.vue', () => ({ default: { name: 'CalculumTooltipIcon', template: '<div />' } }))
vi.mock('@/modules/components/badge/BadgeContainer.vue', () => ({ default: { name: 'BadgeContainer', template: '<div />' } }))

// The stub emits exactly what the real PopupComponent emits from changeValue():
// ('change-behavior-level', groupIndex, level).
vi.mock('@/modules/components/popup/PopupComponent.vue', () => ({
  default: {
    name: 'PopupComponentStub',
    props: ['groupIndex', 'levels', 'title', 'levelSelected'],
    emits: ['change-behavior-level'],
    template:
      '<button class="stub-pick-exact" @click="$emit(\'change-behavior-level\', groupIndex, \'exact number\')">pick</button>',
  },
}))

// One saved group, as the API returns it; the view parses it on mount.
const savedGroups = () => [
  {
    '@id': '/api/analyze/buyer_standard_group/1f9f3c1e-0000-4000-8000-000000000001',
    name: 'BSG1, 60D, Group1',
    buyerStandardName: 'Group1',
    paymentTerms: 60,
    priority: 0,
    buyerStandardRules: [],
    buyerStandardGroupBehavior: 'low limit',
  },
]

vi.mock('@/stores/home', () => ({
  useHomeStore: defineStore('home', {
    state: () => ({}),
    actions: {
      getBuyerStandardGroups(params: any) {
        params.callbackSuccess(savedGroups())
      },
      saveBuyerStandardGroups() { /* not exercised here */ },
    },
  }),
}))

vi.mock('@/stores/analyze', () => ({
  useAnalyzeStore: defineStore('analyze', {
    state: () => ({}),
    actions: {
      getRuleFiltersPossibilities(params: any) {
        params.callbackSuccess({})
      },
    },
  }),
}))

async function mountBuyerStandard(spendFileInrecalculation: boolean) {
  const wrapper = mount(BuyerStandard, {
    props: { spendFileInrecalculation },
    global: {
      plugins: [i18n],
      mocks: { $t: (key: string) => key },
    },
  })
  await flushPromises()
  return wrapper
}

const behaviorOf = (wrapper: any) => wrapper.vm.buyerStandardGroups[0].buyerStandardGroupBehavior

describe('Buyer Standard group behavior (AB#19740)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('applies the behavior the popup emits to the group', async () => {
    const wrapper = await mountBuyerStandard(false)

    expect(behaviorOf(wrapper)).toBe('low limit')
    expect(wrapper.text()).toContain('global.limits.lowLimit')

    await wrapper.find('.stub-pick-exact').trigger('click')

    expect(behaviorOf(wrapper)).toBe('exact number')
    expect(wrapper.text()).toContain('global.limits.exactNumber')
    expect(wrapper.text()).not.toContain('global.limits.lowLimit')
  })

  it('ignores the popup while the spend file is recalculating', async () => {
    const wrapper = await mountBuyerStandard(true)

    await wrapper.find('.stub-pick-exact').trigger('click')

    expect(behaviorOf(wrapper)).toBe('low limit')
    expect(wrapper.text()).toContain('global.limits.lowLimit')
  })
})
