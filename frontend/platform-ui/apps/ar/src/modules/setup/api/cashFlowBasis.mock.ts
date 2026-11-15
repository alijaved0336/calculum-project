/**
 * AB#20761: in-memory stand-in for the cash flow basis endpoints until `AdminCashFlowBasisController`
 * is deployed. Every version starts on the default Contractual basis with contractual terms; a 422
 * mirrors the server's guard for an explicit Dso -> Contractual switch without them.
 */
import { HttpError } from '@/api/http'
import type { CashFlowBasis, CashFlowBasisApi, CashFlowBasisResponse } from './cashFlowBasis'

const MOCK_LATENCY_MS = 250
const delay = () => new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

const stored = new Map<number, CashFlowBasis>()
const withoutContractualTerms = new Set<number>()

function responseFor(versionId: number): CashFlowBasisResponse {
  const basis = stored.get(versionId)
  return {
    saleFileVersionId: versionId,
    basis: basis ?? 'Contractual',
    isDefault: basis === undefined,
    hasContractualTerms: !withoutContractualTerms.has(versionId),
  }
}

export const mockCashFlowBasisApi: CashFlowBasisApi = {
  async fetchCashFlowBasis(versionId) {
    await delay()
    return responseFor(versionId)
  },

  async saveCashFlowBasis(versionId, basis) {
    await delay()
    const current = responseFor(versionId)
    if (current.basis === basis) return current
    if (basis === 'Contractual' && !current.hasContractualTerms) {
      throw new HttpError(422, `/api/sale-file-versions/${versionId}/cash-flow-basis`, '{}')
    }
    stored.set(versionId, basis)
    return responseFor(versionId)
  },
}

/** Test-only: forget every version's basis, then seed stored bases and versions without contractual terms. */
export function resetCashFlowBasisMock(seed: { stored?: Record<number, CashFlowBasis>; withoutContractualTerms?: number[] } = {}): void {
  stored.clear()
  withoutContractualTerms.clear()
  Object.entries(seed.stored ?? {}).forEach(([id, basis]) => stored.set(Number(id), basis))
  seed.withoutContractualTerms?.forEach((id) => withoutContractualTerms.add(id))
}
