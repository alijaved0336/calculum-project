/**
 * AB#20733 (#20718 AC-04): harmonization group validation, shared by the section and its mock.
 * Messages are i18n keys.
 */
export const MIN_HARMONIZATION_DAYS = 0
export const MAX_HARMONIZATION_DAYS = 365
/** #20718: a company keeps at most 100 groups; "+ Add group" stops there, the API 422s on 101. */
export const MAX_HARMONIZATION_GROUPS = 100

export interface HarmonizationErrors {
  /** One entry per group, aligned with the input; undefined when that group is fine. */
  byIndex: (string | undefined)[]
  /** A section-level error (no groups while harmonization is on). */
  general?: string
}

/** `days` may hold NaN for an emptied input. */
export function validateHarmonizationGroups(days: number[]): HarmonizationErrors {
  const seen = new Map<number, number>()
  const byIndex = days.map((value, index) => {
    if (!Number.isInteger(value) || value < MIN_HARMONIZATION_DAYS || value > MAX_HARMONIZATION_DAYS) {
      return 'arSetup.harmonization.daysRange'
    }
    if (seen.has(value)) return 'arSetup.harmonization.duplicate'
    seen.set(value, index)
    return undefined
  })
  let general: string | undefined
  if (days.length === 0) general = 'arSetup.harmonization.atLeastOne'
  else if (days.length > MAX_HARMONIZATION_GROUPS) general = 'arSetup.harmonization.maxGroups'
  return { byIndex, general }
}

/** "H{n}, {days}D", or "H{n}" while the term is still empty (AP's pill). */
export const harmonizationLabel = (index: number, days: number) =>
  Number.isFinite(days) ? `H${index + 1}, ${days}D` : `H${index + 1}`
