/**
 * What an address is allowed to choose on the sign-in error screen (G-350, AB#19509).
 *
 * The screen at `/message/:errorType/:message/:errorb2c?` used to build an i18n key out of one URL
 * segment and print another verbatim, so a link anybody could send put chosen sentences on a real
 * login page, at a real domain, under a real certificate. Not XSS — Vue escapes interpolation — but
 * text injection into the one page a phishing site spends its effort imitating.
 *
 * <b>The rule here is the fix, and it lives apart from the view on purpose.</b> `Main.vue` reads the
 * same values off the query string, so the screen is not the only way in and a check written inside
 * it would only cover one of the two.
 *
 * The shape this follows is the one AR built for G-349: constrain what a value may look like, at
 * every point it enters, and render nothing when it does not match. AR's third technique — record
 * the detail server-side against an opaque reference — has no caller here: two of AP's four callers
 * reach this screen without a server round trip, so there is no request in which anything could be
 * recorded. Deleting the free-text channel is the equivalent, and it leaves nothing to constrain.
 */

/** Rendered when the address names nothing we recognise. Defined in every locale. */
export const GENERIC_MESSAGE_KEY = 'error.generic'

/**
 * Slugs are lowercase words and dashes, which is what every caller has always sent.
 *
 * The dash-and-letters shape is doing one specific job beyond tidiness: <b>no dots</b>. Without it a
 * slug could only ever reach DEEPER under `error.`, where nothing lives but leaf strings — but that
 * is a property of today's locale files rather than of this code, and it stops being true the day
 * somebody nests something under `error`.
 */
const ACCEPTABLE_SLUG = /^[a-z0-9-]+$/

/**
 * The i18n key for a slug, or the generic one.
 *
 * Takes the key-exists predicate rather than reaching for i18n so the rule can be read and tested
 * without one; the view hands it vue-i18n's `te`. <b>Existence in the locale files IS the closed
 * set</b> — better than a list kept by hand, which drifts the first time a caller adds a slug. The
 * most a crafted link achieves is showing somebody one of our own real error sentences.
 */
export function resolveErrorMessageKey(slug: unknown, hasKey: (key: string) => boolean): string {
  if (typeof slug !== 'string' || !ACCEPTABLE_SLUG.test(slug)) return GENERIC_MESSAGE_KEY

  const key = `error.${slug}`

  return hasKey(key) ? key : GENERIC_MESSAGE_KEY
}

/**
 * B2C's own error codes, and the OAuth error names it uses alongside them. Same set AR accepts, so
 * the two applications agree on what a provider code looks like.
 */
const ACCEPTABLE_PROVIDER_CODE =
  /^(AADB2C\d{5}|access_denied|server_error|temporarily_unavailable|invalid_request|unauthorized_client|invalid_grant)$/

/**
 * The provider's code, read by shape out of whatever it sent, or nothing.
 *
 * B2C's `error_description` is its code followed by prose — `AADB2C90091: The user has cancelled…`.
 * The code is the only half support can use and the prose is the half an attacker would write, so
 * only the code travels. <b>You cannot write a sentence inside `AADB2C90091`.</b>
 */
export function readProviderErrorCode(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const b2cCode = /AADB2C\d{5}/.exec(value)
  if (b2cCode) return b2cCode[0]

  const trimmed = value.trim()

  return ACCEPTABLE_PROVIDER_CODE.test(trimmed) ? trimmed : null
}

export type AlertVariant = 'error' | 'warning' | 'info' | 'success'

const ACCEPTABLE_VARIANTS = new Set<string>(['error', 'warning', 'info', 'success'])

/**
 * Which alert style to render, defaulting to `error`.
 *
 * The screen used to carry four near-identical sections each gated on this value, so a type outside
 * the four rendered no message at all: a blank alert above a countdown. Defaulting means there is
 * always something to read, and the caller cannot invent a fifth style.
 */
export function resolveAlertVariant(errorType: unknown): AlertVariant {
  return typeof errorType === 'string' && ACCEPTABLE_VARIANTS.has(errorType)
    ? (errorType as AlertVariant)
    : 'error'
}
