/**
 * UC-SET-04: the OCR/file-matching settings the Match module uses, exposed on its own Setup
 * section (backend counterpart WI 19611, `GET`/`PUT /api/companies/{companyUuid}/match-settings`
 * on Ada.Ar.Api's `AdminMatchSettingsController`).
 *
 * **The backend stores `settings` as opaque JSON on purpose** — its own domain comment says so
 * explicitly: "UC-SET-04 names no field list anywhere... no concrete list exists yet in the PHP
 * monolith or the AP front end." There is no typed contract to build against, and no equivalent
 * AP screen to port (checked: AP's only "Match module" concept is an unrelated company feature
 * flag). `MatchSettingsDto` below is this screen's own choice of the two fields the backend's own
 * integration-test fixtures use as an illustrative example (`{"ocrConfidenceThreshold":0.9,
 * "autoMatch":true}`) — the only concrete signal available anywhere in the codebase — not a
 * confirmed product spec. Adjust this file (and the form in SetupMatchSettings.vue) once Product defines the real list;
 * everything downstream of `MatchSettingsDto` changes with it.
 */
import { get, putJson } from '@/api/http'

export interface MatchSettingsDto {
  /** Fraction 0–1, not a percentage — matches the backend's own example fixture literally. */
  ocrConfidenceThreshold: number
  autoMatch: boolean
}

export interface MatchSettingsResponse {
  companyUuid: string
  /** False only when nothing has ever been saved for this company; `settings` is null then. */
  isConfigured: boolean
  settings: MatchSettingsDto | null
}

function route(companyUuid: string): string {
  return `/api/companies/${companyUuid}/match-settings`
}

export async function fetchMatchSettings(companyUuid: string): Promise<MatchSettingsResponse> {
  return get<MatchSettingsResponse>(route(companyUuid))
}

/**
 * Full replace, matching the backend's `SetMatchSettingsRequest` (`{ settings: <object> }`,
 * required — there is no partial-patch semantics).
 */
export async function saveMatchSettings(
  companyUuid: string,
  settings: MatchSettingsDto,
): Promise<MatchSettingsResponse> {
  return putJson<MatchSettingsResponse>(route(companyUuid), { settings })
}
