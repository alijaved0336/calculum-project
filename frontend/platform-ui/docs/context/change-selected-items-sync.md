# Selected Items Synchronization - HomeAnalyzeProgramList & ListsCFEdit

## Summary
Implemented bidirectional communication between `ListsCFEdit` (child) and `HomeAnalyzeProgramList` (parent) to synchronize selected items from the grid to the parent component, allowing `EditOptionProgram` to display and work with the selected records.

## Problem
The `selectedItems` variable in `HomeAnalyzeProgramList.vue` (line 72) was never populated with the records selected in the `ListsCFEdit` component. The selection was managed internally in `ListsCFEdit` but never communicated to the parent.

## Changes Applied

### File 1: `src/modules/home/analyze/views/ListsCFEdit.vue`

#### 1. Updated emits definition (Line 385)
```typescript
emits: ["show-harmonization-modal", "update:selectedItems"],
```

**Added:** `"update:selectedItems"` event to notify parent of selection changes

#### 2. Updated setup function signature (Line 386)
```typescript
setup(props, { emit }) {
```

**Added:** `{ emit }` destructuring to access emit function

#### 3. Updated selectAllRow function (Line 957)
```typescript
function selectAllRow(rowData: any, checked: boolean) {
  // ... existing selection logic ...
  data.selectedItems = checked ? data.selectedItems : [];
  emit('update:selectedItems', data.selectedItems); // NEW
}
```

**Added:** Emit event after updating selectedItems

#### 4. Updated selectRow function (Line 966)
```typescript
function selectRow(rowData: any) {
  data.allChecked = false;
  data.selectedItems = [];
  if (rowData.length > 0) {
    data.selectedItems = rowData;
  }
  emit('update:selectedItems', data.selectedItems); // NEW
}
```

**Added:** Emit event after updating selectedItems

#### 5. Added emits in all places where selectedItems is cleared

**Line 1062:** After harmonization operations
```typescript
data.selectedItems = [];
emit('update:selectedItems', data.selectedItems);
```

**Line 1243:** In pageChangeHandler (pagination changes)
```typescript
data.selectedItems = [];
emit('update:selectedItems', data.selectedItems);
```

**Line 1795:** In dataChange (filter/sort changes)
```typescript
data.selectedItems = [];
emit('update:selectedItems', data.selectedItems);
```

**Line 1847:** In resetSelected function
```typescript
data.selectedItems = [];
emit('update:selectedItems', data.selectedItems);
```

### File 2: `src/modules/home/analyze/views/HomeAnalyzeProgramList.vue`

#### 1. Fixed syntax error (Line 72)
```typescript
selectedSpendFileVersion: !isNullOrUndefined(user.value) && !isNullOrUndefined(user.value.activeSpendFileVersion) ? user.value.activeSpendFileVersion['@id'] : '',
selectedItems: []  // Added missing comma before this line
```

#### 2. Added event listener to ListsCFEdit (Line 13)
```pug
ListsCFEdit(
  v-if="showGrids"
  :keyLists="keyLists"
  :selectedProgramId="selectedProgramId" 
  :hasHarmonization="hasHarmonization" 
  :hasFinancing="hasFinancing"
  :programInrecalculation="programInrecalculation"  
  :isSelectable="Boolean(isSelectable)"
  @update:selectedItems="handleSelectedItemsUpdate"
)
```

**Added:** `@update:selectedItems="handleSelectedItemsUpdate"` event listener

#### 3. Created computed property for type safety (Lines 118-120)
```typescript
const selectedItemsComputed = computed(() => {
  return analyzeProgramList.selectedItems || []
})
```

**Purpose:** Ensures `EditOptionProgram` always receives an array (never undefined)

#### 4. Updated template to use computed (Line 4)
```pug
EditOptionProgram(:selected-items="selectedItemsComputed")
```

**Changed from:** `:selected-items="selectedItems"`
**Changed to:** `:selected-items="selectedItemsComputed"`

#### 5. Added handler function (Lines 194-196)
```typescript
function handleSelectedItemsUpdate(items: any[]) {
  analyzeProgramList.selectedItems = items;
}
```

**Purpose:** Receives selected items from child and updates parent state

#### 6. Updated return statement (Lines 198-206)
```typescript
return {
  ...toRefs(analyzeProgramList),
  hasFinancingComputed,
  hasHarmonizationComputed,
  selectedItemsComputed,        // NEW
  Routing,
  editModeComputed,
  handleSelectedItemsUpdate      // NEW
}
```

## Data Flow

```
User Action (Select/Deselect rows in grid)
  ↓
ListsCFEdit Component
  ↓
selectRow() or selectAllRow() called
  ↓
data.selectedItems updated internally
  ↓
emit('update:selectedItems', data.selectedItems)
  ↓
HomeAnalyzeProgramList Component
  ↓
@update:selectedItems event caught
  ↓
handleSelectedItemsUpdate(items) called
  ↓
analyzeProgramList.selectedItems = items
  ↓
selectedItemsComputed returns updated array
  ↓
EditOptionProgram receives updated :selected-items
  ↓
Displays: "Selected: X" (where X is the count)
```

## Event Emission Points

The `update:selectedItems` event is emitted in the following scenarios:

1. **User selects/deselects individual rows** → `selectRow()`
2. **User selects/deselects all rows** → `selectAllRow()`
3. **After harmonization operations complete** → Clears selection
4. **When pagination changes** → `pageChangeHandler()` - Clears selection
5. **When filters or sorting change** → `dataChange()` - Clears selection
6. **When user manually resets selection** → `resetSelected()`

## Technical Details

### Event Pattern
- Uses Vue 3 convention: `update:propertyName`
- Enables future v-model support if needed
- Clear, semantic event naming

### Type Safety
- `selectedItemsComputed` ensures EditOptionProgram always receives `any[]`
- Prevents TypeScript errors from optional properties
- Handles undefined/null gracefully with `|| []` fallback

### Performance
- Minimal overhead: only emits when selection actually changes
- No watchers needed
- Direct event emission is efficient

## Testing Checklist

- [x] No linter errors
- [x] TypeScript compilation successful
- [ ] Manual testing needed:
  - [ ] Select individual rows → Count updates in EditOptionProgram
  - [ ] Select all rows → Count shows total
  - [ ] Deselect rows → Count decreases
  - [ ] Change pagination → Selection clears, count shows 0
  - [ ] Apply filters → Selection clears, count shows 0
  - [ ] Switch entity level tabs → Selection behavior correct
  - [ ] Perform harmonization → Selection clears after operation
  - [ ] Perform target operations → Selection clears after operation

## Benefits

1. **Real-time sync**: Parent always knows what's selected
2. **Enables bulk operations**: EditOptionProgram can now implement bulk actions
3. **Better UX**: User sees selected count update immediately
4. **Maintainable**: Clear event flow, easy to debug
5. **Extensible**: Other components can now listen to selection changes

## Related Components

- `EditOptionProgram.vue` - Displays selected count and bulk action buttons
- `CalculumDropdownEditProgramOption.vue` - Provides bulk action dropdowns
- Menu action components (VCard, Financing, SetTarget, etc.) - Can now work with bulk selections

## Date
February 13, 2026
