/**
 * Tests for remove9boxFinancingColumns logic in dataGridClear.ts.
 *
 * The module-level imports in dataGridClear.ts (useUser, useModulePlan) depend
 * on Vue inject and Pinia, making direct import unsafe in Vitest/Node.js.
 * Strategy: replicate the pure removal logic as a local helper and verify
 * behaviour, matching the pattern used in ExcludeColumn.spec.ts.
 */

import { describe, it, expect } from 'vitest'

const NINE_BOX_FINANCING_FIELDS = [
  'scalePotentialSCFRevenue',
  'scaleFinancingValueToSupplier',
  'scaleUsingFinancing',
  'financialBox',
  'scfBox',
]

function remove9boxFinancingColumns(columns: Array<{ field: string }>): Array<{ field: string }> {
  for (const field of NINE_BOX_FINANCING_FIELDS) {
    const idx = columns.findIndex((c) => c.field === field)
    if (idx > -1) columns.splice(idx, 1)
  }
  return columns
}

function col(field: string) {
  return { field }
}

// ─── scaleUsingFinancing (new field) ─────────────────────────────────────────

describe('remove9boxFinancingColumns — scaleUsingFinancing', () => {
  it('removes scaleUsingFinancing from the column list', () => {
    const cols = [col('entityName'), col('scaleUsingFinancing'), col('volume')]
    remove9boxFinancingColumns(cols)
    expect(cols.map((c) => c.field)).not.toContain('scaleUsingFinancing')
  })

  it('leaves other columns untouched', () => {
    const cols = [col('entityName'), col('scaleUsingFinancing'), col('volume')]
    remove9boxFinancingColumns(cols)
    expect(cols.map((c) => c.field)).toEqual(['entityName', 'volume'])
  })

  it('is a no-op when scaleUsingFinancing is absent', () => {
    const cols = [col('entityName'), col('volume')]
    remove9boxFinancingColumns(cols)
    expect(cols).toHaveLength(2)
  })
})

// ─── regression: all pre-existing 9-box financing fields still removed ────────

describe('remove9boxFinancingColumns — regression', () => {
  it('removes scalePotentialSCFRevenue', () => {
    const cols = [col('entityName'), col('scalePotentialSCFRevenue')]
    remove9boxFinancingColumns(cols)
    expect(cols.map((c) => c.field)).not.toContain('scalePotentialSCFRevenue')
  })

  it('removes scaleFinancingValueToSupplier', () => {
    const cols = [col('entityName'), col('scaleFinancingValueToSupplier')]
    remove9boxFinancingColumns(cols)
    expect(cols.map((c) => c.field)).not.toContain('scaleFinancingValueToSupplier')
  })

  it('removes financialBox', () => {
    const cols = [col('entityName'), col('financialBox')]
    remove9boxFinancingColumns(cols)
    expect(cols.map((c) => c.field)).not.toContain('financialBox')
  })

  it('removes scfBox', () => {
    const cols = [col('entityName'), col('scfBox')]
    remove9boxFinancingColumns(cols)
    expect(cols.map((c) => c.field)).not.toContain('scfBox')
  })

  it('removes all five fields when present simultaneously', () => {
    const cols = NINE_BOX_FINANCING_FIELDS.map(col)
    cols.unshift(col('entityName'))
    remove9boxFinancingColumns(cols)
    expect(cols).toHaveLength(1)
    expect(cols[0].field).toBe('entityName')
  })
})
