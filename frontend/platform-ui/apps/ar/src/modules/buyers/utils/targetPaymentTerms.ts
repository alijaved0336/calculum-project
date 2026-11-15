/**
 * AB#20657 (Add Target Receivables): the Target modal's own rules, kept out of the component so
 * they can be tested without mounting it. Mirrors AP's `ModalPTTarget.vue` validation and
 * `useNegotiationPaymentTermsTarget.ts` scope building, on AR's buyer / parent / sale-line grains.
 */
import type { GraphqlGridFilterDescriptor } from '@ada/design-system/components/graphql-grid/types'
import {
  flattenFilterDescriptors,
  kendoFilterToGraphqlWhere,
  partitionFilterDescriptor,
} from '@ada/design-system/components/graphql-grid/kendoToGraphql'
import type { PartyRole, TargetPaymentTermsRole, TargetPaymentTermsScope } from '@/api'
import {
  isCustomDataPointField,
  toCustomAttributeFilters,
  type CustomAttributeGridFilter,
} from '@/utils/customAttributeColumns'

export const TARGET_MIN_DAYS = 0
export const TARGET_MAX_DAYS = 365

export type TargetDaysValidation = { ok: true; value: number } | { ok: false }

/**
 * EF-1: a whole number of days from 0 to 365. The input is a `type="number"` field, but its raw
 * value still reaches here as a string ("12.5", "-5", "" or "1e2" all pass the browser), so the
 * check is on the text itself - digits only - rather than on `Number(raw)`, which would accept
 * "1e2" as 100 and "" as 0.
 */
export function validateTargetDays(raw: string | number | null | undefined): TargetDaysValidation {
  const text = raw === null || raw === undefined ? '' : String(raw).trim()
  if (!/^\d+$/.test(text)) {
    return { ok: false }
  }
  const value = Number(text)
  return value >= TARGET_MIN_DAYS && value <= TARGET_MAX_DAYS ? { ok: true, value } : { ok: false }
}

/**
 * Which of a party's sale lines are selected, across every page of a server-paged grid
 * (`OpportunityListBuyers` in selectable mode). Only one page of rows is ever on hand, so "all"
 * cannot be a list of ids: `all: true` means every line EXCEPT `ids`, `all: false` means ONLY
 * `ids`. That keeps "all selected" (the modal's default, FR-02) exact for a family of any size.
 */
export interface SaleLineSelection {
  all: boolean
  ids: number[]
}

export const allLinesSelection = (): SaleLineSelection => ({ all: true, ids: [] })
export const noLinesSelection = (): SaleLineSelection => ({ all: false, ids: [] })

export const isLineSelected = (selection: SaleLineSelection, id: number): boolean =>
  selection.all !== selection.ids.includes(id)

export const selectedLineCount = (selection: SaleLineSelection, total: number): number =>
  selection.all ? Math.max(total - selection.ids.length, 0) : selection.ids.length

/**
 * Folds the grid's answer for the page on screen (`pageIds`, each `true`/`false` in `next`) into
 * the cross-page selection, then normalizes: every line picked one by one becomes `all`, every
 * line excluded becomes none - so `all` with no exceptions is the one shape that means "the whole
 * party", whichever way the analyst got there.
 */
export function applyPageSelection(
  selection: SaleLineSelection,
  pageIds: number[],
  next: Record<string, unknown>,
  total: number,
): SaleLineSelection {
  const ids = new Set(selection.ids)
  for (const id of pageIds) {
    const picked = Boolean(next[String(id)])
    // `ids` holds the exceptions to `all`: in all-mode an unpicked line joins them, otherwise a
    // picked one does.
    if (picked !== selection.all) ids.add(id)
    else ids.delete(id)
  }
  if (total > 0 && ids.size >= total) {
    return selection.all ? noLinesSelection() : allLinesSelection()
  }
  return { all: selection.all, ids: [...ids] }
}

/** The `where` that narrows `saleLineOverviewRows` to one party's lines: a Counterparty's own, or
 * a Parent's whole family (`OpportunityListBuyers` and the modal's id lookup share it). `null` for
 * an id that could never match - "don't fetch", never "fetch every line in the version". */
export function partySaleLinesWhere(partyId: number | string, role: PartyRole | undefined): Record<string, unknown> | null {
  const id = Number(partyId)
  if (!Number.isFinite(id)) return null
  return role === 'Parent' ? { parentId: { eq: id } } : { buyerId: { eq: id } }
}

