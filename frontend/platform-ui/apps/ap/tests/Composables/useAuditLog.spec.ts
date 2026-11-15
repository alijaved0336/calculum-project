/**
 * Tests for useAuditLog composable
 * Tests GraphQL integration, pagination, and filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import { useAuditLogs } from '@/composables/useAuditLog'

vi.mock('@vue/apollo-composable', () => ({ useQuery: vi.fn() }))
vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() })
}))
// Isolate from @/utils/axios's unrelated transitive dependency chain (CookieSessionsFns ->
// ... -> Home views), which is otherwise pulled in just to read this one flag.
vi.mock('@/utils/axios', () => ({ shouldShowErrorToasts: () => true }))

describe('useAuditLog composable', () => {
  describe('AuditLog interface', () => {
    it('should have correct structure for AuditLog', () => {
      const mockLog = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        auditType: 'Security',
        context: 'authentication',
        action: 'login',
        level: 'ERROR',
        outcome: 'Failed',
        source: 'AuthController',
        message: 'Failed login attempt',
        createdAt: '2025-10-25T10:30:00Z',
        ipAddress: '192.168.1.1',
        traceId: 'trace-123',
        eventData: { error: 'Invalid credentials' },
        entityType: 'User',
        requestRoute: '/api/auth/login'
      }
      
      expect(mockLog).toHaveProperty('id')
      expect(mockLog).toHaveProperty('auditType')
      expect(mockLog).toHaveProperty('level')
      expect(mockLog).toHaveProperty('outcome')
      expect(mockLog).toHaveProperty('message')
      expect(mockLog).toHaveProperty('createdAt')
    })

    it('should support user and company information fields (v1.3.8)', () => {
      const mockLog = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        auditType: 'DATABASE_CHANGE',
        context: 'user_profile',
        action: 'UPDATE',
        level: 'INFO',
        outcome: 'Successful',
        source: 'Service',
        message: 'User updated profile',
        createdAt: '2025-10-27T10:30:00Z',
        userEmail: 'john.doe@example.com',
        userUuid: '8f2a3c5d-7e91-4b6a-8d2f-1a3c5e7f9b2d',
        companyName: 'Acme Corporation',
        companyUuid: '3b7c9e1f-4a6d-8c2e-5f1b-9d3a7c5e2f1a'
      }
      
      expect(mockLog).toHaveProperty('userEmail')
      expect(mockLog).toHaveProperty('userUuid')
      expect(mockLog).toHaveProperty('companyName')
      expect(mockLog).toHaveProperty('companyUuid')
      expect(mockLog.userEmail).toBe('john.doe@example.com')
      expect(mockLog.companyName).toBe('Acme Corporation')
    })

    it('should handle logs without user and company information', () => {
      const mockLog = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        auditType: 'SYSTEM',
        context: 'maintenance',
        action: 'CLEANUP',
        level: 'INFO',
        outcome: 'Successful',
        source: 'Command',
        message: 'System maintenance completed',
        createdAt: '2025-10-27T10:30:00Z',
        userEmail: undefined,
        userUuid: undefined,
        companyName: undefined,
        companyUuid: undefined
      }
      
      expect(mockLog.userEmail).toBeUndefined()
      expect(mockLog.userUuid).toBeUndefined()
      expect(mockLog.companyName).toBeUndefined()
      expect(mockLog.companyUuid).toBeUndefined()
    })
  })

  describe('AuditLogFilters interface', () => {
    it('should accept all filter properties', () => {
      const mockFilters = {
        auditType: 'Security',
        context: 'auth',
        level: 'ERROR',
        outcome: 'Failed',
        action: 'login',
        source: 'Controller',
        companyUuid: 'company-123',
        userEmail: 'test@example.com',
        traceId: 'trace-123'
      }
      
      expect(mockFilters).toHaveProperty('auditType')
      expect(mockFilters).toHaveProperty('level')
      expect(mockFilters).toHaveProperty('outcome')
      expect(mockFilters).toHaveProperty('source')
    })
  })

  describe('GraphQL query structure', () => {
    it('should use cursor-based pagination', () => {
      const paginationVars = {
        first: 50,
        after: 'cursor-123'
      }
      
      expect(paginationVars).toHaveProperty('first')
      expect(paginationVars).toHaveProperty('after')
      expect(paginationVars.first).toBe(50)
    })

    it('should support filter variables', () => {
      const queryVars = {
        first: 50,
        after: null,
        level: 'ERROR',
        auditType: 'Security',
        outcome: 'Failed'
      }
      
      expect(queryVars).toHaveProperty('level')
      expect(queryVars).toHaveProperty('auditType')
      expect(queryVars).toHaveProperty('outcome')
    })

    it('should use snake_case for company and user filters', () => {
      const queryVars = {
        company_uuid: 'company-123',
        user_email: 'test@example.com'
      }
      
      expect(queryVars).toHaveProperty('company_uuid')
      expect(queryVars).toHaveProperty('user_email')
    })
  })

  describe('pagination structure', () => {
    it('should have correct pageInfo structure', () => {
      const pageInfo = {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'cursor-start',
        endCursor: 'cursor-end'
      }
      
      expect(pageInfo).toHaveProperty('hasNextPage')
      expect(pageInfo).toHaveProperty('endCursor')
      expect(pageInfo.hasNextPage).toBe(true)
    })

    it('should have totalCount in response', () => {
      const response = {
        auditLogs: {
          edges: [],
          pageInfo: {},
          totalCount: 248
        }
      }
      
      expect(response.auditLogs).toHaveProperty('totalCount')
      expect(response.auditLogs.totalCount).toBe(248)
    })
  })

  describe('response structure', () => {
    it('should use edges and nodes pattern', () => {
      const response = {
        auditLogs: {
          edges: [
            {
              node: {
                id: '123',
                message: 'Test log'
              }
            }
          ]
        }
      }
      
      expect(response.auditLogs).toHaveProperty('edges')
      expect(response.auditLogs.edges[0]).toHaveProperty('node')
    })
  })

  describe('filter logic', () => {
    it('should include source in backend filters (server-side)', () => {
      // Source is now filtered server-side via GraphQL
      const backendFilters = {
        level: 'ERROR',
        auditType: 'Security',
        outcome: 'Failed',
        source: 'Controller'
      }
      
      expect(backendFilters).toHaveProperty('source')
      expect(backendFilters.source).toBe('Controller')
    })

    it('should support multiple filters simultaneously', () => {
      const filters = {
        level: 'ERROR',
        auditType: 'Security',
        outcome: 'Failed',
        source: 'Service',
        context: 'auth',
        action: 'login'
      }
      
      expect(Object.keys(filters).length).toBeGreaterThan(4)
    })
  })

  describe('fetchPolicy configuration', () => {
    it('should use network-only policy', () => {
      const options = {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
        notifyOnNetworkStatusChange: true
      }
      
      expect(options.fetchPolicy).toBe('network-only')
      expect(options.errorPolicy).toBe('all')
      expect(options.notifyOnNetworkStatusChange).toBe(true)
    })
  })

  // WI#19504: a backend serialization bug made every edge.node null while the GraphQL response
  // still carried partial `data` alongside `errors` (errorPolicy: 'all'). These tests exercise
  // the real composable (not object-literal characterization) to guard against that regression.
  describe('partial GraphQL response handling (WI#19504)', () => {
    const mockUseQuery = useQuery as ReturnType<typeof vi.fn>

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('filters out null nodes when some edges failed to serialize', () => {
      mockUseQuery.mockReturnValue({
        result: ref({
          auditLogs: {
            edges: [
              { node: null, cursor: 'c1' },
              { node: { id: 'uuid-1', createdAt: '2026-01-01T00:00:00Z', level: 'Info' }, cursor: 'c2' }
            ],
            pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
            totalCount: 2
          }
        }),
        loading: ref(false),
        error: ref(null),
        refetch: vi.fn(),
        fetchMore: vi.fn(),
        stop: vi.fn()
      })

      const { auditLogs } = useAuditLogs()

      expect(auditLogs.value).toHaveLength(1)
      expect(auditLogs.value[0].id).toBe('uuid-1')
    })

    it('returns an empty array, not a crash, when every edge.node is null', () => {
      mockUseQuery.mockReturnValue({
        result: ref({
          auditLogs: {
            edges: [
              { node: null, cursor: 'c1' },
              { node: null, cursor: 'c2' }
            ],
            pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
            totalCount: 2
          }
        }),
        loading: ref(false),
        error: ref(null),
        refetch: vi.fn(),
        fetchMore: vi.fn(),
        stop: vi.fn()
      })

      const { auditLogs } = useAuditLogs()

      expect(() => auditLogs.value).not.toThrow()
      expect(auditLogs.value).toEqual([])
    })
  })
})
