import type { CustomBadgeVariant } from '@ada/design-system'

/**
 * What a sale-file version's status means to a screen watching it (UC-FE-05a).
 *
 * The vocabulary is the backend's `SaleFileVersionStatuses`, which itself mirrors the PHP
 * monolith's `SaleFileVersion::STATUS_*` constants - including the `reCalculating` casing.
 * Kept as string sets rather than an enum because the API declares `status` as `string | null`
 * and a value this file has never heard of must degrade (inactive, not recalculatable), never
 * throw.
 */

/**
 * The pipeline is still moving: a progress view keeps polling while the version sits in one of
 * these, and stops once it leaves them - `ready`, `processed` and the error states are resting
 * places that only a user action (or a new upload) moves a version out of.
 */
const ACTIVE_STATUSES = new Set([
  'uploaded',
  'processing',
  'calculateClaimed',
  'calculating',
  'recalculateClaimed',
  'reCalculating',
])

export const isActiveStatus = (status: string | null): boolean =>
  status !== null && ACTIVE_STATUSES.has(status)

/**
 * The states from which the view OFFERS recalculation. The status machine itself
 * (`EfSaleFileCalculationStore.AllowedForRecalculation`) also admits `recalculateClaimed` as an
 * idempotent re-claim for a lost publish, but that is a recovery path, not a user affordance:
 * from the screen's side a claimed version is already in flight and the poller is following it.
 *
 * `processed` is deliberately absent on BOTH sides (UC-FE-05a A1): a never-calculated version
 * must take its first calculation through the finalize hand-off, and a recalculate claim would
 * race it into a duplicate pipeline.
 */
const RECALCULATABLE_STATUSES = new Set(['ready', 'errorCalculating', 'errorReCalculating'])

export const canRecalculate = (status: string | null): boolean =>
  status !== null && RECALCULATABLE_STATUSES.has(status)

/**
 * The i18n key for a status, so every screen names `reCalculating` the same way in every locale
 * (same pattern as partyRole's `roleLabelKey`). Callers pass the raw value as the translation
 * fallback: `t(statusLabelKey(status), status)` - a vocabulary word this build has never heard
 * of renders as itself rather than as a key.
 */
export const statusLabelKey = (status: string): string => `arMatch.status.${status}`

/**
 * One badge rule for every screen that shows a version's status: settled is success, anything
 * whose name carries "error" failed, and the rest are still in flight. Extracted from
 * DashboardView, which grew it first, so the Dashboard grid and the progress view cannot drift
 * into two disagreeing color codes for the same status.
 */
export function badgeForStatus(status: string | null): CustomBadgeVariant {
  if (status === 'ready' || status === 'processed') {
    return 'success'
  }
  return status?.toLowerCase().includes('error') ? 'danger' : 'info'
}
