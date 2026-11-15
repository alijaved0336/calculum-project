import { describe, expect, it } from 'vitest'
import {
  saleLineOverviewColumns,
  buyerOverviewColumns,
} from '@/modules/opportunity/data/overviewColumns'
import { saleMatchColumnsGrid } from '@/modules/match/data/graphqlColumns'

type Column = { field?: string; title?: string; children?: Column[] }

const flatten = (columns: Column[]): Column[] =>
  columns.flatMap((column) => (column.children ? flatten(column.children) : [column]))

const titleOf = (columns: Column[], field: string) =>
  flatten(columns).find((column) => column.field === field)?.title

/**
 * AB#20529: the buyer's original name reached the grids under three titles - "Original Buyer
 * Name" (hardcoded, so untranslated) on Match, "Buyer Original Name" on the Opportunity sale lines
 * and "Original Name" on the Opportunity buyers/parents. It is one concept, so it gets one label.
 * (Since column parity, 2026-10-02, the Parents level no longer lists it at all.)
 */
describe('Original name column label (AB#20529)', () => {
  it('uses one title on the Match grid and on every Opportunity grain', () => {
    const titles = [
      titleOf(saleMatchColumnsGrid as Column[], 'originalBuyerName'),
      titleOf(saleLineOverviewColumns() as Column[], 'buyerOriginalName'),
      titleOf(buyerOverviewColumns() as Column[], 'originalName'),
    ]

    expect(titles.every((title) => typeof title === 'string' && title.length > 0)).toBe(true)
    expect(new Set(titles).size).toBe(1)
  })
})
