/**
 * Tests for composables/useWorkingCapitalPdfExport.ts — the error-surfacing/loading-
 * state wrapper around utils/exportPdf.ts (tested separately, on its own, in
 * exportPdf.spec.ts). Mocks exportElementToPdf itself so this file focuses purely on
 * the composable's own behavior: the AC-06/EF-2 bug fixes over EntityExportPDF.vue's
 * precedent (flag always resets, failures show a toast).
 *
 * Uses the same mount-a-dummy-wrapper pattern as useWorkingCapitalComparison.spec.ts,
 * since useI18n()/useToast() require an active component setup() context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

const { toastErrorSpy, exportElementToPdfMock, postWorkingCapitalExportLogMock } = vi.hoisted(() => ({
  toastErrorSpy: vi.fn(),
  exportElementToPdfMock: vi.fn(),
  postWorkingCapitalExportLogMock: vi.fn().mockResolvedValue({ success: true, data: { success: true } }),
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})
vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: toastErrorSpy, info: vi.fn(), success: vi.fn(), warning: vi.fn(), dismiss: vi.fn() }),
}))
vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ getCurrencyTo: 'EUR' }),
}))
vi.mock('@/modules/home/workingCapital/utils/exportPdf', () => ({
  exportElementToPdf: exportElementToPdfMock,
}))
vi.mock('@/modules/home/workingCapital/api', () => ({
  postWorkingCapitalExportLog: postWorkingCapitalExportLogMock,
}))

import { useWorkingCapitalPdfExport } from '@/modules/home/workingCapital/composables/useWorkingCapitalPdfExport'

function mountComposable() {
  let result: ReturnType<typeof useWorkingCapitalPdfExport>
  const wrapper = mount(defineComponent({
    setup() {
      result = useWorkingCapitalPdfExport()
      return () => h('div')
    },
  }))
  return { wrapper, get result() { return result } }
}

describe('useWorkingCapitalPdfExport', () => {
  beforeEach(() => {
    toastErrorSpy.mockReset()
    exportElementToPdfMock.mockReset()
    postWorkingCapitalExportLogMock.mockReset()
    postWorkingCapitalExportLogMock.mockResolvedValue({ success: true, data: { success: true } })
  })

  it('starts with isExporting false', () => {
    const { result } = mountComposable()
    expect(result.isExporting.value).toBe(false)
  })

  it('sets isExporting true while exporting and back to false on success', async () => {
    let resolveExport: () => void = () => {}
    exportElementToPdfMock.mockImplementation(() => new Promise<void>(resolve => { resolveExport = resolve }))

    const { result } = mountComposable()
    const element = document.createElement('div')
    const promise = result.exportToPdf(element, 'test.pdf')

    expect(result.isExporting.value).toBe(true)
    resolveExport()
    await promise

    expect(result.isExporting.value).toBe(false)
    expect(toastErrorSpy).not.toHaveBeenCalled()
  })

  it('resets isExporting to false on failure too (bug fix over EntityExportPDF.vue)', async () => {
    exportElementToPdfMock.mockRejectedValue(new Error('drawDOM failed'))

    const { result } = mountComposable()
    await result.exportToPdf(document.createElement('div'), 'test.pdf')

    expect(result.isExporting.value).toBe(false)
  })

  it('shows a toast error on failure (fix over EntityExportPDF.vue\'s console-only handling)', async () => {
    exportElementToPdfMock.mockRejectedValue(new Error('drawDOM failed'))

    const { result } = mountComposable()
    await result.exportToPdf(document.createElement('div'), 'test.pdf')

    expect(toastErrorSpy).toHaveBeenCalledWith('home.workingCapital.export.exportFailed')
  })

  it('treats a missing element as a failure (no crash, toast shown, flag reset)', async () => {
    const { result } = mountComposable()
    await result.exportToPdf(null, 'test.pdf')

    expect(exportElementToPdfMock).not.toHaveBeenCalled()
    expect(toastErrorSpy).toHaveBeenCalledWith('home.workingCapital.export.exportFailed')
    expect(result.isExporting.value).toBe(false)
  })

  // ─── Story 3 (AC-08) — audit-log call after a successful export ──────────

  it('logs the export with the base version uuid and the live selected currency on success', async () => {
    exportElementToPdfMock.mockResolvedValue(undefined)

    const { result } = mountComposable()
    await result.exportToPdf(document.createElement('div'), 'test.pdf', 'uuid-base-123')

    expect(postWorkingCapitalExportLogMock).toHaveBeenCalledWith('uuid-base-123', 'EUR')
  })

  it('does not log an export that itself failed', async () => {
    exportElementToPdfMock.mockRejectedValue(new Error('drawDOM failed'))

    const { result } = mountComposable()
    await result.exportToPdf(document.createElement('div'), 'test.pdf', 'uuid-base-123')

    expect(postWorkingCapitalExportLogMock).not.toHaveBeenCalled()
  })

  // ─── Supplier Match Coverage donut PDF-render fix ────────────────────────

  it('forwards the pre-rendered chartImage through to exportElementToPdf', async () => {
    exportElementToPdfMock.mockResolvedValue(undefined)

    const { result } = mountComposable()
    const element = document.createElement('div')
    await result.exportToPdf(element, 'test.pdf', 'uuid-base-123', 'data:image/png;base64,fake')

    expect(exportElementToPdfMock).toHaveBeenCalledWith(element, 'test.pdf', 'data:image/png;base64,fake')
  })

  it('never surfaces a toast or affects isExporting when the log call itself fails (fire-and-forget)', async () => {
    exportElementToPdfMock.mockResolvedValue(undefined)
    postWorkingCapitalExportLogMock.mockRejectedValue(new Error('log endpoint down'))

    const { result } = mountComposable()
    await result.exportToPdf(document.createElement('div'), 'test.pdf', 'uuid-base-123')
    // Let the fire-and-forget log call's own rejection handler run.
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(toastErrorSpy).not.toHaveBeenCalled()
    expect(result.isExporting.value).toBe(false)
  })
})
