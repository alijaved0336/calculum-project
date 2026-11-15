/**
 * AB#20702: Ada.Ar.Api's `SetupController` contract (#20701, Rolando's hand-off on 20701/20702)
 * and its mapping to the screen's own model (`StrategySetting`, setupStrategies.types.ts). The
 * screen never sees the wire: the real client (`setupStrategies.ts`) maps here in both directions,
 * and the mock answers the same refusal bodies, so a contract change touches this file only.
 *
 * Wire facts: the nine keys are the backend's strategy ids (`CounterPartyStandard2`,
 * `BuyersRegulatory`…); More Settings travel in a nested `settings` object; enums are their names
 * (metric `Min|Avg|Q1|Q3|Max`, country `Buyer|Supplier|Both`, method `None|OnlyExceptions|All`); a
 * 400/422 lists `{ strategy, field, message }`. Peer Group Standard's combination groups (#20824,
 * Rolando's contract on task 20838) are a flag per attribute of `buyer` / `transaction` / `supplier`.
 */
import {
  PARTY_ATTRIBUTES,
  TRANSACTION_ATTRIBUTES,
  type CombinationGroup,
  type CombinationGroupsSource,
  type RegulatoryCountrySource,
  type RegulatoryMethod,
  type StrategyKey,
  type StrategyMetric,
  type StrategySetting,
} from './setupStrategies.types'

// ----- Wire shapes ---------------------------------------------------------------------------

export type WireStrategyKey =
  | 'PaymentOnTerms' | 'CounterPartyStandard2' | 'PeerGroupStandard2' | 'BuyerOrParentMin'
  | 'IndustryRegionGroup' | 'BuyerPolicy' | 'BuyersRegulatory' | 'CreditLimitMax' | 'ClientStandard'

type WireMetric = 'Min' | 'Avg' | 'Q1' | 'Q3' | 'Max'
type WireCountrySource = 'Buyer' | 'Supplier' | 'Both'
type WireMethod = 'None' | 'OnlyExceptions' | 'All'

export interface WireStrategySettings {
  metric?: WireMetric | null
  minOccurrences?: number | null
  minReductionDays?: number | null
  maxReductionDays?: number | null
  regulatoryCountrySource?: WireCountrySource | null
  regulatoryMethod?: WireMethod | null
  /** #20716 (BuyerOrParentMin). `volumePercentage` is a PERCENTAGE 0-100 on the wire (12.5 = 12.5 %). */
  sameBuyerRegion?: boolean | null
  sameBuyerIndustry?: boolean | null
  volumePercentage?: number | null
  /** #20824 (PeerGroupStandard2). On a PUT the priority is the position; `priorityOrder` is ignored. */
  combinationGroups?: WireCombinationGroup[] | null
  combinationGroupsSource?: CombinationGroupsSource | null
  defaultCombinationGroups?: WireCombinationGroup[] | null
}

export interface WireCombinationGroup {
  priorityOrder?: number
  buyer?: Record<string, boolean> | null
  transaction?: Record<string, boolean> | null
  supplier?: Record<string, boolean> | null
}

export interface WireStrategy {
  key: WireStrategyKey
  allowed: boolean
  companyAllowed?: boolean
  settings?: WireStrategySettings | null
}

export interface WireStrategiesResponse {
  versionId: number
  status: string | null
  locked: boolean
  strategies: WireStrategy[]
}

/** A 400 (rule broken) or 422 (strategy the company does not allow). */
export interface WireRefusalBody {
  errors?: { strategy: string; field?: string | null; message: string }[]
  error?: string
}

// ----- Key and enum maps ---------------------------------------------------------------------

const KEY_TO_WIRE: Record<StrategyKey, WireStrategyKey> = {
  payOnTerms: 'PaymentOnTerms',
  buyerStandard: 'CounterPartyStandard2',
  peerGroupStandard: 'PeerGroupStandard2',
  parentBuyerMin: 'BuyerOrParentMin',
  industryRegionStandard: 'IndustryRegionGroup',
  buyerPolicy: 'BuyerPolicy',
  regulatoryTerms: 'BuyersRegulatory',
  creditLimitMax: 'CreditLimitMax',
  clientStandard: 'ClientStandard',
}
const KEY_FROM_WIRE = Object.fromEntries(
  Object.entries(KEY_TO_WIRE).map(([key, wire]) => [wire, key]),
) as Record<WireStrategyKey, StrategyKey>

