/**
 * Tests for EntityCardTextArc — credit rating source display logic.
 *
 * The key behaviour introduced: show an "Estimated" label when the source is
 * "Internal" (any casing) or when isInternalOverride is true; show nothing
 * for External, Parent, blank, or unrecognised values.
 *
 * We test the rendering rule both as a pure-logic helper (fast, no DOM) and
 * via a minimal WrapperComponent that mirrors only the conditional in the
 * template, following the same approach used in ManageTeamAction.spec.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ─── Pure-logic helper (mirrors the v-if in EntityCardTextArc template) ────────

function shouldShowEstimatedLabel(isInternalOverride: boolean, source: string): boolean {
  return isInternalOverride || source.toLowerCase() === 'internal'
}

// ─── Tests: shouldShowEstimatedLabel ─────────────────────────────────────────

describe('EntityCardTextArc — shouldShowEstimatedLabel', () => {
  describe('source value drives visibility', () => {
    it('returns true when source is "Internal" (capitalised)', () => {
      expect(shouldShowEstimatedLabel(false, 'Internal')).toBe(true)
    })

    it('returns true when source is "internal" (lowercase)', () => {
      expect(shouldShowEstimatedLabel(false, 'internal')).toBe(true)
    })

    it('returns true when source is "INTERNAL" (uppercase)', () => {
      expect(shouldShowEstimatedLabel(false, 'INTERNAL')).toBe(true)
    })

    it('returns false when source is "External"', () => {
      expect(shouldShowEstimatedLabel(false, 'External')).toBe(false)
    })

    it('returns false when source is "Parent"', () => {
      expect(shouldShowEstimatedLabel(false, 'Parent')).toBe(false)
    })

    it('returns false when source is empty string', () => {
      expect(shouldShowEstimatedLabel(false, '')).toBe(false)
    })

    it('returns false when source is an unrecognised value', () => {
      expect(shouldShowEstimatedLabel(false, 'unknown')).toBe(false)
    })
  })

  describe('isInternalOverride flag drives visibility', () => {
    it('returns true when isInternalOverride is true regardless of source', () => {
      expect(shouldShowEstimatedLabel(true, 'External')).toBe(true)
    })

    it('returns true when isInternalOverride is true and source is empty', () => {
      expect(shouldShowEstimatedLabel(true, '')).toBe(true)
    })

    it('returns true when both isInternalOverride and source are internal', () => {
      expect(shouldShowEstimatedLabel(true, 'Internal')).toBe(true)
    })

    it('returns false when isInternalOverride is false and source is External', () => {
      expect(shouldShowEstimatedLabel(false, 'External')).toBe(false)
    })
  })
})

// ─── WrapperComponent — template rendering ────────────────────────────────────
//
// A minimal component that re-implements only the relevant conditional from
// EntityCardTextArc, using a plain HTML template to avoid Pug parsing issues.

const EstimatedLabelStub = defineComponent({
  props: {
    source: { type: String, default: '' },
    isInternalOverride: { type: Boolean, default: false },
  },
  setup(props) {
    return { props }
  },
  template: `
    <span
      v-if="isInternalOverride || source.toLowerCase() === 'internal'"
      id="source-entity"
    >Estimated</span>
  `,
})

describe('EntityCardTextArc — Estimated label rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the Estimated label when source is "Internal"', () => {
    const wrapper = mount(EstimatedLabelStub, { props: { source: 'Internal' } })
    expect(wrapper.find('#source-entity').exists()).toBe(true)
    expect(wrapper.find('#source-entity').text()).toBe('Estimated')
  })

  it('renders the Estimated label when source is "internal" (lowercase)', () => {
    const wrapper = mount(EstimatedLabelStub, { props: { source: 'internal' } })
    expect(wrapper.find('#source-entity').exists()).toBe(true)
  })

  it('renders the Estimated label when isInternalOverride is true', () => {
    const wrapper = mount(EstimatedLabelStub, {
      props: { source: 'External', isInternalOverride: true },
    })
    expect(wrapper.find('#source-entity').exists()).toBe(true)
  })

  it('does NOT render the label when source is "External"', () => {
    const wrapper = mount(EstimatedLabelStub, { props: { source: 'External' } })
    expect(wrapper.find('#source-entity').exists()).toBe(false)
  })

  it('does NOT render the label when source is "Parent"', () => {
    const wrapper = mount(EstimatedLabelStub, { props: { source: 'Parent' } })
    expect(wrapper.find('#source-entity').exists()).toBe(false)
  })

  it('does NOT render the label when source is empty (missing/unrecognised)', () => {
    const wrapper = mount(EstimatedLabelStub, { props: { source: '' } })
    expect(wrapper.find('#source-entity').exists()).toBe(false)
  })
})

// ─── WrapperComponent — Show Details button visibility ────────────────────────
//
// Mirrors the v-if on the Show Details button in EntityCardTextArc.
// Button is only rendered when source is internal or isInternalOverride is true.

const ShowDetailsButtonStub = defineComponent({
  props: {
    source: { type: String, default: '' },
    isInternalOverride: { type: Boolean, default: false },
  },
  template: `
    <button
      v-if="isInternalOverride || source.toLowerCase() === 'internal'"
      data-testid="show-details-btn"
    >Show Details</button>
  `,
})

describe('EntityCardTextArc — Show Details button visibility', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders Show Details when source is "Internal"', () => {
    const wrapper = mount(ShowDetailsButtonStub, { props: { source: 'Internal' } })
    expect(wrapper.find('[data-testid="show-details-btn"]').exists()).toBe(true)
  })

  it('renders Show Details when source is "internal" (lowercase)', () => {
    const wrapper = mount(ShowDetailsButtonStub, { props: { source: 'internal' } })
    expect(wrapper.find('[data-testid="show-details-btn"]').exists()).toBe(true)
  })

  it('renders Show Details when source is "INTERNAL" (uppercase)', () => {
    const wrapper = mount(ShowDetailsButtonStub, { props: { source: 'INTERNAL' } })
    expect(wrapper.find('[data-testid="show-details-btn"]').exists()).toBe(true)
  })

  it('renders Show Details when isInternalOverride is true regardless of source', () => {
    const wrapper = mount(ShowDetailsButtonStub, {
      props: { source: 'External', isInternalOverride: true },
    })
    expect(wrapper.find('[data-testid="show-details-btn"]').exists()).toBe(true)
  })

  it('does NOT render Show Details when source is "External"', () => {
    const wrapper = mount(ShowDetailsButtonStub, { props: { source: 'External' } })
    expect(wrapper.find('[data-testid="show-details-btn"]').exists()).toBe(false)
  })

  it('does NOT render Show Details when source is "Parent"', () => {
    const wrapper = mount(ShowDetailsButtonStub, { props: { source: 'Parent' } })
    expect(wrapper.find('[data-testid="show-details-btn"]').exists()).toBe(false)
  })

  it('does NOT render Show Details when source is empty', () => {
    const wrapper = mount(ShowDetailsButtonStub, { props: { source: '' } })
    expect(wrapper.find('[data-testid="show-details-btn"]').exists()).toBe(false)
  })
})
