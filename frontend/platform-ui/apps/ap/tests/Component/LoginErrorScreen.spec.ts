import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

vi.mock('@/services/router/Routing', () => ({ openRelogin: vi.fn() }))
vi.mock('@/utils/CookieSessionsFns', () => ({ authLogin: vi.fn() }))
vi.mock('@/resources/assets/assets', () => ({ images: { backgroundLogin: '' }, fontIcons: {} }))
vi.mock('@ada/design-system', () => ({ CalculumLoading: { template: '<div />' } }))

import { messages } from '@ada/design-system/locales/index'
import Login from '@/modules/auth/views/Login.vue'

/**
 * The sign-in error screen, and the one property it has to have: nothing an address carries reaches
 * the page as words (G-350, AB#19509).
 *
 * <b>The copy comes from the real locale files, not from a fixture.</b> A spec that declared its own
 * `error.generic` would stay green after somebody removed the real one, and the screen would then
 * render an empty alert to whoever hit an unrecognised slug.
 */
function mountScreen(props: { errorType: string; message?: string; errorb2c?: string }) {
  setActivePinia(createPinia())

  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })

  return mount(Login, { props, global: { plugins: [i18n] } })
}

describe('Login error screen', () => {
  it('renders the copy the locale files hold for a slug they define', () => {
    const screen = mountScreen({ errorType: 'error', message: 'get-data' })

    expect(screen.text()).toContain('There was an error trying to get your data.')
  })

  it('renders generic copy for a hostile segment, and never the segment itself', () => {
    // The defect, in one line: this string used to arrive as `error.<the whole sentence>`, because
    // vue-i18n returns the key for a miss.
    const hostile = 'Your account is locked, call +1-555-0100'

    const screen = mountScreen({ errorType: 'error', message: hostile })

    expect(screen.text()).not.toContain('555-0100')
    expect(screen.text()).not.toContain(hostile)
    expect(screen.text()).toContain(messages.en.error.generic)
  })

  it('renders generic copy for error-loginfb, which no locale file defines', () => {
    // Not hypothetical: `goTologinScreen` branches on this slug and the key has never existed, so
    // the screen rendered the literal `error.error-loginfb` to a real user.
    const screen = mountScreen({ errorType: 'error', message: 'error-loginfb' })

    expect(screen.text()).not.toContain('error-loginfb')
    expect(screen.text()).toContain(messages.en.error.generic)
  })

  it('renders an alert even when the type is one it does not recognise', () => {
    const screen = mountScreen({ errorType: 'surprise', message: 'get-data' })

    expect(screen.text()).toContain('There was an error trying to get your data.')
  })

  it('does not render a diagnostic the provider could not have sent', () => {
    const hostile = 'Call +1-555-0100 to unlock your account'

    const screen = mountScreen({ errorType: 'error', message: 'get-data', errorb2c: hostile })

    expect(screen.text()).not.toContain('555-0100')
    expect(screen.text()).not.toContain(hostile)
  })

  it("renders a provider code that matches B2C's own shape", () => {
    const screen = mountScreen({ errorType: 'error', message: 'get-data', errorb2c: 'AADB2C90272' })

    expect(screen.text()).toContain('AADB2C90272')
  })

  it('falls back to the default locale rather than to generic copy', () => {
    // Raised by AI review on PR 14238, and the mechanism is real: vue-i18n's `te()` inspects the
    // ACTIVE locale only and ignores `fallbackLocale`, while `t()` honours it. So a key defined in
    // en.json and not yet in es.json used to render its English sentence to a Spanish user and would
    // silently render generic copy instead.
    //
    // <b>This is the one test here that builds its own messages rather than reading the real locale
    // files</b>, and it has to: the two `error` blocks are identical today (22 keys each), so the
    // drift this guards against cannot be expressed with the real files. The bot's specific examples
    // — `error.get-data`, `error.dataUpdateFailed`, `error.error-provider` — are all present in
    // es.json; the risk is the next key somebody adds to one file only, which is exactly what WI
    // 19518 had just finished cleaning up elsewhere in these files.
    setActivePinia(createPinia())

    const drifted = createI18n({
      legacy: false,
      locale: 'es',
      fallbackLocale: 'en',
      messages: { en: { error: { 'get-data': 'English sentence' } }, es: { error: {} } },
    })

    const screen = mount(Login, {
      props: { errorType: 'error', message: 'get-data' },
      global: { plugins: [drifted] },
    })

    expect(screen.text()).toContain('English sentence')
  })

  it('renders no diagnostic label when there is no code to show', () => {
    // With no `v-if`, every legitimate visit used to show a bare `Error: ` — and the one caller that
    // filled it passed an object, so support read `[object Object]`.
    const screen = mountScreen({ errorType: 'error', message: 'get-data' })

    expect(screen.text()).not.toContain('Error:')
  })
})
