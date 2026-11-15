/**
 * The design-system GraphqlGridExportMenu (packages/design-system/src/components/graphql-grid/ExportMenu.vue):
 * the options (vertical ellipsis) trigger + a DropdownPanel with one Export entry. The design-system
 * package has no test runner of its own, so the spec lives here and imports the component by its
 * package path.
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DropdownPanel from '@ada/design-system/components/primitives/dropdown-panel/Index.vue'
import DropdownMenuItem from '@ada/design-system/components/primitives/dropdown-menu-item/Index.vue'
import ExportMenu from '@ada/design-system/components/graphql-grid/ExportMenu.vue'

const TRIGGER = '.graphql-grid-export-menu__trigger'

function mountMenu(props: Record<string, unknown> = {}) {
  return mount(ExportMenu, { props, global: { stubs: { Teleport: true } } })
}

describe('GraphqlGridExportMenu', () => {
  it('renders a button trigger with the default label and a closed popup', () => {
    const wrapper = mountMenu()

    const trigger = wrapper.find(TRIGGER)
    expect(trigger.element.tagName).toBe('BUTTON')
    expect(trigger.attributes('type')).toBe('button')
    expect(trigger.attributes('title')).toBe('Options')
    expect(trigger.attributes('aria-label')).toBe('Options')
    expect(trigger.attributes('aria-haspopup')).toBeDefined()
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(wrapper.findComponent(DropdownPanel).props('open')).toBe(false)
  })

  it('takes the trigger label from triggerLabel', () => {
    const wrapper = mountMenu({ triggerLabel: 'Opciones' })

    expect(wrapper.find(TRIGGER).attributes('title')).toBe('Opciones')
    expect(wrapper.find(TRIGGER).attributes('aria-label')).toBe('Opciones')
  })

  it('opens the panel on click and flags aria-expanded', async () => {
    const wrapper = mountMenu()

    await wrapper.find(TRIGGER).trigger('click')

    expect(wrapper.findComponent(DropdownPanel).props('open')).toBe(true)
    expect(wrapper.find(TRIGGER).attributes('aria-expanded')).toBe('true')
  })

  it('lists one entry labelled Export Excel by default, or exportLabel when given', async () => {
    const wrapper = mountMenu()
    await wrapper.find(TRIGGER).trigger('click')
    expect(wrapper.findAllComponents(DropdownMenuItem)).toHaveLength(1)
    expect(wrapper.findComponent(DropdownMenuItem).props('label')).toBe('Export Excel')

    const custom = mountMenu({ exportLabel: 'Exportar a Excel' })
    await custom.find(TRIGGER).trigger('click')
    expect(custom.findComponent(DropdownMenuItem).props('label')).toBe('Exportar a Excel')
  })

  it('emits export once, with no payload, and closes the panel when the entry is chosen', async () => {
    const wrapper = mountMenu()

    await wrapper.find(TRIGGER).trigger('click')
    await wrapper.findComponent(DropdownMenuItem).trigger('click')

    expect(wrapper.emitted('export')).toHaveLength(1)
    expect(wrapper.emitted('export')![0]).toEqual([])
    expect(wrapper.findComponent(DropdownPanel).props('open')).toBe(false)
    expect(wrapper.find(TRIGGER).attributes('aria-expanded')).toBe('false')
  })

  it('closes the panel without exporting when the panel asks to close (outside click / Escape)', async () => {
    const wrapper = mountMenu()

    await wrapper.find(TRIGGER).trigger('click')
    wrapper.findComponent(DropdownPanel).vm.$emit('update:open', false)
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(DropdownPanel).props('open')).toBe(false)
    expect(wrapper.emitted('export')).toBeUndefined()
  })

  it('toggles closed when the trigger is clicked again', async () => {
    const wrapper = mountMenu()

    await wrapper.find(TRIGGER).trigger('click')
    await wrapper.find(TRIGGER).trigger('click')

    expect(wrapper.findComponent(DropdownPanel).props('open')).toBe(false)
  })
})
