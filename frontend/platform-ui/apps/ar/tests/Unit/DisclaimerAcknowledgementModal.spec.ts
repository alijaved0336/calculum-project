import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

const fetchDisclaimerAcknowledgementStatus = vi.fn()
const acknowledgeDisclaimer = vi.fn()

vi.mock('@/api/disclaimerAcknowledgement', () => ({
  fetchDisclaimerAcknowledgementStatus: (...args: unknown[]) => fetchDisclaimerAcknowledgementStatus(...args),
  acknowledgeDisclaimer: (...args: unknown[]) => acknowledgeDisclaimer(...args),
}))

/**
 * Stubs, not a real mount: `CustomDialog` wraps Kendo's own `Dialog`, whose focus-management and
 * portal behavior belong to a design-system-level test, not this component's. What this suite
 * asserts is THIS component's own logic - the watch trigger, the accordion toggle, the checkbox
 * gating Continue, and what a click on Continue (or its failure) does - all of which survives a
 * plain stub. `CustomButton`'s stub renders a plain `<button>` for BOTH the accordion trigger and
 * the Continue action - `class` fallthrough onto that root element is what lets tests tell them
 * apart via the component's own `disclaimer-modal__*` classes rather than relying on DOM order.
 */
vi.mock('@ada/design-system', () => ({
  CustomDialog: {
    name: 'CustomDialog',
    props: ['visible', 'title'],
    template: '<div v-if="visible" class="dialog"><slot /><slot name="actions" /></div>',
  },
  BodyText: { template: '<span><slot /></span>' },
  CheckBox: {
    props: ['modelValue', 'label'],
    emits: ['update:modelValue'],
    template: '<label class="checkbox"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />{{ label }}</label>',
  },
  CustomButton: {
    props: ['text', 'disabled'],
    emits: ['click'],
    template: '<button class="custom-button" :disabled="disabled" @click="$emit(\'click\')">{{ text }}</button>',
  },
}))

import DisclaimerAcknowledgementModal from '@/components/DisclaimerAcknowledgementModal.vue'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      arDisclaimer: {
        title: 'Credit ratings and limits are estimates',
        summary: 'They are estimates for information only.',
        readFullDisclaimer: 'Read full disclaimer',
        legalHeading: 'Credit Rating & Credit Limit Legal Disclaimer and Notice',
        paragraph1: 'Credit rating and credit limit paragraph one.',
        paragraph2: 'Credit rating and credit limit paragraph two.',
        checkboxLabel: 'I understand these figures are estimates.',
        helperText: 'Tick the box above to continue.',
        continueButton: 'Continue',
        errorMessage: 'Something went wrong.',
      },
    },
  },
})

const USER = { email: 'a@calculum.ai', idps: 'x', authenticationSource: 'x', sessionExpiresAt: 0 }

function mountModal() {
  return mount(DisclaimerAcknowledgementModal, { global: { plugins: [i18n] } })
}

function continueButton(wrapper: ReturnType<typeof mountModal>) {
  return wrapper.find('.disclaimer-modal__continue-btn')
}

describe('DisclaimerAcknowledgementModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchDisclaimerAcknowledgementStatus.mockReset()
    acknowledgeDisclaimer.mockReset()
  })

  it('AB#20327: does not check status (or show anything) before a user is set', async () => {
    const wrapper = mountModal()
    await flushPromises()

    expect(fetchDisclaimerAcknowledgementStatus).not.toHaveBeenCalled()
    expect(wrapper.find('.dialog').exists()).toBe(false)
  })

  it('AB#20327: shows the modal once the user resolves and the disclaimer is owed', async () => {
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })
    const wrapper = mountModal()

    useArCurrentUserStore().setUser(USER)
    await flushPromises()

    expect(fetchDisclaimerAcknowledgementStatus).toHaveBeenCalledOnce()
    expect(wrapper.find('.dialog').exists()).toBe(true)
  })

  it('AB#20327: does not show the modal when the disclaimer is not owed', async () => {
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: false })
    const wrapper = mountModal()

    useArCurrentUserStore().setUser(USER)
    await flushPromises()

    expect(wrapper.find('.dialog').exists()).toBe(false)
  })

  it('AB#20327: fails closed - a status-check failure shows the modal rather than silently letting the user in', async () => {
    fetchDisclaimerAcknowledgementStatus.mockRejectedValue(new Error('network'))
    const wrapper = mountModal()

    useArCurrentUserStore().setUser(USER)
    await flushPromises()

    expect(wrapper.find('.dialog').exists()).toBe(true)
  })

  it('AB#20327: does not re-check (or re-open) on a later setUser call replacing the user object', async () => {
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })
    const wrapper = mountModal()
    const store = useArCurrentUserStore()

    store.setUser(USER)
    await flushPromises()
    await wrapper.find('.checkbox input').setValue(true)
    await continueButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.find('.dialog').exists()).toBe(false)

    // A session-validation refresh replacing the user object (e.g. a new sessionExpiresAt) must
    // not re-trigger the check - if it did, a transient failure here would re-open the modal via
    // the fail-closed branch even though this user already acknowledged it this session.
    fetchDisclaimerAcknowledgementStatus.mockRejectedValue(new Error('network'))
    store.setUser({ ...USER, sessionExpiresAt: 12345 })
    await flushPromises()

    expect(fetchDisclaimerAcknowledgementStatus).toHaveBeenCalledOnce()
    expect(wrapper.find('.dialog').exists()).toBe(false)
  })

  it('AB#20327: re-checks after a sign-out followed by another sign-in in the same SPA session', async () => {
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: false })
    const wrapper = mountModal()
    const store = useArCurrentUserStore()

    store.setUser(USER)
    await flushPromises()
    expect(wrapper.find('.dialog').exists()).toBe(false)

    // A different user signing in after `clear()` must get their own check, not inherit the
    // previous user's "already checked".
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })
    store.clear()
    await flushPromises()
    store.setUser({ ...USER, email: 'b@calculum.ai' })
    await flushPromises()

    expect(fetchDisclaimerAcknowledgementStatus).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.dialog').exists()).toBe(true)
  })

  it('AB#20327: resets the checkbox/error state for a new user, not just the status check', async () => {
    // Review finding (PR 14956): re-arming the check for a second user was pointless if this
    // component's own local state - the checkbox, the error text, the accordion - still belonged
    // to the first user. Left unreset, user B's modal could open already ticked and Continue
    // already enabled, defeating the acknowledgment this component exists to enforce.
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })
    acknowledgeDisclaimer.mockResolvedValue(undefined)
    const wrapper = mountModal()
    const store = useArCurrentUserStore()
    store.setUser(USER)
    await flushPromises()

    await wrapper.find('.checkbox input').setValue(true)
    await continueButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.find('.dialog').exists()).toBe(false)

    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })
    store.clear()
    await flushPromises()
    store.setUser({ ...USER, email: 'b@calculum.ai' })
    await flushPromises()

    expect(wrapper.find('.dialog').exists()).toBe(true)
    expect((wrapper.find('.checkbox input').element as HTMLInputElement).checked).toBe(false)
    expect(continueButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('AB#20327: re-checks a coalesced clear+setUser (no await between them, same flush)', async () => {
    // Review finding (PR 14956): Vue's default watcher flush batches every synchronous mutation
    // of the watched source within one tick into a single callback carrying only the NET change.
    // A clear() immediately followed by setUser(next) with no await between them (a plausible
    // defensive pattern in a future SPA sign-in handler) would deliver (next, <previous user>)
    // straight through with the null in between never observed, defeating the re-arm entirely -
    // this is the one case the "await flushPromises() between clear() and setUser()" test above
    // does not cover.
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: false })
    const wrapper = mountModal()
    const store = useArCurrentUserStore()
    store.setUser(USER)
    await flushPromises()
    fetchDisclaimerAcknowledgementStatus.mockClear()
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })

    store.clear()
    store.setUser({ ...USER, email: 'b@calculum.ai' })
    await flushPromises()

    expect(fetchDisclaimerAcknowledgementStatus).toHaveBeenCalledOnce()
    expect(wrapper.find('.dialog').exists()).toBe(true)
  })

  it('AB#20327: checks status when the store already has a user before the modal mounts', async () => {
    // Review finding (PR 14956): the immediate watcher's own oldValue is undefined on its very
    // first invocation regardless of the store's history, so an already-set user at mount time
    // (e.g. persisted state rehydrated before this component ever mounts) still gets checked -
    // this pins that down as a regression guard against future changes to the watcher's guard.
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })
    const store = useArCurrentUserStore()
    store.setUser(USER)

    const wrapper = mountModal()
    await flushPromises()

    expect(fetchDisclaimerAcknowledgementStatus).toHaveBeenCalledOnce()
    expect(wrapper.find('.dialog').exists()).toBe(true)
  })

  it('AB#20327: Continue stays disabled until the checkbox is checked', async () => {
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })
    const wrapper = mountModal()
    useArCurrentUserStore().setUser(USER)
    await flushPromises()

    expect(continueButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.find('.checkbox input').setValue(true)
    expect(continueButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('AB#20327: AC-03 - clicking Continue records the acknowledgment and closes the modal', async () => {
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })
    acknowledgeDisclaimer.mockResolvedValue(undefined)
    const wrapper = mountModal()
    useArCurrentUserStore().setUser(USER)
    await flushPromises()

    await wrapper.find('.checkbox input').setValue(true)
    await continueButton(wrapper).trigger('click')
    await flushPromises()

    expect(acknowledgeDisclaimer).toHaveBeenCalledOnce()
    expect(wrapper.find('.dialog').exists()).toBe(false)
  })

  it('AB#20327: EF-1 - a failed acknowledgment keeps the modal open and shows the error text', async () => {
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })
    acknowledgeDisclaimer.mockRejectedValue(new Error('network'))
    const wrapper = mountModal()
    useArCurrentUserStore().setUser(USER)
    await flushPromises()

    await wrapper.find('.checkbox input').setValue(true)
    await continueButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.find('.dialog').exists()).toBe(true)
    expect(wrapper.text()).toContain('Something went wrong.')
  })

  it('AB#20327: AC-02 - nothing in this component ever tells CustomDialog to close on its own (no update:visible/close listener)', () => {
    const wrapper = mountModal()
    const dialogVNode = wrapper.findComponent({ name: 'CustomDialog' })
    // The stub's own emitted events are irrelevant here - what matters is this component's
    // template never listens for them, which `attrs`/listeners on the real component confirms.
    expect(Object.keys(dialogVNode.vm.$attrs)).not.toContain('onUpdate:visible')
    expect(Object.keys(dialogVNode.vm.$attrs)).not.toContain('onClose')
  })

  it('the "Read full disclaimer" accordion toggles the full legal text without a second modal', async () => {
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })
    const wrapper = mountModal()
    useArCurrentUserStore().setUser(USER)
    await flushPromises()

    // `v-show` toggles the element's own inline `display: none` - asserted directly rather than
    // via `isVisible()`, which walks ancestor `getComputedStyle` and jsdom reports `display: none`
    // for any element not attached to `document` (which `mount()` doesn't do by default here).
    const fullText = wrapper.find('#disclaimer-modal-full-text')
    expect(fullText.attributes('style')).toContain('display: none')

    await wrapper.find('.disclaimer-modal__accordion-trigger').trigger('click')
    expect(fullText.attributes('style')).not.toContain('display: none')
    expect(fullText.text()).toContain('Credit rating and credit limit paragraph one.')

    await wrapper.find('.disclaimer-modal__accordion-trigger').trigger('click')
    expect(fullText.attributes('style')).toContain('display: none')
  })

  it('clicking anywhere in the checkbox box (not just the square) toggles acknowledgment', async () => {
    fetchDisclaimerAcknowledgementStatus.mockResolvedValue({ owed: true })
    const wrapper = mountModal()
    useArCurrentUserStore().setUser(USER)
    await flushPromises()

    const box = wrapper.find('.disclaimer-modal__checkbox-box')
    expect(box.classes()).not.toContain('disclaimer-modal__checkbox-box--checked')

    await box.trigger('click')
    expect((wrapper.find('.checkbox input').element as HTMLInputElement).checked).toBe(true)
    expect(box.classes()).toContain('disclaimer-modal__checkbox-box--checked')

    await box.trigger('click')
    expect((wrapper.find('.checkbox input').element as HTMLInputElement).checked).toBe(false)
    expect(box.classes()).not.toContain('disclaimer-modal__checkbox-box--checked')
  })
})
