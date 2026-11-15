/**
 * WI#19427 / UC-ENT-12 — MODULE_AR, the receivables enablement flag.
 *
 * Covers the two things the story turns on: that the grid checkbox maps to the role the monolith
 * validates, and that every receivables-only company selector filters on it.
 */

import { describe, it, expect } from 'vitest'
import {
  filterReceivablesCompanies,
  getRoleFromFieldName
} from '@/modules/adminBackend/utils/CompaniesUtils'
import { MODULE_ROLES } from '@/constants'
// Leaf module, not the `@/utils` barrel: that barrel reaches RedirectSection and from there the
// router and whole views, which fails to evaluate under vitest.
import { hasModuleRole } from '@/utils/moduleRoleUtils'

const enabled = { name: 'Enabled Co', roles: ['MODULE_MATCH', 'MODULE_AR'] }
const notEnabled = { name: 'Payables Only Co', roles: ['MODULE_MATCH'] }

describe('getRoleFromFieldName — the AR column', () => {
  it('maps the grid field to MODULE_AR', () => {
    // Without this the checkbox toggles and saves nothing: CompaniesAdmin dispatches every module
    // cell through this function, and an unmapped field returns undefined and is dropped.
    expect(getRoleFromFieldName('moduleArIsAvailable')).toBe(MODULE_ROLES.AR)
  })

  it('leaves the existing module columns mapped as they were', () => {
    expect(getRoleFromFieldName('moduleOverviewIsAvailable')).toBe(MODULE_ROLES.MATCH)
    expect(getRoleFromFieldName('moduleAnalyzeIsAvailable')).toBe(MODULE_ROLES.ANALYZE)
  })
})

describe('filterReceivablesCompanies', () => {
  it('keeps only the companies holding MODULE_AR', () => {
    expect(filterReceivablesCompanies([enabled, notEnabled])).toEqual([enabled])
  })

  it('returns an empty list when no company is enabled', () => {
    // What the selector's empty state hangs off (UC-ENT-12 A3).
    expect(filterReceivablesCompanies([notEnabled])).toEqual([])
  })

  it('returns an empty list rather than throwing before the store has fetched', () => {
    expect(filterReceivablesCompanies(undefined)).toEqual([])
    expect(filterReceivablesCompanies(null)).toEqual([])
  })

  it('tolerates a company serialised without roles', () => {
    expect(filterReceivablesCompanies([{ name: 'No roles' }])).toEqual([])
  })

  it('matches the role exactly, not as a substring', () => {
    // The allowlist this replaced used String.includes, so a longer key sharing the prefix would
    // have passed. Named here because the failure would be a company reaching AR unentitled.
    expect(filterReceivablesCompanies([{ name: 'Lookalike', roles: ['MODULE_ARCHIVE'] }])).toEqual([])
  })
})

describe('hasModuleRole with MODULE_AR', () => {
  it('reads the role out of a session role list', () => {
    // The same call the sidebar's receivables entry is gated on: MODULE_AR arrives in the session
    // because User::getRoles() merges the active company's roles.
    expect(hasModuleRole(['ROLE_USER', 'MODULE_AR'], MODULE_ROLES.AR)).toBe(true)
    expect(hasModuleRole(['ROLE_USER', 'MODULE_MATCH'], MODULE_ROLES.AR)).toBe(false)
  })
})
