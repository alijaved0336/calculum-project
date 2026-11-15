/**
 * Tests for EntityCardOverview — top menu tab bar (visibility, active state, rounded corners).
 *
 * The 9 tabs are driven by `useTopMenuTabs` (composables/useTopMenuTabs.ts), which
 * EntityCardOverview.vue and EntityCardTabBar.vue both consume. These tests import the
 * real, production show/active/rounding logic — no local mirrors — so a future change
 * can't silently alter which tab shows, which one is marked active, or its rounded-corner
 * classes without failing here.
 */

import { describe, it, expect } from 'vitest'
import {
  buildTopMenuTabShowFlags,
  isTopMenuTabActive,
  roundingByPosition,
  TOP_MENU_TAB_ORDER,
  type TopMenuTabShowFlagsState,
} from '@/modules/home/entityCard/composables/useTopMenuTabs'

const baseState: TopMenuTabShowFlagsState = {
  programTarget: 'cashFlow',
  disabledProgram: false,
  useFeatureSupplierInsights: true,
  isFinancingEnabled: true,
  hasSCF: true,
  potentialTheme: false,
  useFeatureEntityCardNewsletter: true,
  userIsSuperAdmin: true,
  allowShowTabOptionsReceivablesMockup4: true,
}

function buildRounding(s: TopMenuTabShowFlagsState) {
  const showFlags = buildTopMenuTabShowFlags(s)
  return roundingByPosition(TOP_MENU_TAB_ORDER.filter(id => showFlags[id]))
}

describe('EntityCardOverview — top menu tab visibility', () => {
  it('shows every tab when all gating flags/features are enabled', () => {
    expect(buildTopMenuTabShowFlags(baseState)).toEqual({
      'opportunity-tab': true,
      'supplier-insights-tab': true,
      'supplier-options-tab': true,
      'financing-tab': true,
      'corporate-tab': true,
      'company-details-tab': true,
      'ratings-and-metrics-tab': true,
      'entity-card-calculator': true,
      'news-tab': true,
    })
  })

  it('hides the opportunity tab when the program is disabled, even for a cashFlow target', () => {
    const flags = buildTopMenuTabShowFlags({ ...baseState, disabledProgram: true })
    expect(flags['opportunity-tab']).toBe(false)
  })

  it('hides the opportunity tab for a non-cashFlow program target', () => {
    const flags = buildTopMenuTabShowFlags({ ...baseState, programTarget: 'other' })
    expect(flags['opportunity-tab']).toBe(false)
  })

  it('hides the AR-mockup options tab when receivables mockup mode is off', () => {
    const flags = buildTopMenuTabShowFlags({
      ...baseState,
      allowShowTabOptionsReceivablesMockup4: false,
    })
    expect(flags['supplier-options-tab']).toBe(false)
  })

  it('hides the AR-mockup options tab from non-super-admins even in mockup mode', () => {
    const flags = buildTopMenuTabShowFlags({ ...baseState, userIsSuperAdmin: false })
    expect(flags['supplier-options-tab']).toBe(false)
  })

  it('marks the AR-mockup options tab active only for ReceivablesMockup4', () => {
    expect(isTopMenuTabActive('supplier-options-tab', 'ReceivablesMockup4')).toBe(true)
    expect(isTopMenuTabActive('supplier-options-tab', 'EntityCardNegotiation')).toBe(false)
  })

  it('hides supplier-insights-tab when the feature flag is off', () => {
    const flags = buildTopMenuTabShowFlags({ ...baseState, useFeatureSupplierInsights: false })
    expect(flags['supplier-insights-tab']).toBe(false)
  })

  it('hides financing-tab unless financing is enabled AND the program has SCF AND is not disabled', () => {
    expect(buildTopMenuTabShowFlags({ ...baseState, isFinancingEnabled: false })['financing-tab']).toBe(false)
    expect(buildTopMenuTabShowFlags({ ...baseState, hasSCF: false })['financing-tab']).toBe(false)
    expect(buildTopMenuTabShowFlags({ ...baseState, disabledProgram: true })['financing-tab']).toBe(false)
  })

  it('always shows corporate-tab, company-details-tab and ratings-and-metrics-tab', () => {
    const flags = buildTopMenuTabShowFlags({ ...baseState, programTarget: '', disabledProgram: true, useFeatureSupplierInsights: false })
    expect(flags['corporate-tab']).toBe(true)
    expect(flags['company-details-tab']).toBe(true)
    expect(flags['ratings-and-metrics-tab']).toBe(true)
  })

  it('shows entity-card-calculator for a potential supplier even with no cashFlow program (the !!potentialTheme cast)', () => {
    const flags = buildTopMenuTabShowFlags({ ...baseState, programTarget: '', potentialTheme: true })
    expect(flags['entity-card-calculator']).toBe(true)
  })

  it('hides entity-card-calculator for a standard supplier with no cashFlow program', () => {
    const flags = buildTopMenuTabShowFlags({ ...baseState, programTarget: '', potentialTheme: false })
    expect(flags['entity-card-calculator']).toBe(false)
  })

  it('coerces a truthy-but-non-boolean potentialTheme through !! for entity-card-calculator', () => {
    // props.potentialTheme is typed Boolean, but the show rule casts it with `!!` defensively —
    // guard that an arbitrary truthy value still resolves to a real boolean, not the value itself.
    const flags = buildTopMenuTabShowFlags({ ...baseState, programTarget: '', potentialTheme: 'yes' as unknown as boolean })
    expect(flags['entity-card-calculator']).toBe(true)
  })

  it('hides news-tab when the newsletter feature flag is off', () => {
    expect(buildTopMenuTabShowFlags({ ...baseState, useFeatureEntityCardNewsletter: false })['news-tab']).toBe(false)
  })
})

