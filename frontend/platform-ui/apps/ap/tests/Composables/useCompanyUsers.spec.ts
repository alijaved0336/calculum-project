import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useCompanyUsers, CompanyUsersFilters } from '@/composables/useCompanyUsers'
import { useQuery } from '@vue/apollo-composable'

// Mock Apollo composable
vi.mock('@vue/apollo-composable', () => ({
  useQuery: vi.fn()
}))

describe('useCompanyUsers', () => {
  const mockUseQuery = useQuery as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty data', () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      result: ref(null),
      loading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })

    const filters = ref<CompanyUsersFilters>({
      companyUuid: 'test-uuid'
    })

    // Act
    const { userCompanies, loading, error } = useCompanyUsers(filters)

    // Assert
    expect(userCompanies.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('should extract user companies from GraphQL result', () => {
    // Arrange
    const mockResult = {
      collectionQueryCompanyUsers: {
        collection: [
          {
            _id: 1,
            id: 1,
            enabled: true,
            roles: ['ROLE_USER'],
            userEmail: 'john@example.com',
            userFirstName: 'John',
            userLastName: 'Doe',
            companyUuid: 'company-uuid',
            companyName: 'Test Company',
            activeDaysLast30: 15
          },
          {
            _id: 2,
            id: 2,
            enabled: true,
            roles: ['ROLE_ADMIN'],
            userEmail: 'jane@example.com',
            userFirstName: 'Jane',
            userLastName: 'Smith',
            companyUuid: 'company-uuid',
            companyName: 'Test Company',
            activeDaysLast30: 20
          }
        ],
        paginationInfo: {
          itemsPerPage: 50,
          lastPage: 1,
          totalCount: 2
        }
      }
    }

    mockUseQuery.mockReturnValue({
      result: ref(mockResult),
      loading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })

    const filters = ref<CompanyUsersFilters>({
      companyUuid: 'test-uuid'
    })

    // Act
    const { userCompanies } = useCompanyUsers(filters)

    // Assert
    expect(userCompanies.value).toHaveLength(2)
    expect(userCompanies.value[0].userEmail).toBe('john@example.com')
    expect(userCompanies.value[1].userEmail).toBe('jane@example.com')
  })

  it('should compute pagination info correctly', () => {
    // Arrange
    const mockResult = {
      collectionQueryCompanyUsers: {
        collection: [],
        paginationInfo: {
          itemsPerPage: 25,
          lastPage: 4,
          totalCount: 100
        }
      }
    }

    mockUseQuery.mockReturnValue({
      result: ref(mockResult),
      loading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })

    const filters = ref<CompanyUsersFilters>({
      companyUuid: 'test-uuid'
    })

    // Act
    const { paginationInfo } = useCompanyUsers(filters)

    // Assert
    expect(paginationInfo.value.totalCount).toBe(100)
    expect(paginationInfo.value.lastPage).toBe(4)
    expect(paginationInfo.value.itemsPerPage).toBe(25)
  })

  it('should handle pagination with skip and first params', async () => {
    // Arrange
    const mockRefetch = vi.fn()
    const mockResult = {
      collectionQueryCompanyUsers: {
        collection: [
          { _id: 1, id: 1, userEmail: 'user1@test.com' }
        ],
        paginationInfo: {
          itemsPerPage: 10,
          lastPage: 5,
          totalCount: 50
        }
      }
    }

    mockUseQuery.mockReturnValue({
      result: ref(mockResult),
      loading: ref(false),
      error: ref(null),
      refetch: mockRefetch
    })

    const filters = ref<CompanyUsersFilters>({
      companyUuid: 'test-uuid'
    })

    const pagination = ref({ first: 10, skip: 0 })

    // Act
    const { paginationInfo } = useCompanyUsers(filters, pagination)

    // Assert
    expect(paginationInfo.value.totalCount).toBe(50)
    expect(paginationInfo.value.itemsPerPage).toBe(10)
  })

  it('should support legacy itemsPerPage parameter', () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      result: ref(null),
      loading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })

    const filters = ref<CompanyUsersFilters>({
      companyUuid: 'test-uuid'
    })

    // Act - pass a number (legacy API)
    useCompanyUsers(filters, ref(25))

    // Assert - should convert to pagination object
    const variablesFunction = mockUseQuery.mock.calls[0][1]
    const variables = variablesFunction()

    expect(variables.itemsPerPage).toBe(25)
    expect(variables.page).toBe(1) // skip 0 = page 1
  })

  it('should pass filters to GraphQL query with offset pagination', () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      result: ref(null),
      loading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })

    const filters = ref<CompanyUsersFilters>({
      companyUuid: 'test-company-uuid',
      search: 'john',
      enabled: true,
      roles: 'ROLE_ADMIN',
      order: [{ userEmail: 'ASC' }]
    })

    const pagination = ref({ first: 25, skip: 0 })

    // Act
    useCompanyUsers(filters, pagination)

    // Assert
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(), // GraphQL query
      expect.any(Function), // Variables function
      expect.objectContaining({
        fetchPolicy: 'network-only',
        enabled: expect.anything()
      })
    )

    // Get the variables function and test it
    const variablesFunction = mockUseQuery.mock.calls[0][1]
    const variables = variablesFunction()

    expect(variables).toEqual({
      itemsPerPage: 25,
      page: 1, // skip 0 with first 25 = page 1
      company_uuid: 'test-company-uuid',
      search: 'john',
      enabled: true,
      roles: 'ROLE_ADMIN',
      order: [{ userEmail: 'ASC' }]
    })
  })

  it('should calculate correct page from skip and first', () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      result: ref(null),
      loading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })

    const filters = ref<CompanyUsersFilters>({
      companyUuid: 'test-company-uuid'
    })

    // Test different skip/first combinations
    const testCases = [
      { skip: 0, first: 10, expectedPage: 1 },
      { skip: 10, first: 10, expectedPage: 2 },
      { skip: 20, first: 10, expectedPage: 3 },
      { skip: 0, first: 25, expectedPage: 1 },
      { skip: 25, first: 25, expectedPage: 2 },
      { skip: 50, first: 25, expectedPage: 3 }
    ]

    testCases.forEach(({ skip, first, expectedPage }) => {
      vi.clearAllMocks()
      const pagination = ref({ first, skip })

      // Act
      useCompanyUsers(filters, pagination)

      // Assert
      const variablesFunction = mockUseQuery.mock.calls[0][1]
      const variables = variablesFunction()

      expect(variables.page).toBe(expectedPage)
      expect(variables.itemsPerPage).toBe(first)
    })
  })

  it('should exclude undefined optional filters', () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      result: ref(null),
      loading: ref(false),
      error: ref(null),
      refetch: vi.fn(),
      fetchMore: vi.fn()
    })

    const filters = ref<CompanyUsersFilters>({
      companyUuid: 'test-company-uuid'
      // No search, enabled, or roles
    })

    // Act
    useCompanyUsers(filters)

    // Assert
    const variablesFunction = mockUseQuery.mock.calls[0][1]
    const variables = variablesFunction()

    expect(variables.search).toBeUndefined()
    expect(variables.enabled).toBeUndefined()
    expect(variables.roles).toBeUndefined()
    expect(variables.company_uuid).toBe('test-company-uuid')
  })

  it('should call refetch when resetAndRefetch is called', async () => {
    // Arrange
    const mockRefetch = vi.fn()
    mockUseQuery.mockReturnValue({
      result: ref(null),
      loading: ref(false),
      error: ref(null),
      refetch: mockRefetch
    })

    const filters = ref<CompanyUsersFilters>({
      companyUuid: 'test-uuid'
    })

    // Act
    const { refetch } = useCompanyUsers(filters)
    await refetch()

    // Assert
    expect(mockRefetch).toHaveBeenCalled()
  })
})
