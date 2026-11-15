import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Guards the production-build environment check in vite.config.ts (G-61) against a silent
 * regression.
 *
 * vite.config.ts is excluded from the coverage measurement (`**\/*.config.*` in
 * vitest.config.ts), so a broken guard passes `vitest run --coverage` with no signal: an inverted
 * `mode` check, a dropped required variable, or a wrong `loadEnv` prefix would all still read as
 * fully covered. Asserted against the source rather than by importing the config, for the same
 * reason observability.spec.ts is: importing vite.config.ts runs it the way Vite does (reads
 * package.json, shells out to git, probes for a dev TLS cert), which exercises far more than the
 * one guard this file cares about.
 */
const viteConfig = read('../../vite.config.ts')

describe('AR production build env guard', () => {
  it('only refuses a production build, not dev or test', () => {
    expect(viteConfig).toMatch(/if\s*\(\s*mode === 'production'\s*\)\s*\{/)
  })

  it('requires the API base URL and the storage secret', () => {
    expect(viteConfig).toMatch(
      /required = \[\s*'VITE_BASE_URL',\s*'VITE_APP_STORAGE_SECRET',?\s*\]/,
    )
  })

  it('reads only VITE_-prefixed variables, matching the app\'s env contract', () => {
    expect(viteConfig).toMatch(/loadEnv\(mode, __dirname, 'VITE_'\)/)
  })

  it('throws, naming every missing variable, rather than warning or stopping at the first', () => {
    expect(viteConfig).toMatch(/missing = required\.filter\(/)
    expect(viteConfig).toMatch(/if \(missing\.length > 0\) \{\s*\n\s*throw new Error/)
  })
})

function read(relative: string): string {
  return readFileSync(resolve(__dirname, relative), 'utf8')
}
