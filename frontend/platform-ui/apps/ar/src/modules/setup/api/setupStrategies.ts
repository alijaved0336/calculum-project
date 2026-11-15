/**
 * AB#20702: the real Setup strategies client, over Ada.Ar.Api's `SetupController` (#20701,
 * `api/sale-file-versions/{versionId}/setup`, AR:admin). The wire contract lives in
 * `setupStrategies.wire.ts`; this file only moves data through it. Refusals surface as `HttpError`
 * with the wire body: 400/422 list `{ strategy, field, message }` (read them with
 * `fieldErrorsFromWire`), 409 means the version is being calculated (EF-3).
 */
import { get, putJson } from '@/api/http'
import type {
  SaveSetupStrategiesResult,
  SetupStatus,
  SetupStrategiesApi,
  StrategySetting,
} from './setupStrategies.types'
import {
  strategyFromWire,
  strategyToWire,
  type WireStrategiesResponse,
} from './setupStrategies.wire'

const base = (versionId: number) => `/api/sale-file-versions/${versionId}/setup`

export const realSetupStrategiesApi: SetupStrategiesApi = {
  async fetchSetupStrategies(versionId) {
    const response = await get<WireStrategiesResponse>(`${base(versionId)}/strategies`)
    return {
      versionId: response.versionId,
      status: response.status,
      locked: response.locked,
      strategies: response.strategies
        .map(strategyFromWire)
        .filter((strategy): strategy is StrategySetting => strategy !== null),
    }
  },
  saveSetupStrategies: (versionId, strategies: StrategySetting[]) =>
    putJson<SaveSetupStrategiesResult>(`${base(versionId)}/strategies`, { strategies: strategies.map(strategyToWire) }),
  fetchSetupStatus: (versionId) => get<SetupStatus>(`${base(versionId)}/status`),
}
