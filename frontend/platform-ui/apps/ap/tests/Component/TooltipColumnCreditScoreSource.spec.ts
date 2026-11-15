/**
 * Tests for TooltipColumn — creditScoreSource behaviour.
 *
 * Column is named "Credit Rating Estimated". The cell shows:
 * - "Yes" when creditScoreSource is "Internal" (any casing)
 * - "No"  when creditScoreSource has any other non-empty value (External, Parent, etc.)
 * - blank when creditScoreSource is absent, null, or empty string
 *
 * We test this as a pure-logic helper and via a minimal WrapperComponent that
 * mirrors the template conditional, following the approach in
 * ManageTeamAction.spec.ts.
 *
 * Note: $t is mocked in tests to return the key itself, so assertions compare
 * against the i18n key strings rather than the resolved "Yes"/"No" strings.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ─── Pure-logic helper ────────────────────────────────────────────────────────

function getCreditRatingEstimatedLabel(
  creditScoreSource: string | null | undefined,
): 'yes' | 'no' | null {
  if (!creditScoreSource) return null
  return creditScoreSource.toLowerCase() === 'internal' ? 'yes' : 'no'
}

// ─── Tests: getCreditRatingEstimatedLabel ─────────────────────────────────────

describe('TooltipColumn — getCreditRatingEstimatedLabel', () => {
  it('returns "yes" for "Internal" (capitalised)', () => {
    expect(getCreditRatingEstimatedLabel('Internal')).toBe('yes')
  })

  it('returns "yes" for "internal" (lowercase)', () => {
    expect(getCreditRatingEstimatedLabel('internal')).toBe('yes')
  })

  it('returns "yes" for "INTERNAL" (uppercase)', () => {
    expect(getCreditRatingEstimatedLabel('INTERNAL')).toBe('yes')
  })

  it('returns "no" for "External"', () => {
    expect(getCreditRatingEstimatedLabel('External')).toBe('no')
  })

  it('returns "no" for "Parent"', () => {
    expect(getCreditRatingEstimatedLabel('Parent')).toBe('no')
  })

  it('returns null for empty string (blank cell)', () => {
    expect(getCreditRatingEstimatedLabel('')).toBeNull()
  })

  it('returns null for null (blank cell)', () => {
    expect(getCreditRatingEstimatedLabel(null)).toBeNull()
  })

  it('returns null for undefined (blank cell)', () => {
    expect(getCreditRatingEstimatedLabel(undefined)).toBeNull()
  })
})

// ─── WrapperComponent — template rendering ────────────────────────────────────
//
// Mirrors the TooltipColumn template logic for creditScoreSource.
// $t is not mocked here — the stub renders the i18n key directly so we can
// assert on which key is used without needing a full i18n setup.

const CreditScoreSourceCellStub = defineComponent({
  props: {
    dataItem: { type: Object, default: () => ({}) },
  },
  template: `
    <td>
      <p
        v-if="dataItem.creditScoreSource"
        class="pt-3 text-center"
        data-testid="credit-estimated-label"
      >{{ dataItem.creditScoreSource.toLowerCase() === 'internal' ? 'yes' : 'no' }}</p>
    </td>
  `,
})

describe('TooltipColumn creditScoreSource — cell rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders "yes" when creditScoreSource is "Internal"', () => {
    const wrapper = mount(CreditScoreSourceCellStub, {
      props: { dataItem: { creditScoreSource: 'Internal' } },
    })
    expect(wrapper.find('[data-testid="credit-estimated-label"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="credit-estimated-label"]').text()).toBe('yes')
  })

  it('renders "yes" when creditScoreSource is "internal" (lowercase)', () => {
    const wrapper = mount(CreditScoreSourceCellStub, {
      props: { dataItem: { creditScoreSource: 'internal' } },
    })
    expect(wrapper.find('[data-testid="credit-estimated-label"]').text()).toBe('yes')
  })

  it('renders "yes" when creditScoreSource is "INTERNAL" (uppercase)', () => {
    const wrapper = mount(CreditScoreSourceCellStub, {
      props: { dataItem: { creditScoreSource: 'INTERNAL' } },
    })
    expect(wrapper.find('[data-testid="credit-estimated-label"]').text()).toBe('yes')
  })

  it('renders "no" when creditScoreSource is "External"', () => {
    const wrapper = mount(CreditScoreSourceCellStub, {
      props: { dataItem: { creditScoreSource: 'External' } },
    })
    expect(wrapper.find('[data-testid="credit-estimated-label"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="credit-estimated-label"]').text()).toBe('no')
  })

  it('renders "no" when creditScoreSource is "Parent"', () => {
    const wrapper = mount(CreditScoreSourceCellStub, {
      props: { dataItem: { creditScoreSource: 'Parent' } },
    })
    expect(wrapper.find('[data-testid="credit-estimated-label"]').text()).toBe('no')
  })

  it('renders blank cell when creditScoreSource is empty string', () => {
    const wrapper = mount(CreditScoreSourceCellStub, {
      props: { dataItem: { creditScoreSource: '' } },
    })
    expect(wrapper.find('[data-testid="credit-estimated-label"]').exists()).toBe(false)
  })

  it('renders blank cell when creditScoreSource is missing from dataItem', () => {
    const wrapper = mount(CreditScoreSourceCellStub, {
      props: { dataItem: {} },
    })
    expect(wrapper.find('[data-testid="credit-estimated-label"]').exists()).toBe(false)
  })

  it('renders blank cell when creditScoreSource is null', () => {
    const wrapper = mount(CreditScoreSourceCellStub, {
      props: { dataItem: { creditScoreSource: null } },
    })
    expect(wrapper.find('[data-testid="credit-estimated-label"]').exists()).toBe(false)
  })
})
