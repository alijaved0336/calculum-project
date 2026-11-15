/**
 * Covers the applied-filter pills: the notice renders one removable badge per
 * active field (same shape as the filters bar) and the X drops only that field.
 */
import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'

// The real store module pulls the global filters API → analyze store → routing
// tree, a cycle that leaves NumberUtils undefined while a view module evaluates
// and kills collection. Only the applied-filters slice matters here.
// StringUtils imports the `@/utils` barrel, which reaches the views; same cycle.
// Only the field-name prettifier is used here.
vi.mock('@/utils/StringUtils', () => ({
  default: {
    transformFromCamelCaseToReadable: (field: string) =>
      field.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()),
  },
}))

vi.mock('@/stores/globalFilters', async () => {
  const { defineStore } = await import('pinia')

  return {
    useGlobalFiltersStore: defineStore('globalFilters', {
      state: () => ({ filtersApplied: { filters: [], logic: 'and' } as any }),
      getters: { getFiltersApplied: (state: any) => state.filtersApplied },
      actions: {
        setFiltersApplied(value: any) {
          this.filtersApplied = value
        },
      },
    }),
  }
})

import { mountWithProviders } from '../Helpers/mountWithProviders'
import GlobalFilterNotice from '@/modules/globalFilters/components/GlobalFilterNotice.vue'
import { useGlobalFiltersStore } from '@/stores/globalFilters'

const buildFilters = (fields: string[]) => ({
  logic: 'and',
  filters: fields.map(field => ({
    field,
    level: 'suppliers',
    logic: 'or',
    filters: [{ field, operator: 'eq', value: `${field}-value` }]
  }))
})

const mountWithFields = async (fields: string[]) => {
  const wrapper = mountWithProviders(GlobalFilterNotice, {
    props: { message: 'A global filter is active:', showFilterLabels: true, showRemove: true }
  })

  useGlobalFiltersStore().filtersApplied = buildFilters(fields) as any
  await nextTick()

  return wrapper
}

describe('GlobalFilterNotice applied-filter pills', () => {
  it('renders one pill per active field, keeping the message', async () => {
    const wrapper = await mountWithFields(['a', 'b', 'c'])

    expect(wrapper.findAll('[data-testid="global-filter-notice-pill"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('A global filter is active:')
    expect(wrapper.text()).toContain('a-value')
    expect(wrapper.text()).toContain('c-value')
  })

  it('removes only the clicked field and keeps the rest', async () => {
    const wrapper = await mountWithFields(['a', 'b'])

    await wrapper.findAll('[data-testid="global-filter-notice-pill-remove"]')[0].trigger('click')
    await nextTick()

    const store = useGlobalFiltersStore()
    expect(store.getFiltersApplied.filters.map(f => f.field)).toEqual(['b'])
    expect(wrapper.findAll('[data-testid="global-filter-notice-pill"]')).toHaveLength(1)
  })

  it('hides the notice once the last pill is removed', async () => {
    const wrapper = await mountWithFields(['a'])

    await wrapper.find('[data-testid="global-filter-notice-pill-remove"]').trigger('click')
    await nextTick()

    expect(wrapper.find('.global-filter-notice').exists()).toBe(false)
  })

  it('keeps the clear-all action next to the pills', async () => {
    const wrapper = await mountWithFields(['a', 'b'])

    expect(wrapper.find('[data-testid="global-filter-notice-remove"]').exists()).toBe(true)
  })

  it('shows no pills when the consumer does not ask for labels', async () => {
    const wrapper = mountWithProviders(GlobalFilterNotice, {
      props: { message: 'A global filter is active.', showFilterLabels: false }
    })

    useGlobalFiltersStore().filtersApplied = buildFilters(['a', 'b']) as any
    await nextTick()

    expect(wrapper.find('[data-testid="global-filter-notice-pill"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('A global filter is active.')
  })
})
