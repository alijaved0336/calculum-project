/**
 * Ported from apps/ap/src/utils/FormatData.ts (formatISODateToUS).
 */

/**
 * `YYYY-MM-DD` -> `MM/DD/YYYY`. Parsed from the string directly rather than through `new Date(...)`,
 * which would shift the date under the reader's own timezone.
 */
export function toUSDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-')
  return `${month}/${day}/${year}`
}
