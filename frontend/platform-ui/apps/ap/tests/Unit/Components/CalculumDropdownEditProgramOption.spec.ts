/**
 * Tests for CalculumDropdownEditProgramOption option-visibility and fetch-guard logic.
 *
 * The component cannot be mounted directly in Vitest/Node.js because its Pug
 * template contains TypeScript type casts inside event expressions. Strategy:
 * mirror the relevant pure logic as standalone functions and test those directly
 * (same pattern as ManageTeamAction.spec.ts).
 */

import { describe, it, expect } from 'vitest'

// ─── Mirrors the ENTITY_LEVEL constant ───────────────────────────────────────

const ENTITY_LEVEL = { SPEND_LINES: 0, SUPPLIERS: 1, ULTIMATE_PARENT: 2 } as const

// ─── Option type ─────────────────────────────────────────────────────────────

interface Option {
  keyId: string
  text: string
  btn: boolean
  isCustomColumn?: boolean
  columnUuid?: string
}

// ─── Mirror of the component's optionsFilter computed logic ──────────────────

interface FilterContext {
  getAllGroupsLength: number
  hasHarmonization: boolean
  getAllFinancingLength: number
  hasFinancing: boolean
  hasVcard: boolean
  entityLevel: number
  userIsSuperAdmin: boolean
  useFeatureDownloadPdfEntity: boolean
}

function buildOptionsFilter(options: Option[], ctx: FilterContext): Option[] {
  let result = [...options]

  if (String(ctx.entityLevel) === String(ENTITY_LEVEL.SPEND_LINES)) {
    result = result.filter((o) => o.keyId !== 'exportPdf')
    result = result.filter((o) => o.keyId !== 'supplierCreditRating')
  }
  if (
    String(ctx.entityLevel) === String(ENTITY_LEVEL.SUPPLIERS) &&
    !ctx.useFeatureDownloadPdfEntity
  ) {
    result = result.filter((o) => o.keyId !== 'exportPdf')
  }
  if (String(ctx.entityLevel) !== String(ENTITY_LEVEL.SPEND_LINES)) {
    result = result.filter((o) => o.keyId !== 'updateStatus')
  }
  if (String(ctx.entityLevel) === String(ENTITY_LEVEL.ULTIMATE_PARENT)) {
    result = result.filter((o) => o.keyId !== 'supplierUltimateParent')
  }
  if (!(ctx.getAllGroupsLength > 0 && ctx.hasHarmonization)) {
    result = result.filter((o) => o.keyId !== 'harmonizationGroup')
  }
  if (!(ctx.getAllFinancingLength > 0 && ctx.hasFinancing)) {
    result = result.filter((o) => o.keyId !== 'financingGroup')
  }
  if (!ctx.hasVcard) {
    result = result.filter((o) => o.keyId !== 'vcardGroup')
  }
  if (!ctx.userIsSuperAdmin) {
    result = result.filter(
      (o) =>
        o.keyId !== 'supplierIndustry' &&
        o.keyId !== 'supplierCreditRating' &&
        o.keyId !== 'supplierUltimateParent',
    )
  }
  return result
}

// ─── Mirror of the component's fetch-guard conditions ────────────────────────

function shouldFetchHarmonization(hasHarmonization: boolean, groupsLength: number): boolean {
  return hasHarmonization && groupsLength === 0
}

function shouldFetchFinancing(hasFinancing: boolean, financingLength: number): boolean {
  return hasFinancing && financingLength === 0
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ALL_OPTIONS: Option[] = [
  { keyId: 'vcardGroup', text: 'VCard Groups', btn: true },
  { keyId: 'setTarget', text: 'Set Target', btn: true },
  { keyId: 'financingGroup', text: 'Financing Groups', btn: true },
  { keyId: 'harmonizationGroup', text: 'Harmonization Groups', btn: true },
  { keyId: 'updateStatus', text: 'Update Status', btn: true },
  { keyId: 'includeExclude', text: 'Include / Exclude', btn: true },
  { keyId: 'moveBetween', text: 'Plan/Phases', btn: true },
  { keyId: 'exportPdf', text: 'Export to PDF', btn: true },
  { keyId: 'manageTeam', text: 'Procurement Team', btn: true },
  { keyId: 'commodity', text: 'Commodity', btn: true },
  { keyId: 'supplierIndustry', text: 'Industry', btn: true },
  { keyId: 'supplierCreditRating', text: 'Credit Rating', btn: true },
  { keyId: 'supplierUltimateParent', text: 'Ultimate Parent', btn: true },
]

const BASE_CTX: FilterContext = {
  getAllGroupsLength: 0,
  hasHarmonization: false,
  getAllFinancingLength: 0,
  hasFinancing: false,
  hasVcard: false,
  entityLevel: ENTITY_LEVEL.SUPPLIERS,
  userIsSuperAdmin: false,
  useFeatureDownloadPdfEntity: true,
}

function ids(options: Option[]): string[] {
  return options.map((o) => o.keyId)
}

// ─── Tests: harmonizationGroup visibility ────────────────────────────────────

describe('optionsFilter — harmonizationGroup', () => {
  it('is hidden when store is empty even if hasHarmonization=true', () => {
    const ctx = { ...BASE_CTX, hasHarmonization: true, getAllGroupsLength: 0 }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).not.toContain('harmonizationGroup')
  })

  it('is hidden when hasHarmonization=false even if groups are loaded', () => {
    const ctx = { ...BASE_CTX, hasHarmonization: false, getAllGroupsLength: 3 }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).not.toContain('harmonizationGroup')
  })

  it('is visible when hasHarmonization=true AND groups are in the store', () => {
    const ctx = { ...BASE_CTX, hasHarmonization: true, getAllGroupsLength: 2 }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).toContain('harmonizationGroup')
  })

  it('is hidden when both hasHarmonization=false and store is empty', () => {
    const ctx = { ...BASE_CTX, hasHarmonization: false, getAllGroupsLength: 0 }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).not.toContain('harmonizationGroup')
  })
})

