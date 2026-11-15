import { describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const putJson = vi.fn()
vi.mock('@/api/http', () => ({
  get: (...args: unknown[]) => get(...args),
  putJson: (...args: unknown[]) => putJson(...args),
}))

import { fetchMatchSettings, saveMatchSettings } from '@/modules/setup/api/matchSettings'

describe('setup.matchSettings', () => {
  it('reads the company-scoped route', async () => {
    const response = { companyUuid: 'company-1', isConfigured: false, settings: null }
    get.mockResolvedValue(response)

    await expect(fetchMatchSettings('company-1')).resolves.toBe(response)

    expect(get).toHaveBeenCalledWith('/api/companies/company-1/match-settings')
  })

  it('PUTs the settings to the company-scoped route, wrapped in { settings }', async () => {
    const settings = { ocrConfidenceThreshold: 0.85, autoMatch: false }
    const response = { companyUuid: 'company-1', isConfigured: true, settings }
    putJson.mockResolvedValue(response)

    await expect(saveMatchSettings('company-1', settings)).resolves.toBe(response)

    expect(putJson).toHaveBeenCalledWith('/api/companies/company-1/match-settings', { settings })
  })
})
