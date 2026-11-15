import { ref, computed, Ref, watch } from 'vue'
import { shouldShowErrorToasts } from '@/utils/axios'
import { useToast } from 'vue-toastification'
import axios from '@/utils/axios'
import { giveAnswer } from '@/services/api/response'
import { getBaseApi } from '@/utils/getBaseApi'

/**
 * ChangeRequestActivity interface based on backend entity
 */
export interface ChangeRequestActivity {
  '@id': string
  id: string
  uuid: string
  message?: string | null
  activityType: string
  created: string
  createdBy?: {
    '@id': string
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  metadata?: Record<string, unknown>
  changeRequest?: string // IRI reference
}

/**
 * ChangeRequest interface based on backend entity
 */
export interface ChangeRequest {
  '@id': string
  id: string
  uuid: string
  status: string
  userMessage: string
  changeType?: string | null
  resolutionMessage?: string | null
  values?: any
  oldValues?: any
  created: string
  updated?: string
  createdBy?: {
    '@id': string
    id: string
    firstName: string
    lastName: string
    email: string
  }
  reviewedBy?: {
    '@id': string
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  entity?: {
    '@id': string
    id: string
    name: string
    domain?: string
    company?: {
      name: string
    }
    country?: {
      code: string
    }
  } | null
  spendFileVersion?: {
    '@id': string
    id: string
    name: string
    version?: string
  }
  activities?: ChangeRequestActivity[]
  cloned: boolean
}

/**
 * Filters for change requests query
 */
export interface ChangeRequestFilters {
  status?: string
  changeType?: string
  search?: string        // Global search across userMessage, entity name, etc.
  userEmail?: string
  entityName?: string
  startDate?: string
  endDate?: string
  order?: {
    created?: 'asc' | 'desc'
  }
}

/**
 * Pagination parameters
 */
export interface ChangeRequestPaginationParams {
  page?: number
  itemsPerPage?: number
}

/**
 * Composable to fetch change requests with pagination and filters
 * 
 * Uses API Platform's standard pagination (page-based) for efficient large dataset handling.
 */
export function useChangeRequests(
  filters: Ref<ChangeRequestFilters> = ref({}),
  pagination: Ref<ChangeRequestPaginationParams> = ref({ page: 1, itemsPerPage: 10 }),
  sortOrder: Ref<'asc' | 'desc'> = ref('desc')
) {
  const toast = useToast()
  const changeRequests = ref<ChangeRequest[]>([])
  const loading = ref(false)
  const error = ref<any>(null)
  const totalCount = ref(0)
  const pageInfo = ref({
    hasNextPage: false,
    hasPreviousPage: false
  })

  // Build query parameters
  const buildQueryParams = () => {
    const params: Record<string, string | number> = {
      page: pagination.value.page || 1,
      itemsPerPage: Math.max(1, Math.min(pagination.value.itemsPerPage || 10, 100)) // Cap at 100
    }

    // Add filters
    if (filters.value.status) params['status'] = filters.value.status
    if (filters.value.changeType) params['changeType'] = filters.value.changeType
    
    // Global search across multiple fields (uses custom ChangeRequestSearchFilter with OR logic)
    if (filters.value.search) {
      params['search'] = filters.value.search.trim()
    }
    
    if (filters.value.userEmail) params['createdBy.email'] = filters.value.userEmail
    if (filters.value.entityName) params['entity.name'] = filters.value.entityName
    if (filters.value.startDate) params['created[after]'] = filters.value.startDate
    if (filters.value.endDate) params['created[before]'] = filters.value.endDate

    // Add ordering
    params['order[created]'] = sortOrder.value

    return params
  }

  // Parse the current page number from the API's hydra:view pagination metadata
  const parseCurrentPage = (data: any, fallbackPage: number): number => {
    const currentUrl = data['hydra:view']?.['hydra:current']
    if (!currentUrl) return fallbackPage
    const pageMatch = currentUrl.match(/[?&]page=(\d+)/)
    return pageMatch ? Number.parseInt(pageMatch[1], 10) : fallbackPage
  }

  // Sync the pagination ref with the page confirmed by the API response,
  // skipping the update when it was already applied programmatically
  const syncPaginationPage = (currentPage: number) => {
    if (!isPageChangeProgrammatic && pagination.value.page !== currentPage) {
      pagination.value.page = currentPage
    } else if (isPageChangeProgrammatic) {
      isPageChangeProgrammatic = false
    }
  }

  // Handle a successful API response: update results, counts, and pagination state
  const handleSuccessResponse = (data: any) => {
    const members = data['hydra:member'] || []
    const totalItems = data['hydra:totalItems'] || 0
    const currentPage = parseCurrentPage(data, pagination.value.page || 1)
    const itemsPerPage = pagination.value.itemsPerPage || 10
    const lastPage = Math.ceil(totalItems / itemsPerPage)

    changeRequests.value = members.filter((item: any) => item != null)
    totalCount.value = totalItems
    pageInfo.value = {
      hasNextPage: currentPage < lastPage,
      hasPreviousPage: currentPage > 1
    }

    syncPaginationPage(currentPage)
  }

  // Handle an unsuccessful/empty API response
  const handleEmptyResponse = () => {
    changeRequests.value = []
    totalCount.value = 0
    if (shouldShowErrorToasts()) {
      toast.error('Error loading change requests')
    }
  }

  // Handle a thrown error from the fetch
  const handleFetchError = (err: any) => {
    error.value = err
    changeRequests.value = []
    totalCount.value = 0

    if (shouldShowErrorToasts()) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Error loading change requests'
      if (import.meta.env.DEV) {
        console.error('useChangeRequests error:', errorMessage)
      }
      toast.error('Error loading change requests')
    }
  }

