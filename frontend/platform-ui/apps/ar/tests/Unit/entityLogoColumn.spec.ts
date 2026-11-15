/**
 * Tests for EntityLogoColumn (packages/design-system/src/components/grid/custom-columns/EntityLogoColumn.vue),
 * built for AB#20339 (Overview List: buyer entity and parent organization logos). Neither
 * `buyerLogoUrl` nor `parentLogoUrl` exists on the AR backend yet (see the WI's backend companion
 * plan), so these tests mock them directly on the dataItem to verify the cell's rendering logic
 * ahead of those fields actually being served.
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EntityLogoColumn from '@ada/design-system/components/grid/custom-columns/EntityLogoColumn.vue'
import { ENTITY_LOGO_CLICK_KEY } from '@ada/design-system/components/grid/custom-columns/entityLogoClick'

describe('EntityLogoColumn', () => {
  it('renders the logo image and the name when buyerLogoUrl is present', () => {
    const w = mount(EntityLogoColumn, {
      props: {
        dataItem: { buyerName: 'Acme Corp', buyerLogoUrl: 'https://cdn.example.com/acme.png' },
        field: 'buyerName',
      },
    })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://cdn.example.com/acme.png')
    expect(w.text()).toContain('Acme Corp')
  })

  it('falls back to a first-letter circle when buyerLogoUrl is null', () => {
    const w = mount(EntityLogoColumn, {
      props: { dataItem: { buyerName: 'Acme Corp', buyerLogoUrl: null }, field: 'buyerName' },
    })
    expect(w.find('img').exists()).toBe(false)
    expect(w.text()).toContain('A')
    expect(w.text()).toContain('Acme Corp')
  })

  it('renders the logo image and the name for parentName when parentLogoUrl is present', () => {
    const w = mount(EntityLogoColumn, {
      props: {
        dataItem: { parentName: 'Globex Holdings', parentLogoUrl: 'https://cdn.example.com/globex.png' },
        field: 'parentName',
      },
    })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://cdn.example.com/globex.png')
    expect(w.text()).toContain('Globex Holdings')
  })

  it('falls back to the first-letter circle for a field with no known logo source', () => {
    const w = mount(EntityLogoColumn, {
      props: { dataItem: { supplierName: 'Globex', buyerLogoUrl: 'https://cdn.example.com/x.png' }, field: 'supplierName' },
    })
    expect(w.find('img').exists()).toBe(false)
    expect(w.text()).toContain('G')
  })

  it('falls back to the first-letter circle when the image fails to load', async () => {
    const w = mount(EntityLogoColumn, {
      props: {
        dataItem: { buyerName: 'Acme Corp', buyerLogoUrl: 'https://cdn.example.com/acme.png' },
        field: 'buyerName',
      },
    })
    await w.find('img').trigger('error')
    expect(w.find('img').exists()).toBe(false)
    expect(w.text()).toContain('A')
  })

  it("renders '-' for a missing name", () => {
    const w = mount(EntityLogoColumn, {
      props: { dataItem: {}, field: 'buyerName' },
    })
    expect(w.text()).toContain('-')
  })

  describe('opening the entity', () => {
    function mountWithHandler(dataItem: Record<string, unknown>, field: string) {
      const onClick = vi.fn()
      const w = mount(EntityLogoColumn, {
        props: { dataItem, field },
        global: { provide: { [ENTITY_LOGO_CLICK_KEY as symbol]: onClick } },
      })
      return { w, onClick }
    }

    it.each(['name', 'buyerName'])('is clickable from the %s column when the row has a partyId', async (field) => {
      const dataItem = { partyId: 42, [field]: 'Acme' }
      const { w, onClick } = mountWithHandler(dataItem, field)

      const cell = w.find('.entity-logo-cell')
      expect(cell.classes()).toContain('entity-logo-cell--clickable')
      await cell.trigger('click')
      expect(onClick).toHaveBeenCalledWith(dataItem, field)
    })

    it.each(['parentName', 'supplierName'])('is not clickable from the %s column, which names another entity', async (field) => {
      const { w, onClick } = mountWithHandler({ partyId: 42, [field]: 'Globex' }, field)

      const cell = w.find('.entity-logo-cell')
      expect(cell.classes()).not.toContain('entity-logo-cell--clickable')
      await cell.trigger('click')
      expect(onClick).not.toHaveBeenCalled()
    })

    it('is not clickable without a partyId', async () => {
      const { w, onClick } = mountWithHandler({ name: 'Acme' }, 'name')

      const cell = w.find('.entity-logo-cell')
      expect(cell.classes()).not.toContain('entity-logo-cell--clickable')
      await cell.trigger('click')
      expect(onClick).not.toHaveBeenCalled()
    })
  })
})
