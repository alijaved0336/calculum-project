/**
 * AB#20702: an in-memory stand-in for `SetupController` (#20701) until it is deployed. Same
 * signatures and the same refusals as the real client (`HttpError` 400/409/422 with the contract's
 * bodies), so the screen's success and error paths are already the real ones.
 *
 * - Settings are kept per sale file version (AC-03 / AF-5); a version never configured starts from
 *   the API's defaults (Buyer Standard Avg / 5 occurrences / reduction days empty, Regulatory Both
 *   + OnlyExceptions - Rolando's hand-off on #20702).
 * - Refusals carry the wire's bodies (`setupStrategies.wire.ts`): 400/422 `{ errors: [...] }`,
 *   409 `{ error }`.
 * - A save that changes something "claims" a recalculation: the status walks
 *   `recalculateClaimed → reCalculating (step 1..N) → ready` over `MOCK_RECALCULATION_MS`, computed
 *   from the claim time, so the lock, banner and polling run for real.
 *
 * Delete this file once `SETUP_API_MOCKED` is flipped in `./index.ts`.
 */
import { HttpError } from '@/api/http'
import { validateStrategySettings } from '../utils/strategySettingsRules'
import { fieldErrorsToWire, strategyKeyToWire } from './setupStrategies.wire'
import {
  STRATEGY_KEYS,
  type CombinationGroup,
  type SetupStatus,
  type SetupStrategiesApi,
  type StrategyKey,
  type StrategySetting,
} from './setupStrategies.types'

export const MOCK_RECALCULATION_MS = 10_000
const MOCK_TOTAL_STEPS = 10
const MOCK_LATENCY_MS = 250

/** One strategy turned off company-wide, so EF-5's disabled switch is visible in the mock. */
const COMPANY_DISALLOWED = new Set<StrategyKey>(['buyerPolicy'])

/** Row of the backend's default table (#20824 plan F): commodity, buyer leverage, Buyer C/R/I/CR, Supplier C/R/I/CR. */
type DefaultRow = [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean]
const PEER_GROUP_DEFAULT_ROWS: DefaultRow[] = [
  [true, true, true, true, true, true, true, true, true, true],
  [false, true, true, true, true, true, true, true, true, true],
  [false, true, true, true, true, false, true, true, true, false],
  [false, true, true, true, true, false, false, true, true, false],
  [false, true, false, true, true, false, false, true, true, false],
  [false, false, false, true, true, false, false, true, true, false],
  [false, false, false, false, true, false, false, true, false, false],
]

export const MOCK_PEER_GROUP_DEFAULTS: CombinationGroup[] = PEER_GROUP_DEFAULT_ROWS.map(
  ([commodity, buyerLeverage, bc, br, bi, bcr, sc, sr, si, scr]) => ({
    buyer: { country: bc, region: br, industry: bi, creditRating: bcr },
    transaction: { commodity, buyerLeverage },
    supplier: { country: sc, region: sr, industry: si, creditRating: scr },
  }),
)

function companyDefaults(): StrategySetting[] {
  return STRATEGY_KEYS.map((key) => {
    const setting: StrategySetting = { key, allowed: !COMPANY_DISALLOWED.has(key), companyAllowed: !COMPANY_DISALLOWED.has(key) }
    if (key === 'buyerStandard') {
      Object.assign(setting, { metric: 'AVG', minOccurrences: 5 })
    }
    if (key === 'parentBuyerMin') {
      Object.assign(setting, { sameBuyerRegion: false, sameBuyerIndustry: false, volumePercentage: 0.1 })
    }
    if (key === 'peerGroupStandard') {
      Object.assign(setting, {
        metric: 'Q1',
        minOccurrences: 30,
        combinationGroups: structuredClone(MOCK_PEER_GROUP_DEFAULTS),
        combinationGroupsSource: 'default',
        defaultCombinationGroups: structuredClone(MOCK_PEER_GROUP_DEFAULTS),
      })
    }
    if (key === 'regulatoryTerms') {
      Object.assign(setting, { regulatoryCountrySource: 'both', regulatoryMethod: 'ONLY_EXCEPTIONS' })
    }
    return setting
  })
}