const METRIC_TO_WIRE: Record<StrategyMetric, WireMetric> = { MIN: 'Min', AVG: 'Avg', Q1: 'Q1', Q3: 'Q3', MAX: 'Max' }
const METRIC_FROM_WIRE: Record<WireMetric, StrategyMetric> = { Min: 'MIN', Avg: 'AVG', Q1: 'Q1', Q3: 'Q3', Max: 'MAX' }
const SOURCE_TO_WIRE: Record<RegulatoryCountrySource, WireCountrySource> = { buyer: 'Buyer', supplier: 'Supplier', both: 'Both' }
const SOURCE_FROM_WIRE: Record<WireCountrySource, RegulatoryCountrySource> = { Buyer: 'buyer', Supplier: 'supplier', Both: 'both' }
const METHOD_TO_WIRE: Record<RegulatoryMethod, WireMethod> = {
  ONLY_EXCEPTIONS: 'OnlyExceptions', ALL_REGULATIONS: 'All', NO_LIMITATION: 'None',
}
const METHOD_FROM_WIRE: Record<WireMethod, RegulatoryMethod> = {
  OnlyExceptions: 'ONLY_EXCEPTIONS', All: 'ALL_REGULATIONS', None: 'NO_LIMITATION',
}

/** The strategies whose More Settings the PUT accepts. Sending Client Standard's is a 400. */
const SAVES_SETTINGS = new Set<StrategyKey>(['buyerStandard', 'peerGroupStandard', 'regulatoryTerms', 'parentBuyerMin'])

/**
 * The screen holds Parent Min's volume as a 0-1 fraction (`StrategySetting.volumePercentage`); the
 * wire carries a 0-100 percentage. Rounded to 4 decimals so 0.07 does not travel as 7.000000000000001.
 */
const fractionToPercent = (fraction: number): number => Math.round(fraction * 100 * 10000) / 10000
const percentToFraction = (percent: number): number => Math.round(percent * 10000) / 1000000

const orUndefined = <T>(value: T | null | undefined): T | undefined => value ?? undefined
/** An empty number field reaches the wire as null ("left empty"), never NaN. */
const numberOrNull = (value: number | undefined): number | null =>
  value === undefined || Number.isNaN(value) ? null : value

/** A flag the wire leaves out is off, so every group has all ten attributes. */
const flags = <K extends string>(keys: readonly K[], wire: Record<string, boolean> | null | undefined) =>
  Object.fromEntries(keys.map((key) => [key, wire?.[key] === true])) as Record<K, boolean>

/** The wire's groups in priority order (the GET numbers them from 1). */
function groupsFromWire(groups: WireCombinationGroup[]): CombinationGroup[] {
  return [...groups]
    .sort((a, b) => (a.priorityOrder ?? 0) - (b.priorityOrder ?? 0))
    .map((group) => ({
      buyer: flags(PARTY_ATTRIBUTES, group.buyer),
      transaction: flags(TRANSACTION_ATTRIBUTES, group.transaction),
      supplier: flags(PARTY_ATTRIBUTES, group.supplier),
    }))
}

const groupsToWire = (groups: CombinationGroup[]): WireCombinationGroup[] =>
  groups.map((group) => ({ buyer: { ...group.buyer }, transaction: { ...group.transaction }, supplier: { ...group.supplier } }))

// ----- Mapping -------------------------------------------------------------------------------

export const strategyKeyToWire = (key: StrategyKey): WireStrategyKey => KEY_TO_WIRE[key]

// Each strategy's own settings, read from a GET entry into the screen's setting.
function buyerStandardFromWire(setting: StrategySetting, settings: WireStrategySettings): void {
  setting.minOccurrences = orUndefined(settings.minOccurrences)
  setting.minReductionDays = orUndefined(settings.minReductionDays)
  setting.maxReductionDays = orUndefined(settings.maxReductionDays)
}

function peerGroupStandardFromWire(setting: StrategySetting, settings: WireStrategySettings): void {
  setting.minOccurrences = orUndefined(settings.minOccurrences)
  if (settings.combinationGroups) setting.combinationGroups = groupsFromWire(settings.combinationGroups)
  if (settings.combinationGroupsSource) setting.combinationGroupsSource = settings.combinationGroupsSource
  if (settings.defaultCombinationGroups) setting.defaultCombinationGroups = groupsFromWire(settings.defaultCombinationGroups)
}

function parentBuyerMinFromWire(setting: StrategySetting, settings: WireStrategySettings): void {
  setting.sameBuyerRegion = settings.sameBuyerRegion ?? false
  setting.sameBuyerIndustry = settings.sameBuyerIndustry ?? false
  if (settings.volumePercentage !== null && settings.volumePercentage !== undefined) {
    setting.volumePercentage = percentToFraction(settings.volumePercentage)
  }
}

