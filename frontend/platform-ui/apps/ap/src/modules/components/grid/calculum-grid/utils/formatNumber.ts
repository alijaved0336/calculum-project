/**
 * Locale-aware number formatting for grid chrome (e.g. pager total).
 */

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}
