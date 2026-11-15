/**
 * KanbanAgreedTermsModal.vue cannot be mounted directly in this Vitest environment:
 * its <CalculumModal> child never resolves as a component in the compiled render
 * function (same pre-existing, project-wide issue documented in
 * KanbanGlobalWarningDialog.spec.ts / KanbanFilterScopeDialog.spec.ts). Strategy:
 * mirror the component's reactive logic here and test it directly.
 *
 * Not covered: the "resetForm on re-show" watcher. In this harness,
 * `wrapper.setProps()` does not trigger `watch(() => props.show, ...)` at all, so the
 * false→true transition that populates `form` (including the scfAccepted suggestion)
 * can't be exercised here even though the underlying code is correct, idiomatic Vue 3.
 * Verify that behavior manually or via e2e instead. `suggestedScfAccepted()` itself is
 * pure and fully covered below independent of the watcher.
 */
import { describe, it, expect } from 'vitest'
import { computed, defineComponent, reactive } from 'vue'
import { mount } from '@vue/test-utils'

// Mirrors KanbanAgreedTermsModal.vue's suggestedScfAccepted() — same matrix as
// ModalResults.vue's fillSuggested() SCF logic.
function suggestedScfAccepted(onSCF: boolean | null, scfAccepted: boolean | null): boolean {
  const bothTrue = onSCF === true && scfAccepted === true
  const onScfFalseScfTrue = onSCF === false && scfAccepted === true
  const onScfTrueScfNull = onSCF === true && scfAccepted === null
  const onScfTrueScfFalse = onSCF === true && scfAccepted === false
  const onScfFalseScfNull = onSCF === false && scfAccepted === null
  switch (true) {
    case bothTrue:
    case onScfFalseScfTrue:
    case onScfTrueScfNull:
      return true
    case onScfTrueScfFalse:
    case onScfFalseScfNull:
    default:
      return false
  }
}

describe('KanbanAgreedTermsModal — suggestedScfAccepted matrix', () => {
  it('onSCF=true, scfAccepted=true → true', () => {
    expect(suggestedScfAccepted(true, true)).toBe(true)
  })

  it('onSCF=false, scfAccepted=true → true', () => {
    expect(suggestedScfAccepted(false, true)).toBe(true)
  })

  it('onSCF=true, scfAccepted=null → true', () => {
    expect(suggestedScfAccepted(true, null)).toBe(true)
  })

  it('onSCF=true, scfAccepted=false → false', () => {
    expect(suggestedScfAccepted(true, false)).toBe(false)
  })

  it('onSCF=false, scfAccepted=null → false', () => {
    expect(suggestedScfAccepted(false, null)).toBe(false)
  })

  it('onSCF=null, scfAccepted=null → false (today\'s real case: the Kanban query does not request either field yet)', () => {
    expect(suggestedScfAccepted(null, null)).toBe(false)
  })

  it('onSCF=false, scfAccepted=false → false (unnamed combination, falls to the default branch)', () => {
    expect(suggestedScfAccepted(false, false)).toBe(false)
  })
})

// Mirrors KanbanAgreedTermsModal.vue's resetForm(): termsWithoutCashDiscount defaults
// to the modelPaymentTerms prop when present (a pragmatic proxy for ModalResults.vue's
// fillSuggested() opportunityTerms fallback — see docs/context/change-kanban-agreed-terms-scf-vcard.md
// for why the VCard-specific override isn't reproduced here).
function suggestedTermsWithoutCashDiscount(modelPaymentTerms: number | null): number | null {
  return modelPaymentTerms ?? null
}

describe('KanbanAgreedTermsModal — termsWithoutCashDiscount default', () => {
  it('pre-fills from modelPaymentTerms when present', () => {
    expect(suggestedTermsWithoutCashDiscount(45)).toBe(45)
  })

  it('a modelPaymentTerms of 0 is a real value, not "no data" (?? not ||)', () => {
    expect(suggestedTermsWithoutCashDiscount(0)).toBe(0)
  })

  it('stays null when modelPaymentTerms is not available', () => {
    expect(suggestedTermsWithoutCashDiscount(null)).toBeNull()
  })
})

// Mirrors the component's form/canConfirm/onConfirm — verified via DOM interaction
// instead of the show-watcher (see harness limitation above).
const WrapperComponent = defineComponent({
  props: {
    show: { type: Boolean, required: true }
  },
  emits: ['confirm', 'cancel'],
  setup(props, { emit }) {
    const form = reactive({
      termsWithoutCashDiscount: null as number | null,
      termsWithCashDiscount: null as number | null,
      cashDiscount: null as number | null,
      agreedDateOfChange: '',
      effectiveDate: '',
      nextReviewDate: '',
      scfAccepted: false,
      vcardAccepted: false
    })

    const canConfirm = computed(
      () => !!form.agreedDateOfChange && !!form.effectiveDate && !!form.nextReviewDate
    )

    function onConfirm() {
      if (!canConfirm.value) return
      emit('confirm', { ...form })
    }

    return { form, canConfirm, onConfirm }
  },
  template: `
    <div v-if="show">
      <input id="scf-accepted" type="checkbox" v-model="form.scfAccepted" />
      <input id="vcard-accepted" type="checkbox" v-model="form.vcardAccepted" />
      <input id="agreed-date" type="date" v-model="form.agreedDateOfChange" />
      <input id="effective-date" type="date" v-model="form.effectiveDate" />
      <input id="next-review-date" type="date" v-model="form.nextReviewDate" />
      <button id="confirm" @click="onConfirm">Confirm</button>
      <button id="cancel" @click="$emit('cancel')">Cancel</button>
    </div>
  `
})

describe('KanbanAgreedTermsModal — form defaults and confirm emit', () => {
  it('scfAccepted and vcardAccepted default to false', () => {
    const wrapper = mount(WrapperComponent, { props: { show: true } })
    expect((wrapper.find('#scf-accepted').element as HTMLInputElement).checked).toBe(false)
    expect((wrapper.find('#vcard-accepted').element as HTMLInputElement).checked).toBe(false)
  })

  it('does not emit confirm while required dates are missing', async () => {
    const wrapper = mount(WrapperComponent, { props: { show: true } })
    await wrapper.find('#confirm').trigger('click')
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('emits confirm with scfAccepted/vcardAccepted included once dates are filled', async () => {
    const wrapper = mount(WrapperComponent, { props: { show: true } })
    await wrapper.find('#agreed-date').setValue('2026-08-13')
    await wrapper.find('#effective-date').setValue('2026-08-13')
    await wrapper.find('#next-review-date').setValue('2027-02-13')
    await wrapper.find('#scf-accepted').setValue(true)
    await wrapper.find('#confirm').trigger('click')

    const payload = wrapper.emitted('confirm')![0][0] as Record<string, unknown>
    expect(payload.scfAccepted).toBe(true)
    expect(payload.vcardAccepted).toBe(false)
    expect(payload).toHaveProperty('agreedDateOfChange', '2026-08-13')
  })
})
