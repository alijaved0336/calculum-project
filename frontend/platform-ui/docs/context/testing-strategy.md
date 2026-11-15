# Frontend Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the Calculum frontend application. The strategy implements a testing pyramid approach with multiple test types to ensure code quality while maintaining fast feedback loops in the CI/CD pipeline.

## Testing Philosophy

Our testing strategy follows these principles:

1. **Fast Feedback**: Unit and component tests run quickly on every PR
2. **Comprehensive Coverage**: Multiple test types cover different layers of the application
3. **Efficient CI/CD**: Tiered testing reduces unnecessary long test runs
4. **Maintainability**: Tests are well-organized and easy to understand

## Test Types

### 1. Unit Tests (`tests/Unit/`)

**Purpose**: Test pure functions and utility classes in isolation

**Location**: `tests/Unit/`

**When to Use**:
- Testing utility functions (DateUtils, StringUtils, NumberUtils, etc.)
- Testing validation functions
- Testing pure business logic
- Testing helper functions

**Characteristics**:
- Very fast execution (< 1 second per test)
- No external dependencies
- High coverage of edge cases
- Easy to debug

**Example**:
```typescript
// tests/Unit/Utils/DateUtils.spec.ts
import { describe, it, expect } from 'vitest'
import DateUtils from '@/utils/DateUtils'

describe('DateUtils', () => {
  describe('addDays', () => {
    it('should add days to a date string', () => {
      const result = DateUtils.addDays('2024-01-15', 5)
      expect(result.getDate()).toBe(20)
    })
  })
})
```

**Run Command**: `npm run test:unit`

### 2. Component Tests (`tests/Component/`)

**Purpose**: Test Vue components in isolation with mocked dependencies

**Location**: `tests/Component/`

**When to Use**:
- Testing component rendering
- Testing component props and events
- Testing component state management
- Testing user interactions

**Characteristics**:
- Fast execution (< 5 seconds per test)
- External dependencies mocked (API, stores, router)
- Focus on component behavior
- Use Vue Test Utils

**Example**:
```typescript
// tests/Component/ButtonCustom.spec.ts
import { describe, it, expect } from 'vitest'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import ButtonCustom from '@/modules/components/ButtonCustom.vue'

describe('ButtonCustom', () => {
  it('should emit click event when clicked', async () => {
    const wrapper = mountWithProviders(ButtonCustom, {
      props: { label: 'Test' }
    })
    
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

**Run Command**: `npm run test:component`

### 3. Composables Tests (`tests/Composables/`)

**Purpose**: Test Vue composables (composition API)

**Location**: `tests/Composables/`

**When to Use**:
- Testing composable functions
- Testing reactive state management
- Testing computed properties
- Testing composable side effects

**Characteristics**:
- Fast execution
- May require mocking other composables
- Test in isolation or with minimal dependencies

**Example**:
```typescript
// tests/Composables/useCompany.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCompany } from '@/composables/useCompany'

describe('useCompany', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should return company active ID', () => {
    const { companyActiveId } = useCompany()
    expect(companyActiveId.value).toBeDefined()
  })
})
```

**Run Command**: `npm run test:component` (runs with component tests)

### 4. Integration Tests (`tests/Integration/`)

**Purpose**: Test multiple components/services working together

**Location**: `tests/Integration/`

**When to Use**:
- Testing service integrations
- Testing store interactions with components
- Testing complex workflows
- Testing API service layers

**Characteristics**:
- Slower execution (5-10 seconds per test)
- Mock only external APIs
- Test real interactions between modules
- More comprehensive than unit tests

**Example**:
```typescript
// tests/Integration/Services/CompanyService.spec.ts
import { describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCompanyStore } from '@/stores/company'

