# SCF Badge Display Logic - Final Implementation

## Context
The SCF badge in `EntityPaymentTermsStrategies.vue` component displays based on the `scfAccepted` field from the entity detail API.

**Note:** This implementation was simplified from the initial multi-source approach. The badge now only uses `scfAccepted` from `/api/entity-card/entity/{uuid}/detail`.

## Final Requirement
The badge should show only when `scfAccepted` is `true` in the entity details response from `/api/entity-card/entity/{uuid}/detail`. This is a new backend field that determines if SCF has been accepted.

## Solution

### Files to Modify
1. `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

### Changes Required

#### 1. Update `onSCF` computed property (line 3454-3462)

**Current logic:**
```typescript
const onSCF = computed(() => {
  console.log('onSCF', props.entityDetails?.onSCF, tabsDataTabSelected.value?.onSCF,selectedTabIndex.value,data.tabs[selectedTabIndex.value],data.tabsData[selectedTabIndex.value]);
  // If a specific spend tab is selected (not "All Spends"), use its onSCF value
  if (tabsDataTabSelected.value && selectedTabIndex.value > 0) {
    return tabsDataTabSelected.value.onSCF ?? null
  }
  // Otherwise, use the supplier-level onSCF from entityDetails
  return props.entityDetails?.onSCF ?? null
})
```

**New logic:**
```typescript
const onSCF = computed(() => {
  // If a specific spend tab is selected (not "All Spends")
  if (tabsDataTabSelected.value && selectedTabIndex.value > 0) {
    // First, check if tabsData has onSCF value
    if (tabsDataTabSelected.value.onSCF !== null && tabsDataTabSelected.value.onSCF !== undefined) {
      return tabsDataTabSelected.value.onSCF
    }
    
    // If not, search in listSpend for a matching spendUUID
    const selectedSpendUUID = tabsDataTabSelected.value.spendUUID
    if (selectedSpendUUID && data.listSpend && data.listSpend.length > 0) {
      const matchingSpend = data.listSpend.find(
        (spend: any) => spend.spendUUID === selectedSpendUUID
      )
      if (matchingSpend && matchingSpend.onSCF !== null && matchingSpend.onSCF !== undefined) {
        return matchingSpend.onSCF
      }
    }
    
    return null
  }
  
  // Otherwise, use the supplier-level onSCF from entityDetails
  return props.entityDetails?.onSCF ?? null
})
```

### Expected Behavior

After the change:
1. When "All Spends" tab is selected (index 0): Show badge if `entityDetails.onSCF` is true
2. When a specific spend tab is selected (index > 0):
   - First check: `tabsData[selectedTabIndex].onSCF`
   - Second check: Find matching spend in `listSpend` by `spendUUID` and use its `onSCF` value
   - If neither has data, don't show badge

### Testing Checklist
- [ ] Badge shows correctly when entity-level `onSCF` is true (All Spends tab)
- [ ] Badge shows when `tabsData[selectedTabIndex].onSCF` is true
- [ ] Badge shows when matching spend in `listSpend` has `onSCF: true`
- [ ] Badge hides when no `onSCF` data is available
- [ ] Badge updates correctly when switching between tabs

## Implementation Status

### ✅ Phase 1: ModalResults - scfAccepted (Completed)

#### 1. Created `scfAcceptedForModal` computed property in `EntityCardNegotiation.vue`

**File:** `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Lines:** 3480-3483

**Change:** Added new computed property specifically for `ModalResults`:
```typescript
const scfAcceptedForModal = computed(() => {
  return props.entityDetails?.scfAccepted ?? null
})
```

This computed property:
- Returns `scfAccepted` value from `entityDetails` (from `/api/entity-card/entity/{uuid}/detail`)
- Will be `true` when SCF has been accepted (new backend field)
- Is passed as a prop to `ModalResults` component

#### 2. Added `scfAcceptedForModal` to return statement

**File:** `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Line:** 3491

Added `scfAcceptedForModal` to the component's return statement to make it available in the template.

#### 3. Passed `scfAccepted` prop to `ModalResults`

**File:** `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Line:** 77

Added new prop binding:
```pug
:scfAccepted="scfAcceptedForModal"
```

#### 4. Added `scfAccepted` prop definition in `ModalResults.vue`

**File:** `src/modules/home/entityCard/components/modals/ModalResults.vue`

**Line:** 348

Added new prop:
```typescript
scfAccepted: { type: Boolean, required: false, default: null },
```

### Summary

