# Testing Module Initialization Issue - Solution

## Problem
The barrel export in `src/utils/index.ts` was causing module initialization errors during testing. When any util was imported, it would load `PaymentTermsStrategiesUtils` which tried to access `ColorsUtils.gray[400]` at class definition time, before any mocks could be applied.

## Root Cause
```typescript
// src/modules/paymentTermsAndTermsStrategies/utils/index.ts
export default class PaymentTermsStrategiesUtils {
  static readonly STRATEGY_COLOR_DEFAULT: string = ColorsUtils.gray[400];
  // ^^^ This initialization happens at module load time!
}
```

When this is loaded via the barrel export `src/utils/index.ts`, it executes before Vitest mocks can be applied, causing `Cannot read properties of undefined (reading 'gray')` errors.

## Solution Implemented

### 1. For DateUtils
Changed the import to avoid the barrel file:
```typescript
// Before: import { StringUtils } from "@/utils";
// After:
import StringUtils from "./StringUtils"; // Direct import to avoid barrel file issues in tests
```

### 2. For DateUtils Tests
Added a mock for the barrel export in the test file:
```typescript
// Mock the barrel export to prevent loading PaymentTermsStrategiesUtils
vi.mock('@/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils/DateUtils')>('@/utils/DateUtils')
  return {
    DateUtils: actual.default
  }
})
```

### 3. For StringUtils Tests
Since StringUtils needs `isNullOrUndefined` from the barrel, we mock just that function:
```typescript
// Mock isNullOrUndefined to prevent loading the barrel export
vi.mock('@/utils', () => ({
  isNullOrUndefined: (value: any) => value === null || value === undefined
}))
```

## Best Practices for Future Tests

1. **Prefer Direct Imports**: Import directly from the file instead of from barrel exports when possible
2. **Mock at Test File Level**: Use `vi.mock()` at the top of test files (before imports) for problematic modules
3. **Avoid Initialization-Time Dependencies**: Don't initialize static class properties with values from other modules
4. **Consider Lazy Initialization**: Use getters or methods instead of static readonly properties when dependencies are involved

## Example Template for New Tests

```typescript
import { describe, it, expect, vi } from 'vitest'

// Mock any problematic barrel exports BEFORE other imports
vi.mock('@/utils', () => ({
  // Only mock what's needed
  someFunction: vi.fn()
}))

// Now import the module under test
import MyUtils from '@/utils/MyUtils'

describe('MyUtils', () => {
  // tests here
})
```

## Files Modified
- `src/utils/DateUtils.ts` - Changed import to direct file reference
- `tests/Unit/Utils/DateUtils.spec.ts` - Added barrel mock
- `tests/Unit/Utils/StringUtils.spec.ts` - Added barrel mock
- `tests/setup.ts` - Cleaned up (removed ineffective ColorsUtils mock)

## Result
✅ All 132 unit tests passing
✅ No module initialization errors
✅ Tests run fast and isolated