describe('CompanyService Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should fetch and store company data', async () => {
    const store = useCompanyStore()
    await store.fetchCompanies()
    expect(store.companies.length).toBeGreaterThan(0)
  })
})
```

**Run Command**: `npm run test:integration`

### 5. E2E Tests (`e2e/tests/`)

**Purpose**: Test complete user flows in a real browser

**Location**: `e2e/tests/`

**When to Use**:
- Testing critical user paths
- Testing full application workflows
- Testing browser-specific behavior
- Testing real backend integration

**Characteristics**:
- Slow execution (30-60 minutes for full suite)
- Use real browser (Playwright)
- Test against real or staging environment
- High confidence but expensive

**Tags**:
- `@prq` - PR required tests (critical paths)
- `@smoke` - Smoke tests (quick validation)
- `@heavy` - Long-running tests (excluded from quick runs)

**Run Commands**:
- Full suite: `npm run env:test`
- PR tests: `npm run env:test-pr`
- Without heavy: `npm run env:test-partial`

## Test Helpers and Utilities

### Test Helpers (`tests/Helpers/`)

**mountWithProviders.ts**
- Mounts Vue components with all providers (Router, Pinia, i18n)
- Use for component tests
- Handles common setup automatically

**mockFactories.ts**
- Factory functions for creating test data
- Consistent mock data across tests
- Easy to customize with overrides

**mockServices.ts**
- Mock implementations of services
- Apollo Client mock
- Firebase mock
- Axios mock

**testUtils.ts**
- Common test utilities
- `flushPromises()` - Wait for promises to resolve
- `wait(ms)` - Wait for specific time
- `waitFor(condition)` - Wait for condition

### Test Fixtures (`tests/Fixtures/`)

Reusable test data for common entities:
- Company data
- User data
- Program data
- Entity data

## CI/CD Pipeline

### Azure DevOps Pipeline Stages

Our Azure DevOps pipeline implements a tiered testing approach:

#### 1. Fast Tests (All PRs)
**Runs on**: All pull requests
**Duration**: ~2-5 minutes
**Includes**:
- Unit tests
- Component tests
- Composables tests

**Purpose**: Provide fast feedback to developers

#### 2. Quality Checks (All PRs)
**Runs on**: All pull requests
**Duration**: ~1-2 minutes
**Includes**:
- ESLint

**Purpose**: Enforce code quality standards

#### 3. Integration Tests (Master Branch)
**Runs on**: Merge to master
**Duration**: ~5-10 minutes
**Includes**:
- Integration tests
- Store tests
- Service integration tests

**Purpose**: Validate component interactions

#### 4. Code Coverage (Master/Staging)
**Runs on**: Master and staging branches
**Duration**: ~5-10 minutes
**Includes**:
- All tests with coverage
- Coverage report generation

**Purpose**: Track code coverage metrics
**Thresholds**:
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

#### 5. E2E Smoke Tests (Staging)
**Runs on**: Staging branch
**Duration**: ~10-15 minutes
**Includes**:
- E2E tests tagged with `@prq`
- Critical user paths

**Purpose**: Validate critical paths before production

#### 6. Full E2E Tests (Production)
**Runs on**: Master branch (production deployments)
**Duration**: ~30-60 minutes
**Includes**:
- All E2E tests
- Complete regression suite

**Purpose**: Comprehensive validation before production

### Pipeline Diagram

```
┌─────────────────────────────────────────┐
│           Pull Request (PR)              │
│  ┌────────────┐      ┌──────────────┐  │
│  │ Fast Tests │      │ Lint Checks  │  │
│  │  (2-5 min) │      │  (1-2 min)   │  │
│  └────────────┘      └──────────────┘  │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│          Merge to Master                │
│  ┌────────────────┐  ┌────────────────┐ │
│  │Integration Tests│  │Code Coverage   │ │
│  │   (5-10 min)    │  │  (5-10 min)    │ │
│  └────────────────┘  └────────────────┘ │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│          Merge to Staging                │
│  ┌────────────────────────────────────┐ │
│  │    E2E Smoke Tests (@prq)          │ │
│  │         (10-15 min)                │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│       Deploy to Production (Master)      │
│  ┌────────────────────────────────────┐ │
│  │    Full E2E Test Suite             │ │
│  │        (30-60 min)                 │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Writing Tests

### Best Practices

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **One Assertion Per Test** (when possible)
3. **Descriptive Test Names**: Use "should" statements
4. **Mock External Dependencies**: Keep tests isolated
5. **Test Edge Cases**: Not just happy paths
6. **Keep Tests Simple**: Easy to understand and maintain

### Naming Conventions

