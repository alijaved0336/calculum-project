/**
 * Factory functions to create mock data for tests
 */

/**
 * Create a mock company object
 */
export function createMockCompany(overrides: Partial<any> = {}) {
  return {
    id: '123',
    name: 'Test Company',
    taxId: 'TAX123',
    country: 'US',
    industry: 'Technology',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  }
}

/**
 * Create a mock user object
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: '456',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    ...overrides
  }
}

/**
 * Create a mock program object
 */
export function createMockProgram(overrides: Partial<any> = {}) {
  return {
    id: '789',
    name: 'Test Program',
    description: 'A test program',
    status: 'active',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    companyId: '123',
    ...overrides
  }
}

/**
 * Create a mock entity object
 */
export function createMockEntity(overrides: Partial<any> = {}) {
  return {
    id: '999',
    name: 'Test Entity',
    type: 'supplier',
    taxId: 'ENTITY123',
    country: 'US',
    ...overrides
  }
}

/**
 * Create a mock spend file object
 */
export function createMockSpendFile(overrides: Partial<any> = {}) {
  return {
    id: '111',
    fileName: 'test-spend.xlsx',
    status: 'processed',
    uploadedAt: new Date('2024-01-01'),
    processedAt: new Date('2024-01-01'),
    totalRows: 100,
    validRows: 95,
    invalidRows: 5,
    ...overrides
  }
}

/**
 * Create mock pagination data
 */
export function createMockPagination(overrides: Partial<any> = {}) {
  return {
    page: 1,
    pageSize: 20,
    total: 100,
    totalPages: 5,
    ...overrides
  }
}

/**
 * Create a mock API response
 */
export function createMockApiResponse<T>(data: T, overrides: Partial<any> = {}) {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
    ...overrides
  }
}

/**
 * Create a mock error response
 */
export function createMockErrorResponse(message = 'An error occurred', overrides: Partial<any> = {}) {
  return {
    message,
    response: {
      status: 500,
      statusText: 'Internal Server Error',
      data: {
        error: message
      }
    },
    ...overrides
  }
}

