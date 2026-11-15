import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@ada/design-system', () => ({
  ContentBox: { template: '<div class="content-box-stub"><slot /></div>' },
  ContentBoxBody: { template: '<div class="content-box-body-stub"><slot /></div>' },
  Skeleton: { template: '<div class="skeleton-stub" />' },
}))

import CustomerCardTabSkeleton from '@/modules/buyers/components/customerCard/CustomerCardTabSkeleton.vue'

describe('CustomerCardTabSkeleton', () => {
  it('renders one card per row entry, in the given Bootstrap column class', () => {
    const view = mount(CustomerCardTabSkeleton, {
      props: { rows: [[{ col: 'col-6' }, { col: 'col-12 col-xl-4' }]] },
    })

    const cardWrappers = view.findAll('.content-box-stub').map((card) => card.element.parentElement?.className)
    expect(cardWrappers).toEqual(['col-6 d-flex flex-column', 'col-12 col-xl-4 d-flex flex-column'])
  })

  it('defaults a card with no column class to col-12', () => {
    const view = mount(CustomerCardTabSkeleton, { props: { rows: [[{}]] } })

    expect(view.find('.content-box-stub').element.parentElement?.className).toBe('col-12 d-flex flex-column')
  })

  it('draws a title placeholder plus three placeholder lines per card by default', () => {
    const view = mount(CustomerCardTabSkeleton, { props: { rows: [[{}]] } })

    expect(view.findAll('.skeleton-stub')).toHaveLength(4)
  })

  it('draws as many placeholder lines as requested, on top of the title placeholder', () => {
    const view = mount(CustomerCardTabSkeleton, { props: { rows: [[{ lines: 4 }]] } })

    expect(view.findAll('.skeleton-stub')).toHaveLength(5)
  })

  it('skips the title placeholder when title is set to false', () => {
    const view = mount(CustomerCardTabSkeleton, { props: { rows: [[{ lines: 2, title: false }]] } })

    expect(view.findAll('.skeleton-stub')).toHaveLength(2)
  })

  it('renders every row and every card within it', () => {
    const view = mount(CustomerCardTabSkeleton, {
      props: { rows: [[{}, {}], [{}, {}, {}]] },
    })

    expect(view.findAll('.content-box-stub')).toHaveLength(5)
  })
})
