import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RatingComparisonBar from '@/modules/buyers/components/customerCard/bars/RatingComparisonBar.vue'

describe('RatingComparisonBar', () => {
  it('renders the label and the display value', () => {
    const view = mount(RatingComparisonBar, {
      props: { label: 'Company', displayValue: 'AA-', percent: 90 },
    })

    expect(view.text()).toContain('Company')
    expect(view.text()).toContain('AA-')
  })

  it('sizes the fill to the given percent', () => {
    const view = mount(RatingComparisonBar, {
      props: { label: 'Company', displayValue: 'AA-', percent: 42 },
    })

    expect(view.find('.rating-comparison-bar__fill').attributes('style')).toContain('width: 42%')
  })

  it('clamps a percent above 100 down to 100', () => {
    const view = mount(RatingComparisonBar, {
      props: { label: 'Company', displayValue: 'AA-', percent: 150 },
    })

    expect(view.find('.rating-comparison-bar__fill').attributes('style')).toContain('width: 100%')
  })

  it('clamps a negative percent up to 0', () => {
    const view = mount(RatingComparisonBar, {
      props: { label: 'Company', displayValue: 'AA-', percent: -10 },
    })

    expect(view.find('.rating-comparison-bar__fill').attributes('style')).toContain('width: 0%')
  })

  it('defaults to the primary variant when none is given', () => {
    const view = mount(RatingComparisonBar, {
      props: { label: 'Company', displayValue: 'AA-', percent: 50 },
    })

    expect(view.find('.rating-comparison-bar__fill').classes()).toContain('rating-comparison-bar__fill--primary')
  })

  it('applies the requested variant class', () => {
    const view = mount(RatingComparisonBar, {
      props: { label: 'Total Sales', displayValue: 'BBB', percent: 55, variant: 'tertiary' },
    })

    expect(view.find('.rating-comparison-bar__fill').classes()).toContain('rating-comparison-bar__fill--tertiary')
  })
})
