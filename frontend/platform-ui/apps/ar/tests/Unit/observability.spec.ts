import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Guards AR's error reporting against the failure it was just fixed out of.
 *
 * AR shipped for months with `sentryVitePlugin` uploading source maps and the pipeline posting a
 * release marker, for an application that called `Sentry.init` nowhere. Every dashboard listing
 * the project showed it wired up; no event ever arrived. That is worse than having nothing,
 * because nothing is visibly nothing.
 *
 * Asserted against the source rather than by booting the app, for the same reason the context
 * store's `persist.pick` list is: what must not regress is the wiring itself, and a test that
 * imports `main.ts` would mount the whole application to learn one fact about four lines.
 */
const main = read('../../src/main.ts')
const viteConfig = read('../../vite.config.ts')

describe('AR observability wiring', () => {
  it('initialises Sentry, not just the build-time plugin', () => {
    // The original defect exactly: the plugin present, the init absent.
    expect(viteConfig).toContain('sentryVitePlugin')
    expect(main).toMatch(/Sentry\.init\s*\(/)
  })

  it('reports the same release the source maps are uploaded under', () => {
    // Two independently-configured release names is the quiet version of the same failure: events
    // arrive, maps sit in the project unused, and every stack trace is minified with nothing
    // anywhere explaining why. One constant, injected at build time, read at runtime.
    expect(viteConfig).toMatch(/__APP_RELEASE__:\s*JSON\.stringify\(release\)/)
    expect(viteConfig).toMatch(/name:\s*release/)
    expect(main).toMatch(/release:\s*__APP_RELEASE__/)
  })

  it('stays off unless the environment turns it on', () => {
    // Tests, local runs and preview builds must send nothing. Same gate apps/ap uses.
    expect(main).toMatch(/VITE_ALLOW_SENTRY\s*===\s*'true'/)
  })

  it('does not attach personal data by default', () => {
    // These screens carry customer financial data. A field worth sending gets sent deliberately,
    // named, one at a time — never by a default that sweeps up whatever is in scope.
    expect(main).toMatch(/sendDefaultPii:\s*false/)
  })
})

function read(relative: string): string {
  return readFileSync(resolve(__dirname, relative), 'utf8')
}

/*
 * The auth-bypass build guard that used to live here is deleted (UC-ENT-18, G-60).
 *
 * It asserted that `vite.config.ts` refused any production build while VITE_BYPASS_AUTH was set,
 * and that the waiver reached only non-deployed branches. All three assertions were about a flag
 * that no longer exists anywhere in `apps/ar` or `packages/` — the last reader went with commit
 * 6bd021715b, and this change removes the declaration, the guard and both pipeline waivers.
 *
 * Worth being honest about the trade rather than filing it as a cleanup: the protection is now
 * that the flag does not exist, where before it was that the build refused it. A reintroduced
 * bypass would no longer be caught here. That is what the story asks for, and the reason it can
 * ask is that the router guard the flag once disabled is gone too.
 */
