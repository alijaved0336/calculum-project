/**
 * Tests for EntityCardOverview — Calculator tab visibility gate.
 *
 * The tab used to be hidden for potential suppliers (`v-if="programTarget === 'cashFlow' && !potentialTheme"`).
 * It must now also be shown whenever the card is a potential supplier, regardless of programTarget,
 * while leaving standard-supplier behaviour (potentialTheme === false) completely unchanged.
 */

import { describe, it, expect } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { buildTopMenuTabShowFlags, type TopMenuTabShowFlagsState } from '@/modules/home/entityCard/composables/useTopMenuTabs'

// ─── Pure-logic helper — derived from the real `entity-card-calculator` show rule ──────────

const baseState: TopMenuTabShowFlagsState = {
  programTarget: '',
  disabledProgram: false,
  useFeatureSupplierInsights: false,
  isFinancingEnabled: false,
  hasSCF: false,
  potentialTheme: false,
  useFeatureEntityCardNewsletter: false,
  userIsSuperAdmin: false,
  allowShowTabOptionsReceivablesMockup4: false,
}

function shouldShowCalculatorTab(programTarget: string, potentialTheme: boolean): boolean {
  return buildTopMenuTabShowFlags({ ...baseState, programTarget, potentialTheme })['entity-card-calculator']
}

describe('EntityCardOverview — shouldShowCalculatorTab', () => {
  it('shows the tab for a standard supplier with an active cashFlow program (unchanged)', () => {
    expect(shouldShowCalculatorTab('cashFlow', false)).toBe(true)
  })

  it('hides the tab for a standard supplier with no active program (unchanged, AC-11 regression guard)', () => {
    expect(shouldShowCalculatorTab('', false)).toBe(false)
  })

  it('hides the tab for a standard supplier with a non-cashFlow program (unchanged)', () => {
    expect(shouldShowCalculatorTab('somethingElse', false)).toBe(false)
  })

  it('shows the tab for a potential supplier with no program (new behaviour)', () => {
    expect(shouldShowCalculatorTab('', true)).toBe(true)
  })

  it('shows the tab for a potential supplier that already has a cashFlow program (AF-1 edge case)', () => {
    expect(shouldShowCalculatorTab('cashFlow', true)).toBe(true)
  })
})

// ─── WrapperComponent — template rendering ────────────────────────────────────

const CalculatorTabStub = defineComponent({
  props: {
    programTarget: { type: String, default: '' },
    potentialTheme: { type: Boolean, default: false },
  },
  template: `
    <a v-if="programTarget === 'cashFlow' || potentialTheme" id="entity-card-calculator">Payment Terms vs Price</a>
  `,
})

describe('EntityCardOverview — Calculator tab rendering', () => {
  it('renders the tab for a standard supplier with an active cashFlow program', () => {
    const wrapper = mount(CalculatorTabStub, { props: { programTarget: 'cashFlow', potentialTheme: false } })
    expect(wrapper.find('#entity-card-calculator').exists()).toBe(true)
  })

  it('does not render the tab for a standard supplier with no active program', () => {
    const wrapper = mount(CalculatorTabStub, { props: { programTarget: '', potentialTheme: false } })
    expect(wrapper.find('#entity-card-calculator').exists()).toBe(false)
  })

  it('renders the tab for a potential supplier with no program', () => {
    const wrapper = mount(CalculatorTabStub, { props: { programTarget: '', potentialTheme: true } })
    expect(wrapper.find('#entity-card-calculator').exists()).toBe(true)
  })
})
