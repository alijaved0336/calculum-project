/**
 * AB#19545 — FEATURE_DOWNLOAD_PDF_ENTITY gates the entity PDF export.
 *
 * `hasDownloadPdfEntityFeature` is the real production function. The menu-visibility rule is
 * mirrored because it lives inline in EntityCardOverview.vue's template (same approach as
 * CalculumDropdownEditProgramOption.spec.ts) — its job here is to pin down that the gate applies
 * to supplier cards only, so a parent card never loses "Download PDF" (FR-04 / AC-12 neighbours).
 */

import { describe, it, expect } from 'vitest'
import { hasDownloadPdfEntityFeature } from '@/utils/featureRoleUtils'
import { FEATURE_ROLES } from '@/constants/featureRoles'

function downloadPdfMenuItemIsVisible(state: {
  programTarget: string
  disabledProgram: boolean
  companyType: string
  useFeatureDownloadPdfEntity: boolean
}): boolean {
  return (
    state.programTarget === 'cashFlow' &&
    !state.disabledProgram &&
    (state.companyType !== 'supplier' || state.useFeatureDownloadPdfEntity)
  )
}

const BASE_STATE = {
  programTarget: 'cashFlow',
  disabledProgram: false,
  companyType: 'supplier',
  useFeatureDownloadPdfEntity: true,
}

describe('hasDownloadPdfEntityFeature', () => {
  it('is true when the company holds the role', () => {
    expect(hasDownloadPdfEntityFeature([FEATURE_ROLES.DOWNLOAD_PDF_ENTITY])).toBe(true)
  })

  it('is false for a company without it (AC-08 — off by default)', () => {
    expect(hasDownloadPdfEntityFeature([FEATURE_ROLES.DOWNLOAD_EXCEL])).toBe(false)
  })

  it('is false for an empty roles array', () => {
    expect(hasDownloadPdfEntityFeature([])).toBe(false)
  })
})

describe('EntityCardOverview — Download PDF menu item', () => {
  it('shows on a supplier card when the company holds the feature (AC-04)', () => {
    expect(downloadPdfMenuItemIsVisible(BASE_STATE)).toBe(true)
  })

  it('hides on a supplier card without the feature (AC-05)', () => {
    expect(downloadPdfMenuItemIsVisible({ ...BASE_STATE, useFeatureDownloadPdfEntity: false })).toBe(false)
  })

  it('stays visible on a parent card without the feature (FR-04)', () => {
    expect(
      downloadPdfMenuItemIsVisible({
        ...BASE_STATE,
        companyType: 'parent',
        useFeatureDownloadPdfEntity: false,
      })
    ).toBe(true)
  })

  it('stays hidden outside a cash-flow program even with the feature', () => {
    expect(downloadPdfMenuItemIsVisible({ ...BASE_STATE, programTarget: 'other' })).toBe(false)
  })
})