const settingsByVersion = new Map<number, StrategySetting[]>()
const claimedAtByVersion = new Map<number, number>()

const clone = <T>(value: T): T => structuredClone(value)
const delay = () => new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

function settingsOf(versionId: number): StrategySetting[] {
  if (!settingsByVersion.has(versionId)) {
    settingsByVersion.set(versionId, companyDefaults())
  }
  return settingsByVersion.get(versionId)!
}

/** A company-wide save (harmonization, Client Standard groups) recalculates every version. */
let companyClaimedAt: number | undefined

/** Mock-only: the harmonization / Client Standard mocks call this when a save is accepted. */
export function claimAllMockVersions(): void {
  companyClaimedAt = Date.now()
}

function statusOf(versionId: number, now = Date.now()): SetupStatus {
  const claims = [claimedAtByVersion.get(versionId), companyClaimedAt].filter((at): at is number => at !== undefined)
  const claimedAt = claims.length > 0 ? Math.max(...claims) : undefined
  const elapsed = claimedAt === undefined ? Infinity : now - claimedAt
  const base = {
    saleFileVersionId: versionId,
    isError: false,
    statusDescription: null,
    dateLastRecalculated: null,
    totalSteps: MOCK_TOTAL_STEPS,
  }

  if (elapsed >= MOCK_RECALCULATION_MS) {
    return { ...base, status: 'ready', locked: false, currentStep: null, currentStepName: null }
  }
  const step = Math.min(MOCK_TOTAL_STEPS, Math.floor((elapsed / MOCK_RECALCULATION_MS) * MOCK_TOTAL_STEPS) + 1)
  return {
    ...base,
    status: elapsed < MOCK_LATENCY_MS * 2 ? 'recalculateClaimed' : 'reCalculating',
    locked: true,
    currentStep: step,
    currentStepName: `Mock step ${step}`,
  }
}

const sameSetting = (a: StrategySetting, b: StrategySetting) => JSON.stringify(a) === JSON.stringify(b)

export const mockSetupStrategiesApi: SetupStrategiesApi = {
  async fetchSetupStrategies(versionId) {
    await delay()
    const status = statusOf(versionId)
    return { versionId, status: status.status, locked: status.locked, strategies: clone(settingsOf(versionId)) }
  },

  async saveSetupStrategies(versionId, strategies) {
    await delay()
    const path = `/api/sale-file-versions/${versionId}/setup/strategies`

    if (statusOf(versionId).locked) {
      throw new HttpError(409, path, JSON.stringify({ error: 'The sale file is being recalculated. Try again when it finishes.' }))
    }
    const current = settingsOf(versionId)
    const errors = validateStrategySettings(strategies, current)
    if (Object.keys(errors).length > 0) {
      throw new HttpError(400, path, JSON.stringify(fieldErrorsToWire(errors)))
    }
    const refused = strategies.find((s) => s.allowed && current.find((c) => c.key === s.key)?.companyAllowed === false)
    if (refused) {
      throw new HttpError(422, path, JSON.stringify({
        errors: [{ strategy: strategyKeyToWire(refused.key), field: 'allowed', message: 'The company does not allow this strategy.' }],
      }))
    }

    const changes = strategies.filter((s) => {
      const before = current.find((c) => c.key === s.key)
      return !before || !sameSetting(before, s)
    }).length
    if (changes === 0) {
      return { changes: 0 }
    }

    settingsByVersion.set(versionId, clone(strategies))
    claimedAtByVersion.set(versionId, Date.now())
    const warnings = strategies.every((s) => !s.allowed)
      ? ['No strategy is allowed, so no Opportunity will be recommended for this sale file.']
      : []
    return { status: 'recalculateClaimed', changes, warnings }
  },

  async fetchSetupStatus(versionId) {
    await delay()
    return statusOf(versionId)
  },
}

/** Test-only: forget every version's settings and claims. */
export function resetSetupStrategiesMock(): void {
  settingsByVersion.clear()
  claimedAtByVersion.clear()
  companyClaimedAt = undefined
}
