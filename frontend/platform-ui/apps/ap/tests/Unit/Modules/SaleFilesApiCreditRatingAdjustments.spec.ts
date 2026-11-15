/**
 * UC-SET-08 / AB#19911 — the URL each adjustments kind resolves to.
 *
 * Both families now run one parameterised function each, so `SaleFilesApiAdjustmentsOutcome.spec.ts`
 * already covers the envelope handling and the three outcome states for both. What it cannot cover
 * is the segment: the `kind` argument is the only thing keeping the two columns apart, and a
 * transposed constant would leave every assertion in that file green while this column read and
 * wrote the other file entirely — no exception, no log line, because both endpoints exist and both
 * answer.
 *
 * So this file asserts the six URLs together, in one case, rather than one case per call that can
 * only fail alongside its neighbours.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('@/utils/axios', () => ({ default: { get, post } }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'https://api.test' }))

import {
  ADJUSTMENTS_KIND_CREDIT_RATING,
  ADJUSTMENTS_KIND_STRATEGY,
  ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET,
  downloadAdjustments,
  fetchAdjustmentsOutcome,
  uploadAdjustments
} from '@/modules/home/saleFiles/api'

const UUID = 'version-uuid-1'
const BASE = `https://api.test/api/sale_file_versions/${UUID}`

beforeEach(() => {
  vi.clearAllMocks()
  get.mockResolvedValue({ status: 200, data: new ArrayBuffer(8), headers: {} })
  post.mockResolvedValue({ status: 202, data: {} })
})

describe('adjustments endpoints by kind', () => {
  it('sends each kind to its own route, and never to the other one', async () => {
    await downloadAdjustments(UUID, ADJUSTMENTS_KIND_CREDIT_RATING)
    await downloadAdjustments(UUID, ADJUSTMENTS_KIND_STRATEGY)

    get.mockResolvedValue({
      status: 200,
      data: { result: 'success', message: null, data: { state: ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET, report: null }, error: null }
    })
    await fetchAdjustmentsOutcome(UUID, ADJUSTMENTS_KIND_CREDIT_RATING)
    await fetchAdjustmentsOutcome(UUID, ADJUSTMENTS_KIND_STRATEGY)

    await uploadAdjustments(new Blob(['a']), UUID, ADJUSTMENTS_KIND_CREDIT_RATING)
    await uploadAdjustments(new Blob(['a']), UUID, ADJUSTMENTS_KIND_STRATEGY)

    expect(get.mock.calls.map((c) => c[0])).toEqual([
      `${BASE}/credit-rating-adjustments`,
      `${BASE}/strategy-adjustments`,
      `${BASE}/credit-rating-adjustments/outcome`,
      `${BASE}/strategy-adjustments/outcome`
    ])
    expect(post.mock.calls.map((c) => c[0])).toEqual([
      `${BASE}/credit-rating-adjustments`,
      `${BASE}/strategy-adjustments`
    ])
  })

  /**
   * The download is read as bytes and the upload sent as multipart, whichever kind it is: the
   * file's shape is Receivables' to decide, and the credit rating export is BOM-prefixed CSV where
   * its sibling is a spreadsheet. Decoding either would corrupt the one the administrator edits.
   */
  it('moves the file as bytes in and multipart out, without interpreting it', async () => {
    await downloadAdjustments(UUID, ADJUSTMENTS_KIND_CREDIT_RATING)
    await uploadAdjustments(new Blob(['a']), UUID, ADJUSTMENTS_KIND_CREDIT_RATING)

    expect(get.mock.calls[0][1]).toMatchObject({ responseType: 'arraybuffer' })
    expect(post.mock.calls[0][1]).toBeInstanceOf(FormData)
  })
})