The `ModalResults` component now receives the `scfAccepted` value from the entity details API. This value will be `true` when SCF has been accepted by the entity, and can be used within the modal for any SCF-related logic or display.

**Note:** The original `onSCF` computed property remains unchanged and continues to work for the `EntityPaymentTermsStrategies` component (badge display).

---

### ✅ Phase 2: Badge Display - onSCF from Entity Card API (Completed)

#### 1. Added `listSpendEntityCard` state

**File:** `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Line:** 1049

Added new state to store spends from Entity Card API:
```typescript
listSpend: [],              // From Analyze API (for grid)
listSpendEntityCard: [],    // From Entity Card API (includes onSCF)
```

#### 2. Created `retrieveSpendsFromEntityCardAPI` function

**File:** `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Lines:** 2740-2773

New function that calls Entity Card API to get spends with `onSCF` field:
```typescript
function retrieveSpendsFromEntityCardAPI() {
  try {
    if (selectedTabIndex.value === 0) {
      return; // Only for specific spend tabs
    }

    const params = {
      companyId: props.companyId,
      programId: props.programUuid,
      callbackSuccess: (callbackSuccessData: any) => {
        data.listSpendEntityCard = callbackSuccessData;
      },
      callbackError: (callbackErrorData: unknown) => {
        // Handle error
      },
    };

    entityCardStore.getSpendsBySupplier(params);
  } catch (error) {
    // Handle error
  }
}
```

**API Called:** `GET /api/entity-card/entity/{companyId}/{programId}/spends`

**Response includes:**
- `spendUUID` ✅
- `onSCF` ✅ (boolean)
- `alias` ✅
- `contractualPaymentTerms` ✅
- And other spend-related fields

#### 3. Call function when tab changes

**File:** `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Line:** 1446

Added call in `watch(tabsDataTabSelected)`:
```typescript
// Get spend details
getEntityDetails();

// Retrieve spends from Entity Card API to get onSCF field
retrieveSpendsFromEntityCardAPI();
```

#### 4. Updated `onSCF` computed property

**File:** `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Lines:** 3494-3517

Updated to use `listSpendEntityCard` instead of `listSpend`:
```typescript
const onSCF = computed(() => {
  if (tabsDataTabSelected.value && selectedTabIndex.value > 0) {
    const selectedSpendUUID = tabsDataTabSelected.value.spendUUID
    
    // Search in listSpendEntityCard (from Entity Card API)
    if (selectedSpendUUID && data.listSpendEntityCard && data.listSpendEntityCard.length > 0) {
      const matchingSpend = data.listSpendEntityCard.find(
        (spend: any) => spend.spendUUID === selectedSpendUUID
      )
      
      if (matchingSpend && matchingSpend.onSCF !== null && matchingSpend.onSCF !== undefined) {
        return matchingSpend.onSCF
      }
    }
    
    return null
  }
  
  return props.entityDetails?.onSCF ?? null
})
```

### Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│              EntityCardNegotiation.vue                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Tab Change (watch)                                          │
│    ↓                                                          │
│  retrieveSpendsFromEntityCardAPI()                           │
│    ↓                                                          │
│  entityCardStore.getSpendsBySupplier()                       │
│    ↓                                                          │
│  GET /api/entity-card/entity/{id}/{programId}/spends        │
│    ↓                                                          │
│  data.listSpendEntityCard = [                                │
│    {                                                          │
│      spendUUID: "18edab03-...",                              │
│      onSCF: true,          ← Campo disponible               │
│      alias: "Spend 1",                                       │
│      ...                                                      │
│    }                                                          │
│  ]                                                            │
│    ↓                                                          │
│  computed onSCF → Busca en listSpendEntityCard              │
│    ↓                                                          │
│  Badge "Currently on SCF" en EntityPaymentTermsStrategies    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Final Implementation Benefits

✅ **Usa API correcta:** Entity Card API que incluye `onSCF`
✅ **Separación de datos:** 
   - `listSpend` → Grid (API Analyze)
   - `listSpendEntityCard` → SCF info (API Entity Card)
✅ **Sin cambios en backend:** API ya devuelve `onSCF`
✅ **Código limpio:** Lógica clara y mantenible

### Notes
- The `listSpend` array is populated from `/api/entity-card/entity/{uuid}/{configUuid}/spends` via `analyzeStore.getSpendsbySupplier`
- Each item in `listSpend` should have a `spendUUID` property
- The `tabsData` array is populated from `/api/analyze/get-spend-program-configs-by-provider`
- Both `tabsData` and `listSpend` items have `spendUUID` property that can be used for matching
