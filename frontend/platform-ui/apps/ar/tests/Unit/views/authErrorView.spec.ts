import { describe, expect, it, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

// `useRoute()` resolves through injection rather than `this.$route`, so a `mocks` entry does not
// reach a `<script setup>` component. The module is mocked and the query swapped per test.
const currentQuery: { value: Record<string, string> } = { value: {} }
vi.mock('vue-router', () => ({ useRoute: () => ({ query: currentQuery.value }) }))

import AuthErrorView from '@/views/AuthErrorView.vue'

/**
 * The sign-in error screen (G-349), and mostly the one property it exists to have: nothing an
 * address can carry reaches the page as words.
 *
 * Payables' equivalent route takes the message as a path segment and renders it, so a crafted link
 * puts chosen text on a real sign-in screen at a real domain (G-350). These tests are what stop the
 * same thing arriving here by a later edit that looks harmless.
 */
const messages = {
  en: {
    auth: {
      signInError: {
        title: 'We could not sign you in',
        genericBody: 'Something interrupted your sign-in. Starting again usually fixes it.',
        retry: 'Sign in again',
        detailsHeading: 'Technical details',
        providerCode: 'Provider code',
        reference: 'Reference',
        detailsHint: 'Support may ask you for these.',
        reasons: {
          link_spent: 'That sign-in link has already been used.',
          no_company: 'This account has no receivables company.',
        },
      },
    },
  },
}

function mountWith(query: Record<string, string>) {
  currentQuery.value = query
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })

  return mount(AuthErrorView, { global: { plugins: [i18n] } })
}

/** 43 characters of base64url, which is what the server's 32 random bytes encode to. */
const REFERENCE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

describe('AuthErrorView', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the copy the slug names', async () => {
    const view = mountWith({ code: 'link_spent' })
    await flushPromises()

    expect(view.text()).toContain('That sign-in link has already been used.')
  })

  it('renders the generic sentence for a slug it does not know, and never the slug itself', async () => {
    // The attack this screen is designed against, in one line. vue-i18n returns the KEY for a miss,
    // so without the `te` check the page would print the attacker's string with a prefix.
    const hostile = 'Your account is locked, call +1-555-0100'
    const view = mountWith({ code: hostile })
    await flushPromises()

    expect(view.text()).toContain('Something interrupted your sign-in.')
    expect(view.text()).not.toContain('555-0100')
    expect(view.text()).not.toContain(hostile)
  })

  it('shows a provider code the server recorded, once it passes the shape check', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ detail: { code: 'provider_refused', providerCode: 'AADB2C90272' } }),
    }))

    const view = mountWith({ code: 'link_spent', ref: REFERENCE })
    await flushPromises()

    expect(view.text()).toContain('AADB2C90272')
  })

  it('refuses a provider code that is not shaped like one, wherever it came from', async () => {
    // The server reads B2C's description by shape before storing it, so this is a second gate on
    // the same value. It is here so the rule survives somebody later reading this from the query
    // string, which is the edit that would quietly rebuild G-350.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ detail: { providerCode: 'Call +1-555-0100 to verify your account' } }),
    }))

    const view = mountWith({ code: 'link_spent', ref: REFERENCE })
    await flushPromises()

    expect(view.text()).not.toContain('555-0100')
  })

  it('asks for no detail when the address carries no reference', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    mountWith({ code: 'link_spent' })
    await flushPromises()

    expect(fetch).not.toHaveBeenCalled()
  })

  it('stays readable when the detail lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const view = mountWith({ code: 'no_company', ref: REFERENCE })
    await flushPromises()

    // The details are an extra. A failed lookup must not replace a sign-in error with a fetch one.
    expect(view.text()).toContain('This account has no receivables company.')
  })

  it('never renders a reference taken from the address, however it is dressed up', async () => {
    // The review finding on PR 14050, pinned. `providerCode` was gated behind a shape check and the
    // reference beside it was printed verbatim, so `?ref=<prose>` put chosen words on a real
    // sign-in error page — G-350 under a different query key, inside the change written to prevent
    // it. Nothing the address carries is displayed now; the reference shown is the one the server
    // echoes back.
    const hostile = 'Call 1-555-0100 to unlock your account'
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    const view = mountWith({ code: 'link_spent', ref: hostile })
    await flushPromises()

    expect(view.text()).not.toContain('555-0100')
    expect(view.text()).not.toContain(hostile)
    // It is not even sent: the key is shape-checked before a request is worth making.
    expect(fetch).not.toHaveBeenCalled()
  })

  it('renders the reference the server echoes, not the one in the address', async () => {
    const inAddress = REFERENCE
    const fromServer = 'B' + 'b'.repeat(42)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ detail: { providerCode: 'AADB2C90272', reference: fromServer } }),
    }))

    const view = mountWith({ code: 'link_spent', ref: inAddress })
    await flushPromises()

    expect(view.text()).toContain(fromServer)
  })

  it('shows no reference when the lookup resolves nothing', async () => {
    // A reference the server cannot resolve is also one support cannot use, so showing nothing is
    // the honest answer rather than echoing the address back at the reader.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ detail: null }) }))

    const view = mountWith({ code: 'link_spent', ref: REFERENCE })
    await flushPromises()

    expect(view.text()).not.toContain(REFERENCE)
  })


  it.each([
    'title',
    '../title',
    'reasons.link_spent',
    'auth.signInError.title',
    'link-spent',
    'LINK_SPENT',
  ])('renders the generic sentence for the slug %s, which is not one of the seven', async (slug) => {
    // Raised on PR 14050 as a way to address arbitrary translations. Measured, it is not: the key
    // is always prefixed, so a slug only ever reaches DEEPER under `reasons.`, where nothing lives
    // but the seven leaf strings. Pinned anyway, together with the [a-z_]+ check now in front of
    // it, so neither the claim nor the guard has to be re-derived if somebody nests something
    // under `reasons` later.
    const view = mountWith({ code: slug })
    await flushPromises()

    expect(view.text()).toContain('Something interrupted your sign-in.')
    // The slug itself, which is the thing that must not reach the page. The assertion here used to
    // read `not.toContain('We could not sign you in.')` — with a trailing period the fixture title
    // does not have, so it searched for a string that is never present and could not fail. It was
    // also checking the wrong thing: the title is rendered on every path by design.
    expect(view.text()).not.toContain(slug)
  })

})
