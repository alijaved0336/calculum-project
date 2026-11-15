/**
 * `Intl.NumberFormat` construction is the expensive part (see `chartFormatting.ts`'s own
 * `numberFormatterFor`, the established pattern this mirrors) - cached per code/locale rather than
 * rebuilt on every call, since `resolveCurrencySymbol` runs once per currency option on every
 * dropdown recompute and once per figure via `selectedCurrencySymbol`. A code Intl cannot resolve
 * (an unrecognized ISO 4217 code) caches as `null` too, so a bad catalog entry pays the
 * constructor's thrown exception once, not on every subsequent call.
 */
const formatterCache = new Map<string, Intl.NumberFormat | null>()

function currencyFormatterFor(code: string, locale: string): Intl.NumberFormat | null {
  const cacheKey = `${locale}:${code}`
  if (formatterCache.has(cacheKey)) {
    return formatterCache.get(cacheKey)!
  }

  let formatter: Intl.NumberFormat | null = null
  try {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
    })
  } catch {
    // Intl throws on a code it cannot resolve to an ISO 4217 currency - cached as null so a bad
    // catalog entry throws (and is caught) once, not on every later call for the same code.
  }
  formatterCache.set(cacheKey, formatter)
  return formatter
}

/**
 * Resolves the display symbol for one currency (UC-UI-23), a fallback chain of three:
 *
 * 1. The API's own `symbol` field on the currency catalog entry (`Currency.symbol`,
 *    `api/currencies.ts`) - once the backend half of this story ships it.
 * 2. Failing that (A1: the backend half has not merged/deployed yet, so every catalog entry's
 *    `symbol` is absent), a symbol derived from `Intl.NumberFormat`'s own `currencyDisplay:
 *    'symbol'` for the code/locale - this is what makes the picker and every money figure correct
 *    in DEV today regardless of which repo's PR lands first.
 * 3. Failing THAT (a code `Intl` does not recognize as ISO 4217 - a placeholder/test code, or one
 *    newer than the runtime's locale data), the bare code itself, so a caller never renders an
 *    empty prefix (AC#6) and this function never throws.
 */
export function resolveCurrencySymbol(
  code: string,
  apiSymbol: string | null | undefined,
  locale = 'en-US',
): string {
  if (apiSymbol) {
    return apiSymbol
  }

  const formatter = currencyFormatterFor(code, locale)
  if (formatter) {
    const symbolPart = formatter.formatToParts(0).find((part) => part.type === 'currency')
    if (symbolPart?.value) {
      return symbolPart.value
    }
  }

  return code
}
