import { useQuery } from '@vue/apollo-composable'
import { gql } from '@apollo/client/core'
import { computed, ref, Ref, watch, onUnmounted } from 'vue'
import { shouldShowErrorToasts } from '@/utils/axios'
import { useToast } from 'vue-toastification'

/**
 * AuditLog interface based on backend entity
 * Note:
 * - user and company relations are not included in GraphQL queries
 *   to avoid schema resolution issues
 * - userEmail, userUuid, companyName, companyUuid are computed fields (not persisted in DB)
 *   that return values from user/company relations if available
 */
export interface AuditLog {
  id: string    // API Platform identifier (the audit log's uuid)
  auditType: string
  context: string
  action: string
  level: string
  outcome: string
  source: string
  message: string
  createdAt: string
  ipAddress?: string
  userEmail?: string    // Computed field from user relation
  userUuid?: string     // Computed field from user relation
  companyName?: string  // Computed field from company relation
  companyUuid?: string  // Computed field from company relation
  traceId?: string
  eventData?: any
  entityType?: string
  requestRoute?: string
  // Compliance fields
  legalHold?: boolean
  retentionDays?: number
  retentionExpiresAt?: string
  archived?: boolean
  archiveLocation?: string
}

/**
 * Filters for audit logs query
 */
export interface AuditLogFilters {
  auditType?: string
  context?: string
  level?: string
  outcome?: string
  action?: string
  source?: string
  search?: string        // Global search across message, action, requestRoute, ipAddress, traceId
  message?: string
  requestRoute?: string
  ipAddress?: string
  traceId?: string
  companyUuid?: string
  userEmail?: string
  startDate?: string
  endDate?: string
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  itemsPerPage?: number
}

/**
 * GraphQL Query to fetch audit logs with pagination and filters
 * Uses API Platform's standard cursor-based pagination
 */
const AUDIT_LOGS_QUERY = gql`
  query AuditLogs(
    $first: Int
    $after: String
    $auditType: String
    $context: String
    $level: String
    $outcome: String
    $action: String
    $source: String
    $search: String
    $message: String
    $requestRoute: String
    $ipAddress: String
    $traceId: String
    $company_uuid: String
    $user_email: String
  ) {
    auditLogs(
      first: $first
      after: $after
      auditType: $auditType
      context: $context
      level: $level
      outcome: $outcome
      action: $action
      source: $source
      search: $search
      message: $message
      requestRoute: $requestRoute
      ipAddress: $ipAddress
      traceId: $traceId
      company_uuid: $company_uuid
      user_email: $user_email
    ) {
      edges {
        node {
          id
          auditType
          context
          action
          level
          outcome
          source
          message
          createdAt
          ipAddress
          userEmail
          userUuid
          companyName
          companyUuid
          traceId
          eventData
          entityType
          requestRoute
          legalHold
          retentionDays
          retentionExpiresAt
          archived
          archiveLocation
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`

/**
 * GraphQL Query to fetch a single audit log by ID
 */
const AUDIT_LOG_BY_ID_QUERY = gql`
  query AuditLogById($id: ID!) {
    auditLog(id: $id) {
      id
      auditType
      context
      action
      level
      outcome
      source
      message
      createdAt
      ipAddress
      email
      traceId
      eventData
      entityType
      requestRoute
      legalHold
      retentionDays
      retentionExpiresAt
      archived
      archiveLocation
    }
  }
`

/**
 * GraphQL Query for audit log statistics
 */
const AUDIT_LOG_STATS_QUERY = gql`
  query AuditLogStats(
    $startDate: String
    $endDate: String
    $companyUuid: String
  ) {
    auditLogStats(
      startDate: $startDate
      endDate: $endDate
      companyUuid: $companyUuid
    ) {
      totalLogs
      byLevel {
        level
        count
      }
      byAuditType {
        auditType
        count
      }
      byOutcome {
        outcome
        count
      }
      recentErrors
    }
  }
`

/**
 * Composable to fetch audit logs with pagination and filters
 *
 * Uses API Platform's cursor-based pagination for efficient large dataset handling.
 *
 * Naming Convention Note:
 * - Frontend uses camelCase (e.g., companyUuid, userEmail)
 * - Backend GraphQL API expects snake_case for some fields (e.g., company_uuid, user_email)
 * - This conversion is required due to API Platform's automatic field name transformation
 * - Most fields use camelCase in both frontend and backend
 *
 * Performance Note:
 * - Uses 'network-only' fetchPolicy to ensure fresh data on every query
 * - This is critical for audit logs where real-time accuracy is required
 * - Trade-off: Higher network usage, but guarantees no stale/outdated logs are displayed
 */
