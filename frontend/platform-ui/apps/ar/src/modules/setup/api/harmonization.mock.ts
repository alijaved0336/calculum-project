/**
 * AB#20733: in-memory stand-in for the harmonization endpoint (#20732), same signatures and
 * refusals (422 on invalid groups). Delete with the other mocks once `SETUP_API_MOCKED` is off.
 */
import { HttpError } from '@/api/http'
import { validateHarmonizationGroups } from '../utils/harmonizationRules'
import type { HarmonizationApi, HarmonizationResponse } from './harmonization'
import { claimAllMockVersions } from './setupStrategies.mock'

export const DEFAULT_HARMONIZATION_GROUPS = [0, 7, 14, 15, 21, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]

const MOCK_LATENCY_MS = 250
const delay = () => new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))
const byCompany = new Map<string, HarmonizationResponse>()
let nextId = 1

function stateOf(companyUuid: string): HarmonizationResponse {
  if (!byCompany.has(companyUuid)) {
    byCompany.set(companyUuid, {
      enabled: true,
      roundOn: 'Nearest',
      groups: DEFAULT_HARMONIZATION_GROUPS.map((days) => ({ id: nextId++, days })),
      defaultGroups: [...DEFAULT_HARMONIZATION_GROUPS],
      isRecalculating: false,
    })
  }
  return byCompany.get(companyUuid)!
}

export const mockHarmonizationApi: HarmonizationApi = {
  async fetchHarmonization(companyUuid) {
    await delay()
    return structuredClone(stateOf(companyUuid))
  },

  async saveHarmonization(companyUuid, _saleFileVersionId, input) {
    await delay()
    const path = `/api/companies/${companyUuid}/harmonization`
    const days = input.groups.map((group) => group.days)
    if (input.enabled) {
      const errors = validateHarmonizationGroups(days)
      if (errors.general || errors.byIndex.some(Boolean)) {
        throw new HttpError(422, path, JSON.stringify({ errors: [errors.general ?? 'invalid groups'] }))
      }
    }
    const state = stateOf(companyUuid)
    const nextDays = input.enabled ? [...days].sort((a, b) => a - b) : []
    const unchanged = state.enabled === input.enabled
      && state.roundOn === input.roundOn
      && JSON.stringify(state.groups.map((g) => g.days)) === JSON.stringify(nextDays)
    if (unchanged) return {}

    state.enabled = input.enabled
    state.roundOn = input.roundOn
    state.groups = nextDays.map((value) => ({ id: nextId++, days: value }))
    claimAllMockVersions()
    return { inProcess: true, versions: 2 }
  },
}

export function resetHarmonizationMock(): void {
  byCompany.clear()
}
