import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import NineBoxColumn from '@ada/design-system/components/grid/custom-columns/NineBoxColumn.vue'
import { NINE_BOX_POSITION_NUMBERS } from '@ada/design-system'

// The overview grid's own "9 Boxes Cash Flow" column (AP's real column, ported per the shared-grid
// column-parity story - opportunityNineBox in globalColumns.ts, `cell: "nineBoxColumn"`). This
// component has real per-position logic (highlighting the right cell of its mini icon), unlike its
// sibling cell renderers (DateColumn, BooleanYesNoColumn, ...), none of which have their own spec -
// design-system has no vitest setup of its own, so this lives here, the same way overviewList.spec.ts
// already mounts other design-system pieces (GraphqlGrid) directly from AR.
const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: { global: { box: 'Box' } } } })

function mountColumn(field: string, dataItem: Record<string, unknown>) {
  return mount(NineBoxColumn, { props: { dataItem, field }, global: { plugins: [i18n] } })
}

describe('NineBoxColumn', () => {
  it('shows "Box N" for a classified row, highlighting that box\'s own grid position', () => {
    const wrapper = mountColumn('nineBox', { nineBox: 1 })

    expect(wrapper.text()).toContain('Box 1')
    const rects = wrapper.findAll('rect')
    // Box 1 sits at NINE_BOX_POSITION_NUMBERS' index 2 (top-right, AP's own strongest cell) - only
    // that one rect gets the highlight color, the other 8 stay the neutral gray.
    const highlightedIndex = NINE_BOX_POSITION_NUMBERS.indexOf(1)
    rects.forEach((rect, index) => {
      expect(rect.attributes('fill')).toBe(index === highlightedIndex ? '#1570EF' : '#D0D5DD')
    })
  })

  it('shows a dash, no icon, for a row with no nine-box classification (null)', () => {
    const wrapper = mountColumn('nineBox', { nineBox: null })

    expect(wrapper.text()).toBe('-')
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('shows a dash for an out-of-range value rather than a broken icon', () => {
    const wrapper = mountColumn('nineBox', { nineBox: 0 })

    expect(wrapper.text()).toBe('-')
  })
})
