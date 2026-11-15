/**
 * WI#18968 — `getSpendFileVersion()`.
 *
 * The Cash Flow setup section reads the frozen 9-box limits through this call, so two things have
 * to hold: the uuid is sent bare (the store hands out an IRI, `/api/spend_file_versions/{uuid}`,
 * and posting that verbatim would build a doubled path), and a failed request comes back as
 * `success: false` instead of throwing — the caller only guards on `response.success`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('@/utils/axios', () => ({ default: { get, post } }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'https://api.test' }))

import { getSpendFileVersion, postNineBoxThresholds } from '@/modules/home/api'

const THRESHOLDS = {
  cashFlow: { med: 14945.97353, high: 81252.67004 },
  economicProfit: { med: 1345.13762, high: 7312.7403 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getSpendFileVersion', () => {
  it('requests the version by bare uuid and returns nineBoxThresholds', async () => {
    get.mockResolvedValue({ status: 200, data: { nineBoxThresholds: THRESHOLDS } })

    const response = await getSpendFileVersion('/api/spend_file_versions/abc-123')

    expect(get).toHaveBeenCalledWith('https://api.test/api/spend_file_versions/abc-123')
    expect(response.success).toBe(true)
    expect(response.data.nineBoxThresholds).toEqual(THRESHOLDS)
  })

  it('accepts a plain uuid too', async () => {
    get.mockResolvedValue({ status: 200, data: {} })

    await getSpendFileVersion('abc-123')

    expect(get).toHaveBeenCalledWith('https://api.test/api/spend_file_versions/abc-123')
  })

  it('reports failure instead of throwing when the request errors', async () => {
    get.mockRejectedValue({ response: { status: 500, data: null } })

    const response = await getSpendFileVersion('abc-123')

    expect(response.success).toBe(false)
    expect(response.code).toBe(500)
  })
})

/**
 * WI#19582 — `postNineBoxThresholds()`.
 *
 * The endpoint answers 202: the reclassification is queued, not finished. giveAnswer() only counts
 * 200/201/204 as success, so without the 202 case the caller reads an accepted job as a failure —
 * it did, and the screen toasted an error and kept the modal open over a job already running.
 */
describe('postNineBoxThresholds', () => {
  const PAYLOAD = {
    programUuid: 'program-uuid-1',
    boxType: 'cashFlow' as const,
    mode: 'manual' as const,
    med: 8238,
    high: 240096,
    currencyRate: 1,
  }

  it('treats the 202 of a queued job as success', async () => {
    post.mockResolvedValue({
      status: 202,
      data: { id: 'f518de9b', boxType: 'cashFlow', mode: 'manual', programUuid: 'program-uuid-1' },
    })

    const response = await postNineBoxThresholds('/api/spend_file_versions/abc-123', PAYLOAD)

    expect(post).toHaveBeenCalledWith(
      'https://api.test/api/spend_file_versions/abc-123/nine_box_thresholds',
      PAYLOAD,
    )
    expect(response.success).toBe(true)
    expect(response.code).toBe(202)
  })

  it('still reports a rejected payload as a failure', async () => {
    post.mockRejectedValue({
      response: { status: 422, data: { detail: 'high must be greater than med.' } },
    })

    const response = await postNineBoxThresholds('abc-123', PAYLOAD)

    expect(response.success).toBe(false)
    expect(response.code).toBe(422)
    expect(response.data.detail).toBe('high must be greater than med.')
  })
})
