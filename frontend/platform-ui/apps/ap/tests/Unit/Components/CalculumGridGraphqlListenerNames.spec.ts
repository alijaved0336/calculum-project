/**
 * AB#20496 — every `@event` bound on a `<CalculumGridGraphql>` must be reachable by one of the
 * grid's declared emits.
 *
 * Match › List's "Export Excel" did nothing: the grid does `emit("exportCSV")`, and the kebab-case
 * rewrite of `OverviewList.vue` bound it as `@export-csv`. That compiles to `onExportCsv`, while
 * Vue's `emit()` only looks up `onExportCSV` (the event name and its camelized form, never the
 * hyphenated one outside `update:` listeners). The click was dropped with no request and no
 * console error. `ClusterTemplate.vue` had the same listener.
 *
 * So this parses every AP template with Vue's own compiler and resolves each listener with Vue's
 * own `camelize`/`toHandlerKey`, and reads the emits from the grid itself rather than from a
 * list kept here.
 */

import { beforeAll, describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { camelize, toHandlerKey } from 'vue'
import { parse } from 'vue/compiler-sfc'

const APP_ROOT = resolve(__dirname, '../../..')
const SRC = resolve(APP_ROOT, 'src')
const GRID = resolve(SRC, 'modules/components/grid/CalculumGridGraphql.vue')
const GRID_TAG = /^(CalculumGridGraphql|calculum-grid-graphql)$/

// Node type ids from @vue/compiler-core (ELEMENT, DIRECTIVE).
const ELEMENT = 1
const DIRECTIVE = 7

interface TemplateNode {
  type: number
  tag?: string
  props?: Array<{ type: number; name: string; arg?: { content: string; isStatic: boolean }; loc: { start: { line: number } } }>
  children?: TemplateNode[]
}

function declaredEmits(): string[] {
  const match = readFileSync(GRID, 'utf8').match(/defineEmits\((\[[\s\S]*?\])\)/)
  if (!match) throw new Error('defineEmits([...]) not found in CalculumGridGraphql.vue')
  return JSON.parse(match[1].replace(/,\s*\]$/, ']'))
}

function vueFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return vueFiles(full)
    return entry.name.endsWith('.vue') ? [full] : []
  })
}

// Only a few dozen of the ~800 templates use the grid. Parsing all of them timed out both tests
// (10 s testTimeout) on the CI agent.
const MENTIONS_GRID = /CalculumGridGraphql|calculum-grid-graphql/

function scanGridListeners(): Array<{ where: string; event: string }> {
  const found: Array<{ where: string; event: string }> = []
  for (const file of vueFiles(SRC)) {
    const source = readFileSync(file, 'utf8')
    if (!MENTIONS_GRID.test(source)) continue
    const { descriptor } = parse(source, { filename: file })
    if (!descriptor.template) continue
    const visit = (node: TemplateNode) => {
      if (node.type === ELEMENT && node.tag && GRID_TAG.test(node.tag)) {
        for (const prop of node.props ?? []) {
          if (prop.type === DIRECTIVE && prop.name === 'on' && prop.arg?.isStatic) {
            found.push({
              where: `${relative(APP_ROOT, file).replace(/\\/g, '/')}:${prop.loc.start.line}`,
              event: prop.arg.content,
            })
          }
        }
      }
      node.children?.forEach(visit)
    }
    visit(descriptor.template.ast as unknown as TemplateNode)
  }
  return found
}

describe('CalculumGridGraphql listener names', () => {
  let emits: string[] = []
  let listeners: Array<{ where: string; event: string }> = []

  // The CI agent runs the whole suite in parallel under coverage, so the scan gets more than the
  // default 10 s hookTimeout.
  beforeAll(() => {
    emits = declaredEmits()
    listeners = scanGridListeners()
  }, 60_000)

  it('reads the emits and finds the consumers', () => {
    expect(emits).toContain('exportCSV')
    expect(listeners.length).toBeGreaterThan(50)
  })

  it('binds only listeners that a declared emit reaches', () => {
    const reachable = new Set(emits.flatMap((e) => [toHandlerKey(e), toHandlerKey(camelize(e))]))
    const unreachable = listeners
      .filter(({ event }) => !reachable.has(toHandlerKey(camelize(event))))
      .map(({ where, event }) => `${where} @${event}`)

    expect(unreachable).toEqual([])
  })
})