/**
 * The party's lines narrowed further by the grid's own column filters - the query
 * `OpportunityListBuyers` pages through, and the one the modal's full-id lookup repeats, so both
 * read the same population. Custom attributes leave the `where` and ride the field argument, the
 * same split `OverviewList.vue` makes (they are not fields of the filter input).
 */
export function partySaleLinesQuery(
  partyId: number | string,
  role: PartyRole | undefined,
  filter: GraphqlGridFilterDescriptor | undefined,
): { where: Record<string, unknown>; customFilters: CustomAttributeGridFilter[] } | null {
  const partyWhere = partySaleLinesWhere(partyId, role)
  if (partyWhere === null) return null
  const split = partitionFilterDescriptor(filter, isCustomDataPointField)
  const filterWhere = kendoFilterToGraphqlWhere(split.first)
  return {
    where: filterWhere ? { and: [partyWhere, filterWhere] } : partyWhere,
    customFilters: toCustomAttributeFilters(flattenFilterDescriptors(split.second)),
  }
}

/** The grid's applied filters as the `telerikFilter` the Target endpoint receives: the Kendo
 * descriptor, JSON-encoded the way the Opportunity summary request already sends its own
 * (`OverviewList.vue`), with an empty `and` when nothing is filtered. */
export const toTelerikFilter = (filter: GraphqlGridFilterDescriptor | undefined): string =>
  JSON.stringify(filter ?? { logic: 'and', filters: [] })

/** What `buildTargetScope` decides; the modal adds the party and the grid's `telerikFilter`. */
export type TargetLineScope = Omit<TargetPaymentTermsScope, 'partyId' | 'telerikFilter'>

export type TargetScopeResult = { ok: true; scope: TargetLineScope } | { ok: false }

/** The request's `role`: a family's card is `Parent`, any other party's is `Counterparty`. */
export const toTargetRole = (role: PartyRole | undefined): TargetPaymentTermsRole =>
  role === 'Parent' ? 'Parent' : 'Counterparty'

/**
 * Which lines a save/clear reaches (FR-03). The target is always written on sale lines, so
 * `level` is always `SaleLine`; `role` says which kind of party they belong to, and:
 * - a specific sale line is open on the card (its Sale Line tab): exactly that line;
 * - every line selected: `all: true` with `saleLineIds: null` - the backend resolves the party's
 *   lines itself (narrowed by `telerikFilter`);
 * - only some selected: `all: false` with exactly those ids. When the selection is "all except a
 *   few", the caller passes the full `allIds` (same filters) so the exceptions come out of it.
 * Nothing selected is EF-2.
 */
export function buildTargetScope(options: {
  role: PartyRole | undefined
  /** The Sale Line tab's own line, when the card is sitting on one. */
  activeSaleLineId?: number
  selection: SaleLineSelection
  total: number
  allIds?: number[]
}): TargetScopeResult {
  const { activeSaleLineId, selection, total, allIds } = options
  const base = { level: 'SaleLine', role: toTargetRole(options.role) } as const
  if (activeSaleLineId !== undefined) {
    return { ok: true, scope: { ...base, all: false, saleLineIds: [activeSaleLineId] } }
  }
  if (selectedLineCount(selection, total) === 0) {
    return { ok: false }
  }
  if (selection.all && selection.ids.length === 0) {
    return { ok: true, scope: { ...base, all: true, saleLineIds: null } }
  }
  const saleLineIds = selection.all
    ? (allIds ?? []).filter((id) => !selection.ids.includes(id))
    : [...selection.ids]
  return saleLineIds.length === 0 ? { ok: false } : { ok: true, scope: { ...base, all: false, saleLineIds } }
}

/** Whether `buildTargetScope` needs the party's full id list (an "all except a few" selection). */
export const needsAllLineIds = (selection: SaleLineSelection): boolean =>
  selection.all && selection.ids.length > 0

/**
 * The value the days field opens with (AF-4): the party's own target when the backend reports one,
 * otherwise empty.
 */
export function initialTargetInput(targetPaymentTerms: number | null | undefined): string {
  return targetPaymentTerms === null || targetPaymentTerms === undefined ? '' : String(targetPaymentTerms)
}
