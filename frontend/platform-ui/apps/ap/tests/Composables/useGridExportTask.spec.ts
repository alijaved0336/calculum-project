import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ─── Module mocks ───────────────────────────────────────────────────────────
// Declared via vi.hoisted so the mock fns exist when vitest hoists the vi.mock
// factories, and can be referenced directly (no `(...args) => fn(...args)`
// forwarder — that spreads any[] into fixed-arity fns and trips TS2556 under the
// vue-cli build type-check). addProcess is typed so `mock.calls[0][n]` is a known
// tuple (an untyped vi.fn infers an empty args tuple → TS2493).
const { exportDataXlsx, getGridExportStatus, getGridExportFile, cancelGridExport, addProcess, updateProcess, subscribeToGridExport } =
  vi.hoisted(() => ({
    exportDataXlsx: vi.fn(),
    getGridExportStatus: vi.fn(),
    getGridExportFile: vi.fn(async (_token: string): Promise<{ blob: Blob; fileName?: string }> => ({
      blob: new Blob(['x']),
      fileName: 'AnalyzeSpends.csv',
    })),
    cancelGridExport: vi.fn(async (_jobId: string): Promise<boolean> => true),
    addProcess: vi.fn(
      (_title: string, _type: string, _total: number, _cancelable?: boolean, _cancelFn?: () => void): string => 'proc-1',
    ),
    updateProcess: vi.fn(),
    subscribeToGridExport: vi.fn(),
  }))

vi.mock('@/modules/home/api', () => ({ exportDataXlsx, getGridExportStatus, getGridExportFile, cancelGridExport }))
vi.mock('@/composables/useBackgroundProcesses', () => ({
  useBackgroundProcesses: () => ({ addProcess, updateProcess }),
}))
vi.mock('@/composables/firebase/useGridExportFirebase', () => ({
  default: () => ({ subscribeToGridExport }),
}))

import { useGridExportTask } from '@/modules/home/analyze/composables/useGridExportTask'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REQUEST = {
  level: 'spends',
  title: 'AnalyzeSpends',
  columns: [{ field: 'entityName', title: 'Entity', cell: 'moneyTemplate' }],
  filtersGrid: { telerikFilter: '' },
  section: 'program',
}

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }

function setup() {
  const onError = vi.fn()
  const t = vi.fn((key: string) => key)
  const { start } = useGridExportTask({ t, onError })
  return { start, onError, t }
}

beforeEach(() => {
  vi.clearAllMocks()
  addProcess.mockReturnValue('proc-1')
  getGridExportFile.mockResolvedValue({ blob: new Blob(['x']), fileName: 'AnalyzeSpends.csv' })
  // jsdom lacks these; stub so blob/anchor download paths don't throw.
  ;(globalThis.URL as any).createObjectURL = vi.fn(() => 'blob:mock')
  ;(globalThis.URL as any).revokeObjectURL = vi.fn()
  HTMLAnchorElement.prototype.click = vi.fn()
})

