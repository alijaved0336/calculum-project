import { describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const putJson = vi.fn()
vi.mock('@/api/http', () => ({
  get: (...args: unknown[]) => get(...args),
  putJson: (...args: unknown[]) => putJson(...args),
}))

import { fetchCashFlowImpactLimits, saveCashFlowImpactLimits } from '@/modules/setup/api/cashFlowImpactLimits'

describe('setup.cashFlowImpactLimits', () => {
  it('reads the company-scoped route', async () => {
    const response = [{ tier: 'Low', fromAmount: null, toAmount: null, isDefault: true }]
    get.mockResolvedValue(response)

    await expect(fetchCashFlowImpactLimits('company-1')).resolves.toBe(response)

    expect(get).toHaveBeenCalledWith('/api/companies/company-1/cash-flow-impact-limits')
  })

  it('PUTs the whole set to the company-scoped route, wrapped in { limits }', async () => {
    const limits = [{ tier: 'Low' as const, fromAmount: 0, toAmount: 10_000 }]
    const response = [{ tier: 'Low', fromAmount: 0, toAmount: 10_000, isDefault: false }]
    putJson.mockResolvedValue(response)

    await expect(saveCashFlowImpactLimits('company-1', limits)).resolves.toBe(response)

    expect(putJson).toHaveBeenCalledWith('/api/companies/company-1/cash-flow-impact-limits', { limits })
  })
})
