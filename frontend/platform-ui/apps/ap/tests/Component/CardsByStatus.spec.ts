/**
 * CardsByStatus.vue cannot be mounted directly in this Vitest environment: it depends on
 * PillLabelNumberBadge.vue, which (confirmed by mounting it alone, with nothing else involved)
 * already fails to parse via a broken transitive icon import (iconGrantAccess.vue — a
 * fragment-only SVG template Vite's SSR transform can't handle outside its normal dev/build
 * pipeline). This is a pre-existing, project-wide test-harness limitation, unrelated to this
 * feature. Strategy: mirror the new Partial-aware branching logic here and test it directly
 * (same approach used in ManageTeamAction.spec.ts and the Kanban dialog specs this session) —
 * the underlying isPartialEntity/getStageBreakdownEntry primitives are already fully covered
 * by usePartialNegotiationStatus.spec.ts, so this only needs to verify the fallback branching.
 */
import { describe, it, expect } from 'vitest'
import { isPartialEntity, getStageBreakdownEntry, type StageBreakdownEntry } from '@/composables/usePartialNegotiationStatus'

// Mirrors CardsByStatus.vue's setValueforSpend/setPaymentTerms/setTargetType/setRebateType
// computeds exactly, including isAgreedColumn (columnStatus/statusCode, not the entity-level
// rolled-up info.negotiationStatus — a Partial card's column can differ from that rollup).
function isAgreedColumn(statusCode: string) {
  return statusCode === '400' || statusCode === '500'
}

function setValueforSpend(info: any, levelofGrid: number, statusCode: string) {
  const isPartial = isPartialEntity(info.negotiationStatusCodes)
  const stageEntry = isPartial ? getStageBreakdownEntry(info.stageBreakdown, statusCode) : null
  if (isPartial && stageEntry) {
    if (levelofGrid === 1) return stageEntry.count <= 0 ? '-' : stageEntry.count
    if (levelofGrid === 2) {
      const count = stageEntry.count ?? info.count
      return count <= 0 ? '-' : count
    }
  }
  switch (levelofGrid) {
    case 0: return info.spendAlias
    case 1: return info.spendCounts <= 0 ? '-' : info.spendCounts
    case 2: return info.supplierCounts <= 0 ? '-' : info.supplierCounts
    default: return '-'
  }
}

function setPaymentTerms(info: any, statusCode: string) {
  const isPartial = isPartialEntity(info.negotiationStatusCodes)
  const stageEntry = isPartial ? getStageBreakdownEntry(info.stageBreakdown, statusCode) : null
  if (isPartial && stageEntry) {
    const stageTerms = isAgreedColumn(statusCode) ? stageEntry.avgPaymentTermsWithoutDiscount : stageEntry.avgPaymentTerms
    return stageTerms ?? 'N/A'
  }
  if (isAgreedColumn(statusCode)) {
    return info.termsWithoutCashDiscount ?? 'N/A'
  }
  return info.modelPaymentTerms ?? 'N/A'
}

function setTargetType(info: any, statusCode: string) {
  const isPartial = isPartialEntity(info.negotiationStatusCodes)
  const stageEntry = isPartial ? getStageBreakdownEntry(info.stageBreakdown, statusCode) : null
  if (isPartial && stageEntry) return stageEntry.cashFlowTarget ?? 'N/A'
  if (isAgreedColumn(statusCode)) {
    return info.agreedCashFlow ?? 'N/A'
  }
  return info.modelCashFlow ?? 'N/A'
}

function setRebateType(info: any, statusCode: string) {
  const isPartial = isPartialEntity(info.negotiationStatusCodes)
  const stageEntry = isPartial ? getStageBreakdownEntry(info.stageBreakdown, statusCode) : null
  const rebate = isPartial && stageEntry ? stageEntry.vCardRebateFull : info.vCardRebateFull
  return rebate ? rebate : 'N/A'
}

function baseInfo(overrides: Record<string, any> = {}) {
  return {
    negotiationStatus: 'contacted',
    spendCounts: 5,
    supplierCounts: 3,
    modelPaymentTerms: 40,
    modelCashFlow: 12000,
    ...overrides
  }
}

const breakdown: StageBreakdownEntry[] = [
  { stageCode: 200, count: 3, avgPaymentTerms: 20, avgPaymentTermsWithoutDiscount: 25, cashFlowTarget: 4000, vCardRebateFull: null },
  { stageCode: 300, count: 2, avgPaymentTerms: 60, avgPaymentTermsWithoutDiscount: 65, cashFlowTarget: 8000, vCardRebateFull: 900 }
]

