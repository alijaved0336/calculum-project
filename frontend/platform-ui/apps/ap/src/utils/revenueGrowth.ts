/**
 * Computes revenue growth as a percentage: ((y - y1) / |y1|) * 100
 *
 * Returns null when either input is null or when y1 is 0 (division by zero).
 * The caller decides how to format the result (e.g. toFixed(2) + '%').
 */
export function computeRevenueGrowthPercent(
  y: number | null,
  yMinus1: number | null,
): number | null {
  if (y === null || yMinus1 === null) return null
  if (yMinus1 === 0) return null
  return ((y - yMinus1) / Math.abs(yMinus1)) * 100
}