```typescript
describe('ComponentName or FunctionName', () => {
  describe('methodName or feature', () => {
    it('should do something specific', () => {
      // Test implementation
    })
  })
})
```

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('MyComponent', () => {
  // Setup
  beforeEach(() => {
    // Runs before each test
  })

  afterEach(() => {
    // Runs after each test
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should render correctly', () => {
      // Arrange
      const wrapper = mountComponent()
      
      // Act
      // (if needed)
      
      // Assert
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('user interactions', () => {
    it('should handle click events', async () => {
      // Arrange
      const wrapper = mountComponent()
      
      // Act
      await wrapper.find('button').trigger('click')
      
      // Assert
      expect(wrapper.emitted('click')).toBeTruthy()
    })
  })
})
```

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run all tests in watch mode
npm run test:watch

# Run unit tests only
npm run test:unit

# Run component tests only
npm run test:component

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:ci

# Open Vitest UI
npm run test:ui

# Run E2E tests
npm run e2e:run
```

### CI/CD

Tests run automatically in Azure DevOps based on the branch and trigger:
- **PR to any branch**: Unit + Component + Lint
- **Merge to develop**: + Integration + Coverage
- **Merge to staging**: + E2E Smoke Tests
- **Merge to master**: + Full E2E Suite

## Coverage Requirements

### Minimum Coverage Thresholds

- **Statements**: 70%
- **Branches**: 60%
- **Functions**: 70%
- **Lines**: 70%

### Coverage Exclusions

- Type definition files (`*.d.ts`)
- Configuration files (`*.config.ts`)
- Test files
- E2E tests
- Mock data
- Main entry point (`main.ts`)

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:ci

# Coverage reports are generated in:
# - coverage/index.html (HTML report)
# - coverage/coverage-final.json (JSON report)
# - coverage/lcov.info (LCOV format)
```

## Troubleshooting

### Common Issues

**Issue**: Tests failing with "Cannot find module '@/...'"
**Solution**: Check that path aliases are configured in `vitest.config.ts`

**Issue**: Component tests failing with "Vue is not defined"
**Solution**: Ensure `@vitejs/plugin-vue` is installed and configured

**Issue**: Tests timing out
**Solution**: Increase timeout in test or vitest config

**Issue**: Mocks not working
**Solution**: Use `vi.mock()` before imports, clear mocks in `afterEach`

### Debug Mode

```bash
# Debug a specific test file
npx vitest run tests/Unit/Utils/DateUtils.spec.ts --reporter=verbose

# Run tests in UI mode for debugging
npm run test:ui
```

## Migration Guide

### Adding Tests to Existing Code

1. Start with unit tests for utility functions
2. Add component tests for Vue components
3. Add integration tests for complex workflows
4. E2E tests are already in place (Playwright)

### Converting from Jest to Vitest

Vitest is mostly compatible with Jest. Main differences:
- `import { vi } from 'vitest'` instead of `jest`
- Use `vi.fn()` instead of `jest.fn()`
- Use `vi.mock()` instead of `jest.mock()`

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils Documentation](https://test-utils.vuejs.org/)
- [Playwright Documentation](https://playwright.dev/)

### Internal Resources
- Test Helpers: `tests/Helpers/`
- Test Fixtures: `tests/Fixtures/`
- Example Tests: `tests/Unit/Utils/`

## Maintenance

### Regular Tasks

1. **Review Coverage Reports**: Weekly
2. **Update Test Fixtures**: As data models change
3. **Refactor Tests**: When code changes significantly
4. **Update Documentation**: When strategy changes

### Adding New Test Types

If you need to add new test types:
1. Create appropriate directory structure
2. Update `vitest.config.ts` if needed
3. Add npm scripts to `package.json`
4. Update Azure DevOps pipeline
5. Document in this file

## FAQ

**Q: Why Vitest instead of Jest?**
A: Vitest is faster, has better TypeScript support, and works seamlessly with Vite (even though we use webpack for builds).

**Q: Do I need to write tests for every file?**
A: Focus on business logic, utilities, and critical components. Not everything needs 100% coverage.

**Q: How long should tests take to run?**
A: Unit/Component tests should complete in 2-5 minutes. If longer, consider optimizing or splitting tests.

**Q: What should I mock in component tests?**
A: Mock external dependencies (API calls, stores, router) but test real component logic.

**Q: When should I write E2E tests vs component tests?**
A: Use component tests for most cases. Reserve E2E tests for critical user flows.

## Contact

For questions or issues with the testing strategy, please contact the development team or create an issue in Azure DevOps.

