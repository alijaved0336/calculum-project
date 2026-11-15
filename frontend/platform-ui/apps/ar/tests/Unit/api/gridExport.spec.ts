import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@ada/auth', () => ({ authLogin: vi.fn() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

import {
  cancelGridExport,
  downloadGridExport,
  getGridExportStatus,
  parseContentDispositionFileName,
  startGridExport,
  type GridExportRequest,
} from '@/api/gridExport'
import { HttpError } from '@/api/http'

const REQUEST: GridExportRequest = {
  versionUuid: 'v',
  where: { a: 1 },
  order: null,
  customFilters: null,
  customSorts: null,
  currencyRate: 1,
  columns: [{ field: 'name', title: 'Name', hidden: false }],
  fileName: 'f',
}

describe('gridExport api', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs the body with the session cookie and returns the file on a 200', async () => {
    fetchMock.mockResolvedValue(
      new Response('xlsx', { status: 200, headers: { 'Content-Disposition': 'attachment; filename="sale.xlsx"' } }),
    )

    const result = await startGridExport('OpportunitySaleLines', REQUEST)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api.test/api/grid-exports/OpportunitySaleLines')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(JSON.parse(init.body)).toEqual(REQUEST)
    expect(result.kind).toBe('file')
    if (result.kind === 'file') {
      expect(result.file.fileName).toBe('sale.xlsx')
      expect(await result.file.blob.text()).toBe('xlsx')
    }
  })

  it('returns the job id on a 202', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ jobId: 'j1' }), { status: 202 }))

    expect(await startGridExport('Match', REQUEST)).toEqual({ kind: 'job', jobId: 'j1' })
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/grid-exports/Match')
  })

  it('rejects a 409 with an HttpError carrying the status', async () => {
    fetchMock.mockImplementation(async () => new Response('{"error":"busy"}', { status: 409 }))

    await expect(startGridExport('Match', REQUEST)).rejects.toMatchObject({ status: 409 })
    await expect(startGridExport('Match', REQUEST)).rejects.toBeInstanceOf(HttpError)
  })

  it('reads the status, cancels and downloads on the documented routes', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ready', downloadToken: 't' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ cancelled: true })))
      .mockResolvedValueOnce(new Response('data'))

    expect(await getGridExportStatus('j1')).toEqual({ status: 'ready', downloadToken: 't' })
    expect(await cancelGridExport('j1')).toBe(true)
    const file = await downloadGridExport('t')
    expect(await file.blob.text()).toBe('data')
    expect(file.fileName).toBeNull()

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://api.test/api/grid-exports/j1/status',
      'http://api.test/api/grid-exports/j1/cancel',
      'http://api.test/api/grid-exports/download/t',
    ])
    expect(fetchMock.mock.calls[1][1].method).toBe('POST')
    expect(fetchMock.mock.calls[2][1].credentials).toBe('include')
  })

  it('parses plain and RFC 5987 file names', () => {
    expect(parseContentDispositionFileName(null)).toBeNull()
    expect(parseContentDispositionFileName('attachment; filename=a.csv')).toBe('a.csv')
    expect(
      parseContentDispositionFileName('attachment; filename=a.csv; filename*=UTF-8\'\'n%C3%BAmero.xlsx'),
    ).toBe('número.xlsx')
  })
})
