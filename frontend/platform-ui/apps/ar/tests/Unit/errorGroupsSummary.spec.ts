import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

// The real Kendo Grid needs a full DOM layout engine jsdom does not provide - same stub shape
// ErrorsTab/BuyerGrid's own specs use, extended with sortchange so onSortChange is exercised.
vi.mock('@progress/kendo-vue-grid', () => ({
  Grid: {
    props: ['dataItems', 'columns'],
    emits: ['sortchange'],
    template: `
      <div class="grid-stub">
        <div v-for="item in dataItems" :key="item.errorCode + item.sheet" class="grid-row">
          <span class="cell">{{ item.sheet }} / {{ item.errorCode }} / {{ item.storedRows }}</span>
          <slot name="severity" :props="{ dataItem: item }" />
        </div>
        <button type="button" class="sort-button" @click="$emit('sortchange', { sort: [{ field: 'storedRows', dir: 'asc' }] })">sort</button>
      </div>
    `,
  },
}))

vi.mock('@ada/design-system', () => ({
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  CustomBadge: { props: ['text', 'variant'], template: '<span class="badge" :class="variant">{{ text }}</span>' },
}))

import ErrorGroupsSummary from '@/modules/match/components/ErrorGroupsSummary.vue'
import type { ParseErrorGroup } from '@/api'

const messages = {
  en: {
    arMatch: {
      errorGroups: 'Errors by group',
      emptyErrors: 'No errors.',
      severity: { blocking: 'Blocking', warning: 'Warning' },
      table: { sheet: 'Sheet', column: 'Column', code: 'Code', severity: 'Severity', rows: 'Rows' },
    },
  },
}

function group(overrides: Partial<ParseErrorGroup> = {}): ParseErrorGroup {
  return {
    sheet: 'Sales Data',
    columnRef: 'K',
    errorCode: 'invalid-number',
    severity: 'blocking',
    storedRows: 3,
    ...overrides,
  }
}

function mountSummary(groups: ParseErrorGroup[]) {
  // globalInjection: true - the severity badge cell uses the template's own `$t`.
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', globalInjection: true, messages })
  return mount(ErrorGroupsSummary, { props: { groups }, global: { plugins: [i18n] } })
}

describe('ErrorGroupsSummary', () => {
  it('shows the empty state when there are no error groups', () => {
    const view = mountSummary([])

    expect(view.text()).toContain('No errors.')
    expect(view.find('.grid-stub').exists()).toBe(false)
  })

  it('renders one row per group with its stored count, highest count first', () => {
    const view = mountSummary([
      group({ sheet: 'Sales Data', errorCode: 'invalid-number', storedRows: 2 }),
      group({ sheet: 'Buyer Data', errorCode: 'missing-required', storedRows: 9 }),
    ])

    const rows = view.findAll('.cell').map((cell) => cell.text())
    expect(rows).toEqual([
      'Buyer Data / missing-required / 9',
      'Sales Data / invalid-number / 2',
    ])
  })

  it('badges blocking and warning groups distinctly (UC-VAL-03 basic flow step 4)', () => {
    const view = mountSummary([
      group({ severity: 'blocking' }),
      group({ errorCode: 'out-of-range', severity: 'warning' }),
    ])

    const badges = view.findAll('.badge').map((b) => ({ text: b.text(), classes: b.classes() }))
    expect(badges.some((b) => b.text === 'Blocking' && b.classes.includes('danger'))).toBe(true)
    expect(badges.some((b) => b.text === 'Warning' && b.classes.includes('warning'))).toBe(true)
  })

  it('re-sorts when the analyst changes the sort column', async () => {
    const view = mountSummary([
      group({ sheet: 'Sales Data', errorCode: 'invalid-number', storedRows: 2 }),
      group({ sheet: 'Buyer Data', errorCode: 'missing-required', storedRows: 9 }),
    ])

    await view.find('.sort-button').trigger('click')

    const rows = view.findAll('.cell').map((cell) => cell.text())
    expect(rows).toEqual([
      'Sales Data / invalid-number / 2',
      'Buyer Data / missing-required / 9',
    ])
  })
})