// ─── Tests: financingGroup visibility ────────────────────────────────────────

describe('optionsFilter — financingGroup', () => {
  it('is hidden when store is empty even if hasFinancing=true', () => {
    const ctx = { ...BASE_CTX, hasFinancing: true, getAllFinancingLength: 0 }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).not.toContain('financingGroup')
  })

  it('is hidden when hasFinancing=false even if groups are loaded', () => {
    const ctx = { ...BASE_CTX, hasFinancing: false, getAllFinancingLength: 3 }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).not.toContain('financingGroup')
  })

  it('is visible when hasFinancing=true AND groups are in the store', () => {
    const ctx = { ...BASE_CTX, hasFinancing: true, getAllFinancingLength: 1 }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).toContain('financingGroup')
  })
})

// ─── Tests: entity-level based filters ───────────────────────────────────────

describe('optionsFilter — entity level filters', () => {
  it('hides exportPdf on SPEND_LINES level', () => {
    const ctx = { ...BASE_CTX, entityLevel: ENTITY_LEVEL.SPEND_LINES }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).not.toContain('exportPdf')
  })

  it('shows exportPdf on SUPPLIERS level', () => {
    const ctx = { ...BASE_CTX, entityLevel: ENTITY_LEVEL.SUPPLIERS }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).toContain('exportPdf')
  })

  it('hides updateStatus when NOT on SPEND_LINES level', () => {
    const ctx = { ...BASE_CTX, entityLevel: ENTITY_LEVEL.SUPPLIERS }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).not.toContain('updateStatus')
  })

  it('shows updateStatus on SPEND_LINES level', () => {
    const ctx = { ...BASE_CTX, entityLevel: ENTITY_LEVEL.SPEND_LINES }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).toContain('updateStatus')
  })

  // AB#19545 / AC-05. The suppliers tab's bulk export hits the same gated endpoint as the
  // supplier card, so it follows the same entitlement. Ultimate Parent is out of scope (FR-04).
  it('hides exportPdf on SUPPLIERS level without the entity PDF feature', () => {
    const ctx = { ...BASE_CTX, entityLevel: ENTITY_LEVEL.SUPPLIERS, useFeatureDownloadPdfEntity: false }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).not.toContain('exportPdf')
  })

  it('keeps exportPdf on ULTIMATE_PARENT level without the entity PDF feature', () => {
    const ctx = { ...BASE_CTX, entityLevel: ENTITY_LEVEL.ULTIMATE_PARENT, useFeatureDownloadPdfEntity: false }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).toContain('exportPdf')
  })

  it('hides supplierUltimateParent on ULTIMATE_PARENT level', () => {
    const ctx = { ...BASE_CTX, userIsSuperAdmin: true, entityLevel: ENTITY_LEVEL.ULTIMATE_PARENT }
    expect(ids(buildOptionsFilter(ALL_OPTIONS, ctx))).not.toContain('supplierUltimateParent')
  })
})

// ─── Tests: shouldFetchHarmonization guard ───────────────────────────────────

describe('shouldFetchHarmonization', () => {
  it('returns true when enabled and store is empty', () => {
    expect(shouldFetchHarmonization(true, 0)).toBe(true)
  })

  it('returns false when disabled regardless of store state', () => {
    expect(shouldFetchHarmonization(false, 0)).toBe(false)
    expect(shouldFetchHarmonization(false, 3)).toBe(false)
  })

  it('returns false when enabled but store already has data (skip redundant fetch)', () => {
    expect(shouldFetchHarmonization(true, 2)).toBe(false)
  })
})

// ─── Tests: shouldFetchFinancing guard ───────────────────────────────────────

describe('shouldFetchFinancing', () => {
  it('returns true when enabled and store is empty', () => {
    expect(shouldFetchFinancing(true, 0)).toBe(true)
  })

  it('returns false when disabled regardless of store state', () => {
    expect(shouldFetchFinancing(false, 0)).toBe(false)
    expect(shouldFetchFinancing(false, 5)).toBe(false)
  })

  it('returns false when enabled but store already has data', () => {
    expect(shouldFetchFinancing(true, 1)).toBe(false)
  })
})
