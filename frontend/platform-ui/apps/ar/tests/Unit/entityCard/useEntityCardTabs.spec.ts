import { describe, it, expect } from 'vitest'
import {
  ENTITY_CARD_TAB_ORDER,
  buildEntityCardTabs,
  resolveEntityCardTab,
} from '@/modules/entityCard/composables/useEntityCardTabs'

const labels = {
  opportunity: 'Opportunity',
  'corporate-tree': 'Corporate Tree',
  'company-details': 'Company Details',
}

describe('resolveEntityCardTab', () => {
  it('defaults to the Opportunity tab when the route carries no tab segment (UC-UI-06 basic flow step 3)', () => {
    expect(resolveEntityCardTab(undefined)).toBe('opportunity')
  })

  it('defaults to Opportunity for a tab id this build does not recognise, rather than selecting nothing', () => {
    expect(resolveEntityCardTab('retired-tab-from-a-future-story')).toBe('opportunity')
  })

  it('keeps a recognised tab id as-is', () => {
    expect(resolveEntityCardTab('corporate-tree')).toBe('corporate-tree')
  })
})

describe('buildEntityCardTabs', () => {
  it('lists every tab in the fixed order, each carrying its label', () => {
    const tabs = buildEntityCardTabs('opportunity', labels)

    expect(tabs.map((tab) => tab.id)).toEqual([...ENTITY_CARD_TAB_ORDER])
    expect(tabs.map((tab) => tab.label)).toEqual(['Opportunity', 'Corporate Tree', 'Company Details'])
  })

  it('marks only the selected tab active', () => {
    const tabs = buildEntityCardTabs('corporate-tree', labels)

    expect(tabs.find((tab) => tab.id === 'corporate-tree')?.active).toBe(true)
    expect(tabs.filter((tab) => tab.active)).toHaveLength(1)
  })
})
