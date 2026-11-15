/**
 * Ported from apps/ap/src/utils/FormatData.ts (getNumberWithDecimals) and
 * apps/ap/src/utils/StringUtils.ts (formatBigNumbers) at commits 514bc076d6 and c4d0f97c33
 * respectively (UC-UI-00 / AB#19226).
 *
 * Adapted:
 * - AP's getNumberWithDecimals reads a per-user locale preference from its own Pinia user store
 *   (useUserStore().getUserNumberFormatting), which AR has no equivalent of. Fixed to 'en-US',
 *   matching every other formatter already in apps/ar (see apps/ar/src/modules/match/utils/format.ts).
 * - getNumberWithDecimals is called from WaterfallChart's `captureTooltipContent` (a mousemove-driven
 *   hot path) and from GeoChart's per-row draw loop, so the `Intl.NumberFormat` instance is now
 *   cached per fraction-digit count instead of constructed fresh on every call — construction is
 *   the expensive part, and instances are stateless/shareable.
 */

const numberFormatters = new Map<number, Intl.NumberFormat>()

function numberFormatterFor(maximumFractionDigits: number): Intl.NumberFormat {
  let formatter = numberFormatters.get(maximumFractionDigits)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      maximumFractionDigits,
      minimumFractionDigits: maximumFractionDigits,
    })
    numberFormatters.set(maximumFractionDigits, formatter)
  }
  return formatter
}

/**
 * A number with a fixed decimal count, e.g. for chart tooltips.
 */
export function getNumberWithDecimals(
  value: string | number | null | undefined,
  maximumFractionDigits = 2,
): string {
  const num = value ?? 0
  return numberFormatterFor(maximumFractionDigits).format(typeof num === 'number' ? num : Number.parseFloat(num))
}

/**
 * A large number collapsed to a k/m/b/t/q/i/s-suffixed short form, e.g. for chart axis labels.
 */
export function formatBigNumbers(
  value: number,
  options?: Partial<{ maximumFractionDigits: number; minimumFractionDigits: number }>,
): string {
  const { maximumFractionDigits = 1, minimumFractionDigits = 1 } = options ?? {}
  const localeOptions = { maximumFractionDigits, minimumFractionDigits }
  const abs = Math.abs(value)

  const suffixes: Array<[number, string]> = [
    [1e21, 's'],
    [1e18, 'i'],
    [1e15, 'q'],
    [1e12, 't'],
    [1e9, 'b'],
    [1e6, 'm'],
    [1e3, 'k'],
  ]

  const suffix = suffixes.find(([threshold]) => abs >= threshold)
  if (suffix) {
    const [threshold, letter] = suffix
    return (value / threshold).toLocaleString('en-US', localeOptions) + letter
  }

  return abs === 0 ? '0' : value.toLocaleString('en-US', localeOptions)
}
