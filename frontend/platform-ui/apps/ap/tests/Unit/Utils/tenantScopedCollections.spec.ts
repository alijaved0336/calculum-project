/**
 * Unit tests for the tenant-scope guard used by getCollectionData (WI#18809).
 */

import { describe, it, expect } from 'vitest'
import {
  TENANT_SCOPED_COLLECTIONS,
  hasUsableTenantScope,
  isTenantScopedCollectionQuery
} from '@/utils/validation/tenantScopedCollections'

const query = (collection: string, args = '') => `
  {
    rows: ${collection}(${args}) {
      edges { cursor node { entityName } }
    }
  }
`

describe('tenantScopedCollections', () => {
  describe('isTenantScopedCollectionQuery', () => {
    it.each([...TENANT_SCOPED_COLLECTIONS])('detects %s', (collection) => {
      expect(isTenantScopedCollectionQuery(query(collection))).toBe(true)
    })

    it('does not flag the exempt management catalog collection', () => {
      expect(isTenantScopedCollectionQuery(query('collectionQueryManagementCatalogLists'))).toBe(false)
    })

    it('does not flag the exempt compare company collection', () => {
      expect(isTenantScopedCollectionQuery(query('collectionQueryCompareCompanyLists'))).toBe(false)
    })

    it('does not flag the exempt company users collection', () => {
      expect(isTenantScopedCollectionQuery(query('collectionQueryCompanyUsers'))).toBe(false)
    })

    it('returns false for a query with no collection at all', () => {
      expect(isTenantScopedCollectionQuery('{ me { email } }')).toBe(false)
    })
  })

  describe('hasUsableTenantScope', () => {
    it('accepts a uuid', () => {
      expect(hasUsableTenantScope('df4a867e-63c6-48e3-8d31-3aa16785f560')).toBe(true)
    })

    it('rejects an empty string, which is what spendFileVersionActiveId yields before the store loads', () => {
      expect(hasUsableTenantScope('')).toBe(false)
    })

    it('rejects undefined', () => {
      expect(hasUsableTenantScope(undefined)).toBe(false)
    })

    it('rejects null', () => {
      expect(hasUsableTenantScope(null)).toBe(false)
    })

    it('rejects the "undefined" literal left by interpolating an unset ref', () => {
      expect(hasUsableTenantScope('undefined')).toBe(false)
    })

    it('rejects the "null" literal', () => {
      expect(hasUsableTenantScope('null')).toBe(false)
    })

    it('rejects a placeholder surrounded by whitespace', () => {
      expect(hasUsableTenantScope('  undefined  ')).toBe(false)
    })
  })
})
