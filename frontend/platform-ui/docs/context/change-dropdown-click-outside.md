# CalculumDropdownEditProgramOption - Click Outside to Close Implementation

## Summary
Implemented "click outside" functionality to automatically close open dropdowns when the user clicks anywhere outside the component.

## Changes Applied

### File: `src/modules/components/utils/CalculumDropdownEditProgramOption.vue`

#### 1. Template Changes (Line 2)
```pug
.dropdown-op-container(ref="dropdownContainer")
```

**Added:**
- Template ref `dropdownContainer` to the root element for DOM access

#### 2. Script Changes

**Imports (Line 21):**
```typescript
import { defineComponent, reactive, toRefs, computed, ref, onMounted, onBeforeUnmount } from "vue";
```

**Added imports:**
- `ref` - for creating template ref
- `onMounted` - lifecycle hook to add event listener
- `onBeforeUnmount` - lifecycle hook to clean up event listener

**Setup Function Changes (Lines 53, 92-105, 112):**

```typescript
// Line 53: Create ref for dropdown container
const dropdownContainer = ref<HTMLElement | null>(null);

// Lines 92-97: Handle click outside logic
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownContainer.value && !dropdownContainer.value.contains(event.target as Node)) {
    data.selectedOption = null;
  }
};

// Lines 99-101: Add event listener on mount
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

// Lines 103-105: Remove event listener on unmount
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Line 112: Return dropdownContainer ref
return {
  ...toRefs(data),
  toggleDropdownFn,
  toggleDropdown,
  callStoreMenuAction,
  dropdownContainer  // Added
};
```

## Technical Implementation

### How It Works

1. **Template Ref**: The `ref="dropdownContainer"` binds the root DOM element to `dropdownContainer.value`

2. **Click Detection**: 
   - `document.addEventListener('click', handleClickOutside)` listens to all clicks on the page
   - `handleClickOutside` checks if the click target is inside the dropdown using `contains()`
   - If click is outside, sets `data.selectedOption = null` to close the dropdown

3. **Lifecycle Management**:
   - `onMounted`: Adds the event listener when component is mounted
   - `onBeforeUnmount`: Removes the event listener to prevent memory leaks

### Why This Approach?

- ✅ **Simple and effective**: Single event listener handles all cases
- ✅ **Works with nested elements**: `contains()` checks entire component tree
- ✅ **No interference**: Internal clicks still work normally
- ✅ **Memory safe**: Properly cleans up on unmount
- ✅ **Performance**: Uses native DOM methods, no watchers needed

## User Experience Improvements

### Before
- User had to click the dropdown button again to close it
- Multiple dropdowns could appear open (visually confusing)
- No intuitive way to dismiss the dropdown

### After
- ✅ Click anywhere outside closes the dropdown automatically
- ✅ More intuitive UX matching standard dropdown behavior
- ✅ Cleaner interface - only one dropdown open at a time
- ✅ Internal clicks (selecting options) still work perfectly

## Testing Recommendations

1. **Click Outside**: Click anywhere outside the dropdown → should close
2. **Click Inside**: Click on dropdown items → should work normally
3. **Multiple Dropdowns**: Open one, then click outside → should close
4. **Nested Actions**: Click on action components inside → should work
5. **Memory Leaks**: Open/close component multiple times → no console errors

## Related Components

This pattern can be applied to other dropdown/popover components:
- `CalculumTreeSelect.vue`
- Other custom dropdown components
- Modal/popover components that need click-outside behavior

## Browser Compatibility

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Uses standard DOM APIs (`contains()`, `addEventListener`)
- ✅ TypeScript type safety with `MouseEvent` and `Node`

## Date
February 13, 2026
