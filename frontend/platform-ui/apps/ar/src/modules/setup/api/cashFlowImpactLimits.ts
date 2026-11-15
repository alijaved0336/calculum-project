/**
 * UC-SET-03: the cash flow impact threshold surface, `GET`/`PUT`
 * `/api/companies/{companyUuid}/cash-flow-impact-limits` on Ada.Ar.Api's
 * `AdminCashFlowImpactLimitsController`.
 */
import { get, putJson } from '@/api/http'

export type CashFlowImpactTier = 'Low' | 'Medium' | 'High'

/** One tier's band, and whether it is the platform default or an admin's override. */
export interface CashFlowImpactLimitDto {
  tier: CashFlowImpactTier
  fromAmount: number | null
  toAmount: number | null
  isDefault: boolean
}

/** One band of a PUT, matching Ada.Ar.Api.Models.CashFlowImpactLimitInput. */
export interface CashFlowImpactLimitInput {
  tier: CashFlowImpactTier
  fromAmount: number
  toAmount: number | null
}

function route(companyUuid: string): string {
  return `/api/companies/${companyUuid}/cash-flow-impact-limits`
}

export async function fetchCashFlowImpactLimits(companyUuid: string): Promise<CashFlowImpactLimitDto[]> {
  return get<CashFlowImpactLimitDto[]>(route(companyUuid))
}

/**
 * Saves the whole set (UC-SET-03 step 2/3). An empty array reverts every tier to the platform
 * default, matching `CashFlowImpactLimitLayout.Validate`'s own documented "configuring nothing is
 * configuring the platform default."
 *
 * Refused (A1, non-ascending or an incomplete set) with an `HttpError` whose `body` is
 * `{ errors: string[] }`; the caller reads that to show the refusal.
 */
export async function saveCashFlowImpactLimits(
  companyUuid: string,
  limits: CashFlowImpactLimitInput[],
): Promise<CashFlowImpactLimitDto[]> {
  return putJson<CashFlowImpactLimitDto[]>(route(companyUuid), { limits })
}
