/**
 * AB#19950: the Opportunity and Target columns are merged into one, in every AP list.
 *
 * The merged column must read the field the backend already coalesces:
 *   - modelPaymentTerms = coalesce(spend.target_payment_terms, config.model_payment_terms)
 *   - modelCashFlow     = cash flow computed from those same target-or-model terms
 *     (CashFlowTargetProgramManager), gated on the program's enabled spends.
 * Reading proposedPaymentTerms / opportunityCashFlow instead would silently ignore the target
 * on the 3.4k spend lines that carry one; reading targetPaymentTerms leaves the column empty
 * for every line that does not (which is what this story is retiring).
 */

import { describe, it, expect } from 'vitest'

import * as analyzeColumns from '@/modules/home/analyze/data/graphqlColums'
import * as nineBoxesColumns from '@/modules/home/analyze/data/9boxesGraphQlColumns'
import * as planColumns from '@/modules/home/plan/data/graphqlColumns'
import * as entityCardColumns from '@/modules/home/entityCard/data/graphqlColums'
import * as waterfallColumns from '@/modules/home/analyze/data/waterfallGraphQlColumns'

const RETIRED = ['targetPaymentTerms', 'targetCashFlow']
const MERGED = { paymentTerms: 'modelPaymentTerms', cashFlow: 'modelCashFlow' }
const OLD_OPPORTUNITY_ONLY = ['proposedPaymentTerms', 'opportunityCashFlow']

const lists = Object.entries({
  ...analyzeColumns,
  ...nineBoxesColumns,
  ...planColumns,
  ...entityCardColumns,
  ...waterfallColumns,
}).filter(([, value]) => Array.isArray(value)) as [string, any[]][]

const fieldsOf = (cols: any[]) => cols.map((c: any) => c?.field)

it('covers every exported list', () => {
  expect(lists.length).toBeGreaterThan(20)
})

describe.each(lists)('%s', (_name, columns) => {
  const fields = fieldsOf(columns)

  it('no longer carries a separate Target column', () => {
    expect(fields.filter((f: string) => RETIRED.includes(f))).toEqual([])
  })

  it('does not read the Opportunity-only fields, which ignore the target', () => {
    expect(fields.filter((f: string) => OLD_OPPORTUNITY_ONLY.includes(f))).toEqual([])
  })

  it.each(Object.values(MERGED))('carries %s at most once', (field) => {
    expect(fields.filter((f: string) => f === field).length).toBeLessThanOrEqual(1)
  })

  it('shows the merged columns by default', () => {
    Object.values(MERGED).forEach((field) => {
      const i = fields.indexOf(field)
      if (i > -1) expect(columns[i].hidden).toBe(false)
    })
  })
})
