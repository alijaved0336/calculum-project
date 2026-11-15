import { describe, expect, it } from 'vitest'

import {
  GENERIC_MESSAGE_KEY,
  readProviderErrorCode,
  resolveAlertVariant,
  resolveErrorMessageKey,
} from '@/modules/auth/errorMessages'

/**
 * The rules behind the sign-in error screen (G-350, AB#19509).
 *
 * The screen used to take its wording from a URL path segment and its diagnostic from a second one,
 * so a link anybody could send put chosen sentences on a real login page, at a real domain, under a
 * real certificate. These three functions are the whole of what stops that, so they are tested
 * apart from the view: what an address is allowed to choose is a rule, not a rendering detail.
 *
 * `resolveErrorMessageKey` takes the key-exists predicate rather than reaching for i18n, so these
 * tests exercise the real decision without an i18n instance. The view hands it vue-i18n's `te`.
 */
describe('resolveErrorMessageKey', () => {
  /** Stands in for the locale files: the two keys AP actually navigates with. */
  const hasKey = (key: string) => key === 'error.error-login' || key === 'error.get-data'

  it('resolves a slug the locale files define', () => {
    expect(resolveErrorMessageKey('get-data', hasKey)).toBe('error.get-data')
  })

  it('returns the generic key for a slug no locale file defines', () => {
    // `error-loginfb` is the live case: `Login.vue` branches on it and no locale file has ever
    // defined it, so the screen used to render the literal string `error.error-loginfb` to a real
    // user with no attacker involved.
    expect(resolveErrorMessageKey('error-loginfb', hasKey)).toBe(GENERIC_MESSAGE_KEY)
  })

  it('never builds a key out of a sentence', () => {
    // The attack in one line. vue-i18n returns the KEY for a miss, so a resolver that handed back
    // `error.<segment>` would have the view print the attacker's words with a prefix.
    const hostile = 'Your account is locked, call +1-555-0100'

    expect(resolveErrorMessageKey(hostile, hasKey)).toBe(GENERIC_MESSAGE_KEY)
  })

  it('refuses a dotted slug rather than letting it address another namespace', () => {
    expect(resolveErrorMessageKey('..global.copyright', () => true)).toBe(GENERIC_MESSAGE_KEY)
  })

  it('returns the generic key when no slug arrives at all', () => {
    expect(resolveErrorMessageKey(undefined, hasKey)).toBe(GENERIC_MESSAGE_KEY)
    expect(resolveErrorMessageKey('', hasKey)).toBe(GENERIC_MESSAGE_KEY)
  })
})

describe('readProviderErrorCode', () => {
  it("lifts B2C's code out of the description it arrives inside", () => {
    // What B2C actually sends: the code, then prose. Only the code is worth anything to support,
    // and the prose is the half an attacker would write.
    const description = 'AADB2C90091: The user has cancelled entering self-asserted information.'

    expect(readProviderErrorCode(description)).toBe('AADB2C90091')
  })

  it('accepts an OAuth error name on its own', () => {
    expect(readProviderErrorCode('access_denied')).toBe('access_denied')
  })

  it('discards a description that is only prose', () => {
    // The second entry point: `Main.vue` reads `error_description` from the query string, so
    // `/?error=x&error_description=<chosen text>` reached the screen without naming the route.
    expect(readProviderErrorCode('Your account is locked, call +1-555-0100')).toBeNull()
  })

  it('discards a code with prose wrapped around a valid-looking shape', () => {
    expect(readProviderErrorCode('access_denied — call +1-555-0100 to unlock')).toBeNull()
  })

  it('discards a missing or non-string value', () => {
    expect(readProviderErrorCode(null)).toBeNull()
    expect(readProviderErrorCode(undefined)).toBeNull()
  })
})

describe('resolveAlertVariant', () => {
  it('keeps the four variants the screen has always rendered', () => {
    expect(resolveAlertVariant('error')).toBe('error')
    expect(resolveAlertVariant('warning')).toBe('warning')
    expect(resolveAlertVariant('info')).toBe('info')
    expect(resolveAlertVariant('success')).toBe('success')
  })

  it('falls back to error for anything else, so a message is always shown', () => {
    // Previously an unrecognised type matched none of the four sections and the screen rendered no
    // message at all — a blank alert above a countdown.
    expect(resolveAlertVariant('surprise')).toBe('error')
    expect(resolveAlertVariant(undefined)).toBe('error')
  })
})
