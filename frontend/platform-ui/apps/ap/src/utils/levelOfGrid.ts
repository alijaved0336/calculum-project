/**
 * Maps a companyType prop value to the level string expected by the API.
 *
 * 'supplier'         → 'suppliers'
 * 'parent'           → 'parents'
 * 'potential-supplier' → passes through unchanged (confirm with backend whether
 *                        this should map to 'suppliers'; current behaviour in all
 *                        5 inline callsites was passthrough)
 * anything else      → passes through unchanged
 */
export function mapCompanyTypeToLevel(companyType: string): string {
  if (companyType === 'supplier') return 'suppliers'
  if (companyType === 'parent') return 'parents'
  return companyType
}


export function mapCompanyTypeForAllLevels(companyType: string): string {
  if (companyType === 'supplier' || companyType === 'potential-supplier') return 'suppliers'
  if (companyType === 'parent' || companyType === 'potential-parent') return 'parents'
  return companyType
}
