/**
 * AB#20761: the sale file version's cash flow basis, `GET`/`PUT`
 * `/api/sale-file-versions/{id}/cash-flow-basis` on Ada.Ar.Api's `AdminCashFlowBasisController`
 * (impl plan L). A version never configured answers `Contractual` with `isDefault: true`.
 *
 * PUT refusals the caller branches on: 409 while the version is being recalculated, 422 when a
 * version stored on `Dso` asks for `Contractual` but has no contractual terms.
 */
import { get, putJson } from '@/api/http'

export type CashFlowBasis = 'Contractual' | 'Dso'

export interface CashFlowBasisResponse {
  saleFileVersionId: number
  basis: CashFlowBasis
  isDefault: boolean
  hasContractualTerms: boolean
}

export interface CashFlowBasisApi {
  fetchCashFlowBasis(versionId: number): Promise<CashFlowBasisResponse>
  /** Saving the stored value again is a no-op on the server: nothing recorded, nothing recalculated. */
  saveCashFlowBasis(versionId: number, basis: CashFlowBasis): Promise<CashFlowBasisResponse>
}

const route = (versionId: number) => `/api/sale-file-versions/${versionId}/cash-flow-basis`

export const realCashFlowBasisApi: CashFlowBasisApi = {
  fetchCashFlowBasis: (versionId) => get<CashFlowBasisResponse>(route(versionId)),
  saveCashFlowBasis: (versionId, basis) => putJson<CashFlowBasisResponse>(route(versionId), { basis }),
}
