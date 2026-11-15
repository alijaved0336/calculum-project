/**
 * Tests for DateColumn (packages/design-system/src/components/grid/custom-columns/DateColumn.vue),
 * added for the AR Opportunity Overview's column-parity work - GraphqlGrid had no registered date
 * cell before this, so every date-typed column in that batch would otherwise render the raw ISO
 * string Apollo hands back.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DateColumn from '@ada/design-system/components/grid/custom-columns/DateColumn.vue'

describe('DateColumn', () => {
  it('renders the date part of an ISO datetime string', () => {
    const w = mount(DateColumn, {
      props: { dataItem: { effectiveDate: '2026-08-27T15:09:50Z' }, field: 'effectiveDate' },
    })
    expect(w.text()).toBe('2026-08-27')
  })

  it('renders a date-only string unchanged', () => {
    const w = mount(DateColumn, {
      props: { dataItem: { effectiveDate: '2026-08-27' }, field: 'effectiveDate' },
    })
    expect(w.text()).toBe('2026-08-27')
  })

  it("renders '-' for null", () => {
    const w = mount(DateColumn, {
      props: { dataItem: { effectiveDate: null }, field: 'effectiveDate' },
    })
    expect(w.text()).toBe('-')
  })

  it("renders '-' for a missing field", () => {
    const w = mount(DateColumn, {
      props: { dataItem: {}, field: 'effectiveDate' },
    })
    expect(w.text()).toBe('-')
  })

  it("renders '-' for an empty string", () => {
    const w = mount(DateColumn, {
      props: { dataItem: { effectiveDate: '' }, field: 'effectiveDate' },
    })
    expect(w.text()).toBe('-')
  })
})