describe('EntityCardOverview — top menu tab active state', () => {
  it('marks opportunity-tab active for both EntityCardNegotiation and ReceivablesMockup3', () => {
    expect(isTopMenuTabActive('opportunity-tab', 'EntityCardNegotiation')).toBe(true)
    expect(isTopMenuTabActive('opportunity-tab', 'ReceivablesMockup3')).toBe(true)
    expect(isTopMenuTabActive('opportunity-tab', 'EntityCardCorporateTree')).toBe(false)
  })

  it('marks ratings-and-metrics-tab active for both EntityCardRatingsAndMetrics and ReceivablesMockup5', () => {
    expect(isTopMenuTabActive('ratings-and-metrics-tab', 'EntityCardRatingsAndMetrics')).toBe(true)
    expect(isTopMenuTabActive('ratings-and-metrics-tab', 'ReceivablesMockup5')).toBe(true)
    expect(isTopMenuTabActive('ratings-and-metrics-tab', 'EntityCardNews')).toBe(false)
  })

  it('marks each remaining tab active only for its own selectedButton value', () => {
    expect(isTopMenuTabActive('supplier-insights-tab', 'EntityCardSupplierController')).toBe(true)
    expect(isTopMenuTabActive('financing-tab', 'EntityCardFinancing')).toBe(true)
    expect(isTopMenuTabActive('corporate-tab', 'EntityCardCorporateTree')).toBe(true)
    expect(isTopMenuTabActive('company-details-tab', 'EntityCardCompanyDetails')).toBe(true)
    expect(isTopMenuTabActive('entity-card-calculator', 'EntityCardCalculator')).toBe(true)
    expect(isTopMenuTabActive('news-tab', 'EntityCardNews')).toBe(true)
  })
})

describe('EntityCardOverview — top menu tab rounded corners', () => {
  it('rounds only the first (left) and last (right) tab when every tab is visible', () => {
    const rounding = buildRounding(baseState)
    expect(Object.keys(rounding)).toEqual(TOP_MENU_TAB_ORDER)
    expect(rounding['opportunity-tab']).toEqual({ roundedTopLeft: false, roundedTopRight: true })
    expect(rounding['news-tab']).toEqual({ roundedTopLeft: true, roundedTopRight: false })
    Object.entries(rounding)
      .filter(([id]) => id !== 'opportunity-tab' && id !== 'news-tab')
      .forEach(([, r]) => expect(r).toEqual({ roundedTopLeft: true, roundedTopRight: true }))
  })

  it('moves the rounded right edge to whichever tab ends up last when trailing tabs are hidden', () => {
    // Newsletter off hides news-tab; potentialTheme keeps entity-card-calculator visible,
    // so entity-card-calculator becomes the new last tab instead of ratings-and-metrics-tab.
    const rounding = buildRounding({ ...baseState, useFeatureEntityCardNewsletter: false, potentialTheme: true })
    expect(rounding['news-tab']).toBeUndefined()
    expect(rounding['entity-card-calculator'].roundedTopRight).toBe(false)
    expect(rounding['ratings-and-metrics-tab'].roundedTopRight).toBe(true)
  })

  it('rounds only the first/last tab within a reduced subset of always-shown tabs', () => {
    const rounding = buildRounding({
      ...baseState,
      programTarget: '',
      disabledProgram: true,
      useFeatureSupplierInsights: false,
      isFinancingEnabled: false,
      useFeatureEntityCardNewsletter: false,
      potentialTheme: false,
      allowShowTabOptionsReceivablesMockup4: false,
    })
    expect(Object.keys(rounding)).toEqual(['corporate-tab', 'company-details-tab', 'ratings-and-metrics-tab'])
    expect(rounding['corporate-tab']).toEqual({ roundedTopLeft: false, roundedTopRight: true })
    expect(rounding['company-details-tab']).toEqual({ roundedTopLeft: true, roundedTopRight: true })
    expect(rounding['ratings-and-metrics-tab']).toEqual({ roundedTopLeft: true, roundedTopRight: false })
  })

  it('rounds both sides of a single visible tab', () => {
    // corporate-tab, company-details-tab and ratings-and-metrics-tab are always shown,
    // so a true single-visible-tab state isn't reachable via show flags — this exercises
    // the position-based rule directly for that edge case instead.
    expect(roundingByPosition(['only-tab'])).toEqual({ 'only-tab': { roundedTopLeft: false, roundedTopRight: false } })
  })
})
