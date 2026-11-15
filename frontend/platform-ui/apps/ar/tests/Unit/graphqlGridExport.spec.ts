/**
 * The design-system GraphqlGrid's export entry (packages/design-system/src/components/graphql-grid/Index.vue):
 * the grid renders GraphqlGridExportMenu (ExportMenu.vue) when allowExport is set and re-emits its export.
 * The menu's own behaviour is covered in graphqlGridExportMenu.spec.ts. The design-system package has no
 * test runner of its own, so - like countryFlagColumn.spec.ts - the spec lives here and imports the
 * component by its package path.
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DropdownMenuItem from '@ada/design-system/components/primitives/dropdown-menu-item/Index.vue'
import ExportMenu from '@ada/design-system/components/graphql-grid/ExportMenu.vue'
import GraphqlGrid from '@ada/design-system/components/graphql-grid/Index.vue'

function mountGrid(props: Record<string, unknown> = {}) {
  return mount(GraphqlGrid, {
    props: { items: [], columns: [], total: 0, ...props },
    global: { stubs: { Grid: true, Teleport: true } },
  })
}

describe('GraphqlGrid export entry', () => {
  it('renders no ExportMenu unless allowExport is set', () => {
    const wrapper = mountGrid()

    expect(wrapper.findComponent(ExportMenu).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Export Excel')
  })

  it('renders the ExportMenu when allowExport is set', () => {
    const wrapper = mountGrid({ allowExport: true })

    expect(wrapper.findComponent(ExportMenu).exists()).toBe(true)
  })

  it('passes its labels to the ExportMenu', () => {
    const wrapper = mountGrid({ allowExport: true, exportLabel: 'Exportar a Excel', optionsLabel: 'Opciones' })

    expect(wrapper.findComponent(ExportMenu).props()).toEqual({
      triggerLabel: 'Opciones',
      exportLabel: 'Exportar a Excel',
    })
  })

  it('emits export once, with no payload, when the menu entry is chosen', async () => {
    const wrapper = mountGrid({ allowExport: true })

    await wrapper.find('.graphql-grid-export-menu__trigger').trigger('click')
    await wrapper.findComponent(DropdownMenuItem).trigger('click')

    expect(wrapper.emitted('export')).toHaveLength(1)
    expect(wrapper.emitted('export')![0]).toEqual([])
  })

  it('shows the toolbar for the export menu even when the column selector is hidden', () => {
    const wrapper = mountGrid({ allowExport: true, hideColumnSelector: true })

    expect(wrapper.findComponent(ExportMenu).exists()).toBe(true)
  })
})
