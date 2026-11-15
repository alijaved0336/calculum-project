import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive, ref } from 'vue'

const context = reactive({
  companyUuid: 'c-1' as string | null,
  companyName: 'Novonesis' as string | null,
  saleFileVersionId: 73 as number | null,
  hasVersion: true,
})
vi.mock('@/stores/context', () => ({ useContextStore: () => context }))

const session = ref<{ roles?: string[] } | null>({ roles: ['ROLE_COMPANY_ADMIN'] })
vi.mock('@ada/auth', () => ({ useSession: () => ({ session }) }))

const route = reactive({ name: 'setup', params: { tab: 'payment-terms' as string | undefined } })
const router = { replace: vi.fn(), push: vi.fn() }
let leaveGuard: ((to: { name: string }) => boolean | undefined) | null = null
let updateGuard: ((to: { name: string; params: { tab?: string } }) => boolean | undefined) | null = null
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
  onBeforeRouteLeave: (guard: typeof leaveGuard) => { leaveGuard = guard },
  onBeforeRouteUpdate: (guard: typeof updateGuard) => { updateGuard = guard },
}))

// Every tab ready by default so the shell is tested whole; a test can hide one as master does.
const tabReady = vi.hoisted(() => ({ 'payment-terms': true, 'client-standard': true, 'cash-flow': true }))
vi.mock('@/modules/setup/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/setup/api')>()
  return {
    ...actual,
    SETUP_TAB_READY: tabReady,
    setupApi: {
      ...actual.setupApi,
      fetchSetupStatus: vi.fn().mockResolvedValue({ saleFileVersionId: 73, status: 'ready', locked: false, isError: false }),
    },
  }
})

// A section that registers on the Payment Terms tab and can be made dirty from the test.
const dirty = ref(false)
const sectionSave = vi.fn(async () => true)
const sectionDiscard = vi.fn(() => { dirty.value = false })
vi.mock('@/modules/setup/components/SetupStrategies.vue', async () => {
  const { registerSetupSection } = await import('@/modules/setup/composables/useSetupSections')
  return {
    default: defineComponent({
      name: 'SetupStrategies',
      setup() {
        registerSetupSection('payment-terms', { isDirty: dirty, save: sectionSave, discard: sectionDiscard })
        return () => h('div', { class: 'strategies-stub' })
      },
    }),
  }
})
const { stub } = vi.hoisted(() => ({
  stub: async (name: string) => {
    const { defineComponent: define, h: render } = await import('vue')
    return { default: define({ name, render: () => render('div', { class: `${name}-stub` }) }) }
  },
}))
vi.mock('@/modules/setup/components/SetupHarmonizationGroups.vue', () => stub('SetupHarmonizationGroups'))
// The Client Standard tab's own section, so a test can leave edits on a tab other than the open one.
const clientStandardDirty = ref(false)
const clientStandardDiscard = vi.fn(() => { clientStandardDirty.value = false })
const clientStandardSave = vi.fn(async () => true)
vi.mock('@/modules/setup/components/clientStandard/ClientStandardTab.vue', async () => {
  const { registerSetupSection } = await import('@/modules/setup/composables/useSetupSections')
  return {
    default: defineComponent({
      name: 'ClientStandardTab',
      setup() {
        registerSetupSection('client-standard', { isDirty: clientStandardDirty, save: clientStandardSave, discard: clientStandardDiscard })
        return () => h('div', { class: 'ClientStandardTab-stub' })
      },
    }),
  }
})
vi.mock('@/modules/setup/components/SetupCashFlowCalculation.vue', () => stub('SetupCashFlowCalculation'))
vi.mock('@/modules/setup/components/SetupCashFlowImpactLimits.vue', () => stub('SetupCashFlowImpactLimits'))
vi.mock('@/modules/setup/components/SetupLockBanner.vue', () => stub('SetupLockBanner'))

