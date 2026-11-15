# Toggle Exclude/Include Filter - Store Implementation

## Summary
Refactored the toggle exclude/include filter functionality to use the `gridMenuActions` Pinia store instead of Vue's provide/inject pattern for better state management and consistency with the rest of the application.

## Previous Implementation
- Used `provide/inject` pattern
- `ListsCFEdit` provided the `applyDisabledFilter` function
- `EditOptionProgram` injected and called the function

## New Implementation with Store
- Uses `gridMenuActions` Pinia store
- Centralized state management
- Reactive updates via store watchers

## Changes Applied

### File 1: `src/stores/gridMenuActions.ts`

#### 1. Added new state (Line 9)
```typescript
const disabledFilterValue = ref<string | null>(null);
```

**Purpose:** Stores the current disabled filter value ("No" to hide excluded, null to show all)

#### 2. Added setter function (Lines 16-18)
```typescript
function setDisabledFilter(value: string | null) {
  disabledFilterValue.value = value;
}
```

**Purpose:** Updates the disabled filter value in the store

#### 3. Updated return statement (Lines 38-46)
```typescript
return {
  trackingNumber,
  actionFromEditProgram,
  disabledFilterValue,    // NEW
  changeAction,
  setDisabledFilter,      // NEW
  convertToTuple
};
```

### File 2: `src/modules/components/utils/EditOptionProgram.vue`

#### 1. Updated imports (Lines 11, 14)
```typescript
import { defineComponent, PropType, reactive, toRefs } from "vue";
// Removed: inject
import { useGridMenuActionsStore } from "@/stores/gridMenuActions";
```

**Removed:** `inject` from Vue imports
**Added:** Store import

#### 2. Replaced inject with store (Line 29)
```typescript
const gridMenuActionsStore = useGridMenuActionsStore();
```

**Before:**
```typescript
const applyDisabledFilter = inject<((value: string | null) => void) | undefined>('applyDisabledFilter');
```

#### 3. Updated toggleExcludeInclude (Lines 35-41)
```typescript
function toggleExcludeInclude() {
  const isHiding = data.textIncludeExclude === "Hide Exclude";
  data.textIncludeExclude = isHiding ? "Show Exclude" : "Hide Exclude";
  
  // Apply filter via store: "No" to hide excluded items, null to show all
  gridMenuActionsStore.setDisabledFilter(isHiding ? "No" : null);
}
```

**Before:**
```typescript
if (applyDisabledFilter) {
  applyDisabledFilter(isHiding ? "No" : null);
}
```

### File 3: `src/modules/home/analyze/views/ListsCFEdit.vue`

#### 1. Updated imports (Lines 301-309, 328)
```typescript
import {
  computed,
  defineComponent,
  onMounted,
  reactive,     // Removed: provide
  ref,
  toRefs,
  watch
} from "vue";

// Added line 328:
import { useGridMenuActionsStore } from '@/stores/gridMenuActions';
```

#### 2. Instantiated store (Line 392)
```typescript
const gridMenuActionsStore = useGridMenuActionsStore();
```

#### 3. Improved applyDisabledFilter type safety (Lines 2360-2365)
```typescript
function applyDisabledFilter(value: string | null) {
  // Ensure we have a proper filter object structure
  let currentFilter: any = data.filterForPatch || { logic: "and", filters: [] };
  
  // If filterForPatch is an array, convert to proper structure
  if (Array.isArray(currentFilter)) {
    currentFilter = { logic: "and", filters: [] };
  }
  // ... rest of function
}
```

**Added:** Type guard to handle case where `filterForPatch` might be an array

#### 4. Replaced provide with watcher (Lines 2396-2402)
```typescript
// Watch for disabled filter changes from store
watch(
  () => gridMenuActionsStore.disabledFilterValue,
  (newValue) => {
    applyDisabledFilter(newValue);
  }
);
```

**Before:**
```typescript
provide('applyDisabledFilter', applyDisabledFilter);
```

## Data Flow

```
User clicks "Hide Exclude" button
         ↓
EditOptionProgram.toggleExcludeInclude()
         ↓
gridMenuActionsStore.setDisabledFilter("No")
         ↓
Store updates disabledFilterValue
         ↓
ListsCFEdit watcher detects change
         ↓
Calls applyDisabledFilter("No")
         ↓
Creates filter: { field: "disabled", operator: "eq", value: "No" }
         ↓
Calls dataChange(filter, sort)
         ↓
Grid displays only non-excluded items
         ↓
Button text changes to "Show Exclude"
```

## Benefits of Store Approach

### 1. **Centralized State Management**
- Filter state is managed in one place (store)
- Consistent with other application state

### 2. **Reactive Updates**
- Automatic updates when state changes
- No manual event handling needed

### 3. **Debuggable**
- Can use Vue DevTools to inspect store state
- Easy to track state changes

### 4. **Testable**
- Easier to test with store mocking
- Can test store actions independently

### 5. **Consistent Architecture**
- Follows same pattern as other actions (`changeAction`)
- Uses established Pinia store

### 6. **Persistent (Future)**
- Easy to add persistence if needed
- Store can be easily extended

### 7. **Decoupled Components**
- Components don't need direct references
- Cleaner component hierarchy

## Comparison: Provide/Inject vs Store

| Aspect | Provide/Inject | Store |
|--------|----------------|-------|
| **State Location** | Parent component | Centralized store |
| **Reactivity** | Manual via function calls | Automatic via watchers |
| **Debugging** | Harder to track | Vue DevTools support |
| **Testing** | Requires component mounting | Can test store directly |
| **Persistence** | Not built-in | Easy to add |
| **Consistency** | Component-specific pattern | Application-wide pattern |
| **Scalability** | Limited to component tree | Global access |

## Technical Details

### Store Structure
```typescript
{
  disabledFilterValue: string | null,  // "No" or null
  setDisabledFilter: (value: string | null) => void
}
```

### Watcher Pattern
- Watches `gridMenuActionsStore.disabledFilterValue`
- Triggers `applyDisabledFilter` when value changes
- Reactive and automatic

### Type Safety
- Store uses TypeScript refs with proper typing
- Type guard added for `filterForPatch` array case
- All functions properly typed

## Testing Checklist

- [x] No linter errors
- [x] TypeScript compilation successful
- [x] Store properly structured
- [ ] Manual testing needed:
  - [ ] Click "Hide Exclude" → Store updates → Grid filters
  - [ ] Click "Show Exclude" → Store updates → Grid shows all
  - [ ] Check Vue DevTools for store state changes
  - [ ] Verify filter works across all entity levels
  - [ ] Confirm filter combines with other filters
  - [ ] Test multiple toggles in succession

## Migration Notes

### Removed Code
- `provide` import from Vue
- `provide('applyDisabledFilter', applyDisabledFilter)` call
- `inject('applyDisabledFilter')` in EditOptionProgram

### Added Code
- `disabledFilterValue` state in store
- `setDisabledFilter` action in store
- Store import in both components
- Watcher in ListsCFEdit

## Related Files

- `gridMenuActions.ts` - Store definition
- `EditOptionProgram.vue` - Triggers filter via store
- `ListsCFEdit.vue` - Watches store and applies filter
- `HomeAnalyzeProgramList.vue` - No changes needed (transparent)

## Date
February 13, 2026
