import { beforeEach, vi } from 'vitest'

/**
 * Global test setup, executed before every test file.
 *
 * Without these, `@vue/test-utils`'s `mount()` silently fails to render any component that
 * touches one of these browser APIs (Kendo's `Switch`/`Grid` need `ResizeObserver`, for
 * instance): Vue logs a `resolveComponent can only be used in render() or setup()` warning and
 * the wrapper ends up with an empty tree, so `findComponent`/`find` throw "Cannot call X on an
 * empty Wrapper" — a confusing failure with no obvious tie to the real cause. Mirrors
 * `apps/ap/tests/setup.ts`, minus its `console.warn`/`console.error` suppression and `$t` mocks:
 * AR resolves i18n through `@ada/design-system`'s locale files rather than a global `$t` mock,
 * and suppressing console output here would have hidden the very warning that surfaced this gap.
 */

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Mock scrollTo
window.scrollTo = vi.fn()

/**
 * Neutralizes VITE_ALLOW_MOCK_CHART_CATALOG for every test, regardless of the developer's own
 * .env.local. Vite loads .env.local for every mode, tests included — so a developer previewing the
 * mock catalog locally (see modules/opportunity/data/mockChartCatalog.ts) would otherwise see every
 * spec asserting the catalog's exact shape start failing, on their machine only, for a reason that
 * has nothing to do with their change.
 *
 * A test that wants the flag on stubs it again for itself with vi.stubEnv, inside its own body —
 * that later call simply overrides this default for the rest of that test.
 */
beforeEach(() => {
  vi.stubEnv('VITE_ALLOW_MOCK_CHART_CATALOG', 'false')
})
