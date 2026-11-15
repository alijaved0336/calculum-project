/**
 * A payment term in whole days, singular for exactly one day.
 *
 * Routes the unit through vue-i18n's pluralization (`arEntityCard.opportunity.days`) so a
 * Spanish caller reads "30 días" beside its own Spanish label. `translate` is required: every
 * caller has vue-i18n context of its own (RadarChart.vue formats its tooltip's day count with
 * its own local `t()` call rather than this function, so it never needed the English-only
 * fallback this used to carry).
 */
export const formatDays = (
  value: number | null | undefined,
  translate: (key: string, params: { count: number }) => string,
): string => {
  if (value === null || value === undefined) {
    return '—'
  }
  return translate('arEntityCard.opportunity.days', { count: value })
}
