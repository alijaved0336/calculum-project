/**
 * Tests for useEntityCardTitle
 *
 * Covers setBrowserTitlebyTab() mapping every EntityCardPage value to the
 * document title set by EntityCardOverview.vue's tab switch.
 */

import { describe, it, expect } from 'vitest'
import useEntityCardTitle from '@/modules/home/entityCard/composables/useEntityCardTitle'

describe('useEntityCardTitle', () => {
  const { setBrowserTitlebyTab } = useEntityCardTitle()

  it.each([
    ['EntityCardNegotiation', 'Entity - Opportunity'],
    ['ReceivablesMockup3', 'Entity - Opportunity'],
    ['EntityCardSupplierController', 'Entity - Supplier Insights'],
    ['ReceivablesMockup4', 'Entity - Options'],
    ['EntityCardFinancing', 'Entity - SCF'],
    ['EntityCardCompanyDetails', 'Entity - Company Details'],
    ['EntityCardCorporateTree', 'Entity - Corporate Tree'],
    ['EntityCardRatingsAndMetrics', 'Entity - Ratings & Metrics'],
    ['ReceivablesMockup5', 'Entity - Ratings & Metrics'],
    ['EntityCardCalculator', 'Entity - Payment Terms vs Price'],
    ['EntityCardNews', 'Entity - News'],
  ] as const)('sets document.title to %s for %s', (page, expected) => {
    setBrowserTitlebyTab(page as any)
    expect(document.title).toBe(expected)
  })

  it('falls back to the bare prefix for an unknown page', () => {
    setBrowserTitlebyTab('SomethingUnmapped' as any)
    // jsdom trims trailing whitespace on document.title
    expect(document.title).toBe('Entity -')
  })
})
