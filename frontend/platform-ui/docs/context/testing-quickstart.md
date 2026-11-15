# Testing Quick Start Guide

## 🚀 Getting Started (5 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

This will install all the new testing dependencies:
- vitest
- @vue/test-utils
- @vitest/ui
- jsdom
- @pinia/testing
- @vitest/coverage-v8
- And more...

### Step 2: Run Your First Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run with visual UI
npm run test:ui
```

You should see **90+ tests pass** ✅

### Step 3: Explore the Test Files

Look at these example tests to understand the patterns:

1. **Unit Test Example**: `tests/Unit/Utils/DateUtils.spec.ts`
   - Pure function testing
   - Edge case coverage
   - Fast execution

2. **Component Test Example**: `tests/Component/ButtonCustom.spec.ts`
   - Vue component testing
   - Event handling
   - Props validation

3. **Composable Test Example**: `tests/Composables/useCompany.spec.ts`
   - Composition API testing
   - Reactive state
   - Pinia integration

## 📝 Writing Your First Test

### Unit Test (Easiest to Start With)

Create `tests/Unit/Utils/MyUtils.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import MyUtils from '@/utils/MyUtils'

describe('MyUtils', () => {
  describe('myFunction', () => {
    it('should return expected result', () => {
      // Arrange
      const input = 'test'
      
      // Act
      const result = MyUtils.myFunction(input)
      
      // Assert
      expect(result).toBe('TEST')
    })
  })
})
```

Run it:
```bash
npm run test:unit -- MyUtils
```

### Component Test

Create `tests/Component/MyComponent.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import MyComponent from '@/modules/components/MyComponent.vue'

describe('MyComponent', () => {
  it('should render correctly', () => {
    const wrapper = mountWithProviders(MyComponent, {
      props: {
        title: 'Test Title'
      }
    })

    expect(wrapper.text()).toContain('Test Title')
  })
})
```

Run it:
```bash
npm run test:component -- MyComponent
```

## 🛠️ Common Commands

```bash
# Development (watch mode)
npm run test:watch

# Run specific test file
npm test -- DateUtils

# Run with coverage
npm run test:ci

# Open interactive UI
npm run test:ui

# Run only changed tests (in watch mode)
npm run test:watch
```

## 🎯 What Tests to Write

### Priority 1: Unit Tests ⚡
- Utility functions (DateUtils, StringUtils, etc.)
- Validators
- Helper functions
- **Why**: Fast, easy to write, high confidence

### Priority 2: Component Tests 🎨
- Form components
- Interactive buttons/controls
- Display components with logic
- **Why**: Catch UI bugs early, faster than E2E

### Priority 3: Composables Tests 🔧
- Business logic composables
- State management
- Computed properties
- **Why**: Test reactive behavior in isolation

### Priority 4: Integration Tests 🔗
- Service + Store interactions
- Multi-component workflows
- **Why**: Test real integrations without E2E overhead

## 📚 Using Test Helpers

### Mount Components with All Providers

```typescript
import { mountWithProviders } from '../Helpers/mountWithProviders'

const wrapper = mountWithProviders(MyComponent, {
  props: { title: 'Test' },
  global: {
    mocks: {
      $t: (key) => key // Mock i18n
    }
  }
})
```

### Create Mock Data

```typescript
import { 
  createMockCompany,
  createMockUser 
} from '../Helpers/mockFactories'

const company = createMockCompany({ 
  name: 'Custom Company' 
})

const user = createMockUser({ 
  email: 'test@example.com' 
})
```

### Mock Services

```typescript
import { createMockAxios } from '../Helpers/mockServices'

const mockAxios = createMockAxios()
mockAxios.get.mockResolvedValue({ 
  data: { result: 'success' } 
})
```

### Wait for Async Operations

```typescript
import { flushPromises } from '../Helpers/testUtils'

await wrapper.find('button').trigger('click')
await flushPromises() // Wait for all promises
expect(wrapper.text()).toContain('Updated')
```

## 🐛 Troubleshooting

### "Cannot find module '@/...'"
✅ **Fixed**: Path aliases are configured in `vitest.config.ts`

### Tests timing out
```typescript
// Increase timeout for slow test
it('slow test', async () => {
  // ...
}, { timeout: 10000 })
```

### Mocks not working
```typescript
import { vi, afterEach } from 'vitest'

// Clear mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})
```

### Component not rendering
Make sure you're using `mountWithProviders` instead of plain `mount`:
```typescript
// ❌ Don't do this
import { mount } from '@vue/test-utils'
const wrapper = mount(MyComponent)

// ✅ Do this
import { mountWithProviders } from '../Helpers/mountWithProviders'
const wrapper = mountWithProviders(MyComponent)
```

## 📖 Documentation

- **Quick Reference**: `tests/README.md`
- **Comprehensive Guide**: `docs/context/testing-strategy.md`
- **Implementation Details**: `docs/context/testing-implementation-summary.md`

## 🎓 Learn by Example

Check out these well-tested files:
- `tests/Unit/Utils/DateUtils.spec.ts` - 40+ unit tests
- `tests/Unit/Utils/StringUtils.spec.ts` - 30+ unit tests
- `tests/Unit/Utils/NumberUtils.spec.ts` - 20+ unit tests

## ✅ CI/CD Pipeline

Tests run automatically in Azure DevOps:

- **On PR**: Unit + Component tests (2-5 min)
- **On Develop**: + Integration + Coverage (10 min)
- **On Staging**: + E2E Smoke tests (20 min)
- **On Master**: + Full E2E suite (60 min)

See `azure-pipelines.yml` for details.

## 🎯 Coverage Goals

Current thresholds (enforced):
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

Check coverage:
```bash
npm run test:ci
# Open coverage/index.html
```

## 💡 Tips for Success

1. **Write tests as you code** - Don't wait until the end
2. **Test behavior, not implementation** - Focus on what, not how
3. **Keep tests simple** - One thing per test
4. **Use descriptive names** - "should do X when Y"
5. **Mock external dependencies** - Keep tests isolated
6. **Run tests in watch mode** - Fast feedback loop

## 🚦 Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Run tests to verify setup (`npm test`)
3. 📝 Write your first test (use examples above)
4. 🔄 Run in watch mode (`npm run test:watch`)
5. 📚 Read full documentation (`docs/context/testing-strategy.md`)

## 🤝 Need Help?

- Read `tests/README.md` for detailed examples
- Check `docs/context/testing-strategy.md` for strategy
- Look at existing tests for patterns
- Ask the team!

---

**Happy Testing!** 🎉

Remember: Good tests = Confident code = Better product

