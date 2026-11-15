/**
 * AB#20259 — `fetchAdjustmentsOutcome()`.
 *
 * The unit the component spec could not reach. `AdminUploadDataReceivablesOutcome.spec.ts` mocks
 * this function, so the one thing it does — turning an HTTP response into the three states — had no
 * test at all, and shipped reading the wrong level of the body: the monolith answers with the
 * envelope `{ result, message, data, error }`, `giveAnswer` hands that envelope back untouched as
 * `data`, and the payload therefore sits at `data.data`. Every answer, good ones included, came out
 * with `state: undefined` and reached the administrator as an error toast.
 *
 * So these cases feed a REAL envelope through the REAL `giveAnswer`. Mocking either would restore
 * the blind spot the bug lived in.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/utils/axios', () => ({ default: { get } }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'https://api.test' }))

import {
  ADJUSTMENTS_KIND_STRATEGY,
  fetchAdjustmentsOutcome,
  ADJUSTMENTS_OUTCOME_REPORTED,
  ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET,
  ADJUSTMENTS_OUTCOME_VERSION_UNKNOWN
} from '@/modules/home/saleFiles/api'

const REPORT = {
  objectKey: 'adjustments/version-uuid-1/edited.csv',
  uploadedByEmail: 'anabeisy@calculum.ai',
  status: 'Applied',
  rowsMatched: 184,
  valuesWritten: 6,
  valuesCleared: 25,
  valuesUnchanged: 1103,
  rejections: [{ lineNumber: 47, sourceUniqueId: 'BU-10231', reason: 'matches no line of this version.' }],
  completedAt: '2026-09-11T19:04:00+00:00'
}

/** What the proxy actually puts on the wire. The nesting is the point of these tests. */
function envelope(data: any) {
  return { status: 200, data: { result: 'success', message: null, data, error: null } }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchStrategyAdjustmentsOutcome', () => {
  it('asks the version own outcome endpoint by bare uuid', async () => {
    get.mockResolvedValue(envelope({ state: ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET, report: null }))

    await fetchAdjustmentsOutcome('version-uuid-1', ADJUSTMENTS_KIND_STRATEGY)

    expect(get).toHaveBeenCalledWith(
      'https://api.test/api/sale_file_versions/version-uuid-1/strategy-adjustments/outcome'
    )
  })

  // The regression itself: this read `undefined` before the envelope was unwrapped.
  it('reads the state out of the envelope payload, not the envelope', async () => {
    get.mockResolvedValue(envelope({ state: ADJUSTMENTS_OUTCOME_REPORTED, report: REPORT }))

    const response = await fetchAdjustmentsOutcome('version-uuid-1', ADJUSTMENTS_KIND_STRATEGY)

    expect(response.success).toBe(true)
    expect(response.state).toBe(ADJUSTMENTS_OUTCOME_REPORTED)
    expect(response.state).toBeDefined()
  })

  it('carries the report through whole, counters and rejections', async () => {
    get.mockResolvedValue(envelope({ state: ADJUSTMENTS_OUTCOME_REPORTED, report: REPORT }))

    const response = await fetchAdjustmentsOutcome('version-uuid-1', ADJUSTMENTS_KIND_STRATEGY)

    expect([
      response.report?.rowsMatched,
      response.report?.valuesWritten,
      response.report?.valuesCleared,
      response.report?.valuesUnchanged
    ]).toEqual([184, 6, 25, 1103])
    expect(response.report?.rejections[0].sourceUniqueId).toBe('BU-10231')
  })

  it('gives back the no-upload state with no report', async () => {
    get.mockResolvedValue(envelope({ state: ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET, report: null }))

    const response = await fetchAdjustmentsOutcome('version-uuid-1', ADJUSTMENTS_KIND_STRATEGY)

    expect(response.state).toBe(ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET)
    expect(response.report).toBeNull()
  })

  // The pair that must never merge, checked here rather than only in the component: a version AR
  // has never heard of is a finding about the sale file, not an absence of adjustments.
  it('keeps a version unknown to Receivables apart from one with no upload', async () => {
    get.mockResolvedValue(envelope({ state: ADJUSTMENTS_OUTCOME_VERSION_UNKNOWN, report: null }))

    const response = await fetchAdjustmentsOutcome('version-uuid-1', ADJUSTMENTS_KIND_STRATEGY)

    expect(response.state).toBe(ADJUSTMENTS_OUTCOME_VERSION_UNKNOWN)
    expect(response.state).not.toBe(ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET)
  })

  // A failed conversation is none of the three. `state` staying absent is what keeps the caller
  // from drawing an unreachable platform as "nothing has been uploaded".
  it('reports a failed proxy as failure with no state', async () => {
    get.mockRejectedValue({
      response: {
        status: 502,
        data: { result: 'error', message: 'The Receivables platform could not be reached.', data: null, error: null }
      }
    })

    const response = await fetchAdjustmentsOutcome('version-uuid-1', ADJUSTMENTS_KIND_STRATEGY)

    expect(response.success).toBe(false)
    expect(response.code).toBe(502)
    expect(response.state).toBeUndefined()
    expect(response.report).toBeNull()
  })

  // The proxy's body carries Receivables' own reason, and the handler reads it out of `data`.
  it('leaves the failure body reachable so the platform own reason survives', async () => {
    get.mockRejectedValue({
      response: {
        status: 502,
        data: { result: 'error', message: 'The Receivables platform rejected this application service key.', data: null, error: null }
      }
    })

    const response = await fetchAdjustmentsOutcome('version-uuid-1', ADJUSTMENTS_KIND_STRATEGY)

    expect(response.data?.message).toContain('service key')
  })
})
