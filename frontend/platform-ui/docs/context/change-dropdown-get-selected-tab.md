# CalculumDropdownEditProgramOption - Get Selected Tab

## Summary
Added access to the selected entity level tab from `ListsCFEdit` in the `CalculumDropdownEditProgramOption` component by importing and using the `homeStore`.

## Problem
The `CalculumDropdownEditProgramOption` component needed to know which tab is currently selected in `ListsCFEdit` (Spend Lines, Suppliers, or Ultimate Parents) to potentially customize dropdown options or pass this information to child action components.

## Solution
Import `useHomeStore` and access the `getEntityLevelTabSelected` computed property from the store.

## Changes Applied

### File: `src/modules/components/utils/CalculumDropdownEditProgramOption.vue`

#### 1. Added Import (Line 24)
```typescript
import { useHomeStore } from "@/stores/home";
```

**Purpose:** Import the home store to access entity level tab state

#### 2. Instantiated Store (Line 61)
```typescript
const homeStore = useHomeStore();
```

**Purpose:** Get instance of home store in setup function

#### 3. Created Computed Property (Lines 73-74)
```typescript
// Get selected tab from store
const entityLevelTabSelected = computed(() => homeStore.getEntityLevelTabSelected)
```

**Purpose:** Create reactive computed property that returns the selected tab

#### 4. Updated Return Statement (Lines 128-139)
```typescript
return {
  ...toRefs(data),
  toggleDropdownFn,
  toggleDropdown,
  callStoreMenuAction,
  dropdownContainer,
  groupsFinan,
  isHarmonization,
  isFinancing,
  hasVcard,
  entityLevelTabSelected  // NEW
};
```

**Purpose:** Expose `entityLevelTabSelected` to template and child components

## Entity Level Constants

From `@/utils`:
```typescript
export const ENTITY_LEVEL = {
  SPEND_LINES: 0,
  SUPPLIERS: 1,
  ULTIMATE_PARENT: 2
}
```

## Data Flow

```
User changes tab in ListsCFEdit
         ↓
changeTabFromGrid(indexTab) called
         ↓
homeStore.setEntityLevelTabSelected(indexTab)
         ↓
Store updates entityLevelTabSelected
         ↓
CalculumDropdownEditProgramOption detects change (computed)
         ↓
entityLevelTabSelected.value updated
         ↓
Can be used to filter/customize dropdown options
```

## Use Cases

Now that `entityLevelTabSelected` is available, it can be used for:

### 1. Conditional Rendering in Template
```pug
ManageTeamAction(
  v-if="option.keyId === 'manageTeam' && entityLevelTabSelected === 1"
  :option="option"
  @call-action="callStoreMenuAction"
)
```

### 2. Pass to Child Components
```pug
ManageTeamAction(
  v-if="option.keyId === 'manageTeam'"
  :option="option"
  :selectedTab="entityLevelTabSelected"
  @call-action="callStoreMenuAction"
)
```

### 3. Filter Options Dynamically
```typescript
const filteredOptions = computed(() => {
  return data.optionsDropdown.filter(option => {
    // Only show "Move to Team" for Suppliers tab
    if (option.keyId === 'manageTeam') {
      return entityLevelTabSelected.value === ENTITY_LEVEL.SUPPLIERS;
    }
    return true;
  });
});
```

### 4. Customize Dropdown Behavior
```typescript
function callStoreMenuAction(keyId: ActionFromEditProgram, isEmit: boolean, payload: any) {
  const newPayload = {
    ...payload,
    isEmit,
    entityLevel: entityLevelTabSelected.value  // Add entity level to payload
  };
  gridMenuActionsStore.changeAction(keyId, newPayload);
}
```

## Technical Details

### Computed Property
- **Type:** `ComputedRef<number>`
- **Values:** 0 (Spend Lines), 1 (Suppliers), 2 (Ultimate Parents)
- **Reactive:** Automatically updates when tab changes
- **Source:** `homeStore.getEntityLevelTabSelected`

### Store Connection
- **Store:** `useHomeStore()`
- **Getter:** `getEntityLevelTabSelected`
- **Setter:** `setEntityLevelTabSelected(value: number)`
- **Shared State:** Same store used by `ListsCFEdit`

### Reactivity
The computed property ensures that:
- Changes in the store are automatically reflected
- No manual subscription needed
- No memory leaks (computed handles cleanup)
- Type-safe access to the value

## Benefits

1. **Centralized State**: Single source of truth for selected tab
2. **Reactive Updates**: Automatic updates when tab changes
3. **Type Safe**: TypeScript ensures correct usage
4. **Decoupled**: Components don't need direct references
5. **Flexible**: Can be used for various customizations
6. **Consistent**: Uses same pattern as other components

## Example Usage

### Filter Options by Tab
```typescript
const visibleOptions = computed(() => {
  const tab = entityLevelTabSelected.value;
  
  return data.optionsDropdown.filter(option => {
    switch (option.keyId) {
      case 'manageTeam':
        return tab === ENTITY_LEVEL.SUPPLIERS;
      case 'moveBetween':
        return tab === ENTITY_LEVEL.SPEND_LINES;
      default:
        return true;
    }
  });
});
```

### Debug Current Tab
```typescript
watch(entityLevelTabSelected, (newTab) => {
  console.log('Tab changed to:', {
    0: 'Spend Lines',
    1: 'Suppliers',
    2: 'Ultimate Parents'
  }[newTab]);
});
```

## Testing Checklist

- [x] No linter errors
- [x] TypeScript compilation successful
- [x] Store imported correctly
- [x] Computed property created
- [x] Exposed in return statement
- [ ] Manual testing needed:
  - [ ] Switch to Spend Lines tab → `entityLevelTabSelected` = 0
  - [ ] Switch to Suppliers tab → `entityLevelTabSelected` = 1
  - [ ] Switch to Ultimate Parents tab → `entityLevelTabSelected` = 2
  - [ ] Value updates reactively
  - [ ] Can be used in template
  - [ ] Can be passed to child components

## Related Files

- `src/stores/home.ts` - Contains `getEntityLevelTabSelected` and `setEntityLevelTabSelected`
- `src/modules/home/analyze/views/ListsCFEdit.vue` - Sets the selected tab
- `src/utils/index.ts` - Contains `ENTITY_LEVEL` constants

## Date
February 13, 2026