const SETTINGS_FROM_WIRE: Partial<Record<StrategyKey, (setting: StrategySetting, settings: WireStrategySettings) => void>> = {
  buyerStandard: buyerStandardFromWire,
  peerGroupStandard: peerGroupStandardFromWire,
  parentBuyerMin: parentBuyerMinFromWire,
}

/** One GET entry → the screen's setting. An unknown key is dropped rather than shown unnamed. */
export function strategyFromWire(wire: WireStrategy): StrategySetting | null {
  const key = KEY_FROM_WIRE[wire.key]
  if (!key) return null
  const settings = wire.settings ?? {}
  const setting: StrategySetting = { key, allowed: wire.allowed, companyAllowed: wire.companyAllowed ?? true }
  if (settings.metric) setting.metric = METRIC_FROM_WIRE[settings.metric]
  SETTINGS_FROM_WIRE[key]?.(setting, settings)
  if (settings.regulatoryCountrySource) setting.regulatoryCountrySource = SOURCE_FROM_WIRE[settings.regulatoryCountrySource]
  if (settings.regulatoryMethod) setting.regulatoryMethod = METHOD_FROM_WIRE[settings.regulatoryMethod]
  return setting
}

// Each strategy's own settings, as the PUT carries them.
const metricToWire = (setting: StrategySetting) => (setting.metric ? METRIC_TO_WIRE[setting.metric] : null)

const buyerStandardToWire = (setting: StrategySetting): WireStrategySettings => ({
  metric: metricToWire(setting),
  minOccurrences: numberOrNull(setting.minOccurrences),
  minReductionDays: numberOrNull(setting.minReductionDays),
  maxReductionDays: numberOrNull(setting.maxReductionDays),
})

// The whole list travels each time; the API compares it with the effective one, so an
// untouched list (even the company's or the defaults) changes nothing.
const peerGroupStandardToWire = (setting: StrategySetting): WireStrategySettings => ({
  metric: metricToWire(setting),
  minOccurrences: numberOrNull(setting.minOccurrences),
  ...(setting.combinationGroups ? { combinationGroups: groupsToWire(setting.combinationGroups) } : {}),
})

const parentBuyerMinToWire = (setting: StrategySetting): WireStrategySettings => ({
  sameBuyerRegion: setting.sameBuyerRegion ?? false,
  sameBuyerIndustry: setting.sameBuyerIndustry ?? false,
  // An emptied input is NaN: it travels as null, which the API refuses beside the field.
  volumePercentage: setting.volumePercentage === undefined || Number.isNaN(setting.volumePercentage)
    ? null
    : fractionToPercent(setting.volumePercentage),
})

const regulatoryToWire = (setting: StrategySetting): WireStrategySettings => ({
  regulatoryCountrySource: setting.regulatoryCountrySource ? SOURCE_TO_WIRE[setting.regulatoryCountrySource] : null,
  regulatoryMethod: setting.regulatoryMethod ? METHOD_TO_WIRE[setting.regulatoryMethod] : null,
})

const SETTINGS_TO_WIRE: Partial<Record<StrategyKey, (setting: StrategySetting) => WireStrategySettings>> = {
  buyerStandard: buyerStandardToWire,
  peerGroupStandard: peerGroupStandardToWire,
  parentBuyerMin: parentBuyerMinToWire,
}

/** The screen's setting → one PUT entry (settings only where the API accepts them). */
export function strategyToWire(setting: StrategySetting): WireStrategy {
  const wire: WireStrategy = { key: KEY_TO_WIRE[setting.key], allowed: setting.allowed }
  if (!SAVES_SETTINGS.has(setting.key)) return wire
  wire.settings = (SETTINGS_TO_WIRE[setting.key] ?? regulatoryToWire)(setting)
  return wire
}

/**
 * A refusal's `errors[]` → the screen's field errors, keyed `"{strategyKey}.{field}"` (the same
 * keys `validateStrategySettings` uses). The value is the backend's own message, shown as is.
 */
export function fieldErrorsFromWire(body: WireRefusalBody | null | undefined): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const error of body?.errors ?? []) {
    const key = KEY_FROM_WIRE[error.strategy as WireStrategyKey] ?? error.strategy
    errors[error.field ? `${key}.${error.field}` : key] = error.message
  }
  return errors
}

/** The screen's field errors → a refusal body in the wire's shape (the mock answers with it). */
export function fieldErrorsToWire(errors: Record<string, string>): WireRefusalBody {
  return {
    errors: Object.entries(errors).map(([at, message]) => {
      const [key, field] = at.split('.') as [StrategyKey, string | undefined]
      return { strategy: KEY_TO_WIRE[key] ?? key, field: field ?? null, message }
    }),
  }
}
