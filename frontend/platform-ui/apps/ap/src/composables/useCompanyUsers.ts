import { computed, ref, Ref } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import { gql } from '@apollo/client/core'

/**
 * Company Users Filters
 */
export interface CompanyUsersFilters {
  companyUuid?: string | null,
  companyUiGroupUuid?: string | null,
  search?: string
  telerikFilter?: string
  enabled?: boolean
  roles?: string
  companyUsers?: boolean
  identityProvider?: string
  status?: string
  order?: Array<{ [key: string]: 'ASC' | 'DESC' }>
}


/**
 * GraphQL Query for Company Users
 * Uses offset-based pagination (page/itemsPerPage)
 */


export const COMPANY_GLOBAL_USERS_EXPORT_QUERY = gql`
  query CompanyUsersExport(
    $itemsPerPage: Int!
    $page: Int!
    $company_uuid: String
    $company_ui_group_uuid: String
    $search: String
    $telerikFilter: String
    $enabled: Boolean
    $roles: String
    $companyUsers: Boolean
    $identityProvider: String
    $status: String
    $order: [CompanyUserFilter_order]
  ) {
    collectionQueryCompanyUsers(
      itemsPerPage: $itemsPerPage
      page: $page
      company_uuid: $company_uuid
      company_ui_group_uuid: $company_ui_group_uuid
      search: $search
      telerikFilter: $telerikFilter
      enabled: $enabled
      roles: $roles
      companyUsers: $companyUsers
      identityProvider: $identityProvider
      status: $status
      order: $order
    ) {
      collection {
        userUuid
        userAzureId
        identityProvider
        userEmail
        userFirstName
        userLastName
        userFullName
        lastActivity
        activeDaysLast30
        activeDaysLast60
        activeDaysLast90
        companyName
        companyUiGroupName
        rolesByCompany
        enabled
      }
    }
  }
`

const COMPANY_GLOBAL_USERS_QUERY = gql`
  query CompanyUsers(
    $itemsPerPage: Int!
    $page: Int!
    $company_uuid: String
    $company_ui_group_uuid: String
    $search: String
    $telerikFilter: String
    $enabled: Boolean
    $roles: String
    $companyUsers: Boolean
    $identityProvider: String
    $status: String
    $order: [CompanyUserFilter_order]
  ) {
    collectionQueryCompanyUsers(
      itemsPerPage: $itemsPerPage
      page: $page
      company_uuid: $company_uuid
      company_ui_group_uuid: $company_ui_group_uuid
      search: $search
      telerikFilter: $telerikFilter
      enabled: $enabled
      roles: $roles
      companyUsers: $companyUsers
      identityProvider: $identityProvider
      status: $status
      order: $order
    ) {
      collection {
        _id
        id
        tokenExpiration
        userUuid
        userAzureId
        identityProvider
        azureLastInvitationDate
        userEmail
        userFirstName
        userLastName
        userFullName
        lastActivity
        activeDaysLast30
        activeDaysLast60
        activeDaysLast90
        companyUuid
        companyName
        companyUiGroupUuid
        companyUiGroupName
        rolesByCompany
        invitationToken
        enabled
        userRoles
      }
      paginationInfo {
        itemsPerPage
        lastPage
        totalCount
      }
    }
  }
`


const COMPANY_USERS_QUERY = gql`
  query CompanyUsers(
    $itemsPerPage: Int!
    $page: Int!
    $company_uuid: String
    $company_ui_group_uuid: String
    $search: String
    $telerikFilter: String
    $enabled: Boolean
    $roles: String
    $companyUsers: Boolean
    $identityProvider: String
    $status: String
    $order: [CompanyUserFilter_order]
  ) {
    collectionQueryCompanyUsers(
      itemsPerPage: $itemsPerPage
      page: $page
      company_uuid: $company_uuid
      company_ui_group_uuid: $company_ui_group_uuid
      search: $search
      telerikFilter: $telerikFilter
      enabled: $enabled
      roles: $roles
      companyUsers: $companyUsers
      identityProvider: $identityProvider
      status: $status
      order: $order
    ) {
      collection {
        _id
        id
        enabled
        roles        
        lastActivity
        invitationToken
        tokenExpiration
        userUuid
        userAzureId
        userEmail
        userFirstName
        userLastName
        userFullName
        userJobTitle
        userPhoneNumber
        activeDaysLast30  
        activeDaysLast60  
        activeDaysLast90
        companyUuid
        companyName                
      }
      paginationInfo {
        itemsPerPage
        lastPage
        totalCount
      }
    }
  }
`

