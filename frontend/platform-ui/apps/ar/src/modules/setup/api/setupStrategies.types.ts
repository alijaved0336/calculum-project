/**
 * AB#20687 / #20702: the screen's own model of the Setup strategies. Ada.Ar.Api's
 * `SetupController` speaks a different wire (backend keys, nested `settings`, enum names): the
 * real client maps it in `setupStrategies.wire.ts`. Both the real client and the mock implement
 * `SetupStrategiesApi` over these types, so the screen never knows which one it is talking to.
 */
import type { CalculationStatus } from '@/api'

/** The nine Receivables strategies, in the Payables display order (US #20687 main flow step 4). */
export const STRATEGY_KEYS = [
  'payOnTerms',
  'buyerStandard',
  'peerGroupStandard',
  'parentBuyerMin',
  'industryRegionStandard',
  'buyerPolicy',
  'regulatoryTerms',
  'creditLimitMax',
  'clientStandard',
] as const

export type StrategyKey = (typeof STRATEGY_KEYS)[number]

/** Buyer Standard takes AVG / Q3 / Q1; Peer Group Standard also MIN and MAX (#20824). */
export type StrategyMetric = 'MIN' | 'AVG' | 'Q1' | 'Q3' | 'MAX'

/** #20824: the attributes of a combination group's Buyer (the counterparty) and Supplier (the client's own entity). */
export const PARTY_ATTRIBUTES = ['country', 'region', 'industry', 'creditRating'] as const
export const TRANSACTION_ATTRIBUTES = ['commodity', 'buyerLeverage'] as const
export type PartyAttribute = (typeof PARTY_ATTRIBUTES)[number]
export type TransactionAttribute = (typeof TRANSACTION_ATTRIBUTES)[number]

/** One Peer Group Standard combination group. Its priority is its position in the list. */
export interface CombinationGroup {
  buyer: Record<PartyAttribute, boolean>
  transaction: Record<TransactionAttribute, boolean>
  supplier: Record<PartyAttribute, boolean>
}

/** Where the groups shown come from: the version's own, the company's, or the seven defaults. */
export type CombinationGroupsSource = 'version' | 'company' | 'default'

/** Same wire values as AP's Strategies.vue. */
export type RegulatoryCountrySource = 'buyer' | 'supplier' | 'both'
export type RegulatoryMethod = 'ONLY_EXCEPTIONS' | 'ALL_REGULATIONS' | 'NO_LIMITATION'

export interface StrategySetting {
  key: StrategyKey
  /** This sale file version's switch. */
  allowed: boolean
  /** False when the company turned the strategy off; the version cannot turn it back on (BR-02). */
  companyAllowed: boolean
  metric?: StrategyMetric
  minOccurrences?: number
  minReductionDays?: number
  maxReductionDays?: number
  regulatoryCountrySource?: RegulatoryCountrySource
  regulatoryMethod?: RegulatoryMethod
  /** #20703 (Parent/Buyer Min): benchmark only against sister companies in the same region. */
  sameBuyerRegion?: boolean
  /** #20703: same industry sector (first NAICS digit). */
  sameBuyerIndustry?: boolean
  /** #20703: share of the parent's sales volume, as a FRACTION 0-1 (the screen shows 0-100 %). */
  volumePercentage?: number
  /** #20824 (Peer Group Standard): the groups the calculation uses, in priority order. */
  combinationGroups?: CombinationGroup[]
  /** #20824: read-only, where `combinationGroups` come from. */
  combinationGroupsSource?: CombinationGroupsSource
  /** #20824: read-only, the seven defaults "Restore to Defaults" brings back. */
  defaultCombinationGroups?: CombinationGroup[]
}

export interface SetupStrategiesResponse {
  versionId: number
  status: string | null
  locked: boolean
  strategies: StrategySetting[]
}

/** 202 (`recalculateClaimed`) or 200 with `changes: 0` when nothing differed (AF-1). */
export interface SaveSetupStrategiesResult {
  status?: 'recalculateClaimed'
  changes: number
  warnings?: string[]
}

/** `GET …/setup/status`: the version status plus `locked`, false only for ready /
 * errorCalculating / errorReCalculating. The only lock flag the whole Setup page honours. */
export interface SetupStatus extends Omit<CalculationStatus, 'parsedAt'> {
  locked: boolean
}

export interface SetupStrategiesApi {
  fetchSetupStrategies(versionId: number): Promise<SetupStrategiesResponse>
  /** Sends the complete set, as the backend's `StrategyAllowanceRules` requires. */
  saveSetupStrategies(versionId: number, strategies: StrategySetting[]): Promise<SaveSetupStrategiesResult>
  fetchSetupStatus(versionId: number): Promise<SetupStatus>
}
