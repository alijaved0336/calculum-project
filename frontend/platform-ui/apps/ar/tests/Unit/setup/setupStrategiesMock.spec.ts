import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/api/http'
import { mockSetupStrategiesApi, resetSetupStrategiesMock } from '@/modules/setup/api/setupStrategies.mock'

/** AB#20702: the stand-in answers like #20701 does, so the screen's paths are the real ones. */
describe('Setup strategies mock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetSetupStrategiesMock()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const run = async <T>(promise: Promise<T>): Promise<T> => {
    await vi.advanceTimersByTimeAsync(300)
    return promise
  }

  it('starts from the API defaults: Buyer Standard Avg / 5 with empty reduction days, Regulatory Both + OnlyExceptions', async () => {
    const { strategies } = await run(mockSetupStrategiesApi.fetchSetupStrategies(73))
    expect(strategies.find((s) => s.key === 'buyerStandard')).toMatchObject({ metric: 'AVG', minOccurrences: 5 })
    expect(strategies.find((s) => s.key === 'buyerStandard')?.minReductionDays).toBeUndefined()
    expect(strategies.find((s) => s.key === 'regulatoryTerms')).toMatchObject({ regulatoryCountrySource: 'both', regulatoryMethod: 'ONLY_EXCEPTIONS' })
  })

  it('answers 200 with no changes, and does not recalculate, when nothing differs (AF-1)', async () => {
    const { strategies } = await run(mockSetupStrategiesApi.fetchSetupStrategies(73))
    await expect(run(mockSetupStrategiesApi.saveSetupStrategies(73, strategies))).resolves.toEqual({ changes: 0 })
    expect((await run(mockSetupStrategiesApi.fetchSetupStatus(73))).locked).toBe(false)
  })

  it('refuses a rule with the wire body: errors[] of { strategy, field, message }', async () => {
    const { strategies } = await run(mockSetupStrategiesApi.fetchSetupStrategies(73))
    const invalid = strategies.map((s) => (s.key === 'buyerStandard' ? { ...s, minOccurrences: 3 } : s))
    const refusal = await run(mockSetupStrategiesApi.saveSetupStrategies(73, invalid).catch((error: unknown) => error))
    expect(refusal).toBeInstanceOf(HttpError)
    expect((refusal as HttpError).status).toBe(400)
    expect((refusal as HttpError).jsonBody<{ errors: unknown[] }>()?.errors[0]).toMatchObject({ strategy: 'CounterPartyStandard2', field: 'minOccurrences' })
  })

  it('keeps each sale file version apart (AC-03)', async () => {
    const { strategies } = await run(mockSetupStrategiesApi.fetchSetupStrategies(73))
    await run(mockSetupStrategiesApi.saveSetupStrategies(73, strategies.map((s) => (s.key === 'creditLimitMax' ? { ...s, allowed: false } : s))))
    const other = await run(mockSetupStrategiesApi.fetchSetupStrategies(74))
    expect(other.strategies.find((s) => s.key === 'creditLimitMax')?.allowed).toBe(true)
  })
})
