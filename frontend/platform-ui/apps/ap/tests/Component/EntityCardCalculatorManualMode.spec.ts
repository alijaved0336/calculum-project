/**
 * Tests for EntityCardCalculator — manual-input mode (potential suppliers with no spend data).
 *
 * EntityCardCalculator.vue is a large, deeply integrated SFC (store/API/i18n/Kendo
 * dependencies) with no existing test coverage. Following the same approach used in
 * EntityCardTextArc.spec.ts, we test the key behaviours as pure-logic helpers (fast,
 * no DOM) and via minimal stub components that mirror only the relevant conditionals
 * from the real template, rather than mounting the full component.
 */

import { describe, it, expect } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import {
  MANUAL_CALCULATOR_DEFAULTS,
  validateManualCalculatorFields,
  createManualCalculatorFieldErrors,
} from '@/modules/home/entityCard/composables/useManualCalculatorValidation'
import { isManualInputMode } from '@/modules/home/entityCard/utils/calculatorUtils'

describe('EntityCardCalculator — isManualInputMode', () => {
  it('is true for a potential supplier with no program', () => {
    expect(isManualInputMode(true, '')).toBe(true)
  })

  it('is false for a standard-looking card that has no programUuid (not a potential supplier)', () => {
    expect(isManualInputMode(false, '')).toBe(false)
  })

  it('is false for a standard supplier with a resolved programUuid', () => {
    expect(isManualInputMode(false, '/api/programs/123')).toBe(false)
  })

  it('is false for a potential supplier that already has a resolved programUuid (AF-1 — behaves like a standard supplier)', () => {
    expect(isManualInputMode(true, '/api/programs/123')).toBe(false)
  })
})

// ─── WrapperComponent — controls hidden in manual mode (AC-04, AC-05, AC-11) ──

const CalculatorControlsStub = defineComponent({
  props: {
    isManualInputMode: { type: Boolean, default: false },
    loadingSpends: { type: Boolean, default: false },
    tabsLength: { type: Number, default: 0 },
    showScenarios: { type: Boolean, default: false },
  },
  template: `
    <div>
      <div v-if="!isManualInputMode && !loadingSpends" id="tab-strip-wrapper">
        <div v-if="tabsLength > 1" id="tab-strip">tabs</div>
      </div>
      <button v-if="!isManualInputMode && !loadingSpends" id="show-hide-scenarios-btn">Show/Hide Scenarios</button>
      <div v-if="!isManualInputMode" id="actions-dropdown">actions</div>
      <div v-if="showScenarios && !isManualInputMode" id="scenarios-panel">scenarios</div>
    </div>
  `,
})

describe('EntityCardCalculator — controls hidden in manual mode', () => {
  it('shows tab-strip wrapper, show/hide-scenarios button, and actions dropdown for a standard supplier', () => {
    const wrapper = mount(CalculatorControlsStub, {
      props: { isManualInputMode: false, loadingSpends: false, tabsLength: 2 },
    })

    expect(wrapper.find('#tab-strip-wrapper').exists()).toBe(true)
    expect(wrapper.find('#show-hide-scenarios-btn').exists()).toBe(true)
    expect(wrapper.find('#actions-dropdown').exists()).toBe(true)
  })

  it('hides tab-strip wrapper, show/hide-scenarios button, and actions dropdown in manual mode', () => {
    const wrapper = mount(CalculatorControlsStub, {
      props: { isManualInputMode: true, loadingSpends: false, tabsLength: 2 },
    })

    expect(wrapper.find('#tab-strip-wrapper').exists()).toBe(false)
    expect(wrapper.find('#show-hide-scenarios-btn').exists()).toBe(false)
    expect(wrapper.find('#actions-dropdown').exists()).toBe(false)
  })

  it('hides the scenarios side panel in manual mode even if showScenarios is somehow true', () => {
    const wrapper = mount(CalculatorControlsStub, {
      props: { isManualInputMode: true, showScenarios: true },
    })

    expect(wrapper.find('#scenarios-panel').exists()).toBe(false)
  })
})

// ─── WrapperComponent — defaults + validation + Calculate gating (AC-03, AC-09) ─
//
// Mirrors calculatorApplyOnClick's manual-mode branch: validate, then either emit
// 'calculate' (valid) or 'invalid' with the per-field errors (blocked, AC-09).
// Following this codebase's own convention for click-driven tests (see
// ManageTeamAction.spec.ts / SpendFileNewVersionBanner.spec.ts), assertions are made
// on emitted events rather than on post-click DOM re-render.

