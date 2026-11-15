import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock stores before importing the function under test
vi.mock('@/stores/analyze', () => ({
  useAnalyzeStore: vi.fn(),
}))

// Mock utils — only removeIRI and StringUtils are needed
vi.mock('@/utils', () => ({
  removeIRI: (iri: string | null | undefined): string => {
    if (iri === null || iri === undefined || iri === '') return ''
    const parts = iri.split('/')
    return parts[parts.length - 1]
  },
  StringUtils: {
    isNullUndefinedOrEmpty: (v: any) => v === null || v === undefined || v === '',
  },
}))

vi.mock('@/services/api/env', () => ({ DEBUG: false }))

import { isProgramSfvConsistent } from '@/utils/validation/programSfvConsistency'
import { useAnalyzeStore } from '@/stores/analyze'

const PROGRAM_ID = 'prog-uuid-1'
const SFV_ID = 'sfv-uuid-1'
const PROGRAM_IRI = `/api/programs/${PROGRAM_ID}`
const SFV_IRI = `/api/spend_file_versions/${SFV_ID}`

function makeStore(programs: any[]) {
  return { getAllPrograms: programs }
}

function makeProgram(programId = PROGRAM_ID, sfvId = SFV_ID) {
  return {
    '@id': `/api/programs/${programId}`,
    spendFileVersion: { '@id': `/api/spend_file_versions/${sfvId}` },
  }
}

describe('isProgramSfvConsistent', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(useAnalyzeStore).mockReturnValue(makeStore([makeProgram()]) as any)
  })

  // ─── Missing params ──────────────────────────────────────────────────────────

  it('returns false when programId is null', () => {
    expect(isProgramSfvConsistent(null, SFV_IRI)).toBe(false)
  })

  it('returns false when programId is undefined', () => {
    expect(isProgramSfvConsistent(undefined, SFV_IRI)).toBe(false)
  })

  it('returns false when programId is empty string', () => {
    expect(isProgramSfvConsistent('', SFV_IRI)).toBe(false)
  })

  it('returns false when sfvId is null', () => {
    expect(isProgramSfvConsistent(PROGRAM_IRI, null)).toBe(false)
  })

  it('returns false when sfvId is undefined', () => {
    expect(isProgramSfvConsistent(PROGRAM_IRI, undefined)).toBe(false)
  })

  it('returns false when sfvId is empty string', () => {
    expect(isProgramSfvConsistent(PROGRAM_IRI, '')).toBe(false)
  })

  // ─── Programs not loaded ─────────────────────────────────────────────────────

  it('returns true (allow-through) when programs list is empty', () => {
    vi.mocked(useAnalyzeStore).mockReturnValue(makeStore([]) as any)
    expect(isProgramSfvConsistent(PROGRAM_IRI, SFV_IRI)).toBe(true)
  })

  it('returns true (allow-through) when programs is null', () => {
    vi.mocked(useAnalyzeStore).mockReturnValue({ getAllPrograms: null } as any)
    expect(isProgramSfvConsistent(PROGRAM_IRI, SFV_IRI)).toBe(true)
  })

  // ─── Program not found ───────────────────────────────────────────────────────

  it('returns false when program is not in allPrograms', () => {
    expect(isProgramSfvConsistent('/api/programs/unknown-uuid', SFV_IRI)).toBe(false)
  })

  it('returns false when programId is a bare UUID not present in allPrograms', () => {
    expect(isProgramSfvConsistent('totally-different-uuid', SFV_IRI)).toBe(false)
  })

  // ─── SFV mismatch ────────────────────────────────────────────────────────────

  it('returns false when program SFV does not match active SFV', () => {
    const mismatchSfv = '/api/spend_file_versions/sfv-uuid-OTHER'
    expect(isProgramSfvConsistent(PROGRAM_IRI, mismatchSfv)).toBe(false)
  })

  it('returns false when program has no spendFileVersion', () => {
    vi.mocked(useAnalyzeStore).mockReturnValue(makeStore([
      { '@id': PROGRAM_IRI, spendFileVersion: undefined },
    ]) as any)
    expect(isProgramSfvConsistent(PROGRAM_IRI, SFV_IRI)).toBe(false)
  })

  // ─── Consistent — happy path ─────────────────────────────────────────────────

  it('returns true when program and SFV match (IRI form)', () => {
    expect(isProgramSfvConsistent(PROGRAM_IRI, SFV_IRI)).toBe(true)
  })

  it('returns true when program and SFV match (bare UUID form)', () => {
    expect(isProgramSfvConsistent(PROGRAM_ID, SFV_ID)).toBe(true)
  })

  it('returns true for a different matching program/SFV pair', () => {
    const p2 = 'prog-uuid-2'
    const s2 = 'sfv-uuid-2'
    vi.mocked(useAnalyzeStore).mockReturnValue(makeStore([
      makeProgram(),
      makeProgram(p2, s2),
    ]) as any)
    expect(isProgramSfvConsistent(`/api/programs/${p2}`, `/api/spend_file_versions/${s2}`)).toBe(true)
  })
})
