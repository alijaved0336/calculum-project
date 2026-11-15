import { route } from '@/router/Routing'
import { router } from '@/router'
import { parsePositiveRouteId } from './utils/routeId'

export const match = 'Match'
export const customerCard = 'CustomerCard'
export const versionProgress = 'VersionProgress'
export const versionErrors = 'VersionErrors'
export const saleLineDetail = 'SaleLineDetail'

/**
 * `fileId`/`versionId` are optional: MatchView falls back to preselecting the most recent
 * parsed version when neither query param is present, which is what every existing caller
 * (the sidebar link) still wants. Passed as a query, not route params, since `/match` itself
 * carries no `:id` segment - adding one would turn every existing bookmark/link to the bare
 * `/match` URL into a 404.
 *
 * `versionId` alone (no `fileId`) is also valid - the Customer Card's `router.back()` fallback
 * has a version but no file id to go with it (`CustomerCardResponse` carries no `fileId`).
 * MatchView resolves the owning file by searching every fetched file's versions in that case.
 *
 * `fileId` alone is NOT valid: MatchView has no "resolve the most recent version of this file"
 * case to receive it, so the overloads below make it a compile error to call rather than a
 * silently-dropped query - the runtime branch immediately below only ever builds a query when
 * `versionId` is present.
 */
export function openMatch(): void
export function openMatch(fileId: number, versionId: number): void
export function openMatch(fileId: undefined, versionId: number): void
export function openMatch(fileId?: number, versionId?: number): void {
  route(
    match,
    undefined,
    versionId === undefined
      ? undefined
      : { ...(fileId === undefined ? {} : { fileId: String(fileId) }), versionId: String(versionId) },
  )
}

export const openCustomerCard = (versionId: number, buyerId: number) =>
  route(customerCard, { versionId: String(versionId), buyerId: String(buyerId) })

/**
 * UC-API-13: one buyer's sale line, everything it carries plus what each strategy produced for
 * it - the deepest of the three provisional surfaces the Customer Card's strategy panel can drill
 * into. `BuyerLinesGrid`'s row click is the caller today.
 */
export const openSaleLineDetail = (versionId: number, buyerId: number, lineId: number) =>
  route(saleLineDetail, { versionId: String(versionId), buyerId: String(buyerId), lineId: String(lineId) })

/** UC-FE-05a: watch one version move through parse and calculation. */
export const openVersionProgress = (versionId: number) =>
  route(versionProgress, { versionId: String(versionId) })

/** UC-VAL-03: the error groups and no-match rows behind one version. */
export const openVersionErrors = (versionId: number) =>
  route(versionErrors, { versionId: String(versionId) })

/**
 * The back affordance every version-scoped view shares (the Customer Card, the progress view).
 *
 * `router.back()` only has somewhere to go when the view was reached by navigating WITHIN the
 * app - a direct load, refresh, or shared link has no prior in-app history entry, and calling it
 * then either does nothing or leaves the SPA for whatever the browser's own history holds.
 * `history.state.back` is the router's own record of that (null when there is no previous in-app
 * entry). The fallback still lands on Match scoped to this version - with the same
 * malformed-segment guard the load paths apply, so a non-numeric param never reaches `openMatch`
 * as NaN (its only guard is `versionId === undefined`, which NaN passes, producing
 * `?versionId=NaN`).
 */
export function backOrOpenMatch(versionIdParam: string): void {
  if (globalThis.history.state?.back) {
    router.back()
    return
  }
  const versionId = parsePositiveRouteId(versionIdParam)
  if (versionId === undefined) {
    openMatch()
  } else {
    openMatch(undefined, versionId)
  }
}
