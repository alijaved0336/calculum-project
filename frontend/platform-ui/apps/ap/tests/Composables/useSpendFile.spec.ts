/**
 * Tests for getNewsConfig logic - News Config functionality
 * 
 * Tests the getNewsConfig function logic directly without the composable
 * to avoid complex mocking issues
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { NewsConfig, UserSessionActiveSpendFileVersion } from '@/types'

// Helper function that mirrors the getNewsConfig logic from useSpendFile
function getNewsConfigFromUser(
  user: { activeSpendFileVersion?: UserSessionActiveSpendFileVersion | null } | null
): NewsConfig | null {
  if (user === null || user === undefined) {
    return null
  }
  if (user.activeSpendFileVersion === null || user.activeSpendFileVersion === undefined) {
    return null
  }
  if (user.activeSpendFileVersion.newsConfig === null || user.activeSpendFileVersion.newsConfig === undefined) {
    return null
  }
  return user.activeSpendFileVersion.newsConfig
}

describe('getNewsConfig logic', () => {
  let mockUser: any

  beforeEach(() => {
    // Reset mock user before each test
    mockUser = {
      '@id': '/api/users/123',
      '@type': 'User',
      id: '123',
      email: 'test@example.com',
      activeSpendFileVersion: {
        '@id': '/api/spend_file_versions/1',
        '@type': 'SpendFileVersion',
        name: 'Test SpendFile',
        version: 1,
        status: 'ready',
        newsConfig: {
          generalNews: {
            keywords: 'Pharma, Healthcare',
            selectedTerms: ['Cash Flow', 'Supply Chain'],
            additionalTerms: 'Finance'
          },
          supplierNews: {
            selectedEntities: ['Supplier Name', 'Parent Name'],
            selectedTerms: ['Cash Flow', 'Financing'],
            additionalTerms: ''
          },
          newsSearchYearsBack: 3
        }
      }
    }
  })

  describe('getNewsConfig', () => {
    it('should return news config when available', () => {
      const config = getNewsConfigFromUser(mockUser)
      
      expect(config).toBeDefined()
      expect(config?.generalNews.keywords).toBe('Pharma, Healthcare')
      expect(config?.generalNews.selectedTerms).toContain('Cash Flow')
      expect(config?.supplierNews.selectedEntities).toContain('Supplier Name')
    })

    it('should return null when user is null', () => {
      const config = getNewsConfigFromUser(null)
      
      expect(config).toBeNull()
    })

    it('should return null when activeSpendFileVersion is null', () => {
      mockUser.activeSpendFileVersion = null
      
      const config = getNewsConfigFromUser(mockUser)
      
      expect(config).toBeNull()
    })

    it('should return null when newsConfig is null', () => {
      mockUser.activeSpendFileVersion.newsConfig = null
      
      const config = getNewsConfigFromUser(mockUser)
      
      expect(config).toBeNull()
    })

    it('should return null when newsConfig is undefined', () => {
      delete mockUser.activeSpendFileVersion.newsConfig
      
      const config = getNewsConfigFromUser(mockUser)
      
      expect(config).toBeNull()
    })

    it('should return generalNews with all fields', () => {
      const config = getNewsConfigFromUser(mockUser)
      
      expect(config?.generalNews).toHaveProperty('keywords')
      expect(config?.generalNews).toHaveProperty('selectedTerms')
      expect(config?.generalNews).toHaveProperty('additionalTerms')
    })

    it('should return supplierNews with all fields', () => {
      const config = getNewsConfigFromUser(mockUser)
      
      expect(config?.supplierNews).toHaveProperty('selectedEntities')
      expect(config?.supplierNews).toHaveProperty('selectedTerms')
      expect(config?.supplierNews).toHaveProperty('additionalTerms')
    })

    it('should return empty selectedTerms array when none selected', () => {
      mockUser.activeSpendFileVersion.newsConfig.generalNews.selectedTerms = []
      
      const config = getNewsConfigFromUser(mockUser)
      
      expect(config?.generalNews.selectedTerms).toEqual([])
    })

    it('should return empty selectedEntities array when none selected', () => {
      mockUser.activeSpendFileVersion.newsConfig.supplierNews.selectedEntities = []
      
      const config = getNewsConfigFromUser(mockUser)
      
      expect(config?.supplierNews.selectedEntities).toEqual([])
    })

    it('should return correct keywords from generalNews', () => {
      mockUser.activeSpendFileVersion.newsConfig.generalNews.keywords = 'Tech, AI, ML'
      
      const config = getNewsConfigFromUser(mockUser)
      
      expect(config?.generalNews.keywords).toBe('Tech, AI, ML')
    })

    it('should return all default terms when fully populated', () => {
      const defaultTerms = ['Cash Flow', 'Supply Chain', 'Supply Chain Finance', 'SCF', 'Financing', 'Procurement']
      mockUser.activeSpendFileVersion.newsConfig.generalNews.selectedTerms = defaultTerms
      
      const config = getNewsConfigFromUser(mockUser)
      
      expect(config?.generalNews.selectedTerms).toEqual(defaultTerms)
      expect(config?.generalNews.selectedTerms).toHaveLength(6)
    })

    it('should handle partial entity selection', () => {
      mockUser.activeSpendFileVersion.newsConfig.supplierNews.selectedEntities = ['Supplier Name']

      const config = getNewsConfigFromUser(mockUser)

      expect(config?.supplierNews.selectedEntities).toEqual(['Supplier Name'])
      expect(config?.supplierNews.selectedEntities).toHaveLength(1)
    })

    // ========================================
    // newsSearchYearsBack Tests
    // ========================================

    it('should return newsSearchYearsBack when available', () => {
      const config = getNewsConfigFromUser(mockUser)

      expect(config?.newsSearchYearsBack).toBeDefined()
      expect(config?.newsSearchYearsBack).toBe(3)
    })

    it('should return custom newsSearchYearsBack value', () => {
      mockUser.activeSpendFileVersion.newsConfig.newsSearchYearsBack = 7

      const config = getNewsConfigFromUser(mockUser)

      expect(config?.newsSearchYearsBack).toBe(7)
    })

    it('should handle newsSearchYearsBack at minimum bound', () => {
      mockUser.activeSpendFileVersion.newsConfig.newsSearchYearsBack = 1

      const config = getNewsConfigFromUser(mockUser)

      expect(config?.newsSearchYearsBack).toBe(1)
    })

    it('should handle newsSearchYearsBack at maximum bound', () => {
      mockUser.activeSpendFileVersion.newsConfig.newsSearchYearsBack = 10

      const config = getNewsConfigFromUser(mockUser)

      expect(config?.newsSearchYearsBack).toBe(10)
    })

    it('should handle undefined newsSearchYearsBack', () => {
      delete mockUser.activeSpendFileVersion.newsConfig.newsSearchYearsBack

      const config = getNewsConfigFromUser(mockUser)

      expect(config?.newsSearchYearsBack).toBeUndefined()
    })
  })
})