/**
 * Composable for fetching company users via GraphQL
 * 
 * @param filters - Reactive filters for the query
 * @param pagination - Pagination params { first: number, skip: number } for offset-based pagination
 * @returns Query result with users, pagination, and helper functions
 * 
 * @example
 * ```ts
 * const filters = ref({
 *   companyUuid: 'uuid-here',
 *   search: 'john',
 *   enabled: true
 * })
 * 
 * const pagination = ref({ first: 25, skip: 0 })
 * 
 * const { 
 *   userCompanies, 
 *   loading, 
 *   error, 
 *   paginationInfo,
 *   refetch
 * } = useCompanyUsers(filters, pagination)
 * ```
 */
export function useCompanyUsers(
  filters: Ref<CompanyUsersFilters>,
  pagination: Ref<{ first: number; skip: number }> | Ref<number> = ref({ first: 25, skip: 0 }),
  isGlobalUsers: boolean = false
) {

  // Support both old API (Ref<number>) and new API (Ref<{ first, skip }>)
  const paginationParams = computed(() => {
    const paginationValue = pagination.value
    if (typeof paginationValue === 'number') {
      // Legacy: itemsPerPage as number
      return { first: paginationValue, skip: 0 }
    }
    // New: pagination object
    return paginationValue
  })  
  
  // GraphQL Query - using first for page size, skip is handled by fetching correct page
  const { result, loading, error, refetch } = useQuery(
    isGlobalUsers ? COMPANY_GLOBAL_USERS_QUERY : COMPANY_USERS_QUERY,
    () => ({
      itemsPerPage: paginationParams.value.first,
      page: Math.floor(paginationParams.value.skip / paginationParams.value.first) + 1,
      company_uuid: filters.value.companyUuid || undefined,
      company_ui_group_uuid: filters.value.companyUiGroupUuid || undefined,
      search: filters.value.search || undefined,
      telerikFilter: filters.value.telerikFilter || undefined,
      enabled: filters.value.enabled,
      roles: filters.value.roles || undefined,
      companyUsers: filters.value.companyUsers,
      identityProvider: filters.value.identityProvider || undefined,
      status: filters.value.status || undefined,
      order: filters.value.order || undefined
    }),
    {
      fetchPolicy: 'network-only',
      enabled: true
    }
  )

  // Computed: Extract user companies from collection
  const userCompanies = computed(() => {
    return result.value?.collectionQueryCompanyUsers?.collection || []
  })

  // Computed: Pagination info
  const paginationInfo = computed(() => ({
    totalCount: result.value?.collectionQueryCompanyUsers?.paginationInfo?.totalCount || 0,
    lastPage: result.value?.collectionQueryCompanyUsers?.paginationInfo?.lastPage || 1,
    itemsPerPage: result.value?.collectionQueryCompanyUsers?.paginationInfo?.itemsPerPage || paginationParams.value.first,
    hasNextPage: false, // Not needed for offset pagination
    hasPreviousPage: false // Not needed for offset pagination
  }))

  /**
   * Reset and refetch (used when filters change; e.g. from component)
   */
  const resetAndRefetch = async () => {
    await refetch()
  }

  // All filter changes (companyUuid, companyUiGroupUuid, search, order, pagination, enabled, roles)
  // are already reactive via useQuery's variables function above; no extra watch to avoid double calls.

  return {
    // Data
    userCompanies,
    
    // State
    loading,
    error,
    
    // Pagination
    paginationInfo,
    
    // Actions
    refetch: resetAndRefetch
  }
}