  // Fetch change requests
  const fetchChangeRequests = async () => {
    loading.value = true
    error.value = null

    try {
      const params = buildQueryParams()
      const url = getBaseApi() + '/api/change_requests'

      if (import.meta.env.DEV) {
        console.log('Fetching change requests with params:', params)
      }

      const response = await axios.get(url, { params })
      const apiResponse = giveAnswer(response)

      if (apiResponse.success && apiResponse.data) {
        handleSuccessResponse(apiResponse.data)
      } else {
        handleEmptyResponse()
      }
    } catch (err: any) {
      handleFetchError(err)
    } finally {
      loading.value = false
    }
  }

  // Refetch function
  const refetch = () => {
    return fetchChangeRequests()
  }

  // Helper to reset pagination
  const resetPagination = () => {
    pagination.value.page = 1
  }

  // Flag to prevent double fetch when page changes programmatically
  let isPageChangeProgrammatic = false

  // Helper to load next page
  const loadNextPage = () => {
    if (pageInfo.value.hasNextPage && !loading.value) {
      isPageChangeProgrammatic = true
      pagination.value.page = (pagination.value.page || 1) + 1
      // Don't call fetchChangeRequests here - let the watch handle it
      // But we need to manually trigger it since the watch will be blocked
      fetchChangeRequests()
    }
  }

  // Helper to load previous page
  const loadPreviousPage = () => {
    if (pageInfo.value.hasPreviousPage && !loading.value) {
      isPageChangeProgrammatic = true
      pagination.value.page = Math.max(1, (pagination.value.page || 1) - 1)
      // Don't call fetchChangeRequests here - let the watch handle it
      // But we need to manually trigger it since the watch will be blocked
      fetchChangeRequests()
    }
  }

  // Watch for filter changes and refetch (but not on initial mount to avoid double fetch)
  let isInitialMount = true
  let isFilterChangeProgrammatic = false
  
  watch(
    () => filters.value,
    () => {
      if (isInitialMount) {
        isInitialMount = false
        return
      }
      // Skip if the filter change is being handled programmatically (from toggleStatusFilter, etc.)
      if (isFilterChangeProgrammatic) {
        isFilterChangeProgrammatic = false
        return
      }
      resetPagination()
      fetchChangeRequests()
    },
    { deep: true, immediate: false }
  )
  
  /**
   * Mark filter changes as programmatic to prevent double fetching.
   * This function should be called before programmatically modifying filters
   * (e.g., from toggleStatusFilter, removeFilter, etc.) to prevent the watch
   * on filters.value from triggering an additional fetch.
   */
  const setFilterChangeProgrammatic = () => {
    isFilterChangeProgrammatic = true
  }

  // Watch for sort order changes
  watch(
    () => sortOrder.value,
    () => {
      if (isInitialMount) {
        isInitialMount = false
        return
      }
      resetPagination()
      fetchChangeRequests()
    }
  )

  // Watch for page size changes
  watch(
    () => pagination.value.itemsPerPage,
    () => {
      if (isInitialMount) {
        isInitialMount = false
        return
      }
      resetPagination()
      fetchChangeRequests()
    }
  )

  // Watch for page changes
  watch(
    () => pagination.value.page,
    () => {
      if (isInitialMount) {
        isInitialMount = false
        return
      }
      // Only fetch if the page change is not programmatic (from loadNextPage/loadPreviousPage)
      // Programmatic changes will be handled by those functions
      if (pagination.value.page && !isPageChangeProgrammatic) {
        fetchChangeRequests()
      }
    }
  )

  // Pagination info computed
  const paginationInfo = computed(() => {
    const itemsPerPage = pagination.value.itemsPerPage || 10
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

  // Initial fetch on mount
  fetchChangeRequests()

  return {
    changeRequests,
    paginationInfo,
    pageInfo,
    totalCount,
    loading,
    error,
    refetch,
    loadNextPage,
    loadPreviousPage,
    resetPagination,
    setFilterChangeProgrammatic
  }
}

/**
 * Helper function to format change request date
 */
export function formatChangeRequestDate(dateString: string): string {
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
export function formatChangeRequestDateOnly(dateString: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

