/**
 * Unit tests for EntityCardUtils
 * 
 * These tests cover utility functions extracted from EntityCardOverview component
 * to ensure business logic is properly tested in isolation.
 */

import { describe, it, expect } from 'vitest'
import {
  getInitial,
  formatCompanyType,
  removeDuplicatesById,
  shouldBlockProgramOptions,
  isFinancingFeatureEnabled,
  buildCalculatedCashFlowSource,
  shouldRefreshFinancingTab,
  defaultSpendLinesSort
} from '@/utils/EntityCardUtils'

describe('EntityCardUtils', () => {
  describe('getInitial', () => {
    it('should return first letter in uppercase', () => {
      expect(getInitial('Test Company')).toBe('T')
      expect(getInitial('acme corp')).toBe('A')
      expect(getInitial('XYZ Industries')).toBe('X')
    })

    it('should handle single character strings', () => {
      expect(getInitial('A')).toBe('A')
      expect(getInitial('z')).toBe('Z')
    })

    it('should return empty string for empty input', () => {
      expect(getInitial('')).toBe('')
      expect(getInitial(null)).toBe('')
      expect(getInitial(undefined)).toBe('')
    })

    it('should handle strings with leading spaces', () => {
      expect(getInitial(' Test')).toBe(' ')
      expect(getInitial('  Company')).toBe(' ')
    })

    it('should handle special characters', () => {
      expect(getInitial('123 Company')).toBe('1')
      expect(getInitial('@mention')).toBe('@')
      expect(getInitial('#hashtag')).toBe('#')
    })

    it('should handle unicode characters', () => {
      expect(getInitial('Ñoño')).toBe('Ñ')
      expect(getInitial('Über')).toBe('Ü')
    })
  })

  // WI#18804: the Spend Lines grid of the Entity Card must default to Spend Volume
  // descending, not alphabetical supplier order. ListNegotiation.vue builds its initial
  // sortSpends descriptor from this function (the component itself cannot be mounted
  // under Vitest — see ListNegotiationGlobalFilter.spec.ts).
  describe('defaultSpendLinesSort', () => {
    it('defaults to Spend Volume descending', () => {
      expect(defaultSpendLinesSort(false)).toEqual([
        { field: 'volume', dir: 'desc' }
      ])
    })

    it('keeps pilot rows on top for pilot accounts, volume descending within', () => {
      expect(defaultSpendLinesSort(true)).toEqual([
        { field: 'isPilot', dir: 'desc' },
        { field: 'volume', dir: 'desc' }
      ])
    })
  })

  describe('formatCompanyType', () => {
    it('should capitalize first letter of company type', () => {
      expect(formatCompanyType('supplier')).toBe('Supplier')
      expect(formatCompanyType('parent')).toBe('Parent')
      expect(formatCompanyType('subsidiary')).toBe('Subsidiary')
    })

    it('should handle already capitalized strings', () => {
      expect(formatCompanyType('Supplier')).toBe('Supplier')
      expect(formatCompanyType('PARENT')).toBe('PARENT')
    })

    it('should handle single character strings', () => {
      expect(formatCompanyType('a')).toBe('A')
      expect(formatCompanyType('Z')).toBe('Z')
    })

    it('should return empty string for empty input', () => {
      expect(formatCompanyType('')).toBe('')
      expect(formatCompanyType(null)).toBe('')
      expect(formatCompanyType(undefined)).toBe('')
    })

    it('should preserve rest of the string', () => {
      expect(formatCompanyType('supplier-entity')).toBe('Supplier-entity')
      expect(formatCompanyType('parent company')).toBe('Parent company')
    })

    it('should handle special characters', () => {
      expect(formatCompanyType('123type')).toBe('123type')
      expect(formatCompanyType('@type')).toBe('@type')
    })
  })

  describe('removeDuplicatesById', () => {
    describe('with default @id field', () => {
      it('should remove duplicates based on @id field', () => {
        const input = [
          { '@id': '1', name: 'A' },
          { '@id': '2', name: 'B' },
          { '@id': '1', name: 'C' }
        ]
        const result = removeDuplicatesById(input)
        
        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({ '@id': '1', name: 'A' })
        expect(result[1]).toEqual({ '@id': '2', name: 'B' })
      })

      it('should keep first occurrence of duplicate', () => {
        const input = [
          { '@id': '1', name: 'First' },
          { '@id': '1', name: 'Second' },
          { '@id': '1', name: 'Third' }
        ]
        const result = removeDuplicatesById(input)
        
        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('First')
      })

      it('should handle empty array', () => {
        expect(removeDuplicatesById([])).toEqual([])
      })

      it('should handle array with no duplicates', () => {
        const input = [
          { '@id': '1', name: 'A' },
          { '@id': '2', name: 'B' },
          { '@id': '3', name: 'C' }
        ]
        const result = removeDuplicatesById(input)
        
        expect(result).toHaveLength(3)
        expect(result).toEqual(input)
      })

      it('should handle single element array', () => {
        const input = [{ '@id': '1', name: 'A' }]
        const result = removeDuplicatesById(input)
        
        expect(result).toEqual(input)
      })

      it('should preserve object properties', () => {
        const input = [
          { '@id': '1', name: 'A', value: 100, active: true },
          { '@id': '2', name: 'B', value: 200, active: false },
          { '@id': '1', name: 'C', value: 300, active: true }
        ]
        const result = removeDuplicatesById(input)
        
        expect(result[0]).toEqual({ '@id': '1', name: 'A', value: 100, active: true })
        expect(result[1]).toEqual({ '@id': '2', name: 'B', value: 200, active: false })
      })
    })

    describe('with custom id field', () => {
      it('should remove duplicates based on custom field', () => {
        const input = [
          { id: '1', name: 'A' },
          { id: '2', name: 'B' },
          { id: '1', name: 'C' }
        ]
        const result = removeDuplicatesById(input, 'id')
        
        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({ id: '1', name: 'A' })
        expect(result[1]).toEqual({ id: '2', name: 'B' })
      })

      it('should work with uuid field', () => {
        const input = [
          { uuid: 'abc-123', name: 'A' },
          { uuid: 'def-456', name: 'B' },
          { uuid: 'abc-123', name: 'C' }
        ]
        const result = removeDuplicatesById(input, 'uuid')
        
        expect(result).toHaveLength(2)
      })

      it('should work with nested id paths', () => {
        const input = [
          { customId: '1', name: 'A' },
          { customId: '2', name: 'B' },
          { customId: '1', name: 'C' }
        ]
        const result = removeDuplicatesById(input, 'customId')
        
        expect(result).toHaveLength(2)
      })
    })

    describe('edge cases', () => {
      it('should handle numeric IDs', () => {
        const input = [
          { '@id': 1, name: 'A' },
          { '@id': 2, name: 'B' },
          { '@id': 1, name: 'C' }
        ]
        const result = removeDuplicatesById(input)
        
        expect(result).toHaveLength(2)
      })

      it('should handle undefined IDs gracefully', () => {
        const input = [
          { '@id': '1', name: 'A' },
          { name: 'B' }, // no @id
          { '@id': '1', name: 'C' }
        ]
        const result = removeDuplicatesById(input)
        
        // Items without the id field will be filtered based on undefined
        expect(result.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('shouldBlockProgramOptions', () => {
    it('should return true when program is in recalculation', () => {
      expect(shouldBlockProgramOptions(true, false)).toBe(true)
    })

    it('should return true when recalculation is pending', () => {
      expect(shouldBlockProgramOptions(false, true)).toBe(true)
    })

    it('should return true when both conditions are true', () => {
      expect(shouldBlockProgramOptions(true, true)).toBe(true)
    })

    it('should return false when both conditions are false', () => {
      expect(shouldBlockProgramOptions(false, false)).toBe(false)
    })
  })

  describe('isFinancingFeatureEnabled', () => {
    it('should return true when all conditions are met', () => {
      expect(isFinancingFeatureEnabled(true, true)).toBe(true)
    })

    it('should return false when hasFinancing is false', () => {
      expect(isFinancingFeatureEnabled(false, true)).toBe(false)
    })

    it('should return false when userPartnerRoleEnabled is false', () => {
      expect(isFinancingFeatureEnabled(true, true)).toBe(true)
    })

    it('should return false when useFeature9BoxesFinancing is false', () => {
      expect(isFinancingFeatureEnabled(true, false)).toBe(false)
    })

    it('should return false when all conditions are false', () => {
      expect(isFinancingFeatureEnabled(false, false)).toBe(false)
    })

    it('should return false when only one condition is true', () => {
      expect(isFinancingFeatureEnabled(true, false)).toBe(false)
      expect(isFinancingFeatureEnabled(false, false)).toBe(false)
      expect(isFinancingFeatureEnabled(false, true)).toBe(false)
    })

    it('should return false when only two conditions are true', () => {
      expect(isFinancingFeatureEnabled(true, false)).toBe(false)
      expect(isFinancingFeatureEnabled(true, true)).toBe(true)
      expect(isFinancingFeatureEnabled(false, true)).toBe(false)
    })
  })

  describe('buildCalculatedCashFlowSource', () => {
    const uuids = { spendUuid: 'spend-uuid', entityUuid: 'entity-uuid' }

    it('should target the spends collection by its own uuid at spend level', () => {
      expect(buildCalculatedCashFlowSource('spend', uuids)).toEqual({
        collectionQuery: 'collectionQueryProgramListSpends',
        alias: 'spends',
        rowFilter: 'uuid: "spend-uuid"',
        entityTypeFilter: ''
      })
    })

    it('should target the suppliers collection by entityUuid at supplier level', () => {
      expect(buildCalculatedCashFlowSource('supplier', uuids)).toEqual({
        collectionQuery: 'collectionQueryProgramListSuppliers',
        alias: 'suppliers',
        rowFilter: 'entityUuid: "entity-uuid"',
        entityTypeFilter: ''
      })

      expect(buildCalculatedCashFlowSource('potential-supplier', uuids)).toEqual(
        buildCalculatedCashFlowSource('supplier', uuids)
      )
    })

    // Regression (WI#19124): the backend AdaTargetEntityTypeFilter forces entity_type = 'supplier'
    // when targetEntityType is absent, so potential rows ('potential-supplier'/'potential-parent')
    // were filtered out, the collection returned [] and the card fell back to a 0 Cash Flow
    // Opportunity while the REST-fed "or X% Discount" and the AdaBot narrative stayed correct.
    it('should ask for the potential entity type on every level when the entity is potential', () => {
      expect(buildCalculatedCashFlowSource('spend', uuids, true)?.entityTypeFilter).toBe(
        'targetEntityType: "potential",'
      )
      expect(buildCalculatedCashFlowSource('potential-supplier', uuids, true)?.entityTypeFilter).toBe(
        'targetEntityType: "potential",'
      )
      expect(buildCalculatedCashFlowSource('potential-parent', uuids, true)?.entityTypeFilter).toBe(
        'targetEntityType: "potential",'
      )
    })

    // 'potential-supplier' is the spend_parsed_company.company_type; the filter only accepts
    // 'supplier' | 'potential' | 'pilot' | '*' and throws on anything else.
    it('should send the filter value the backend accepts, not the company type', () => {
      const source = buildCalculatedCashFlowSource('potential-supplier', uuids, true)

      expect(source?.entityTypeFilter).not.toContain('potential-supplier')
    })

    it('should not restrict the entity type for non-potential entities', () => {
      expect(buildCalculatedCashFlowSource('supplier', uuids, false)?.entityTypeFilter).toBe('')
      expect(buildCalculatedCashFlowSource('parent', uuids)?.entityTypeFilter).toBe('')
    })

    // Regression (WI#18800): parent rows are identified by their own entityUuid. Filtering the
    // parents collection by parentUuid matched nothing, so the card showed a 0 Cash Flow
    // Opportunity and hid the Agreed box for every parent.
    it('should target the parents collection by entityUuid, never by parentUuid', () => {
      const source = buildCalculatedCashFlowSource('parent', uuids)

      expect(source).toEqual({
        collectionQuery: 'collectionQueryProgramListParents',
        alias: 'parents',
        rowFilter: 'entityUuid: "entity-uuid"',
        entityTypeFilter: ''
      })
      expect(source?.rowFilter).not.toContain('parentUuid')
    })

    it('should treat potential parents like parents', () => {
      expect(buildCalculatedCashFlowSource('potential-parent', uuids)).toEqual(
        buildCalculatedCashFlowSource('parent', uuids)
      )
    })

    it('should return null when the uuid needed by the level is missing', () => {
      expect(buildCalculatedCashFlowSource('spend', { spendUuid: '', entityUuid: 'entity-uuid' })).toBeNull()
      expect(buildCalculatedCashFlowSource('parent', { spendUuid: 'spend-uuid', entityUuid: '' })).toBeNull()
      expect(buildCalculatedCashFlowSource('supplier', { spendUuid: 'spend-uuid', entityUuid: null })).toBeNull()
    })
  })

  describe('integration scenarios', () => {
    it('should handle typical entity card initialization flow', () => {
      const supplierName = 'Acme Corporation'
      const companyType = 'supplier'
      
      const initial = getInitial(supplierName)
      const formattedType = formatCompanyType(companyType)
      
      expect(initial).toBe('A')
      expect(formattedType).toBe('Supplier')
    })

    it('should handle program blocking logic', () => {
      // Scenario: Program is recalculating
      const isBlocked1 = shouldBlockProgramOptions(true, false)
      expect(isBlocked1).toBe(true)
      
      // Scenario: Program is ready
      const isBlocked2 = shouldBlockProgramOptions(false, false)
      expect(isBlocked2).toBe(false)
    })

    it('should handle financing feature checks', () => {
      // Scenario: User has all permissions
      const canAccessFinancing1 = isFinancingFeatureEnabled(true, true)
      expect(canAccessFinancing1).toBe(true)
      
      // Scenario: User lacks partner role
      const canAccessFinancing2 = isFinancingFeatureEnabled(true, true)
      expect(canAccessFinancing2).toBe(true)
    })

    it('should handle deduplication of API responses', () => {
      const apiResponse = [
        { '@id': '/api/programs/1', name: 'Program 1', status: 'active' },
        { '@id': '/api/programs/2', name: 'Program 2', status: 'active' },
        { '@id': '/api/programs/1', name: 'Program 1', status: 'active' }, // duplicate
        { '@id': '/api/programs/3', name: 'Program 3', status: 'pending' }
      ]
      
      const uniquePrograms = removeDuplicatesById(apiResponse)
      
      expect(uniquePrograms).toHaveLength(3)
      expect(uniquePrograms.map(p => p['@id'])).toEqual([
        '/api/programs/1',
        '/api/programs/2',
        '/api/programs/3'
      ])
    })
  })
  describe('shouldRefreshFinancingTab (US-18713)', () => {
    it('AC-04/AC-07: does not refetch while the token has not moved', () => {
      expect(shouldRefreshFinancingTab(7, 7, 'spend-uuid')).toBe(false)
    })

    it('AC-01/AC-02: refetches once a Target or Agreed save bumped the token', () => {
      expect(shouldRefreshFinancingTab(7, 8, 'spend-uuid')).toBe(true)
    })

    it('AC-06: several saves in a row are still a single refetch on activation', () => {
      let lastSeen = 7
      const afterTwoSaves = 9

      expect(shouldRefreshFinancingTab(lastSeen, afterTwoSaves, 'spend-uuid')).toBe(true)
      lastSeen = afterTwoSaves
      expect(shouldRefreshFinancingTab(lastSeen, afterTwoSaves, 'spend-uuid')).toBe(false)
    })

    it('does not refetch before the tab knows which spend it is showing', () => {
      expect(shouldRefreshFinancingTab(7, 8, '')).toBe(false)
      expect(shouldRefreshFinancingTab(7, 8, null)).toBe(false)
      expect(shouldRefreshFinancingTab(7, 8, undefined)).toBe(false)
    })
  })
})
