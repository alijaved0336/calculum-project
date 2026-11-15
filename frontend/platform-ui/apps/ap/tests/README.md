# Frontend Tests

This directory contains all tests for the Calculum frontend application, organized by test type.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run specific test types
npm run test:unit           # Unit tests only
npm run test:component      # Component tests only
npm run test:integration    # Integration tests only

# Run with coverage
npm run test:ci

# Open Vitest UI for interactive testing
npm run test:ui
```

## Directory Structure

```
tests/
├── setup.ts                 # Global test setup
├── Helpers/                 # Reusable test utilities
│   ├── mountWithProviders.ts    # Mount components with providers
│   ├── mockFactories.ts         # Test data factories
│   ├── mockServices.ts          # Service mocks
│   └── testUtils.ts             # Common utilities
├── Unit/                    # Unit tests
│   ├── Utils/                   # Utility function tests
│   ├── Validators/              # Validation logic tests
│   └── ...
├── Component/               # Vue component tests
│   └── ...
├── Composables/            # Composables tests
│   └── ...
├── Integration/            # Integration tests
│   ├── Services/               # Service integration tests
│   └── Store/                  # Store interaction tests
└── Fixtures/               # (To be created) Test fixtures

e2e/                        # E2E tests (separate directory)
└── tests/                  # Playwright E2E tests
```

## Test Types

### Unit Tests (`tests/Unit/`)
- **Purpose**: Test pure functions and utilities in isolation
- **Speed**: Very fast (< 1s per test)
- **When to use**: Testing utility functions, validators, helpers
- **Example**: `tests/Unit/Utils/DateUtils.spec.ts`

### Component Tests (`tests/Component/`)
- **Purpose**: Test Vue components in isolation
- **Speed**: Fast (< 5s per test)
- **When to use**: Testing component behavior, props, events, rendering
- **Example**: `tests/Component/ButtonCustom.spec.ts`

### Composables Tests (`tests/Composables/`)
- **Purpose**: Test Vue composables (Composition API)
- **Speed**: Fast
- **When to use**: Testing reactive state, computed properties
- **Example**: `tests/Composables/useCompany.spec.ts`

### Integration Tests (`tests/Integration/`)
- **Purpose**: Test multiple components/services working together
- **Speed**: Medium (5-10s per test)
- **When to use**: Testing service integrations, store interactions
- **Example**: To be added by team

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('MyFeature', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    // Cleanup after each test
  })

  it('should do something specific', () => {
    // Arrange
    const input = 'test'
    
    // Act
    const result = myFunction(input)
    
    // Assert
    expect(result).toBe('expected')
  })
})
```

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import MyComponent from '@/modules/components/MyComponent.vue'

describe('MyComponent', () => {
  it('should render with props', () => {
    const wrapper = mountWithProviders(MyComponent, {
      props: {
        title: 'Test Title'
      }
    })

    expect(wrapper.text()).toContain('Test Title')
  })

  it('should emit events on click', async () => {
    const wrapper = mountWithProviders(MyComponent, {
      props: { title: 'Test' }
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

### Using Test Helpers

```typescript
import { mountWithProviders } from '../Helpers/mountWithProviders'
import { createMockCompany } from '../Helpers/mockFactories'
import { createMockAxios } from '../Helpers/mockServices'
import { flushPromises } from '../Helpers/testUtils'

// Mount component with all providers
const wrapper = mountWithProviders(MyComponent)

// Create mock data
const company = createMockCompany({ name: 'Custom Name' })

// Mock services
const mockAxios = createMockAxios()

// Wait for async operations
await flushPromises()
```

## Test Helpers

### mountWithProviders
Mounts Vue components with all necessary providers (Router, Pinia, i18n).

```typescript
const wrapper = mountWithProviders(MyComponent, {
  props: { ... },
  global: {
    mocks: { ... },
    stubs: { ... }
  }
})
```

### Mock Factories
Create consistent test data with easy customization.

```typescript
import { 
  createMockCompany,
  createMockUser,
  createMockProgram 
} from '../Helpers/mockFactories'

const company = createMockCompany({ name: 'Custom Name' })
const user = createMockUser({ email: 'custom@email.com' })
```

### Mock Services
Mock external services for isolated testing.

```typescript
import { 
  createMockAxios,
  createMockApolloClient,
  createMockFirebase 
} from '../Helpers/mockServices'

const mockAxios = createMockAxios()
mockAxios.get.mockResolvedValue({ data: { ... } })
```

### Test Utils
Common utilities for async testing and waiting.

```typescript
import { 
  flushPromises,
  wait,
  waitFor 
} from '../Helpers/testUtils'

await flushPromises()           // Wait for all promises
await wait(100)                 // Wait 100ms
await waitFor(() => condition)  // Wait for condition
```

## Best Practices

### 1. Follow AAA Pattern
```typescript
it('should calculate total', () => {
  // Arrange - Setup test data
  const numbers = [1, 2, 3]
  
  // Act - Execute the function
  const result = sum(numbers)
  
  // Assert - Verify the result
  expect(result).toBe(6)
})
```

### 2. Use Descriptive Test Names
```typescript
// Good
it('should return empty string when input is null')
it('should emit click event when button is clicked')

// Bad
it('works')
it('test1')
```

### 3. Test One Thing Per Test
```typescript
// Good
it('should format date correctly', () => { ... })
it('should handle null date', () => { ... })

// Bad
it('should format dates and handle errors and validate input', () => { ... })
```

### 4. Mock External Dependencies
```typescript
import { vi } from 'vitest'

// Mock API calls
vi.mock('@/services/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: [] })
}))

// Mock router
const mockRouter = {
  push: vi.fn()
}
```

### 5. Clean Up After Tests
```typescript
import { vi, afterEach } from 'vitest'

afterEach(() => {
  vi.clearAllMocks()    // Clear mock call history
  vi.restoreAllMocks()  // Restore original implementations
})
```

### 6. Test Edge Cases
- Empty inputs
- Null/undefined values
- Boundary conditions
- Error cases
- Loading states

## Running Tests in CI/CD

Tests run automatically in Azure DevOps:

- **Pull Requests**: Unit + Component tests (fast feedback)
- **Develop Branch**: + Integration tests + Coverage
- **Staging Branch**: + E2E Smoke tests
- **Master Branch**: + Full E2E suite

See `azure-pipelines.yml` for full pipeline configuration.

## Coverage

Coverage thresholds are enforced:
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

View coverage report:
```bash
npm run test:ci
# Open coverage/index.html in browser
```

## Troubleshooting

### Tests not finding modules
Make sure path aliases are correct in `vitest.config.ts`:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src')
  }
}
```

### Component tests failing
Ensure Vue plugin is configured:
```typescript
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()]
})
```

### Mocks not working
- Use `vi.mock()` before imports
- Clear mocks in `afterEach`
- Check mock implementation

### Tests timing out
- Increase timeout in test:
  ```typescript
  it('slow test', async () => { ... }, { timeout: 10000 })
  ```
- Or in vitest config:
  ```typescript
  test: {
    testTimeout: 10000
  }
  ```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Strategy Guide](../docs/context/testing-strategy.md)
- [Implementation Checklist](../docs/context/testing-implementation-checklist.md)

## Contributing

When adding new tests:
1. Follow existing patterns and structure
2. Use appropriate test type (unit/component/integration)
3. Leverage test helpers for consistency
4. Write descriptive test names
5. Add documentation for complex test setups

## Questions?

For questions about testing strategy or implementation, refer to:
- [Testing Strategy Documentation](../docs/context/testing-strategy.md)
- Contact the development team
- Create an issue in Azure DevOps