vi.mock('@ada/design-system', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  CalculumLayout: { template: '<div><slot name="slotTop" /><slot name="slotContent" /></div>' },
  CustomTabs: {
    props: ['items', 'modelValue'],
    emits: ['update:modelValue'],
    template: `<div class="tabs"><button v-for="item in items" :key="item.id" type="button" :class="'tab-' + item.id" @click="$emit('update:modelValue', item.id)">{{ item.label }}</button></div>`,
  },
  CustomDialog: {
    props: ['visible', 'title'],
    emits: ['close'],
    template: '<div v-if="visible" class="dialog"><slot /><slot name="actions" /></div>',
  },
  CustomButton: {
    props: ['text'],
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')">{{ text }}</button>',
  },
}))

import SetupView from '@/modules/setup/views/SetupView.vue'
import { i18n } from './setupTestHarness'

function mountView() {
  return mount(SetupView, { global: { plugins: [i18n()] } })
}

/** AB#20702 (impl plan K): the three-tab shell, its access gates and the unsaved-changes prompt. */
describe('SetupView', () => {
  beforeEach(() => {
    session.value = { roles: ['ROLE_COMPANY_ADMIN'] }
    context.companyName = 'Novonesis'
    context.saleFileVersionId = 73
    context.hasVersion = true
    route.params.tab = 'payment-terms'
    tabReady['client-standard'] = true
    tabReady['cash-flow'] = true
    router.replace.mockClear()
    router.push.mockClear()
    dirty.value = false
    sectionSave.mockClear()
    sectionDiscard.mockClear()
    clientStandardDirty.value = false
    clientStandardDiscard.mockClear()
    clientStandardSave.mockClear()
  })

  afterEach(() => {
    leaveGuard = null
    updateGuard = null
  })

  it('refuses an account without an admin role (EF-1)', () => {
    session.value = { roles: ['ROLE_USER'] }
    const wrapper = mountView()
    expect(wrapper.find('[data-test="setup-no-access"]').text()).toBe('You do not have access to Setup')
    expect(wrapper.find('.tabs').exists()).toBe(false)
  })

  it('asks for a sale file when none is selected (EF-2)', () => {
    context.hasVersion = false
    context.saleFileVersionId = null
    const wrapper = mountView()
    expect(wrapper.find('[data-test="setup-no-version"]').text()).toBe('Select a sale file to configure its strategies')
  })

  it("names the three tabs, the second one after the client, with a fallback (AC-01)", () => {
    expect(mountView().find('.tabs').text()).toBe('Payment Terms ReductionNovonesis StandardCash Flow')
    context.companyName = null
    expect(mountView().find('.tabs').text()).toContain('Client Standard')
  })

  it('shows the tab the address names (FR-02)', () => {
    route.params.tab = 'client-standard'
    const wrapper = mountView()
    expect((wrapper.find('[data-test="tab-client-standard"]').element as HTMLElement).style.display).toBe('')
    expect((wrapper.find('[data-test="tab-payment-terms"]').element as HTMLElement).style.display).toBe('none')
  })

  it('hides the tabs whose backend is not ready and falls back to Payment Terms', () => {
    tabReady['client-standard'] = false
    tabReady['cash-flow'] = false
    route.params.tab = 'client-standard'
    const wrapper = mountView()
    expect(wrapper.find('.tabs').text()).toBe('Payment Terms Reduction')
    expect((wrapper.find('[data-test="tab-payment-terms"]').element as HTMLElement).style.display).toBe('')
    expect((wrapper.find('[data-test="tab-client-standard"]').element as HTMLElement).style.display).toBe('none')
    expect(wrapper.find('[data-test="tab-cash-flow"]').exists()).toBe(false)
  })

  it('opens the Cash Flow tab with Cash Flow Calculation above the impact limits (AB#20761)', () => {
    route.params.tab = 'cash-flow'
    const wrapper = mountView()
    const stubs = wrapper.find('[data-test="tab-cash-flow"]').findAll('[class$="-stub"]').map((el) => el.classes()[0])
    expect(stubs).toEqual(['SetupCashFlowCalculation-stub', 'SetupCashFlowImpactLimits-stub'])
  })

  it('switches tab straight away when nothing is unsaved', async () => {
    const wrapper = mountView()
    await wrapper.find('.tab-cash-flow').trigger('click')
    expect(router.replace).toHaveBeenCalledWith({ params: { tab: 'cash-flow' } })
    expect(wrapper.find('[data-test="unsaved-modal"]').exists()).toBe(false)
  })

  it('asks before leaving a tab with unsaved changes: Cancel stays, Discard leaves (AC-11)', async () => {
    const wrapper = mountView()
    dirty.value = true
    await wrapper.find('.tab-cash-flow').trigger('click')
    expect(wrapper.text()).toContain('You have unsaved changes')
    expect(router.replace).not.toHaveBeenCalled()

    await wrapper.findAll('.dialog button').find((b) => b.text() === 'Discard')!.trigger('click')
    expect(sectionDiscard).toHaveBeenCalled()
    expect(router.replace).toHaveBeenCalledWith({ params: { tab: 'cash-flow' } })
  })

  it('saves the dirty section, then moves on, when the prompt answers Save', async () => {
    const wrapper = mountView()
    dirty.value = true
    await wrapper.find('.tab-cash-flow').trigger('click')
    await wrapper.findAll('.dialog button').find((b) => b.text() === 'Save')!.trigger('click')
    await flushPromises()
    expect(sectionSave).toHaveBeenCalled()
    expect(router.replace).toHaveBeenCalledWith({ params: { tab: 'cash-flow' } })
  })

  it('stays on the tab when the save the prompt ran was refused', async () => {
    sectionSave.mockResolvedValueOnce(false)
    const wrapper = mountView()
    dirty.value = true
    await wrapper.find('.tab-cash-flow').trigger('click')
    await wrapper.findAll('.dialog button').find((b) => b.text() === 'Save')!.trigger('click')
    await flushPromises()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('holds a route change away from Setup while something is unsaved', () => {
    mountView()
    dirty.value = true
    expect(leaveGuard!({ name: 'opportunity' })).toBe(false)
    dirty.value = false
    expect(leaveGuard!({ name: 'opportunity' })).toBe(true)
  })

  it('saves or drops only the tab being left; the other tabs keep their edits', async () => {
    const wrapper = mountView()
    dirty.value = true
    clientStandardDirty.value = true
    await wrapper.find('.tab-cash-flow').trigger('click')
    await wrapper.findAll('.dialog button').find((b) => b.text() === 'Discard')!.trigger('click')
    expect(sectionDiscard).toHaveBeenCalled()
    expect(clientStandardDiscard).not.toHaveBeenCalled()
    expect(clientStandardDirty.value).toBe(true)

    dirty.value = true
    await wrapper.find('.tab-cash-flow').trigger('click')
    await wrapper.findAll('.dialog button').find((b) => b.text() === 'Save')!.trigger('click')
    await flushPromises()
    expect(sectionSave).toHaveBeenCalled()
    expect(clientStandardSave).not.toHaveBeenCalled()
  })

  it('holds a tab change made through the address while the open tab is unsaved', async () => {
    const wrapper = mountView()
    dirty.value = true
    expect(updateGuard!({ name: 'setup', params: { tab: 'payment-terms' } })).toBe(true)
    expect(updateGuard!({ name: 'setup', params: { tab: 'cash-flow' } })).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('You have unsaved changes')

    await wrapper.findAll('.dialog button').find((b) => b.text() === 'Discard')!.trigger('click')
    expect(router.replace).toHaveBeenCalledWith({ name: 'setup', params: { tab: 'cash-flow' } })
    expect(updateGuard!({ name: 'setup', params: { tab: 'cash-flow' } })).toBe(true)
  })

  it('asks for every tab when leaving Setup, since it leaves them all', async () => {
    const wrapper = mountView()
    clientStandardDirty.value = true
    expect(leaveGuard!({ name: 'opportunity' })).toBe(false)
    await wrapper.vm.$nextTick()
    await wrapper.findAll('.dialog button').find((b) => b.text() === 'Discard')!.trigger('click')
    expect(clientStandardDiscard).toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith({ name: 'opportunity' })
  })
})
