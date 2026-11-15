/**
 * Tests for the analyze store `loadCustomDataPointTypes` action added with custom data
 * points 21-26. It fetches the per-program column types and builds the
 * `customDataPointTypes` map (field -> 'number' | 'days' | 'money') used by the grid
 * footers and numeric cell templates to pick the right bucket / formatting.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/pinia/index', () => ({
  secureStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}))
vi.mock('@/modules/home/analyze/api')

import * as AnalyzeApi from '@/modules/home/analyze/api'
import { useAnalyzeStore } from '@/stores/analyze'

const mockedGet = () => AnalyzeApi.getProgramCustomColumns as unknown as ReturnType<typeof vi.fn>

describe('analyze store — loadCustomDataPointTypes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with an empty custom data point type map', () => {
    const store = useAnalyzeStore()
    expect(store.customDataPointTypes).toEqual({})
  })

  it('maps { columns: [...] } responses, skipping text and typeless columns', async () => {
    mockedGet().mockResolvedValue({
      success: true,
      data: {
        columns: [
          { columnNumber: 21, type: 'number' },
          { columnNumber: 22, type: 'days' },
          { columnNumber: 23, type: 'money' },
          { columnNumber: 24, type: 'text' }, // text -> excluded
          { columnNumber: 25 },               // no type -> excluded
        ],
      },
    })
    const store = useAnalyzeStore()
    await store.loadCustomDataPointTypes('program-uuid')
    expect(store.customDataPointTypes).toEqual({
      customDataPoint21: 'number',
      customDataPoint22: 'days',
      customDataPoint23: 'money',
    })
  })

  it('also accepts a bare array response shape', async () => {
    mockedGet().mockResolvedValue({
      success: true,
      data: [{ columnNumber: 26, type: 'days' }],
    })
    const store = useAnalyzeStore()
    await store.loadCustomDataPointTypes('p')
    expect(store.customDataPointTypes.customDataPoint26).toBe('days')
  })

  it('leaves the map untouched when the request is not successful', async () => {
    mockedGet().mockResolvedValue({ success: false })
    const store = useAnalyzeStore()
    await store.loadCustomDataPointTypes('p')
    expect(store.customDataPointTypes).toEqual({})
  })
})
