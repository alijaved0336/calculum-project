import { describe, it, expect } from 'vitest'
import { footerColumns, readColumns } from '@progress/kendo-vue-grid'
import {
  normalizeGraphqlGridColumns,
  mergeCachedGraphqlGridColumns,
  isGraphqlGridColumnGroup,
  visibleGraphqlGridColumns,
  type GraphqlGridColumn,
  type GraphqlGridColumnOrGroup,
} from '@ada/design-system/components/graphql-grid/types'
import { applyCustomAttributeDefinitions } from '@/utils/customAttributeColumns'
import { saleMatchColumnsGrid } from '@/modules/match/data/graphqlColumns'
import type { CustomAttributeDefinition } from '@/api'

/**
 * Guards against the Match module freeze (production/DEV, 2026-08-20) without a browser.
 *
 * ROOT CAUSE (confirmed): @progress/kendo-vue-grid@9.1.0's own `footerColumns` feature hangs the
 * tab in an infinite loop when a grid's `columns` contain BOTH a grouped (two-level) column header
 * AND a `footerCell`-bearing column, anywhere in the array. Either alone is safe. Confirmed live in
 * a debugger, twice, across two separate deploys - the stack sits in `footerColumns`'s own
 * ancestor-walk (`for (;r;) { ...; r = e[r.parentIndex] }`), which never terminates. Also confirmed
 * as a REGRESSION, not a combination that never worked: `apps/ap`'s `home/overview/data/columns.ts`
 * (`defaultMatchOverviewListGridColumns`) runs the identical shape - two grouped headers,
 * `footerCell` on a leaf in the second group - against `@progress/kendo-vue-grid@4.3.3`, in
 * production, with no issue.
 *
 * Ruled out first, before landing on the above: this repo's own `orderIndex` cache passthrough
 * (mergeCachedGraphqlGridColumns - removed it, redeployed, identical freeze persisted),
 * `columnVirtualization` (confirmed off), Kendo license coverage (confirmed valid), the exact
 * dataset (reproduced with identical data pre/post), and a network/promise hang (every request
 * completes fast, per DevTools' Network Timing tab - the hang is synchronous JS after data
 * arrives). The 4 scenarios below exercise the cache-merge path specifically and confirm it was
 * never the cause.
 *
 * THE MECHANISM (found 2026-10-05, column parity): Kendo numbers every column's `parentIndex` over
 * the FULL flattened list, hidden columns included (`readColumns`), then drops the hidden ones
 * (Grid's `filterColumns`) and walks `parentIndex` over what is left (`footerColumns`). With a
 * hidden column in a grouped grid the indices point at the wrong columns, and the walk can land on
 * a leaf whose parentIndex is its own position - forever. The stakeholder decision of 2026-08-20
 * (drop grouped grids' totals) is superseded: GraphqlGrid's `renderedColumns` now hands Kendo only
 * visible columns (`visibleGraphqlGridColumns`), so nothing shifts and Match keeps both its grouped
 * headers and its totals, like AP. The last `describe` below reproduces the hang with Kendo's own
 * functions and guards the fix.
 *
 * `kendoReadColumns` / `hasAncestorFooterCell` are a faithful, line-by-line port of
 * kendo-vue-grid@9.1.0's utils/main.js `readColumns` (internally `M`) and `footerColumns`'s
 * ancestor-walk (`K`) - not importable directly, since the package's "exports" map only publishes
 * its root entry point. They model Kendo's per-render `id`-matching against a previous render's
 * flattened column state (`currentColumnsState`), used below to test whether OUR OWN
 * column-building code (the cache merge, column show/hide, etc.) can hand a node a stale
 * `orderIndex` that later cycles - it can't, per the 4 scenarios below. They do NOT reproduce the
 * actual trigger (grouped headers + footerCell) - that needs real Kendo/browser behavior beyond
 * what these two functions alone capture. Treat them as a regression guard on the ruled-out cache
 * mechanism, not as proof of the root cause.
 */

const MAX_STEPS = 10_000

interface KendoFlatColumn {
  id: string
  parentIndex: number
  children: KendoFlatColumn[]
  hidden: boolean
  orderIndex?: number
  width?: unknown
  footerCell?: unknown
  cells?: { footerCell?: unknown }
  declarationIndex: number
  [key: string]: unknown
}