const ManualInputsStub = defineComponent({
  props: {
    supplierWacc: { type: Number as () => number | null, default: MANUAL_CALCULATOR_DEFAULTS.supplierWacc },
    supplierTaxRate: { type: Number as () => number | null, default: MANUAL_CALCULATOR_DEFAULTS.supplierTaxRate },
    contractualPaymentTerms: { type: Number as () => number | null, default: MANUAL_CALCULATOR_DEFAULTS.contractualPaymentTerms },
    changeInTerms: { type: Number as () => number | null, default: MANUAL_CALCULATOR_DEFAULTS.changeInTerms },
    priceChange: { type: Number as () => number | null, default: MANUAL_CALCULATOR_DEFAULTS.priceChange },
  },
  emits: ['calculate', 'invalid'],
  setup(props, { emit }) {
    function onCalculateClick() {
      const { valid, errors } = validateManualCalculatorFields({
        supplierWacc: props.supplierWacc,
        supplierTaxRate: props.supplierTaxRate,
        contractualPaymentTerms: props.contractualPaymentTerms,
        changeInTerms: props.changeInTerms,
        priceChange: props.priceChange,
      })

      if (!valid) {
        emit('invalid', errors)
        return
      }

      emit('calculate')
    }

    return { onCalculateClick }
  },
  template: `<button data-testid="calculate-btn" @click="onCalculateClick">Calculate</button>`,
})

describe('EntityCardCalculator — manual-mode defaults', () => {
  it('pre-fills all five fields with the spec defaults', () => {
    expect(MANUAL_CALCULATOR_DEFAULTS.supplierWacc).toBe(0.09)
    expect(MANUAL_CALCULATOR_DEFAULTS.supplierTaxRate).toBe(0.35)
    expect(MANUAL_CALCULATOR_DEFAULTS.contractualPaymentTerms).toBe(0)
    expect(MANUAL_CALCULATOR_DEFAULTS.changeInTerms).toBe(0)
    expect(MANUAL_CALCULATOR_DEFAULTS.priceChange).toBe(0)
  })
})

describe('EntityCardCalculator — manual-mode Calculate validation (AC-09)', () => {
  it('emits calculate when all fields are valid', async () => {
    const wrapper = mount(ManualInputsStub)

    await wrapper.get('[data-testid="calculate-btn"]').trigger('click')

    expect(wrapper.emitted('calculate')).toHaveLength(1)
    expect(wrapper.emitted('invalid')).toBeFalsy()
  })

  it('emits invalid with the field errors instead of calculate when a required field is blank', async () => {
    const wrapper = mount(ManualInputsStub, { props: { priceChange: null } })

    await wrapper.get('[data-testid="calculate-btn"]').trigger('click')

    expect(wrapper.emitted('calculate')).toBeFalsy()
    const invalidEmissions = wrapper.emitted('invalid')
    expect(invalidEmissions).toHaveLength(1)
    expect((invalidEmissions![0][0] as ReturnType<typeof createManualCalculatorFieldErrors>).priceChange).toBe(true)
  })

  it('emits invalid when a field is non-numeric (NaN)', async () => {
    const wrapper = mount(ManualInputsStub, { props: { supplierWacc: NaN } })

    await wrapper.get('[data-testid="calculate-btn"]').trigger('click')

    expect(wrapper.emitted('calculate')).toBeFalsy()
    expect(wrapper.emitted('invalid')).toHaveLength(1)
  })

  it('allows re-calculating multiple times with updated values (AC-07)', async () => {
    const wrapper = mount(ManualInputsStub)

    await wrapper.get('[data-testid="calculate-btn"]').trigger('click')
    await wrapper.setProps({ changeInTerms: 30 })
    await wrapper.get('[data-testid="calculate-btn"]').trigger('click')

    expect(wrapper.emitted('calculate')).toHaveLength(2)
  })
})

// ─── WrapperComponent — inline error banner preserves inputs (EF-1, AC-10) ────

const ManualErrorBannerStub = defineComponent({
  props: {
    isManualInputMode: { type: Boolean, default: true },
    errorMessage: { type: String as () => string | null, default: null },
  },
  template: `
    <div class="alert alert-danger mt-2" v-if="isManualInputMode && errorMessage" role="alert">
      <span class="text-sm">{{ errorMessage }}</span>
    </div>
  `,
})

describe('EntityCardCalculator — manual-mode API error banner', () => {
  it('does not render when there is no error', () => {
    const wrapper = mount(ManualErrorBannerStub, { props: { errorMessage: null } })
    expect(wrapper.find('.alert-danger').exists()).toBe(false)
  })

  it('renders the error message inline when the calculation call fails', () => {
    const wrapper = mount(ManualErrorBannerStub, { props: { errorMessage: 'Something went wrong.' } })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(wrapper.find('.alert-danger').text()).toBe('Something went wrong.')
  })
})