describe('CardsByStatus Partial-aware value resolution', () => {
  it('non-Partial: setValueforSpend/setPaymentTerms/setTargetType are unchanged from today (AC-05)', () => {
    const info = baseInfo()
    expect(setValueforSpend(info, 1, '300')).toBe(5)
    expect(setPaymentTerms(info, '300')).toBe(40)
    expect(setTargetType(info, '300')).toBe(12000)
  })

  it('Partial: uses the stage-scoped entry matching statusCode, not the entity-level totals', () => {
    const info = baseInfo({ negotiationStatusCodes: '200,300', stageBreakdown: breakdown })
    expect(setValueforSpend(info, 1, '300')).toBe(2)
    expect(setPaymentTerms(info, '300')).toBe(60)
    expect(setTargetType(info, '300')).toBe(8000)
  })

  it('Partial: a different column instance of the same card resolves its own stage slice', () => {
    const info = baseInfo({ negotiationStatusCodes: '200,300', stageBreakdown: breakdown })
    expect(setValueforSpend(info, 1, '200')).toBe(3)
    expect(setPaymentTerms(info, '200')).toBe(20)
    expect(setTargetType(info, '200')).toBe(4000)
  })

  it('parent-level Partial card uses stage-scoped count, falling back to entity-level "count" if absent', () => {
    const withCount = baseInfo({ negotiationStatusCodes: '200,300', stageBreakdown: breakdown })
    expect(setValueforSpend(withCount, 2, '300')).toBe(2)

    const withoutCount = baseInfo({
      negotiationStatusCodes: '200,300',
      count: 9,
      stageBreakdown: [{ stageCode: 300, avgPaymentTerms: 60, cashFlowTarget: 8000 } as any]
    })
    expect(setValueforSpend(withoutCount, 2, '300')).toBe(9)
  })

  it('Partial but no matching stageBreakdown entry: falls back to entity-level totals', () => {
    const info = baseInfo({ negotiationStatusCodes: '200,300', stageBreakdown: [] })
    expect(setValueforSpend(info, 1, '300')).toBe(5)
    expect(setPaymentTerms(info, '300')).toBe(40)
    expect(setTargetType(info, '300')).toBe(12000)
  })

  it('agreed/agreedExtended non-Partial branch is unaffected', () => {
    const info = baseInfo({ negotiationStatus: 'agreed', termsWithoutCashDiscount: 15, agreedCashFlow: 5000 })
    expect(setPaymentTerms(info, '400')).toBe(15)
    expect(setTargetType(info, '400')).toBe(5000)
  })

  describe('Partial entity spanning agreed (400) and agreedExtended (500)', () => {
    // Mirrors the real Zelisko example: negotiationStatusCodes "400,500", rolled-up
    // negotiationStatus "agreed" (its lowest stage) — the card also renders in the
    // agreedExtended column, where isAgreedColumn must key off that column, not the rollup.
    const agreedBreakdown: StageBreakdownEntry[] = [
      { stageCode: 400, count: 1, avgPaymentTerms: 45, avgPaymentTermsWithoutDiscount: 77, cashFlowTarget: 4187.1, vCardRebateFull: 2641.7 },
      { stageCode: 500, count: 1, avgPaymentTerms: 45, avgPaymentTermsWithoutDiscount: 95, cashFlowTarget: 1339.8, vCardRebateFull: null }
    ]

    it('uses avgPaymentTermsWithoutDiscount (not avgPaymentTerms) for an agreed/agreedExtended column', () => {
      const info = baseInfo({ negotiationStatus: 'agreed', negotiationStatusCodes: '400,500', stageBreakdown: agreedBreakdown })
      expect(setPaymentTerms(info, '400')).toBe(77)
      expect(setPaymentTerms(info, '500')).toBe(95)
    })

    it('uses the stage-scoped vCardRebateFull per column, including null for a stage with no rebate', () => {
      const info = baseInfo({ negotiationStatus: 'agreed', negotiationStatusCodes: '400,500', stageBreakdown: agreedBreakdown })
      expect(setRebateType(info, '400')).toBe(2641.7)
      expect(setRebateType(info, '500')).toBe('N/A')
    })

    it('a non-agreed column on the same card still uses avgPaymentTerms, not the WithoutDiscount variant', () => {
      const info = baseInfo({
        negotiationStatus: 'agreed',
        negotiationStatusCodes: '200,400',
        stageBreakdown: [
          { stageCode: 200, count: 1, avgPaymentTerms: 30, avgPaymentTermsWithoutDiscount: 35, cashFlowTarget: 1000, vCardRebateFull: null },
          agreedBreakdown[0]
        ]
      })
      expect(setPaymentTerms(info, '200')).toBe(30)
    })
  })
})