afterEach(() => { vi.useRealTimers() })

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useGridExportTask', () => {
  it('registers a TABLE_EXPORT background task with the grid row count as the total', async () => {
    exportDataXlsx.mockResolvedValue({ kind: 'file', blob: new Blob(['x']) })
    const { start } = setup()

    await start(REQUEST, 1234)

    expect(addProcess).toHaveBeenCalledOnce()
    expect(addProcess.mock.calls[0][1]).toBe('TABLE_EXPORT')
    expect(addProcess.mock.calls[0][2]).toBe(1234)
  })

  it('sync (200): downloads the blob and marks the task completed', async () => {
    exportDataXlsx.mockResolvedValue({ kind: 'file', blob: new Blob(['x']) })
    const { start } = setup()

    await start(REQUEST, 100)

    expect((globalThis.URL as any).createObjectURL).toHaveBeenCalledOnce()
    expect(updateProcess).toHaveBeenCalledWith('proc-1', { status: 'completed' })
    expect(subscribeToGridExport).not.toHaveBeenCalled()
  })

  it('async (202): subscribes to Firestore, downloads via token on ready, and completes', async () => {
    exportDataXlsx.mockResolvedValue({ kind: 'job', jobId: 'job-9' })
    const unsubscribe = vi.fn()
    let captured: ((data: any) => void) | null = null
    subscribeToGridExport.mockImplementation(async (_jobId: string, onChange: (d: any) => void) => {
      captured = onChange
      return unsubscribe
    })
    const { start } = setup()

    await start(REQUEST, 5000)
    expect(subscribeToGridExport).toHaveBeenCalledWith('job-9', expect.any(Function), expect.any(Function))

    // Backend pushes the ready snapshot.
    captured!({ status: 'ready', downloadToken: 'tok-abc', progress: { processed: 5000, total: 5000 } })
    await flush() // the token download is an async blob fetch

    expect(getGridExportFile).toHaveBeenCalledWith('tok-abc')
    expect((globalThis.URL as any).createObjectURL).toHaveBeenCalledOnce() // saved via same-origin blob
    expect(updateProcess).toHaveBeenCalledWith('proc-1', { status: 'completed' })
    expect(unsubscribe).toHaveBeenCalled() // cleanup after completion
  })

  it('async failed snapshot: marks failed and reports the error', async () => {
    exportDataXlsx.mockResolvedValue({ kind: 'job', jobId: 'job-9' })
    let captured: ((data: any) => void) | null = null
    subscribeToGridExport.mockImplementation(async (_jobId: string, onChange: (d: any) => void) => {
      captured = onChange
      return vi.fn()
    })
    const { start, onError } = setup()

    await start(REQUEST, 5000)
    captured!({ status: 'failed', error: 'boom' })

    expect(onError).toHaveBeenCalledOnce()
    expect(updateProcess).toHaveBeenCalledWith('proc-1', { status: 'failed', error: 'home.analyze.list.tableExportFailed' })
  })

  it('falls back to polling when the Firestore subscription is unavailable', async () => {
    vi.useFakeTimers()
    exportDataXlsx.mockResolvedValue({ kind: 'job', jobId: 'job-9' })
    subscribeToGridExport.mockResolvedValue(null) // no firebase auth → null
    getGridExportStatus.mockResolvedValue({
      success: true,
      data: { status: 'ready', processed: 100, total: 100, downloadToken: 'tok-poll', error: null },
    })
    const { start } = setup()

    await start(REQUEST, 100)
    expect(subscribeToGridExport).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1500)
    await flush()

    expect(getGridExportStatus).toHaveBeenCalledWith('job-9')
    expect(getGridExportFile).toHaveBeenCalledWith('tok-poll')
    expect(updateProcess).toHaveBeenCalledWith('proc-1', { status: 'completed' })
  })

  it('async cancel: tells the backend to abort the job and marks the task cancelled', async () => {
    exportDataXlsx.mockResolvedValue({ kind: 'job', jobId: 'job-9' })
    subscribeToGridExport.mockImplementation(async () => vi.fn())
    const { start } = setup()

    await start(REQUEST, 5000)

    // Invoke the cancel callback registered with the background task.
    const cancelFn = addProcess.mock.calls[0][4]
    cancelFn?.()

    expect(cancelGridExport).toHaveBeenCalledWith('job-9')
    expect(updateProcess).toHaveBeenCalledWith('proc-1', { status: 'cancelled' })
  })

  it('error result: marks the task failed and reports it', async () => {
    exportDataXlsx.mockResolvedValue({ kind: 'error', error: new Error('network') })
    const { start, onError } = setup()

    await start(REQUEST, 100)

    expect(onError).toHaveBeenCalledOnce()
    expect(updateProcess).toHaveBeenCalledWith('proc-1', { status: 'failed', error: 'home.analyze.list.tableExportFailed' })
  })

  // Column serialization (WI#18734). The Match grid groups its columns: the group header carries no
  // `field` and the real columns live in `children`. Sending only the top level meant `columns: []`
  // and the backend produced an empty workbook (no headers, no rows).
  describe('column serialization', () => {
    /** The serialized columns are the 4th argument of the export request. */
    const sentColumns = () => exportDataXlsx.mock.calls[0][3] as Array<any>

    beforeEach(() => {
      exportDataXlsx.mockResolvedValue({ kind: 'file', blob: new Blob(['x']) })
    })

    it('flattens grouped columns into their children, preserving display order', async () => {
      const { start } = setup()

      await start({
        ...REQUEST,
        columns: [
          { title: 'Results', children: [{ field: 'status', title: 'Status' }, { field: 'confidenceScore', title: 'Score', filter: 'numeric' }] },
          { title: 'Suppliers', children: [{ field: 'volume', title: 'Volume', cell: 'moneyTemplate' }] },
        ],
      }, 100)

      expect(sentColumns()).toEqual([
        { field: 'status', title: 'Status', hidden: false, type: undefined, format: undefined },
        { field: 'confidenceScore', title: 'Score', hidden: false, type: 'number', format: undefined },
        { field: 'volume', title: 'Volume', hidden: false, type: 'currency', format: undefined },
      ])
    })

    it('marks every child of a hidden group header as hidden', async () => {
      const { start } = setup()

      await start({
        ...REQUEST,
        columns: [
          { title: 'Results', hidden: true, children: [{ field: 'status', title: 'Status' }] },
          { title: 'Suppliers', children: [{ field: 'volume', title: 'Volume' }] },
        ],
      }, 100)

      // Hidden columns are sent flagged (the backend skips them), as with flat grids.
      expect(sentColumns().map((c) => [c.field, c.hidden])).toEqual([['status', true], ['volume', false]])
    })

    it('keeps a hidden child flagged as hidden so the backend skips it', async () => {
      const { start } = setup()

      await start({
        ...REQUEST,
        columns: [
          { title: 'Results', children: [{ field: 'status', title: 'Status' }, { field: 'secret', title: 'Secret', hidden: true }] },
        ],
      }, 100)

      expect(sentColumns()).toEqual([
        { field: 'status', title: 'Status', hidden: false, type: undefined, format: undefined },
        { field: 'secret', title: 'Secret', hidden: true, type: undefined, format: undefined },
      ])
    })

    it('keeps flat and grouped columns in their relative order', async () => {
      const { start } = setup()

      await start({
        ...REQUEST,
        columns: [
          { field: 'uuid', title: 'Id' },
          { title: 'Results', children: [{ field: 'status', title: 'Status' }] },
          { field: 'volume', title: 'Volume' },
        ],
      }, 100)

      expect(sentColumns().map((c) => c.field)).toEqual(['uuid', 'status', 'volume'])
    })

    it('never sends a group header as a data column', async () => {
      const { start } = setup()

      await start({
        ...REQUEST,
        columns: [{ field: 'group', title: 'Results', children: [{ field: 'status', title: 'Status' }] }],
      }, 100)

      expect(sentColumns().map((c) => c.field)).toEqual(['status'])
    })
  })
})
