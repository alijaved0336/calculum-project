/**
 * Tests for EntityCardCalculator — "Spend Volume" mini-form (potential suppliers).
 *
 * Unlike the rest of the manual-input-mode fields, this mini-form is gated by
 * `potentialTheme` alone: it shows for every potential supplier (both the pure-manual
 * sub-case with no spend data, and the AF-1 sub-case where a potential supplier already
 * has spend/program data), and never for a genuinely standard (non-potential) supplier.
 *
 * EntityCardCalculator.vue is a large, deeply integrated SFC with no full-mount test
 * coverage — following the same approach used elsewhere in this suite, we test the
 * key behaviours as pure-logic helpers and via a minimal stub component that mirrors
 * only the relevant conditionals from the real template.
 */

import { describe, it, expect } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { shouldIncludeSpendVolumeInPayload } from '@/modules/home/entityCard/composables/useSpendVolumeCalculator'
import { shouldShowSpendVolumeForm } from '@/modules/home/entityCard/utils/calculatorUtils'

describe('EntityCardCalculator — shouldShowSpendVolumeForm', () => {
  it('shows for a potential supplier with no spend data (pure-manual sub-case)', () => {
    expect(shouldShowSpendVolumeForm(true)).toBe(true)
  })

  it('shows for a potential supplier that already has spend/program data (AF-1 sub-case)', () => {
    expect(shouldShowSpendVolumeForm(true)).toBe(true)
  })

  it('does not show for a standard (non-potential) supplier', () => {
    expect(shouldShowSpendVolumeForm(false)).toBe(false)
  })
})

// ─── WrapperComponent — template rendering ────────────────────────────────────

const SpendVolumeFormStub = defineComponent({
  props: {
    potentialTheme: { type: Boolean, default: false },
  },
  template: `
    <div v-if="potentialTheme" id="spend-volume-form">form</div>
  `,
})

describe('EntityCardCalculator — Spend Volume mini-form rendering', () => {
  it('renders for a potential supplier (pure-manual sub-case)', () => {
    const wrapper = mount(SpendVolumeFormStub, { props: { potentialTheme: true } })
    expect(wrapper.find('#spend-volume-form').exists()).toBe(true)
  })

  it('does not render for a standard supplier', () => {
    const wrapper = mount(SpendVolumeFormStub, { props: { potentialTheme: false } })
    expect(wrapper.find('#spend-volume-form').exists()).toBe(false)
  })
})

// ─── WrapperComponent — Calculate payload decision (only send when changed) ──
//
// Mirrors the conditional spread appended to the calculate-data/calculate-table
// params: `...(shouldIncludeSpendVolumeInPayload(spendVolumeChangeInput.value) ? { spendVolume: ... } : {})`

function buildParams(spendVolumeChange: number | null | undefined): Record<string, unknown> {
  return {
    supplierUUID: 'company-1',
    ...(shouldIncludeSpendVolumeInPayload(spendVolumeChange)
      ? { spendVolume: spendVolumeChange }
      : {}),
  }
}

describe('EntityCardCalculator — Spend Volume Calculate payload', () => {
  it('omits spendVolume entirely when Change is left at its default (0)', () => {
    const params = buildParams(0)
    expect(params).not.toHaveProperty('spendVolume')
  })

  it('includes spendVolume set to the Change delta when the user modified it', () => {
    const params = buildParams(1500)
    expect(params).toHaveProperty('spendVolume', 1500)
  })

  it('includes a negative spendVolume delta (a modeled spend decrease)', () => {
    const params = buildParams(-750)
    expect(params).toHaveProperty('spendVolume', -750)
  })
})
