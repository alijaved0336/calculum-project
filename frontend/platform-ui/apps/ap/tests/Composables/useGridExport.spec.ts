import { describe, it, expect, vi } from 'vitest'

// useGridExport statically imports useGridExportTask, which transitively pulls the Firebase/API
// chain (and SVG-as-component imports that the test transformer can't parse). These tests inject
// their own `runTask`, so stub the task module to keep the unit isolated and loadable.
vi.mock('@/modules/home/analyze/composables/useGridExportTask', () => ({
  useGridExportTask: () => ({ start: vi.fn() }),
}))

import { useGridExport, GridExportRequest } from '@/modules/home/analyze/composables/useGridExport'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REQUEST: GridExportRequest = {
  level: 'spends',
  title: 'AnalyzeSpends',
  columns: [{ field: 'entityName' }],
  filtersGrid: { telerikFilter: '', fullDisabled: false },
}

function setup(overrides: Partial<Parameters<typeof useGridExport>[0]> = {}) {
  const runTask = vi.fn()
  const onError = vi.fn()
  const t = vi.fn((key: string) => key)
  const api = useGridExport({ runTask, t, onError, ...overrides })
  return { api, runTask, onError, t }
}

// ─── Tests ──────────────────────────────────────────────────────────────────
//
// WI#17234: the export now runs server-side via a non-blocking background task. useGridExport
// only owns the large-dataset confirmation gating and delegates the actual work to `runTask`.

describe('useGridExport', () => {
  // ─── Gating / delegation ─────────────────────────────────────────────────

  it('runs the task immediately when total is at or below the threshold', () => {
    const { api, runTask } = setup()
    api.startExport(REQUEST, 10000) // default threshold 10000 (inclusive)

    expect(api.showLargeExportConfirm.value).toBe(false)
    expect(runTask).toHaveBeenCalledOnce()
    expect(runTask).toHaveBeenCalledWith(REQUEST, 10000)
  })

  it('is non-blocking: the legacy overlay flag stays false', () => {
    const { api } = setup()
    api.startExport(REQUEST, 100)
    expect(api.loadExport.value).toBe(false)
  })

  it('asks for confirmation (and does NOT run) when total is above the threshold', () => {
    const { api, runTask } = setup()
    api.startExport(REQUEST, 10001)

    expect(api.showLargeExportConfirm.value).toBe(true)
    expect(api.pendingExportCount.value).toBe(10001)
    expect(runTask).not.toHaveBeenCalled()
  })

  it('respects a custom largeExportThreshold', () => {
    const { api, runTask } = setup({ largeExportThreshold: 10 })
    api.startExport(REQUEST, 11)

    expect(api.showLargeExportConfirm.value).toBe(true)
    expect(runTask).not.toHaveBeenCalled()
  })

  // ─── Confirm / cancel ────────────────────────────────────────────────────

  it('confirmLargeExport runs the pending export (with its total) and clears the dialog', () => {
    const { api, runTask } = setup()
    api.startExport(REQUEST, 30000)
    api.confirmLargeExport()

    expect(api.showLargeExportConfirm.value).toBe(false)
    expect(api.pendingExportCount.value).toBe(0)
    expect(runTask).toHaveBeenCalledOnce()
    expect(runTask).toHaveBeenCalledWith(REQUEST, 30000)
  })

  it('cancelLargeExport clears the dialog state and does NOT run', () => {
    const { api, runTask } = setup()
    api.startExport(REQUEST, 30000)
    api.cancelLargeExport()

    expect(api.showLargeExportConfirm.value).toBe(false)
    expect(api.pendingExportCount.value).toBe(0)
    expect(runTask).not.toHaveBeenCalled()
  })

  // ─── Re-entrancy guard ────────────────────────────────────────────────────

  it('ignores a second startExport while a confirmation is already open', () => {
    const { api, runTask } = setup()
    api.startExport(REQUEST, 30000)                       // opens confirm (count 30000)
    api.startExport({ ...REQUEST, title: 'Other' }, 5000) // sub-threshold — must be ignored

    expect(api.pendingExportCount.value).toBe(30000)
    expect(runTask).not.toHaveBeenCalled()

    api.confirmLargeExport()
    expect(runTask).toHaveBeenCalledOnce()
    expect(runTask).toHaveBeenCalledWith(REQUEST, 30000) // the first (pending) request
  })
})
