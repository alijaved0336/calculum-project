/**
 * AB#20488 — TEMPORARY gate on the Supplier Standard 2.0 / Peer Group Standard 2.0
 * "(Strategy)" grid columns. Every Analyze, Plan and Entity Card grid (and its
 * export) builds its columns through these two helpers, so they are the single
 * point where non super admins lose the columns.
 *
 * Imports the real dataGridClear module. Its barrel imports (useUser,
 * `@/composables`) are mocked because they reach Pinia / the analyze views.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUserIsSuperAdmin = { value: true }
vi.mock('@/services/user/composables/useUser', () => ({
  default: () => ({ userIsSuperAdmin: mockUserIsSuperAdmin }),
}))
vi.mock('@/composables', () => ({ useModulePlan: () => ({}) }))

import {
  removePeerGroupStandard2Strategy,
  removeSupplierStandard2Strategy,
} from '@/utils/dataGridClear'

const columns = () => [
  { field: 'entityName' },
  { field: 'entitySupplierStandard2Strategy' },
  { field: 'entityPeerGroupStandard2Strategy' },
  { field: 'volume' },
]

const fields = (cols: Array<{ field: string }>) => cols.map((c) => c.field)

describe('removeSupplierStandard2Strategy / removePeerGroupStandard2Strategy', () => {
  beforeEach(() => {
    mockUserIsSuperAdmin.value = true
  })

  it('keeps both columns for a super admin when the company features are on', () => {
    let cols = columns()
    cols = removeSupplierStandard2Strategy(cols, true)
    cols = removePeerGroupStandard2Strategy(cols, true)
    expect(fields(cols)).toEqual(fields(columns()))
  })

  it('removes both columns for a non super admin even when the company features are on', () => {
    mockUserIsSuperAdmin.value = false
    let cols = columns()
    cols = removeSupplierStandard2Strategy(cols, true)
    cols = removePeerGroupStandard2Strategy(cols, true)
    expect(fields(cols)).toEqual(['entityName', 'volume'])
  })

  it('still removes both columns for a super admin when the company features are off', () => {
    let cols = columns()
    cols = removeSupplierStandard2Strategy(cols, false)
    cols = removePeerGroupStandard2Strategy(cols, false)
    expect(fields(cols)).toEqual(['entityName', 'volume'])
  })

  it('removes only its own column', () => {
    mockUserIsSuperAdmin.value = false
    expect(fields(removeSupplierStandard2Strategy(columns(), true))).toEqual([
      'entityName',
      'entityPeerGroupStandard2Strategy',
      'volume',
    ])
    expect(fields(removePeerGroupStandard2Strategy(columns(), true))).toEqual([
      'entityName',
      'entitySupplierStandard2Strategy',
      'volume',
    ])
  })
})
