import type { ParsedCompanyRow } from '@/api'

/**
 * One buyer roster row (UC-API-06/UC-UI-05): a `Counterparty`-role `ParsedCompanyRow` with its
 * parent's name resolved alongside it.
 *
 * `parentName` is not something the API returns - `ParsedCompanyDto` carries `ultimateParentId`,
 * a bare id, and the roster's own `Parent`-role rows are where the name for that id lives.
 * `BuyersView` resolves the two against each other rather than the grid/card presentation doing
 * it per-row, so a row that resolves to no parent (UC-API-06 A1) reaches both presentations the
 * same way: `parentName: null`, not a lookup each of them has to fail the same way twice.
 */
export interface BuyerRosterRow extends ParsedCompanyRow {
  parentName: string | null
}

/**
 * The card view's own row shape, re-exported here so `BuyerCard.vue` can keep importing its prop
 * type from `'../types'` like every other component in this module - the DTO itself lives beside
 * `fetchBuyers`, the endpoint it comes from (matching `ParsedCompanyRow`/`fetchCompanies`'s own
 * convention in `@/api`).
 */
export type { BuyerCardRow } from './api/fetchBuyers'
