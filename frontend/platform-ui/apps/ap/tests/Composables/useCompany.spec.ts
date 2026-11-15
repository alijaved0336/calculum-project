/**
 * Tests for useCompany composable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// Mock utils barrel export to prevent initialization issues
vi.mock('@/utils', () => ({
  StringUtils: {
    removeIRI: (iri: string) => {
      if (!iri) return ''
      const lastSlash = iri.lastIndexOf('/')
      return lastSlash !== -1 ? iri.substring(lastSlash + 1) : iri
    }
  },
  isNullOrUndefined: (value: any) => value === null || value === undefined
}))

// Mock media services
vi.mock('@/services/media/mediaActions', () => ({
  getMediaUrl: (url: string) => url ? `https://media.example.com/${url}` : ''
}))

// Create a mock user that we can modify in tests
let mockUser = ref<any>({
  id: '123',
  email: 'test@example.com',
  activeCompany: {
    '@id': '/api/companies/456',
    id: '456',
    name: 'Test Company',
    taxId: 'TAX123',
    currency: {
      '@id': '/api/currencies/USD',
      code: 'USD'
    },
    allowedDomains: 'example.com, test.com',
    teams: [
      { '@id': '/api/teams/1', name: 'Team 1' },
      { '@id': '/api/teams/2', name: 'Team 2' }
    ],
    spendFileVersions: [
      { '@id': '/api/versions/1', name: 'Version 1', status: 'ready' }
    ],
    logo: {
      publicUrl: 'logos/company-logo.png'
    },
    uiGroup: {
      logoPath: 'ui-groups/group-logo.png'
    },
    vCardGroupsEnabled: true
  }
})

// Mock the useUser composable
vi.mock('@/composables', () => ({
  useUser: () => ({
    user: mockUser
  })
}))

import useCompany from '@/composables/useCompany'

describe('useCompany', () => {
  beforeEach(() => {
    // Reset mock user before each test
    mockUser.value = {
      id: '123',
      email: 'test@example.com',
      activeCompany: {
        '@id': '/api/companies/456',
        id: '456',
        name: 'Test Company',
        taxId: 'TAX123',
        currency: {
          '@id': '/api/currencies/USD',
          code: 'USD'
        },
        allowedDomains: 'example.com, test.com',
        teams: [
          { '@id': '/api/teams/1', name: 'Team 1' },
          { '@id': '/api/teams/2', name: 'Team 2' }
        ],
        spendFileVersions: [
          { '@id': '/api/versions/1', name: 'Version 1', status: 'ready' }
        ],
        logo: {
          publicUrl: 'logos/company-logo.png'
        },
        uiGroup: {
          logoPath: 'ui-groups/group-logo.png'
        },
        vCardGroupsEnabled: true
      }
    }
  })

  describe('companyActive', () => {
    it('should return the active company', () => {
      const { companyActive } = useCompany()
      
      expect(companyActive.value).toBeDefined()
      expect(companyActive.value?.name).toBe('Test Company')
    })

    it('should return null when user is null', () => {
      mockUser.value = null
      const { companyActive } = useCompany()
      
      expect(companyActive.value).toBeNull()
    })

    it('should be writable', () => {
      const { companyActive } = useCompany()
      
      const newCompany = {
        '@id': '/api/companies/789',
        id: '789',
        name: 'New Company',
        taxId: 'TAX789'
      }
      
      companyActive.value = newCompany as any
      
      expect(mockUser.value.activeCompany).toEqual(newCompany)
      expect(companyActive.value?.name).toBe('New Company')
    })

    it('should not set when user is null', () => {
      const { companyActive } = useCompany()
      mockUser.value = null
      
      const newCompany = {
        '@id': '/api/companies/789',
        id: '789',
        name: 'New Company',
        taxId: 'TAX789'
      }
      
      companyActive.value = newCompany as any
      
      expect(mockUser.value).toBeNull()
    })
  })

  describe('companyActiveIri', () => {
    it('should return the active company IRI', () => {
      const { companyActiveIri } = useCompany()
      
      expect(companyActiveIri.value).toBe('/api/companies/456')
    })

    it('should return empty string when active company is null', () => {
      mockUser.value.activeCompany = null
      const { companyActiveIri } = useCompany()
      
      expect(companyActiveIri.value).toBe('')
    })
  })

  describe('companyActiveId', () => {
    it('should return the active company ID extracted from IRI', () => {
      const { companyActiveId } = useCompany()
      
      expect(companyActiveId.value).toBe('456')
    })

    it('should return empty string when IRI is empty', () => {
      mockUser.value.activeCompany = null
      const { companyActiveId } = useCompany()
      
      expect(companyActiveId.value).toBe('')
    })
  })

  describe('companyActiveName', () => {
    it('should return the active company name', () => {
      const { companyActiveName } = useCompany()
      
      expect(companyActiveName.value).toBe('Test Company')
    })

    it('should return empty string when active company is null', () => {
      mockUser.value.activeCompany = null
      const { companyActiveName } = useCompany()
      
      expect(companyActiveName.value).toBe('')
    })

    it('should return empty string when name is undefined', () => {
      mockUser.value.activeCompany = { '@id': '/api/companies/456' }
      const { companyActiveName } = useCompany()
      
      expect(companyActiveName.value).toBe('')
    })
  })

  describe('companyActiveSpendFileVersions', () => {
    it('should return spend file versions', () => {
      const { companyActiveSpendFileVersions } = useCompany()
      
      expect(companyActiveSpendFileVersions.value).toHaveLength(1)
      expect(companyActiveSpendFileVersions.value[0].name).toBe('Version 1')
    })

    it('should return empty array when active company is null', () => {
      mockUser.value.activeCompany = null
      const { companyActiveSpendFileVersions } = useCompany()
      
      expect(companyActiveSpendFileVersions.value).toEqual([])
    })

    it('should return empty array when spendFileVersions is null', () => {
      mockUser.value.activeCompany.spendFileVersions = null
      const { companyActiveSpendFileVersions } = useCompany()
      
      expect(companyActiveSpendFileVersions.value).toEqual([])
    })
  })

  describe('companyActiveLogoPublicUrl', () => {
    it('should return the logo public URL', () => {
      const { companyActiveLogoPublicUrl } = useCompany()
      
      expect(companyActiveLogoPublicUrl.value).toBe('https://media.example.com/logos/company-logo.png')
    })

    it('should return empty string when active company is null', () => {
      mockUser.value.activeCompany = null
      const { companyActiveLogoPublicUrl } = useCompany()
      
      expect(companyActiveLogoPublicUrl.value).toBe('')
    })

    it('should return empty string when logo is null', () => {
      mockUser.value.activeCompany.logo = null
      const { companyActiveLogoPublicUrl } = useCompany()
      
      expect(companyActiveLogoPublicUrl.value).toBe('')
    })
  })

  describe('companyActiveUIGroupLogoPath', () => {
    it('should return the UI group logo path', () => {
      const { companyActiveUIGroupLogoPath } = useCompany()
      
      expect(companyActiveUIGroupLogoPath.value).toBe('https://media.example.com/ui-groups/group-logo.png')
    })

    it('should return empty string when active company is null', () => {
      mockUser.value.activeCompany = null
      const { companyActiveUIGroupLogoPath } = useCompany()
      
      expect(companyActiveUIGroupLogoPath.value).toBe('')
    })

    it('should return empty string when uiGroup is null', () => {
      mockUser.value.activeCompany.uiGroup = null
      const { companyActiveUIGroupLogoPath } = useCompany()
      
      expect(companyActiveUIGroupLogoPath.value).toBe('')
    })
  })

  describe('companyActiveTeams', () => {
    it('should return company teams', () => {
      const { companyActiveTeams } = useCompany()
      
      expect(companyActiveTeams.value).toHaveLength(2)
      expect(companyActiveTeams.value?.[0].name).toBe('Team 1')
    })

    it('should return empty array when teams is undefined', () => {
      mockUser.value.activeCompany.teams = undefined
      const { companyActiveTeams } = useCompany()
      
      expect(companyActiveTeams.value).toEqual([])
    })
  })

  describe('usevCardGroupsEnabled', () => {
    it('should return true when vCard groups are enabled', () => {
      const { usevCardGroupsEnabled } = useCompany()
      
      expect(usevCardGroupsEnabled.value).toBe(true)
    })

    it('should return false when active company is null', () => {
      mockUser.value.activeCompany = null
      const { usevCardGroupsEnabled } = useCompany()
      
      expect(usevCardGroupsEnabled.value).toBe(false)
    })

    it('should return false when vCardGroupsEnabled is null', () => {
      mockUser.value.activeCompany.vCardGroupsEnabled = null
      const { usevCardGroupsEnabled } = useCompany()
      
      expect(usevCardGroupsEnabled.value).toBe(false)
    })

    it('should return false when vCardGroupsEnabled is false', () => {
      mockUser.value.activeCompany.vCardGroupsEnabled = false
      const { usevCardGroupsEnabled } = useCompany()
      
      expect(usevCardGroupsEnabled.value).toBe(false)
    })
  })

  describe('updatevCardGroupsEnabled', () => {
    it('should update vCard groups enabled status', () => {
      const { updatevCardGroupsEnabled, usevCardGroupsEnabled } = useCompany()
      
      updatevCardGroupsEnabled(false)
      
      expect(usevCardGroupsEnabled.value).toBe(false)
      expect(mockUser.value.activeCompany.vCardGroupsEnabled).toBe(false)
    })

    it('should not update when user is null', () => {
      const { updatevCardGroupsEnabled } = useCompany()
      mockUser.value = null
      
      updatevCardGroupsEnabled(false)
      
      expect(mockUser.value).toBeNull()
    })

    it('should not update when active company is null', () => {
      const { updatevCardGroupsEnabled } = useCompany()
      const originalCompany = mockUser.value.activeCompany
      mockUser.value.activeCompany = null
      
      updatevCardGroupsEnabled(false)
      
      expect(mockUser.value.activeCompany).toBeNull()
    })
  })

  describe('activeCurrency', () => {
    it('should return the currency code', () => {
      const { activeCurrency } = useCompany()
      
      expect(activeCurrency.value).toBe('USD')
    })

    it('should return empty string when active company is null', () => {
      mockUser.value.activeCompany = null
      const { activeCurrency } = useCompany()
      
      expect(activeCurrency.value).toBe('')
    })
  })

  describe('activeCurrencyIri', () => {
    it('should return the currency IRI', () => {
      const { activeCurrencyIri } = useCompany()
      
      expect(activeCurrencyIri.value).toBe('/api/currencies/USD')
    })

    it('should return empty string when active company is null', () => {
      mockUser.value.activeCompany = null
      const { activeCurrencyIri } = useCompany()
      
      expect(activeCurrencyIri.value).toBe('')
    })
  })

  describe('allowedDomains', () => {
    it('should return the allowed domains', () => {
      const { allowedDomains } = useCompany()

      expect(allowedDomains.value).toBe('example.com, test.com')
    })

    it('should return empty string when active company is null', () => {
      mockUser.value.activeCompany = null
      const { allowedDomains } = useCompany()

      expect(allowedDomains.value).toBe('')
    })
  })

  describe('allowedDomainsList', () => {
    it('should parse the company allowed domains into a normalized list', () => {
      mockUser.value.activeCompany.allowedDomains = ' Example.COM ,\ntest.com'
      const { allowedDomainsList } = useCompany()

      expect(allowedDomainsList.value).toEqual(['example.com', 'test.com'])
    })

    it('should return an empty list when neither the company nor the UI group declares domains', () => {
      mockUser.value.activeCompany.allowedDomains = null
      const { allowedDomainsList } = useCompany()

      expect(allowedDomainsList.value).toEqual([])
    })

    it('should return an empty list when the company allowed domains is an empty string', () => {
      mockUser.value.activeCompany.allowedDomains = ''
      const { allowedDomainsList } = useCompany()

      expect(allowedDomainsList.value).toEqual([])
    })

    it('should include the UI group domains when the company has none', () => {
      mockUser.value.activeCompany.allowedDomains = null
      mockUser.value.activeCompany.uiGroup.allowedDomains = ['Group.com']
      const { allowedDomainsList } = useCompany()

      expect(allowedDomainsList.value).toEqual(['group.com'])
    })

    it('should merge company and UI group domains without duplicates', () => {
      mockUser.value.activeCompany.allowedDomains = 'example.com, shared.com'
      mockUser.value.activeCompany.uiGroup.allowedDomains = ['shared.com', 'group.com']
      const { allowedDomainsList } = useCompany()

      expect(allowedDomainsList.value).toEqual(['example.com', 'shared.com', 'group.com'])
    })

    it('should accept UI group domains served as a comma separated string', () => {
      mockUser.value.activeCompany.allowedDomains = null
      mockUser.value.activeCompany.uiGroup.allowedDomains = 'group.com, other.com'
      const { allowedDomainsList } = useCompany()

      expect(allowedDomainsList.value).toEqual(['group.com', 'other.com'])
    })

    it('should return an empty list when active company is null', () => {
      mockUser.value.activeCompany = null
      const { allowedDomainsList } = useCompany()

      expect(allowedDomainsList.value).toEqual([])
    })
  })

  describe('hasAllowedDomainsRestriction', () => {
    it('should be true when the company declares domains', () => {
      const { hasAllowedDomainsRestriction } = useCompany()

      expect(hasAllowedDomainsRestriction.value).toBe(true)
    })

    it('should be true when only the UI group declares domains', () => {
      mockUser.value.activeCompany.allowedDomains = null
      mockUser.value.activeCompany.uiGroup.allowedDomains = ['group.com']
      const { hasAllowedDomainsRestriction } = useCompany()

      expect(hasAllowedDomainsRestriction.value).toBe(true)
    })

    it('should be false when no domains are configured at any level', () => {
      mockUser.value.activeCompany.allowedDomains = null
      const { hasAllowedDomainsRestriction } = useCompany()

      expect(hasAllowedDomainsRestriction.value).toBe(false)
    })

    it('should be false when the company allowed domains is an empty string', () => {
      mockUser.value.activeCompany.allowedDomains = '   '
      const { hasAllowedDomainsRestriction } = useCompany()

      expect(hasAllowedDomainsRestriction.value).toBe(false)
    })
  })
})

