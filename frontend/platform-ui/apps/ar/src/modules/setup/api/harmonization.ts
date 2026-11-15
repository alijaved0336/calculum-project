/**
 * AB#20733 (#20718): the company's term harmonization, `GET`/`PUT`
 * `api/companies/{companyUuid}/harmonization` on Ada.Ar.Api (#20732). The settings are company-wide
 * (a save recalculates every current Ready version of the company), but the lock is per sale file
 * version: `saleFileVersionId` names the version Setup is open on, `isRecalculating` is about it and
 * a PUT answers 409 while it is being calculated.
 */
import { get, putJson } from '@/api/http'

export type HarmonizationRoundOn = 'Nearest' | 'Up' | 'Down'

export interface HarmonizationGroupDto {
  id: number
  days: number
}

export interface HarmonizationResponse {
  enabled: boolean
  roundOn: HarmonizationRoundOn
  /** Ordered by days. */
  groups: HarmonizationGroupDto[]
  /** The 16 platform defaults, used to pre-fill when harmonization is turned back on (AF-2). */
  defaultGroups: number[]
  /** True while the sale file version Setup is open on is being calculated (false with no version). */
  isRecalculating: boolean
}

/** With `enabled: false` the backend ignores `groups` and deletes them all. */
export interface HarmonizationInput {
  enabled: boolean
  roundOn: HarmonizationRoundOn
  groups: { days: number }[]
}

/** 202 `{ inProcess: true, versions }`; 200 with no body fields when nothing changed. */
export interface SaveHarmonizationResult {
  inProcess?: boolean
  versions?: number
}

export interface HarmonizationApi {
  fetchHarmonization(companyUuid: string, saleFileVersionId: number | null): Promise<HarmonizationResponse>
  saveHarmonization(
    companyUuid: string,
    saleFileVersionId: number | null,
    input: HarmonizationInput,
  ): Promise<SaveHarmonizationResult>
}

// `putJson` takes no query, so the version travels in the path for both verbs.
const route = (companyUuid: string, saleFileVersionId: number | null) => {
  const base = `/api/companies/${companyUuid}/harmonization`
  return saleFileVersionId === null ? base : `${base}?saleFileVersionId=${saleFileVersionId}`
}

export const realHarmonizationApi: HarmonizationApi = {
  fetchHarmonization: (companyUuid, saleFileVersionId) =>
    get<HarmonizationResponse>(route(companyUuid, saleFileVersionId)),
  saveHarmonization: (companyUuid, saleFileVersionId, input) =>
    putJson<SaveHarmonizationResult>(route(companyUuid, saleFileVersionId), input),
}
