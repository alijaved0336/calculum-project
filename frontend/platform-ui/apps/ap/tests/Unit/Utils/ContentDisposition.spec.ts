/**
 * `@/utils/contentDisposition` — the Content-Disposition parser lifted out of
 * `modules/home/api/index.ts` so the grid-export download and the AB#19711 strategy-adjustments
 * download share one implementation, plus the extension fallback the latter needed.
 *
 * The parser had no tests where it lived. It now has two callers, so a regression here silently
 * misnames every downloaded file in the app rather than just one.
 */

import { describe, it, expect } from 'vitest'
import {
  extensionForContentType,
  parseContentDispositionFilename,
  readContentDispositionFilename
} from '@/utils/contentDisposition'

describe('parseContentDispositionFilename', () => {
  it('reads the plain quoted form', () => {
    expect(parseContentDispositionFilename('attachment; filename="Sales 2026.xlsx"')).toBe('Sales 2026.xlsx')
  })

  it('reads the plain unquoted form', () => {
    expect(parseContentDispositionFilename('attachment; filename=report.csv')).toBe('report.csv')
  })

  it('prefers the RFC 5987 extended form and percent-decodes it', () => {
    // What the back-end emits for a non-ASCII name: makeDisposition() writes both, and the
    // extended one is the accurate one.
    const header = "attachment; filename=\"Aper_u.xlsx\"; filename*=utf-8''Aper%C3%A7u.xlsx"

    expect(parseContentDispositionFilename(header)).toBe('Aperçu.xlsx')
  })

  it('reads an upper-case charset too', () => {
    // The charset class dropped its redundant `A-Za-z` for Sonar S5869, leaving the `i` flag to
    // carry the case-insensitivity. This is the assertion that keeps that refactor honest: .NET
    // emits `UTF-8''` where Symfony emits `utf-8''`, and AR serves this header.
    const header = "attachment; filename=\"Aper_u.xlsx\"; filename*=UTF-8''Aper%C3%A7u.xlsx"

    expect(parseContentDispositionFilename(header)).toBe('Aperçu.xlsx')
  })

  it('reads a mixed-case header field name', () => {
    expect(parseContentDispositionFilename('attachment; FileName="a.csv"')).toBe('a.csv')
  })

  it('falls back to the plain form when the extended one is malformed', () => {
    // A truncated percent escape makes decodeURIComponent throw; the ASCII fallback is still usable.
    const header = "attachment; filename=\"fallback.xlsx\"; filename*=utf-8''bad%E0%A4A"

    expect(parseContentDispositionFilename(header)).toBe('fallback.xlsx')
  })

  it('returns undefined for a header that names no file', () => {
    expect(parseContentDispositionFilename('attachment')).toBeUndefined()
    expect(parseContentDispositionFilename('')).toBeUndefined()
    expect(parseContentDispositionFilename(undefined)).toBeUndefined()
    expect(parseContentDispositionFilename(null)).toBeUndefined()
  })
})

describe('readContentDispositionFilename', () => {
  it('reads the header under either casing', () => {
    expect(readContentDispositionFilename({ 'content-disposition': 'attachment; filename="a.csv"' })).toBe('a.csv')
    expect(readContentDispositionFilename({ 'Content-Disposition': 'attachment; filename="b.csv"' })).toBe('b.csv')
  })

  it('survives headers being absent entirely', () => {
    // Cross-origin, the header is only visible because the API lists it in expose_headers; a caller
    // must cope with it missing rather than throwing.
    expect(readContentDispositionFilename(undefined)).toBeUndefined()
    expect(readContentDispositionFilename({})).toBeUndefined()
  })
})

describe('extensionForContentType', () => {
  it('maps the types this endpoint can actually serve', () => {
    expect(extensionForContentType('text/csv')).toBe('.csv')
    expect(extensionForContentType('text/csv; charset=utf-8')).toBe('.csv')
    expect(extensionForContentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('.xlsx')
    expect(extensionForContentType('application/vnd.ms-excel')).toBe('.xls')
  })

  it('is case-insensitive', () => {
    expect(extensionForContentType('TEXT/CSV')).toBe('.csv')
  })

  it('never returns an empty extension', () => {
    // The whole reason this helper exists: a file with no extension cannot be reopened to edit and
    // upload back, so an unknown or absent type still has to produce something openable.
    expect(extensionForContentType(undefined)).toBe('.xlsx')
    expect(extensionForContentType(null)).toBe('.xlsx')
    expect(extensionForContentType('')).toBe('.xlsx')
    expect(extensionForContentType('application/octet-stream')).toBe('.xlsx')
  })
})