/** Port of kendo-vue-grid@9.1.0's utils/main.js `M` (exported as `readColumns`). */
function kendoReadColumns(
  columns: GraphqlGridColumnOrGroup[] | undefined,
  previousState: KendoFlatColumn[] | undefined,
  counter: { prevId: number },
  depth = 0,
  inheritedHidden = false,
): KendoFlatColumn[] {
  const built: KendoFlatColumn[] = []
  if (!columns) return []

  columns.forEach((raw) => {
    const source = raw as Record<string, unknown>
    const id = typeof source.id === 'string' ? source.id : `column-${counter.prevId++}`
    const hidden = inheritedHidden || Boolean(source.hidden)
    const previousMatch = previousState?.find((candidate) => candidate.id === id)
    const children = kendoReadColumns(
      isGraphqlGridColumnGroup(raw) ? raw.children : undefined,
      previousMatch?.children,
      counter,
      depth + 1,
      hidden,
    )

    built.push({
      ...source,
      depth,
      id,
      declarationIndex: built.length,
      children,
      hidden,
      parentIndex: -2, // overwritten by the flatten pass below; -2 marks "not yet assigned"
      ...(previousMatch ? { width: previousMatch.width, orderIndex: previousMatch.orderIndex } : {}),
    } as KendoFlatColumn)
  })

  built.sort((a, b) =>
    a.orderIndex === b.orderIndex
      ? a.declarationIndex - b.declarationIndex
      : (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  )

  if (depth !== 0) return built

  const flat: KendoFlatColumn[] = []
  const flatten = (nodes: KendoFlatColumn[], parentIndex: number) =>
    nodes.forEach((node) => {
      node.parentIndex = parentIndex
      flatten(node.children, flat.push(node) - 1)
    })
  flatten(built, -1)
  return flat
}

/** Port of kendo-vue-grid@9.1.0's utils/main.js `K`, the ancestor-walk `footerColumns` (`$`) uses. */
function hasAncestorFooterCell(flat: KendoFlatColumn[], node: KendoFlatColumn): boolean {
  let steps = 0
  let cur = flat[node.parentIndex]
  while (cur) {
    if (steps++ > MAX_STEPS) {
      throw new Error(
        `Infinite loop: parentIndex ancestor walk from column "${node.id}" (field ${String(node.field)}) exceeded ${MAX_STEPS} steps without terminating - this is the exact freeze reported in production.`,
      )
    }
    if (cur.footerCell || cur.cells?.footerCell) return true
    cur = flat[cur.parentIndex]
  }
  return false
}

/** Runs Kendo's own footer-column pass over every node, the way GraphqlGrid's totals footer does. */
function assertNoParentIndexCycle(flat: KendoFlatColumn[]): void {
  for (const node of flat) {
    expect(() => hasAncestorFooterCell(flat, node)).not.toThrow()
  }
}

function freshCustomAttributes(hasDataForOrdinals: number[]): CustomAttributeDefinition[] {
  return Array.from({ length: 20 }, (_, i) => i + 1).map((ordinal) => ({
    ordinal,
    title: `Custom ${ordinal}`,
    dataType: 'text',
    aggregation: 'list',
    hasData: hasDataForOrdinals.includes(ordinal),
  }))
}

describe('ListMatch grid column parentIndex cycle (kendo-vue-grid 9.1.0)', () => {
  it('does not cycle across a fresh mount (no previous render state)', () => {
    const counter = { prevId: 0 }
    const columns = normalizeGraphqlGridColumns(saleMatchColumnsGrid)
    const flat = kendoReadColumns(columns, undefined, counter)
    assertNoParentIndexCycle(flat)
  })

  it('offers custom-attribute columns only the operators a per-ordinal filter accepts', () => {
    // The reported defect: filtering a custom column built a `where` naming `customDataPoint12`,
    // which `SaleMatchRowFactFilterInput` does not have, so GraphQL rejected the whole query and the
    // grid went blank. The fix is not to remove the filter but to send it the right way — as the list
    // field's `customFilters` argument — and to offer only what that argument accepts.
    //
    // `startswith`/`endswith` are the two the ordinal vocabulary has no equivalent for, so the menu
    // must not show them: an operator offered and unhonourable is the same class of defect as the
    // dropdown that answered 400.
    const normalized = normalizeGraphqlGridColumns(saleMatchColumnsGrid)
    const leaves = normalized.flatMap((column) =>
      isGraphqlGridColumnGroup(column) ? column.children : [column]) as
      { field?: string; columnMenu?: boolean; filterOperators?: string[] }[]

    const custom = leaves.filter((leaf) => leaf.field?.startsWith('customDataPoint'))
    expect(custom).not.toHaveLength(0)

    for (const column of custom) {
      // The menu is back on — it was switched off while the ordinal path was unwired.
      expect(column.columnMenu).toBe(true)
      expect(column.filterOperators).toContain('contains')
      expect(column.filterOperators).toContain('eq')
      expect(column.filterOperators).not.toContain('startswith')
      expect(column.filterOperators).not.toContain('endswith')
    }

    // A fixed column declares no allow-list at all, so it keeps its filter type's full menu: the
    // narrowing is per column, not a grid-wide retreat.
    const fixed = leaves.filter((leaf) => !leaf.field?.startsWith('customDataPoint'))
    expect(fixed.every((leaf) => leaf.filterOperators === undefined)).toBe(true)
  })

  it('does not cycle when loadCustomAttributes() resolves after mount and reveals the customAttributes group', () => {
    // Render A: mount, before fetchCustomAttributes resolves - every customDataPoint column
    // still hidden (hasData unknown), so GraphqlGrid's renderedColumns computed drops the whole
    // "Custom Attributes" group before it ever reaches Kendo (see Index.vue's renderedColumns).
    const columnsA = normalizeGraphqlGridColumns(saleMatchColumnsGrid)
    const renderedA = columnsA.filter((column) =>
      isGraphqlGridColumnGroup(column) ? column.children.some((child) => child.hidden !== true) : true,
    )
    const counterA = { prevId: 0 }
    const flatA = kendoReadColumns(renderedA, undefined, counterA)
    assertNoParentIndexCycle(flatA)

    // Render B: loadCustomAttributes() resolved - customDataPoint3/7 now have data, so the group
    // is no longer fully hidden and reappears in renderedColumns (ListMatch.vue:225-227).
    const columnsB = applyCustomAttributeDefinitions(columnsA, freshCustomAttributes([3, 7]))
    const renderedB = columnsB.filter((column) =>
      isGraphqlGridColumnGroup(column) ? column.children.some((child) => child.hidden !== true) : true,
    )
    const counterB = { prevId: 0 }
    const flatB = kendoReadColumns(renderedB, flatA, counterB)
    assertNoParentIndexCycle(flatB)
  })

  it('does not cycle when the user hides/shows a column via GraphqlGridColumnSelector (update:columns)', () => {
    const columnsA = normalizeGraphqlGridColumns(saleMatchColumnsGrid)
    const counterA = { prevId: 0 }
    const flatA = kendoReadColumns(columnsA, undefined, counterA)
    assertNoParentIndexCycle(flatA)

    // The user toggles one column's visibility - same shape, only a `hidden` flag flips (this is
    // exactly what ColumnSelector's checkbox does, per its own onReset/onSave contract).
    const columnsB = columnsA.map((column) =>
      isGraphqlGridColumnGroup(column)
        ? {
            ...column,
            children: column.children.map((child) =>
              child.field === 'originalBuyerName' ? { ...child, hidden: !child.hidden } : child,
            ),
          }
        : column,
    )
    const counterB = { prevId: 0 }
    const flatB = kendoReadColumns(columnsB, flatA, counterB)
    assertNoParentIndexCycle(flatB)
  })

  it('does not cycle across a code deploy that changes the column set while a stale cache is merged in (the originally-suspected path)', () => {
    // Simulates: the user's browser has a persisted snapshot from BEFORE a deploy added/removed
    // columns. Kendo's own currentColumnsState starts empty on a fresh mount, so this exercises
    // whether OUR merge (not Kendo's internal render-to-render state) can produce a cycle.
    const staleCachedColumns = normalizeGraphqlGridColumns(saleMatchColumnsGrid).map((column) =>
      isGraphqlGridColumnGroup(column)
        ? { ...column, children: column.children.slice(0, -1) } // one fewer column than today
        : column,
    )
    const merged = mergeCachedGraphqlGridColumns(normalizeGraphqlGridColumns(saleMatchColumnsGrid), staleCachedColumns)
    const counter = { prevId: 0 }
    const flat = kendoReadColumns(merged, undefined, counter)
    assertNoParentIndexCycle(flat)
  })

})

/** Kendo's footerColumns ancestor walk, step-capped so a cycle fails the test instead of hanging it. */
function footerWalkCycles(columns: Array<{ parentIndex: number }>): boolean {
  for (const column of columns) {
    let parent = columns[column.parentIndex] as { parentIndex: number; footerCell?: unknown } | undefined
    for (let steps = 0; parent; steps++) {
      if (parent.footerCell) break
      if (steps > MAX_STEPS) return true
      parent = columns[parent.parentIndex] as typeof parent
    }
  }
  return false
}

/** What Grid.vue does before the footer: kendo's own readColumns, then filterColumns (visible only). */
function kendoFooterInput(columns: GraphqlGridColumnOrGroup[]) {
  const flat = readColumns(columns as never, [], { prevId: 0, idPrefix: 'spec' }) as Array<{ hidden?: boolean; parentIndex: number }>
  return flat.filter((column) => !column.hidden)
}

describe('WI#18884 - grouped grid with a totals footer, against kendo-vue-grid 9.1.0 itself', () => {
  const leaf = (field: string, hidden: boolean, footerCell?: string): GraphqlGridColumn =>
    ({ field, title: field, hidden, ...(footerCell ? { footerCell } : {}) })
  // The Match grid as it was when the tab hung: hidden leaves inside both groups.
  const hangingShape: GraphqlGridColumnOrGroup[] = [
    { title: 'Results', children: [leaf('matchStatus', false), leaf('isMatched', true), leaf('isExcluded', true), leaf('confidenceScore', false), leaf('buyerName', true)] },
    { title: 'Details', children: [
      leaf('originalBuyerName', true), leaf('aggregatedLinesCount', false), leaf('originalIdNumber', false),
      leaf('parentCompanyName', false), leaf('received', false), leaf('volume', false, 'TotalsBycolumnsSum'),
    ] },
  ]

  it('reproduces the hang: hidden columns shift parentIndex and the footer walk cycles', () => {
    expect(footerWalkCycles(kendoFooterInput(hangingShape))).toBe(true)
  })

  it('handing Kendo only visible columns ends the walk, with the grouped headers and the footer both kept', () => {
    const visible = visibleGraphqlGridColumns(hangingShape)
    expect(visible.every(isGraphqlGridColumnGroup)).toBe(true)
    const input = kendoFooterInput(visible)
    expect(footerWalkCycles(input)).toBe(false)
    // Kendo's own footerColumns now returns, and still finds the footer.
    expect(footerColumns(input as never).some((column: { footerCell?: unknown }) => column.footerCell)).toBe(true)
  })

  it('the real Match columns, with their parity totals, never cycle', () => {
    const columns = normalizeGraphqlGridColumns(saleMatchColumnsGrid)
    expect(columns.some(isGraphqlGridColumnGroup)).toBe(true)
    expect(footerWalkCycles(kendoFooterInput(visibleGraphqlGridColumns(columns)))).toBe(false)
  })

  it('drops hidden leaves and fully hidden groups, and leaves flat footers untouched', () => {
    const result = visibleGraphqlGridColumns([
      leaf('a', true),
      leaf('b', false, 'TotalsBycolumnsSum'),
      { title: 'Empty', children: [leaf('c', true)] },
      { title: 'Kept', children: [leaf('d', true), leaf('e', false)] },
    ])
    expect(result).toEqual([
      leaf('b', false, 'TotalsBycolumnsSum'),
      { title: 'Kept', children: [leaf('e', false)] },
    ])
  })
})

/**
 * AB#20489: normalizeGraphqlGridColumns drops any footerCell name Index.vue has no template for
 * (GRAPHQL_GRID_FOOTER_TEMPLATES) - by design, per its own comment, for a genuinely unknown name.
 * "TotalsBycolumnsAvgWeighted" (the plain, non-ceil weighted average AB#20356's follow-up added
 * for capturedCashDiscounts) had a real template in Index.vue but was never added to this
 * allow-list, so normalizeGraphqlGridColumns silently stripped it on every column using it -
 * that column's field then never reached the summary request's `weightedAverage` bucket, and its
 * footer stayed permanently empty. One test per template name Index.vue actually declares, so a
 * future template gaining the same gap fails here instead of silently, again.
 */
describe('normalizeGraphqlGridColumns - footerCell allow-list (AB#20489)', () => {
  it.each([
    'TotalsBycolumnsSum',
    'TotalsBycolumnsCount',
    'TotalsBycolumnsAvgWeightedCeil',
    'TotalsBycolumnsAvgWeighted',
    'TotalsBycolumnsCountTrue',
  ])('keeps footerCell %s - Index.vue has a template for it', (footerCell) => {
    const result = normalizeGraphqlGridColumns([{ field: 'a', title: 'A', footerCell }])
    expect(result[0]).toHaveProperty('footerCell', footerCell)
  })

  it('drops a footerCell name Index.vue has no template for', () => {
    const result = normalizeGraphqlGridColumns([{ field: 'a', title: 'A', footerCell: 'SomeOtherAppsTemplate' }])
    expect(result[0]).not.toHaveProperty('footerCell')
  })
})