export function useAuditLogs(
  filters: Ref<AuditLogFilters> = ref({}),
  pagination: Ref<PaginationParams> = ref({ page: 1, itemsPerPage: 50 })
) {
  const toast = useToast()
  const afterCursor = ref<string | null>(null)

  // Track if query is enabled (can be used to stop queries)
  const queryEnabled = ref(true)

  // Build query variables with validation and proper naming conversion
  const queryVariables = computed(() => {
    const vars: Record<string, string | number | null | undefined> = {
      // Pagination: ensure valid values
      first: Math.max(1, Math.min(pagination.value.itemsPerPage || 50, 100)), // Cap at 100
      after: afterCursor.value
    }

    // Map filter fields: camelCase frontend → snake_case/camelCase backend
    // Only include defined, non-empty values to optimize query performance
    if (filters.value.auditType) vars.auditType = filters.value.auditType
    if (filters.value.context) vars.context = filters.value.context
    if (filters.value.level) vars.level = filters.value.level
    if (filters.value.outcome) vars.outcome = filters.value.outcome
    if (filters.value.action) vars.action = filters.value.action
    if (filters.value.source) vars.source = filters.value.source
    if (filters.value.search) vars.search = filters.value.search  // Global search
    if (filters.value.message) vars.message = filters.value.message
    if (filters.value.requestRoute) vars.requestRoute = filters.value.requestRoute
    if (filters.value.ipAddress) vars.ipAddress = filters.value.ipAddress
    if (filters.value.traceId) vars.traceId = filters.value.traceId

    // Backend requires snake_case for these specific fields
    if (filters.value.companyUuid) vars.company_uuid = filters.value.companyUuid
    if (filters.value.userEmail) vars.user_email = filters.value.userEmail

    return vars
  })

  const { result, loading, error, refetch, fetchMore, stop } = useQuery(
    AUDIT_LOGS_QUERY,
    queryVariables,
    {
      fetchPolicy: 'network-only', // Always fetch fresh data, no duplicate calls
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
      enabled: queryEnabled
    }
  )

  // Handle errors
  watch(error, (newError) => {
    if (newError) {
      const errorMessage = newError.message || ''
      const edges = result.value?.auditLogs?.edges ?? []
      const hasPartialData = edges.some((edge: any) => edge.node !== null)

      // Show actual errors
      if (shouldShowErrorToasts()) {
        if (import.meta.env.DEV) {
          console.error('useAuditLogs error:', errorMessage)
        }
        if (hasPartialData) {
          toast.warning('Some audit log entries could not be loaded')
        } else {
          toast.error('Error loading audit logs')
        }
      }
    }
  })

  // Extract nodes from edges (already sorted DESC by createdAt from backend)
  // Null nodes can occur when a GraphQL query returns partial data alongside errors
  // (errorPolicy: 'all') - filter them out so downstream consumers never see a null entry.
  const auditLogs = computed(() => {
    if (!result.value?.auditLogs?.edges) return []
    const logs = result.value.auditLogs.edges
      .map((edge: any) => edge.node)
      .filter((node: any): node is AuditLog => node !== null && node !== undefined)

    // Debug: Log first and last dates to verify DESC order
    if (import.meta.env.DEV && logs.length > 0) {
      console.log('Audit Logs Order (should be DESC):')
      console.log('  First log date:', logs[0].createdAt)
      console.log('  Last log date:', logs[logs.length - 1].createdAt)
    }

    return logs
  })

  const pageInfo = computed(() => result.value?.auditLogs?.pageInfo || {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null
  })

  const totalCount = computed(() => result.value?.auditLogs?.totalCount || 0)

  // Helper to calculate pagination info for UI
  const paginationInfo = computed(() => {
    const itemsPerPage = pagination.value.itemsPerPage || 50
    const currentPage = pagination.value.page || 1
    const total = totalCount.value
    const lastPage = Math.ceil(total / itemsPerPage) || 1

    return {
      itemsPerPage,
      lastPage,
      totalCount: total,
      currentPage
    }
  })

  // Helper to load next page
  const loadNextPage = () => {
    if (pageInfo.value.hasNextPage && pageInfo.value.endCursor) {
      afterCursor.value = pageInfo.value.endCursor
      refetch()
    }
  }

  // Helper to reset pagination
  const resetPagination = () => {
    afterCursor.value = null
    pagination.value.page = 1
  }

  // Cleanup on unmount - stop the query
  onUnmounted(() => {
    if (import.meta.env.DEV) console.log('🧹 Cleaning up: stopping audit logs query...')
    queryEnabled.value = false
    stop()
  })

  return {
    auditLogs,
    paginationInfo,
    pageInfo,
    totalCount,
    loading,
    error,
    refetch,
    fetchMore,
    loadNextPage,
    resetPagination
  }
}

