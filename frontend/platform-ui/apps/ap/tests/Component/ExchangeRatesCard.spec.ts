/**
 * Tests for ExchangeRatesCard — chartCategories label building.
 *
 * Regression for Sentry ADA-VUE-6G / WI#17408:
 *   "TypeError: Cannot read properties of undefined (reading 'split')"
 *
 * The chart category labels are derived from each datapoint's `date` ("YYYY-MM").
 * When a datapoint arrives without a `date` (or the item is null/undefined),
 * the destructured `date` is undefined and `date.split('-')` used to throw.
 * The fix filters out datapoints lacking a `date` before mapping.
 *
 * We mirror the computed as a pure-logic helper (fast, no DOM), following the
 * same approach used in EntityCardTextArc.spec.ts.
 */

import { describe, it, expect } from 'vitest'

type Point = { date?: string; value?: number } | null | undefined

// ─── Pure-logic helper (mirrors the chartCategories computed in ExchangeRatesCard) ──

function buildChartCategories(current?: Point[], previous?: Point[]): string[] {
  const source = current ?? previous
  return source
    ?.filter((item: Point): item is { date: string } => Boolean(item?.date))
    .map(({ date }: { date: string }) => {
      const [year, month] = date.split('-')
      return `${new Date(Number(year), Number(month) - 1).toLocaleString('en', { month: 'short' })} ${year.slice(2)}`
    }) ?? []
}

describe('ExchangeRatesCard — buildChartCategories', () => {
  it('builds "MMM YY" labels from well-formed datapoints', () => {
    const result = buildChartCategories([{ date: '2026-01' }, { date: '2026-03' }])
    expect(result).toEqual(['Jan 26', 'Mar 26'])
  })

  it('falls back to `previous` when `current` is undefined', () => {
    const result = buildChartCategories(undefined, [{ date: '2025-12' }])
    expect(result).toEqual(['Dec 25'])
  })

  it('returns an empty array when there is no chart data', () => {
    expect(buildChartCategories(undefined, undefined)).toEqual([])
  })

  // ─── Regression: WI#17408 ────────────────────────────────────────────────

  it('does NOT throw and skips a datapoint missing `date`', () => {
    expect(() =>
      buildChartCategories([{ date: '2026-01' }, { value: 1.23 }, { date: '2026-02' }]),
    ).not.toThrow()
    expect(buildChartCategories([{ date: '2026-01' }, { value: 1.23 }, { date: '2026-02' }])).toEqual([
      'Jan 26',
      'Feb 26',
    ])
  })

  it('does NOT throw and skips null/undefined datapoints', () => {
    expect(() => buildChartCategories([null, { date: '2026-04' }, undefined])).not.toThrow()
    expect(buildChartCategories([null, { date: '2026-04' }, undefined])).toEqual(['Apr 26'])
  })

  it('returns an empty array when every datapoint lacks a `date`', () => {
    expect(buildChartCategories([{ value: 1 }, null, { value: 2 }])).toEqual([])
  })
})
