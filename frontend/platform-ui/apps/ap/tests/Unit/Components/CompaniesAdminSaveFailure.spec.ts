import { describe, expect, it } from 'vitest'

/**
 * AB#19545 / EF-2 — when saving the Companies Admin grid fails, the console must show an
 * error and put the checkboxes back on their last saved state.
 *
 * companyAPIUpdate resolves even on a failed PATCH (it swallows the axios error and reports
 * it through `success`), so the outcome has to be read off the responses. This mirrors the
 * handler in CompaniesAdmin.vue — same shape as the other specs in this folder.
 */

interface ApiResponseLike {
  success: boolean
}

interface Company {
  '@id': string
  featureDownloadPdfEntityIsAvailable: boolean
}

interface SaveState {
  companies: Company[]
  savedState: Company[]
  pendingRoles: unknown[]
  loading: boolean
  toast: 'success' | 'error' | null
}

function handleSaveResponses(state: SaveState, responses: ApiResponseLike[]): SaveState {
  const next = { ...state, loading: false }

  if (responses.some(response => !response?.success)) {
    return {
      ...next,
      companies: next.savedState.map(company => ({ ...company })),
      pendingRoles: [],
      toast: 'error',
    }
  }

  return {
    ...next,
    savedState: next.companies.map(company => ({ ...company })),
    pendingRoles: [],
    toast: 'success',
  }
}

function buildState(): SaveState {
  return {
    // the Super Admin just ticked the box, not saved yet
    companies: [{ '@id': '/api/companies/1', featureDownloadPdfEntityIsAvailable: true }],
    savedState: [{ '@id': '/api/companies/1', featureDownloadPdfEntityIsAvailable: false }],
    pendingRoles: [{ companyIRI: '/api/companies/1' }],
    loading: true,
    toast: null,
  }
}

describe('CompaniesAdmin — saving the grid', () => {
  it('reverts the checkbox and shows an error when a PATCH fails (EF-2)', () => {
    const result = handleSaveResponses(buildState(), [{ success: false }])

    expect(result.companies[0].featureDownloadPdfEntityIsAvailable).toBe(false)
    expect(result.toast).toBe('error')
    expect(result.pendingRoles).toEqual([])
    expect(result.loading).toBe(false)
  })

  it('reverts when only one of several PATCHes fails', () => {
    const result = handleSaveResponses(buildState(), [{ success: true }, { success: false }])

    expect(result.companies[0].featureDownloadPdfEntityIsAvailable).toBe(false)
    expect(result.toast).toBe('error')
  })

  it('keeps the change and syncs the saved state when every PATCH succeeds', () => {
    const result = handleSaveResponses(buildState(), [{ success: true }])

    expect(result.companies[0].featureDownloadPdfEntityIsAvailable).toBe(true)
    expect(result.savedState[0].featureDownloadPdfEntityIsAvailable).toBe(true)
    expect(result.toast).toBe('success')
    expect(result.loading).toBe(false)
  })
})
