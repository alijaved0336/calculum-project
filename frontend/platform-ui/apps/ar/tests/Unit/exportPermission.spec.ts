import { describe, expect, it } from 'vitest'
import { canExport } from '@/utils/exportPermission'

const LISTS = 'FEATURE_DOWNLOAD_EXCEL'
const MATCH = 'FEATURE_DOWNLOAD_EXCEL_MATCH'

describe('canExport', () => {
  it.each([
    ['a super admin, with no feature', ['ROLE_ADMIN', 'ROLE_USER'], true, true],
    ['a company admin with the lists feature', ['ROLE_USER', 'ROLE_COMPANY_ADMIN', LISTS], true, false],
    ['a company admin with the match feature only', ['ROLE_USER', 'ROLE_COMPANY_ADMIN', MATCH], false, true],
    ['a company admin with both features', ['ROLE_USER', 'ROLE_COMPANY_ADMIN', LISTS, MATCH], true, true],
    ['a company admin without any feature', ['ROLE_USER', 'ROLE_COMPANY_ADMIN', 'MODULE_MATCH'], false, false],
    ['a feature without company admin', ['ROLE_USER', LISTS, MATCH], false, false],
    ['a sales user who is company admin with both features', ['ROLE_USER', 'ROLE_SALES', 'ROLE_COMPANY_ADMIN', LISTS, MATCH], false, false],
    ['a data user who is company admin with both features', ['ROLE_USER', 'ROLE_DATA', 'ROLE_COMPANY_ADMIN', LISTS, MATCH], false, false],
    ['a sales user with ROLE_ADMIN', ['ROLE_ADMIN', 'ROLE_SALES', 'ROLE_USER'], true, true],
    ['a data user with ROLE_ADMIN', ['ROLE_ADMIN', 'ROLE_DATA', 'ROLE_USER'], true, true],
    ['an empty roles list', [], false, false],
  ])('%s', (_label, roles, lists, match) => {
    expect(canExport(roles, LISTS)).toBe(lists)
    expect(canExport(roles, MATCH)).toBe(match)
  })

  it.each([[undefined], [null]])('is false when roles are %s', (roles) => {
    expect(canExport(roles, LISTS)).toBe(false)
    expect(canExport(roles, MATCH)).toBe(false)
  })
})