/**
 * Composable to fetch a single audit log by ID
 *
 * Performance Note:
 * - Uses 'cache-and-network' fetchPolicy to show cached data immediately
 *   while fetching fresh data in the background. This provides better UX
 *   for detail views where stale data is acceptable temporarily.
 */
export function useAuditLog(id: Ref<string> | string) {
  const toast = useToast()
  const idRef = typeof id === 'string' ? ref(id) : id

  const { result, loading, error, refetch } = useQuery(
    AUDIT_LOG_BY_ID_QUERY,
    { id: idRef },
    {
      fetchPolicy: 'cache-and-network', // Show cached data while fetching fresh data
      errorPolicy: 'all',
      enabled: computed(() => !!idRef.value)
    }
  )

  // Reactive error handling - watches for errors that occur after initial setup
  watch(error, (newError) => {
    if (newError && shouldShowErrorToasts()) {
      const errorMessage = newError.message || 'Error loading audit log'
      if (import.meta.env.DEV) {
        console.error('useAuditLog error:', errorMessage)
      }
      toast.error('Error loading audit log details')
    }
  })

  const auditLog = computed(() => result.value?.auditLog || null)

  return {
    auditLog,
    loading,
    error,
    refetch
  }
}

/**
 * Composable to fetch audit log statistics
 *
 * Performance Note:
 * - Uses 'cache-and-network' fetchPolicy for statistics that don't change
 *   frequently. Shows cached data immediately while fetching updates.
 */
export function useAuditLogStats(
  startDate: Ref<string | undefined> = ref(undefined),
  endDate: Ref<string | undefined> = ref(undefined),
  companyUuid: Ref<string | undefined> = ref(undefined)
) {
  const toast = useToast()

  // Compute query variables with validation
  const queryVariables = computed(() => {
    const vars: Record<string, string | undefined> = {}

    // Only include defined values to avoid null/undefined issues
    if (startDate.value) vars.startDate = startDate.value
    if (endDate.value) vars.endDate = endDate.value
    if (companyUuid.value) vars.companyUuid = companyUuid.value

    return vars
  })

  const { result, loading, error, refetch } = useQuery(
    AUDIT_LOG_STATS_QUERY,
    queryVariables,
    {
      fetchPolicy: 'cache-and-network', // Show cached stats while fetching updates
      errorPolicy: 'all'
    }
  )

  // Reactive error handling - watches for errors that occur after initial setup
  watch(error, (newError) => {
    if (newError && shouldShowErrorToasts()) {
      const errorMessage = newError.message || 'Error loading audit statistics'
      if (import.meta.env.DEV) {
        console.error('useAuditLogStats error:', errorMessage)
      }
      toast.error('Error loading audit statistics')
    }
  })

  // Provide default values for statistics to prevent undefined access
  const stats = computed(() => result.value?.auditLogStats || {
    totalLogs: 0,
    byLevel: [],
    byAuditType: [],
    byOutcome: [],
    recentErrors: 0
  })

  return {
    stats,
    loading,
    error,
    refetch
  }
}

/**
 * Helper function to format audit log date
 */
export function formatAuditLogDate(dateString: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Format date for group headers (date only, no time)
 */
export function formatAuditLogDateOnly(dateString: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Helper function to get level badge class
 * Uses standardized level values: Error, Warning, Info, Debug, Critical
 *
 * Note: Both 'Error' and 'Critical' map to 'badge-danger' as they represent
 * different severity levels but use the same visual styling for consistency.
 * This is intentional and not code duplication.
 *
 * after migration to standardized values is complete. Track in project management tool.
 */
export function getLevelBadgeClass(level: string): string {
  const levelMap: Record<string, string> = {
    'Info': 'badge-info',
    'Warning': 'badge-warning',
    'Error': 'badge-danger',
    'Debug': 'badge-secondary',
    'Critical': 'badge-danger', // Same styling as Error for visual consistency
  }
  return levelMap[level] || 'badge-secondary'
}

/**
 * Helper function to get outcome badge class
 */
export function getOutcomeBadgeClass(outcome: string): string {
  const outcomeMap: Record<string, string> = {
    'Successful': 'badge-success',
    'Unsuccessful': 'badge-danger',
    'Partial': 'badge-warning',
    'Unknown': 'badge-secondary'
  }
  return outcomeMap[outcome] || 'badge-secondary'
}

