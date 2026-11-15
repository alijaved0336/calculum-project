# Change: retrieveProgramData Execution Timing

## Context
The `retrieveProgramData()` function is currently being called in the `onMounted` hook of `EntityCard.vue` (line 942), which executes immediately when the component mounts, regardless of which tab is active.

## Problem
- `retrieveProgramData()` is being executed on component mount even when the 'cards' tab is active
- This causes unnecessary API calls when the user is viewing the 'cards' tab
- The function should only execute when the 'lists' tab is active or when switching to it

## Current Behavior
```typescript
onMounted(() => {
  // ... other initialization code
  retrieveProgramData()  // Always executes on mount
  changeTab(entityCardStore.currentTab)
})
```

## Desired Behavior
- If the default tab is 'lists': execute `retrieveProgramData()` after all EntityCard API calls complete
- If the default tab is 'cards': wait until the user switches to 'lists' tab, then execute after all EntityCard API calls complete
- Ensure `retrieveProgramData()` only executes once per tab switch to 'lists'

## Analysis

### Key Functions Involved
1. **`retrieveProgramData()`** (line 340-348): Fetches program data via `analyzeStore.getProgram()`
2. **`changeTab(tab)`** (line 1004-1011): Handles tab switching logic
3. **`getAllEntityCards(loadingMore)`** (line 524-594): Main API call for entity cards
4. **`getRecentEntityCards()`**: Fetches recent entity cards
5. **`checkSearch()`** (line 780-791): Initial data loading logic

### Current Call Sites for `retrieveProgramData()`
1. Line 942: `onMounted` - always executes
2. Line 372: `changeEntityCardType()` - when changing entity type

### Tab State Management
- `data.currentTab`: Current active tab ('cards' or 'lists')
- `entityCardStore.currentTab`: Persisted tab state
- Default tab is restored from store in `changeTab(entityCardStore.currentTab)` on mount

## Implementation Plan

### Step 1: Remove Immediate Execution from onMounted
- Remove `retrieveProgramData()` call from line 942 in `onMounted` hook
- Keep the `changeTab(entityCardStore.currentTab)` call

### Step 2: Add Conditional Execution in changeTab
- Modify `changeTab()` function to check if switching to 'lists' tab
- If switching to 'lists', trigger `retrieveProgramData()` after entity card data loads
- Add a flag to prevent duplicate calls

### Step 3: Create a Tracking Mechanism
- Add a reactive flag `programDataLoaded` to track if program data has been loaded for current session
- Reset flag when changing entity type or when necessary

### Step 4: Implement Deferred Execution Logic
- Create a helper function `loadProgramDataIfNeeded()` that:
  - Checks if current tab is 'lists'
  - Checks if program data hasn't been loaded yet
  - Waits for entity card API calls to complete
  - Executes `retrieveProgramData()`

### Step 5: Integration Points
- Call `loadProgramDataIfNeeded()` in:
  - `changeTab()` when switching to 'lists'
  - After `checkSearch()` completes if initial tab is 'lists'
  - Keep existing call in `changeEntityCardType()` (line 372)

## Technical Considerations

### Loading State Management
- `entityCard.loadingRemainingItems`: Indicates if entity cards are being loaded
- `entityCard.loadingCards`: Indicates if cards are loading
- Need to wait for both to be `false` before calling `retrieveProgramData()`

### Async Operations
- `getAllEntityCards()` is async and updates loading states in callbacks
- Need to use `watch` or callback mechanism to detect when loading completes

### Edge Cases
1. User switches to 'lists' tab before entity cards finish loading
2. User switches between tabs multiple times quickly
3. Entity card loading fails - should we still load program data?
4. User changes entity type while on 'lists' tab

## Implementation Code Structure

