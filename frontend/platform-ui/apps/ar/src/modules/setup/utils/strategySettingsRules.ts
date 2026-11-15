/**
 * AB#20702: BR-03 / EF-4 validation for the Setup strategies' More Settings. Shared by the screen
 * (to keep Save disabled and show the reason next to the field) and by the mock API (to answer the
 * same 400 the backend's `StrategySettingsRules` does), so both agree on what is valid.
 *
 * Messages are i18n keys; the caller translates them.
 */
import type { StrategySetting } from '../api/setupStrategies.types'
import { combinationGroupsError, peerGroupOccurrencesError } from './combinationGroups'

export const MIN_OCCURRENCES = 5
export const MAX_OCCURRENCES = 9999

const isWhole = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value)
const isEmpty = (value: number | undefined): boolean => value === undefined || Number.isNaN(value)

function occurrencesError(occurrences: number | undefined): string | undefined {
  if (occurrences === undefined) return undefined
  if (!isWhole(occurrences)) return 'arSetup.validation.minOccurrencesWhole'
  if (occurrences < MIN_OCCURRENCES || occurrences > MAX_OCCURRENCES) return 'arSetup.validation.minOccurrencesRange'
  return undefined
}

// Either reduction bound may stay empty (the API's default for a version never configured);
// a cleared field arrives as NaN from SetupNumberField and means the same.
// #21163: but a stored bound cannot be cleared - the API reads an empty field as "keep the stored
// value", so the save would answer OK and silently keep it.
function reductionDayError(value: number | undefined, stored: number | undefined): string | undefined {
  if (isEmpty(value)) return isEmpty(stored) ? undefined : 'arSetup.validation.reductionDaysWhole'
  return !isWhole(value) || value < 0 ? 'arSetup.validation.reductionDaysWhole' : undefined
}

function reductionDaysErrors(strategy: StrategySetting, stored: StrategySetting | undefined): { min?: string; max?: string } {
  const { minReductionDays: min, maxReductionDays: max } = strategy
  const errors: { min?: string; max?: string } = {
    min: reductionDayError(min, stored?.minReductionDays),
    max: reductionDayError(max, stored?.maxReductionDays),
  }
  if (isWhole(min) && isWhole(max) && min >= 0 && max >= 0 && min > max) errors.min = 'arSetup.validation.minAboveMax'
  return errors
}

// #20703 AC-03: the fraction behind "Minimum sales volume (%)", 0-100 % on screen.
function volumePercentageError(volume: number | undefined): string | undefined {
  if (volume === undefined) return undefined
  if (typeof volume !== 'number' || Number.isNaN(volume) || volume < 0 || volume > 1) return 'global.errors.baseRate'
  return undefined
}

/** One strategy's errors keyed by field; a field without an error is absent. */
function strategyErrors(strategy: StrategySetting, stored: StrategySetting | undefined): Record<string, string | undefined> {
  const reduction = reductionDaysErrors(strategy, stored)
  return {
    // #20824: Peer Group Standard takes 1 to 9,999 occurrences; Buyer Standard keeps 5 to 9,999.
    minOccurrences: strategy.key === 'peerGroupStandard'
      ? peerGroupOccurrencesError(strategy.minOccurrences)
      : occurrencesError(strategy.minOccurrences),
    combinationGroups: strategy.combinationGroups ? combinationGroupsError(strategy.combinationGroups) : undefined,
    minReductionDays: reduction.min,
    maxReductionDays: reduction.max,
    volumePercentage: volumePercentageError(strategy.volumePercentage),
  }
}

/**
 * Errors keyed `"{strategyKey}.{field}"`, empty when the set is valid. `stored` is the version's
 * saved set, so a stored reduction bound cannot be cleared (#21163).
 */
export function validateStrategySettings(strategies: StrategySetting[], stored: StrategySetting[] = []): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const strategy of strategies) {
    const storedStrategy = stored.find((candidate) => candidate.key === strategy.key)
    for (const [field, error] of Object.entries(strategyErrors(strategy, storedStrategy))) {
      if (error) errors[`${strategy.key}.${field}`] = error
    }
  }

  return errors
}

/** AF-3: every strategy off saves, but no Opportunity will be recommended. */
export const allStrategiesOff = (strategies: StrategySetting[]): boolean =>
  strategies.every((strategy) => !strategy.allowed)
