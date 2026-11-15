/**
 * WI#19987 — the "Set Auto" button next to the Active Client checkbox.
 *
 * The button only exists while the caller says the cell is resettable (the company is pinned to
 * manual mode), and clicking it emits `reset` so the view can PATCH the company straight away
 * instead of queueing the change for the Save button.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ColumnCheckbox from '@/modules/components/grid/columns/ColumnCheckbox.vue'

function mountCell(props: Record<string, unknown>) {
  return mount(ColumnCheckbox, {
    props,
    global: { stubs: { KCheckbox: true } }
  })
}

describe('ColumnCheckbox — reset to auto', () => {
  it('renders no button for a company that is not resettable', () => {
    const wrapper = mountCell({ behavior: 'activeClient', checked: true, label: '(Auto)' })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('renders the labelled button for a pinned company', () => {
    const wrapper = mountCell({
      behavior: 'activeClient',
      checked: true,
      label: '(Manual)',
      resettable: true,
      resetLabel: 'Set Auto'
    })

    expect(wrapper.find('button').text()).toBe('Set Auto')
  })

  it('paints the button as pending only once Set Auto was pressed', async () => {
    const base = {
      behavior: 'activeClient',
      checked: true,
      resettable: true,
      resetLabel: 'Set Auto'
    }

    const idle = mountCell(base)
    const pending = mountCell({ ...base, resetPending: true })

    expect(idle.find('button').classes()).not.toContain('is-pending')
    expect(pending.find('button').classes()).toContain('is-pending')
  })

  it('emits reset when the button is clicked', async () => {
    const wrapper = mountCell({
      behavior: 'activeClient',
      checked: true,
      resettable: true,
      resetLabel: 'Set Auto'
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('reset')).toHaveLength(1)
    expect(wrapper.emitted('item-checked')).toBeUndefined()
  })
})
