/**
 * AB#20259 — every i18n key this feature asks for must exist in both catalogs.
 *
 * The companion blind spot to `SaleFilesApiAdjustmentsOutcome.spec.ts`. When the outcome detail
 * refused to open it announced `global.noty.error.general`, a key present in neither `en.json` nor
 * `es.json`, so the administrator was shown the key path itself. Nothing caught it: `mountWithProviders`
 * builds i18n with EMPTY catalogs, `t()` there returns whatever key it is handed, and the component
 * spec only asserted that a toast happened — a real key and an invented one are indistinguishable
 * under that setup.
 *
 * So this reads the shipped catalogs, and takes the keys from the source files rather than from a
 * list kept here: a list would be a copy of the code that stays green when the code adds a key.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const APP_ROOT = resolve(__dirname, '../../..')
const CATALOGS = resolve(APP_ROOT, '../../packages/design-system/src/locales/languages')

const SOURCES = [
  'src/modules/adminBackend/views/AdminUploadDataReceivables.vue',
  'src/modules/components/grid/columns/AdjustmentsOutcomeAction.vue',
  // AB#19911 put a feature key (`…receivablesAdjustmentsOutcome.columnCreditRating`) in the column
  // definitions, where nothing scanned it — the guard was a file behind the feature it guards.
  'src/modules/adminBackend/data/columns.ts'
]

/** `$t('a.b')`, `this.$t("a.b")`, `translate.t('a.b')` — the plain literal forms. */
const LITERAL_KEY = /(?:\$t|translate\.t)\(\s*['"]([a-zA-Z0-9_.]+)['"]\s*[,)]/g
/**
 * `$t(`${SOME_PREFIX}.view`)` — the constant is captured rather than named here.
 *
 * Naming one constant would scan for the shape this feature happens to use today: the view already
 * builds its recalculate keys from a second prefix through the composable handle, and a regex
 * pinned to `$t` and to `I18N_PREFIX` dropped all three without a word.
 */
const PREFIXED_KEY = /(?:\$t|translate\.t)\(\s*`\$\{([A-Za-z0-9_]+)\}\.([a-zA-Z0-9_]+)`\s*[,)]/g
/**
 * Every t() call in the file, whatever its shape.
 *
 * The completeness check reads this rather than a guess at the shapes that might be missed: a
 * pattern listing what to look for can only find the forms whose existence was anticipated, and a
 * key it never imagined is exactly what goes missing without a word.
 */
const ANY_CALL = /(?:\$t|translate\.t)\(/g

function prefixValue(source: string, constantName: string): string | undefined {
  // A plain quoted string, not a template literal: a template literal would read the regex's
  // own backslash escapes and hand RegExp a pattern matching literal 's' characters.
  return new RegExp('const\\s+' + constantName + '\\s*=\\s*[\'"]([a-zA-Z0-9_.]+)[\'"]').exec(source)?.[1]
}

function keysUsedBy(relativePath: string): string[] {
  const source = readFileSync(resolve(APP_ROOT, relativePath), 'utf-8')

  const literals = [...source.matchAll(LITERAL_KEY)]
  const keys = literals.map((match) => match[1])

  const prefixed = [...source.matchAll(PREFIXED_KEY)]
  for (const [, constantName, suffix] of prefixed) {
    const prefix = prefixValue(source, constantName)
    // A prefix built somewhere else — imported, or computed — cannot be resolved by reading this
    // file, and contributing nothing for it is the same silence this spec exists to break.
    expect(prefix, `${relativePath} builds keys from ${constantName}, declared nowhere in it`).toBeDefined()
    keys.push(`${prefix}.${suffix}`)
  }

  // Every t() call must have been understood by one of the two patterns above. A key assembled some
  // other way — a second interpolation, a dynamic suffix, a variable — cannot be checked against the
  // catalogs, and this suite's whole value is that it does not quietly pass over what it cannot see.
  // Compared by position, so the check does not depend on predicting the shapes that could escape.
  const understood = new Set([...literals, ...prefixed].map((match) => match.index))
  const unreadable = [...source.matchAll(ANY_CALL)]
    .filter((match) => !understood.has(match.index))
    .map((match) => source.slice(match.index, match.index + 70).split('\n')[0].trim())
  expect(unreadable, `${relativePath} has i18n calls this scanner cannot resolve`).toEqual([])

  return [...new Set(keys)]
}

function resolveKey(catalog: any, key: string): unknown {
  return key.split('.').reduce((node, segment) => (node === undefined ? undefined : node?.[segment]), catalog)
}

const ALL_KEYS = SOURCES.flatMap(keysUsedBy)

describe('Receivables adjustments outcome i18n', () => {
  // Guards the scanner itself: a regex that stopped matching would leave this suite asserting
  // nothing at all while still reporting green.
  it('finds the keys the feature uses', () => {
    expect(ALL_KEYS.length).toBeGreaterThan(10)
    // A template-side literal, and one built from a prefix through `this.$t`.
    expect(ALL_KEYS).toContain('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.title')
    expect(ALL_KEYS).toContain('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.view')
    // Review finding on PR 14636. A key built from a DIFFERENT prefix constant, through the
    // composable handle rather than `$t` — the shape the first scanner dropped without a word.
    // Pinned here because both halves of that miss are invisible: the keys resolve, so nothing
    // fails, and the count guard above is satisfied by the template alone.
    expect(ALL_KEYS).toContain('adminBackend.adminUploadData.receivablesRecalculate.queued')
    expect(ALL_KEYS).toContain('adminBackend.adminUploadData.receivablesRecalculate.failed')
  })

  for (const language of ['en', 'es']) {
    it(`resolves every key in ${language}.json`, () => {
      const catalog = JSON.parse(readFileSync(resolve(CATALOGS, `${language}.json`), 'utf-8'))

      const missing = ALL_KEYS.filter((key) => typeof resolveKey(catalog, key) !== 'string')

      expect(missing, `missing from ${language}.json`).toEqual([])
    })
  }
})