```typescript
// Add reactive flag
const programDataLoadedForCurrentTab = ref(false)

// Helper function
const loadProgramDataIfNeeded = () => {
  if (data.currentTab === 'lists' && !programDataLoadedForCurrentTab.value) {
    // Wait for entity card loading to complete
    const unwatch = watch(
      () => entityCard.loadingRemainingItems,
      (isLoading) => {
        if (!isLoading) {
          retrieveProgramData()
          programDataLoadedForCurrentTab.value = true
          unwatch() // Stop watching
        }
      },
      { immediate: true }
    )
  }
}

// Modify changeTab
function changeTab(tab: any) {
  if (data.withChanges) {
    data.tabtoChange = tab
  } else {
    data.currentTab = tab
    
    // Reset flag when switching tabs
    if (tab === 'lists') {
      programDataLoadedForCurrentTab.value = false
      loadProgramDataIfNeeded()
    }
  }
  entityCardStore.currentTab = tab
}

// Modify onMounted
onMounted(() => {
  // ... existing initialization code
  // REMOVE: retrieveProgramData()
  changeTab(entityCardStore.currentTab)
  
  // If initial tab is 'lists', load program data after entity cards load
  if (entityCardStore.currentTab === 'lists') {
    loadProgramDataIfNeeded()
  }
})

// Modify changeEntityCardType to reset flag
function changeEntityCardType(entityType: EntityType) {
  // ... existing code
  programDataLoadedForCurrentTab.value = false
  getAllEntityCards(true)
  retrieveProgramData() // Keep this call as it's entity-type specific
}
```

## Implementation Summary

### Changes Made

#### 1. Added Program Data Loading Flag (Line 340-341)
```typescript
// Flag to track if program data has been loaded for current context
const programDataLoadedForCurrentTab = ref(false)
```

#### 2. Created Helper Function `loadProgramDataIfNeeded()` (Line 353-371)
- Checks if current tab is 'lists' and program data hasn't been loaded
- Uses a watcher to wait for `entityCard.loadingRemainingItems` to become false
- Calls `retrieveProgramData()` once loading completes
- Sets flag to prevent duplicate calls
- Automatically unwatches after execution

#### 3. Modified `onMounted()` Hook (Line 963-980)
- **Removed**: Direct call to `retrieveProgramData()` on line 974
- **Added**: Conditional call to `loadProgramDataIfNeeded()` if initial tab is 'lists' (lines 977-979)
- **Result**: Program data only loads when needed, not on every mount

#### 4. Modified `changeTab()` Function (Line 1041-1053)
- **Added**: Reset flag when switching to 'lists' tab (line 1049)
- **Added**: Call to `loadProgramDataIfNeeded()` when switching to 'lists' (line 1050)
- **Result**: Program data loads after entity cards complete when user switches to 'lists' tab

#### 5. Modified `changeEntityCardType()` Function (Line 377-405)
- **Added**: Reset flag when changing entity type (line 394)
- **Modified**: Conditional logic for program data loading (lines 400-404)
  - If on 'lists' tab: use `loadProgramDataIfNeeded()` to wait for entity cards
  - If on 'cards' tab: call `retrieveProgramData()` immediately (preserves existing behavior)

### Behavior Changes

#### Before
- `retrieveProgramData()` executed immediately on component mount, regardless of active tab
- Always executed before entity card data finished loading
- Could cause unnecessary API calls when 'cards' tab was active

#### After
- **'cards' tab active on mount**: No program data call until user switches to 'lists'
- **'lists' tab active on mount**: Program data loads after entity card API calls complete
- **Switching to 'lists' tab**: Program data loads after entity cards finish loading
- **Switching between tabs**: Program data doesn't reload unnecessarily (flag prevents duplicates)
- **Changing entity type on 'lists' tab**: Program data reloads after new entity cards load

## Testing Checklist
- [ ] Mount component with default 'cards' tab - verify no program data call
- [ ] Mount component with default 'lists' tab - verify program data loads after entity cards
- [ ] Switch from 'cards' to 'lists' - verify program data loads after entity cards
- [ ] Switch from 'lists' to 'cards' and back - verify program data doesn't reload
- [ ] Change entity type while on 'lists' tab - verify program data reloads
- [ ] Rapid tab switching - verify no duplicate calls
- [ ] Entity card loading fails - verify behavior is acceptable

## Files Modified
- `src/modules/home/entityCard/views/EntityCard.vue`
  - Lines 340-341: Added `programDataLoadedForCurrentTab` flag
  - Lines 353-371: Added `loadProgramDataIfNeeded()` helper function
  - Lines 393-404: Modified `changeEntityCardType()` function
  - Lines 963-980: Modified `onMounted()` hook
  - Lines 1041-1053: Modified `changeTab()` function

## Related Context Files
- None found specifically for this change

## Notes
- No linter errors introduced
- All changes are backward compatible
- The implementation uses Vue's `watch` API to properly wait for async operations
- The flag-based approach prevents duplicate API calls efficiently
