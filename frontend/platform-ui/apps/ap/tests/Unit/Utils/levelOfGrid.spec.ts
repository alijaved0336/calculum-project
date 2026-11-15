import { describe, it, expect } from 'vitest'
import { mapCompanyTypeToLevel } from '@/utils/levelOfGrid'

describe('mapCompanyTypeToLevel', () => {
  it("maps 'supplier' to 'suppliers'", () => {
    expect(mapCompanyTypeToLevel('supplier')).toBe('suppliers')
  })

  it("maps 'parent' to 'parents'", () => {
    expect(mapCompanyTypeToLevel('parent')).toBe('parents')
  })

  it("passes 'potential-supplier' through unchanged", () => {
    // 'potential-supplier' exists as a companyType in the UI (e.g. DetailBox titles use
    // companyType.replace('potential-', '')). All 5 original inline callsites passed it
    // through without mapping. Confirm with backend whether it should map to 'suppliers'.
    expect(mapCompanyTypeToLevel('potential-supplier')).toBe('potential-supplier')
  })

  it('passes unknown values through unchanged', () => {
    expect(mapCompanyTypeToLevel('unknown')).toBe('unknown')
  })

  it('handles empty string', () => {
    expect(mapCompanyTypeToLevel('')).toBe('')
  })
})
