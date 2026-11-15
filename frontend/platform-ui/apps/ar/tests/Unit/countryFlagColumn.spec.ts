/**
 * Tests for CountryFlagColumn (packages/design-system/src/components/grid/custom-columns/CountryFlagColumn.vue),
 * built for AB#20339 (Overview List: country flag, paired with the full country name to match AP -
 * `countryName`, not the short `countryCode`). `countryFlagUrl` doesn't exist on the AR backend yet
 * (see the WI's backend companion plan), so these tests mock it directly on the dataItem to verify
 * the cell's rendering logic ahead of that field actually being served.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CountryFlagColumn from '@ada/design-system/components/grid/custom-columns/CountryFlagColumn.vue'

describe('CountryFlagColumn', () => {
  it('renders the flag image and the full country name when countryFlagUrl is present', () => {
    const w = mount(CountryFlagColumn, {
      props: {
        dataItem: { countryName: 'United States', countryFlagUrl: 'https://cdn.example.com/us.svg' },
        field: 'countryName',
      },
    })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://cdn.example.com/us.svg')
    expect(w.text()).toContain('United States')
  })

  it('renders only the text, no flag, when countryFlagUrl is null', () => {
    const w = mount(CountryFlagColumn, {
      props: { dataItem: { countryName: 'United States', countryFlagUrl: null }, field: 'countryName' },
    })
    expect(w.find('img').exists()).toBe(false)
    expect(w.text()).toContain('United States')
  })

  it('hides the flag when the image fails to load', async () => {
    const w = mount(CountryFlagColumn, {
      props: {
        dataItem: { countryName: 'United States', countryFlagUrl: 'https://cdn.example.com/us.svg' },
        field: 'countryName',
      },
    })
    await w.find('img').trigger('error')
    expect(w.find('img').exists()).toBe(false)
    expect(w.text()).toContain('United States')
  })

  it("renders '-' for a missing country field", () => {
    const w = mount(CountryFlagColumn, {
      props: { dataItem: {}, field: 'countryName' },
    })
    expect(w.text()).toContain('-')
    expect(w.find('img').exists()).toBe(false)
  })

  it('renders only the text, no flag, for a comma-joined rollup value', () => {
    // A party-grain rollup (e.g. supplierCountryName across a buyer's several suppliers) reads as
    // its distinct values comma-joined - there is no single country left to pick a flag for.
    const w = mount(CountryFlagColumn, {
      props: {
        dataItem: {
          supplierCountryName: 'United States, Germany',
          supplierCountryFlagUrl: 'https://cdn.example.com/us.svg',
        },
        field: 'supplierCountryName',
      },
    })
    expect(w.find('img').exists()).toBe(false)
    expect(w.text()).toContain('United States, Germany')
  })
})
