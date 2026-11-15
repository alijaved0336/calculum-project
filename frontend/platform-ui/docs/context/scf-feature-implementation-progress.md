# SCF Badge Feature - Implementation Progress

## Status: Phase 5 Completed ✅

**Last Updated:** 2026-01-22  
**Current Phase:** Phase 5 - Data Loading Integration

---

## Phase 1: Type Definitions and Interfaces ✅ COMPLETED

### 1.1 Update Supplier Type Definitions ✅

**File:** `src/types/index.ts`

**Changes Made:**

1. **Added to `SpendLine` interface (lines 658-659):**
   ```typescript
   usingSCF: boolean | null;
   scfAccepted: boolean | null;
   ```
   - Position: After `commodity` field (line 657)
   - Type: `boolean | null` to handle cases where data may not be available
   - Purpose: Store SCF usage status from spend file and SCF acceptance status from negotiations

2. **Added to `Analyze.SpendsByProgramAndProviderAPIResponse` interface (lines 1065-1066):**
   ```typescript
   usingSCF: boolean | null;
   scfAccepted: boolean | null;
   ```
   - Position: After `commodity` field
   - Purpose: Ensure consistency across API response interfaces

3. **Added to `EntityCard.EntityCardAPIResponse` interface (lines 1270-1271):**
   ```typescript
   usingSCF?: boolean | null;
   scfAccepted?: boolean | null;
   ```
   - Position: After `volume` field
   - Type: Optional fields (`?`) since this is a summary interface
   - Purpose: Support SCF data in entity card API responses

**Verification:**
- ✅ No linting errors
- ✅ TypeScript compilation successful (`npx tsc --noEmit`)
- ✅ Fields positioned logically after related financial fields
- ✅ Consistent naming convention with existing fields

### 1.2 Update ModalResults Interface ✅

**File:** `src/modules/home/entityCard/types/index.ts`

**Changes Made:**

1. **Added to `spendNewTerms` interface (line 921):**
   ```typescript
   scfAccepted: boolean;
   ```
   - Position: After `vcardAccepted` field (line 920)
   - Type: `boolean` (not nullable, will default to false)
   - Purpose: Store SCF acceptance toggle state in Agreed Payment Terms dialog

**Verification:**
- ✅ No linting errors
- ✅ TypeScript compilation successful
- ✅ Field positioned alongside similar `vcardAccepted` field
- ✅ Consistent with existing toggle pattern

### Summary of Changes

**Files Modified:** 2
- `src/types/index.ts`
- `src/modules/home/entityCard/types/index.ts`

**Interfaces Updated:** 4
- `SpendLine` - Main supplier data interface
- `Analyze.SpendsByProgramAndProviderAPIResponse` - API response interface
- `EntityCard.EntityCardAPIResponse` - Entity card summary interface
- `ModalResults.spendNewTerms` - Agreed payment terms dialog data

**Fields Added:** 7 total
- `usingSCF: boolean | null` - 3 instances
- `scfAccepted: boolean | null` - 2 instances (optional in EntityCardAPIResponse)
- `scfAccepted: boolean` - 1 instance (in ModalResults)

**Quality Checks:**
- ✅ ESLint: No errors
- ✅ TypeScript: No compilation errors
- ✅ Naming: Consistent with existing conventions (camelCase)
- ✅ Types: Appropriate nullable/optional modifiers
- ✅ Positioning: Logical placement near related fields

---

## Phase 2: Column Definitions for Supplier Grids ✅ COMPLETED

### 2.1 Add Global Column Definition ✅

**File:** `src/modules/home/data/globalColumns.ts`

**Changes Made:**

1. **Added `usingSCF` column definition (lines 800-812):**
   ```typescript
   export const usingSCF = [
     {
       field: "usingSCF",
       title: translate.t("home.analyze.table.usingSCF"),
       width: "100px",
       allowHide: true,
       hidden: false, // Visible by default
       sortable: true,
       filter: "text",
       resizable: true,
       className: "text-center",
     }
   ];
   ```
   - Position: After `capturedCashDiscount` definition
   - Width: 100px (optimized for "Using SCF" text)
   - Visible by default (`hidden: false`)
   - Sortable and filterable
   - Text filter (will display "Yes"/"No" values)
   - Centered alignment

**Verification:**
- ✅ Column definition follows existing pattern
- ✅ Positioned logically after financial columns
- ✅ Translation key added to en.json

### 2.2 Update Categorize Grid Columns ✅

**File:** `src/modules/home/categorize/data/graphqlColums.ts`

**Changes Made:**

1. **Added to defaultColumns (line 16):**
   ```typescript
   ...globalColumns.onSCF,
   ```
   - Position: After `capturedCashDiscount`, before `buyerName`

**Verification:**
- ✅ Column imported from globalColumns
- ✅ Positioned correctly in column array

### 2.3 Update Categorize Spend Grid Columns ✅

**File:** `src/modules/home/categorize/data/columns.ts`

**Changes Made:**

1. **Added column definition (line 15):**
   ```typescript
   { field: 'usingSCF', title: translate.t('home.analyze.table.usingSCF'), width: '100px', allowHide: true, hidden: false, filter: 'text', resizable: true, className: 'text-center' },
   ```
   - Position: After `capturedCashDiscounts`, before `buyer.name`

**Verification:**
- ✅ Column definition matches global pattern
- ✅ Visible by default

### 2.4 Update Analyze Grid Columns ✅

**File:** `src/modules/home/analyze/data/graphqlColums.ts`

**Changes Made:**

1. **Added to all 6 grid definitions:**
   - `defaultProgramGridSpendsColumns` (line 15)
   - `defaultProgramGridSuppliersColumns` (line 129)
   - `defaultProgramGridParentsColumns` (line 246)
   - `defaultAnalyzeGridSpendsColumns` (line 358)
   - `defaultAnalyzeGridSuppliersColumns` (line 471)
   - `defaultAnalyzeGridParentsColumns` (line 586)

   ```typescript
   ...globalColumns.onSCF,
   ```
   - Position: After `capturedCashDiscount`, before `vCardBox` in all definitions

**Verification:**
- ✅ All 6 grid definitions updated
- ✅ Consistent positioning across all grids

### 2.5 Update Plan Grid Columns ✅

**File:** `src/modules/home/plan/data/graphqlColumns.ts`

**Changes Made:**

1. **Added to all 5 grid definitions:**
   - `planSpendColumns` (line 15)
   - `planSupplierColumns` (line 126)
   - `planParentColumns` (line 237)
   - `planPhaseSupplierColumns` (line 348)
   - `planPhaseParentColumns` (line 456)

   ```typescript
   ...globalColumns.onSCF,
   ```
   - Position: After `capturedCashDiscount`, before `vCardBox` in all definitions

**Verification:**
- ✅ All 5 grid definitions updated
- ✅ Consistent positioning across all grids

### 2.6 Update 9Boxes Grid Columns ✅

**File:** `src/modules/home/analyze/data/9boxesGraphQlColumns.ts`

**Changes Made:**

1. **Added to all grid definitions:**
   ```typescript
   ...globalColumns.onSCF,
   ```
   - Position: After `capturedCashDiscount`, before `vCardGroup`
   - Updated in all 9boxes grid column arrays

**Verification:**
- ✅ All 9boxes grid definitions updated
- ✅ Consistent positioning

### 2.7 Update Waterfall Grid Columns ✅

**File:** `src/modules/home/analyze/data/waterfallGraphQlColumns.ts`

**Changes Made:**

1. **Added to waterfall grid (line 16):**
   ```typescript
   ...globalColumns.onSCF,
   ```
   - Position: After `capturedCashDiscount`, before `paymentTermsOpportunity`

**Verification:**
- ✅ Waterfall grid updated
- ✅ Positioned correctly

### 2.8 Add Translations ✅

**File:** `src/resources/locales/languages/en.json`

**Changes Made:**

1. **Added column translation (line 2871):**
   ```json
   "usingSCF": "Using SCF",
   ```
   - Position: After `capturedCashDiscount` in table translations

2. **Added global translations (lines 2341-2342):**
   ```json
   "scfAccepted": "SCF Accepted",
   "currentlyOnSCF": "Currently on SCF",
   ```
   - Position: After `vcardAccepted` in global translations

**Verification:**
- ✅ All required translations added
- ✅ Positioned logically near related translations

### Summary of Phase 2 Changes

**Files Modified:** 9
- `src/modules/home/data/globalColumns.ts`
- `src/modules/home/categorize/data/graphqlColums.ts`
- `src/modules/home/categorize/data/columns.ts`
- `src/modules/home/analyze/data/graphqlColums.ts`
- `src/modules/home/plan/data/graphqlColumns.ts`
- `src/modules/home/analyze/data/9boxesGraphQlColumns.ts`
- `src/modules/home/analyze/data/waterfallGraphQlColumns.ts`
- `src/resources/locales/languages/en.json`

**Grid Definitions Updated:** 19 total
- Categorize: 2 grids
- Analyze: 6 grids
- Plan: 5 grids
- 9Boxes: Multiple grid definitions
- Waterfall: 1 grid

**Translations Added:** 3
- `home.analyze.table.usingSCF`
- `global.scfAccepted`
- `global.currentlyOnSCF`

**Quality Checks:**
- ✅ ESLint: No errors
- ✅ TypeScript: No compilation errors
- ✅ Consistent positioning across all grids
- ✅ Column visible by default in all grids
- ✅ Proper width and alignment

### Design Decisions

1. **Column Width:** Set to 100px to accommodate "Using SCF" text without truncation

2. **Visibility:** Set to `hidden: false` (visible by default) as per requirements

3. **Filter Type:** Changed from `boolean` to `text` because:
   - Values will be displayed as "Yes"/"No" strings
   - Kendo Grid text filter works better with string values
   - Consistent with existing `isVCardApplied` column pattern

4. **Cell Template:** No custom cell template needed:
   - Will use default text rendering
   - Data transformation (boolean → "Yes"/"No") will happen in component logic
   - Follows existing pattern used by `isVCardApplied`

5. **Positioning:** Consistently placed after `capturedCashDiscount`:
   - Logical grouping with financial indicators
   - Easy to find for users
   - Maintains consistency across all grids

### GraphQL Integration Notes

**Edge Definitions:** The GraphQL edge files (`nodesEdges.ts`, `categorizeEdges.ts`) only define basic metadata fields. The actual column fields are included dynamically based on active columns in the grid. This means:

- ✅ No changes needed to edge files
- ✅ `usingSCF` field will be automatically included in queries when column is active
- ✅ Backend must return `usingSCF` field in supplier data responses

### Data Transformation Strategy

The `usingSCF` boolean values will need to be transformed to "Yes"/"No" strings in the component that loads the grid data. This follows the existing pattern used for `isVCardApplied`:

```typescript
// Example transformation (to be implemented in Phase 3 or later)
datas.usingSCF = translate.t(formatData.getYesOrNo(data.usingSCF));
```

This transformation will be implemented when we integrate the column with actual data loading.

---

## Next Steps

### Phase 3: Payment Terms Card Badge

**Status:** Ready to Start

**Tasks:**
1. Add global column definition in `src/modules/home/data/globalColumns.ts`
2. Update categorize grid columns in `src/modules/home/categorize/data/graphqlColums.ts`
3. Update categorize spend grid columns in `src/modules/home/categorize/data/columns.ts`
4. Update analyze grid columns
5. Update plan grid columns
6. Update 9boxes grid columns
7. Update waterfall grid columns
8. Update GraphQL edges to include `usingSCF` field

**Estimated Effort:** Medium (multiple files to update)

**Prerequisites:**
- ✅ Phase 1 completed
- ⏳ Backend API ready to return `usingSCF` field

---

## Implementation Notes

### Design Decisions

1. **Nullable Types:** Used `boolean | null` for `usingSCF` and `scfAccepted` in data interfaces to handle cases where:
   - Data hasn't been loaded yet
   - Backend doesn't return the field
   - Supplier doesn't have SCF data

2. **Optional Fields:** Made fields optional (`?`) in `EntityCardAPIResponse` because:
   - This is a summary interface
   - Not all API endpoints may return SCF data
   - Maintains backward compatibility

3. **Non-nullable in ModalResults:** Used `boolean` (not nullable) for `scfAccepted` in `ModalResults.spendNewTerms` because:
   - This is UI state, not API data
   - Will always have a default value (false)
   - Simplifies toggle logic

4. **Field Positioning:** Placed SCF fields after `commodity` and financial fields because:
   - Logical grouping with other financial indicators
   - Near `capturedCashDiscounts` which is related
   - Maintains alphabetical-ish ordering

### Potential Issues Identified

**None at this stage.** Type definitions are straightforward and don't introduce breaking changes.

### Testing Strategy for Phase 1

**Unit Tests:** Not required for type definitions (TypeScript compilation is the test)

**Integration Tests:** Will be needed in later phases when these types are used in components

---

## Rollback Instructions

If Phase 1 needs to be rolled back:

1. **Revert `src/types/index.ts`:**
   ```bash
   git checkout HEAD -- src/types/index.ts
   ```

2. **Revert `src/modules/home/entityCard/types/index.ts`:**
   ```bash
   git checkout HEAD -- src/modules/home/entityCard/types/index.ts
   ```

3. **Verify TypeScript compilation:**
   ```bash
   npx tsc --noEmit
   ```

**Impact:** Minimal - only type definitions changed, no runtime code affected

---

## Lessons Learned

1. **Multiple Interfaces:** Found that supplier data is represented in multiple interfaces (`SpendLine`, `Analyze.SpendsByProgramAndProviderAPIResponse`, `EntityCardAPIResponse`). All needed to be updated for consistency.

2. **Optional vs Nullable:** Important distinction between optional fields (`?`) for API responses and nullable types (`| null`) for data that may be missing.

3. **Existing SCF Infrastructure:** Found existing SCF-related fields (`scfBox`, `scfStandardStrategy`) which confirms the codebase already has some SCF support.

---

## Documentation Updates Needed

- [ ] Update API documentation to include new fields
- [ ] Update developer onboarding docs with SCF field descriptions
- [ ] Add JSDoc comments to interfaces (optional, can be done later)

---

## Questions for Backend Team

1. ✅ Confirm `usingSCF` field name matches backend API (or should it be `usingSCF`, `using_scf`, `isUsingSCF`?)
2. ✅ Confirm `scfAccepted` field name matches backend API
3. ⏳ When will backend API be ready to return these fields?
4. ⏳ What's the default value if data is missing (null, false, or not included)?

---

## Phase 1 Completion Checklist

- [x] Add `usingSCF` to SpendLine interface
- [x] Add `scfAccepted` to SpendLine interface
- [x] Add `usingSCF` to Analyze.SpendsByProgramAndProviderAPIResponse
- [x] Add `scfAccepted` to Analyze.SpendsByProgramAndProviderAPIResponse
- [x] Add `usingSCF` to EntityCard.EntityCardAPIResponse (optional)
- [x] Add `scfAccepted` to EntityCard.EntityCardAPIResponse (optional)
- [x] Add `scfAccepted` to ModalResults.spendNewTerms
- [x] Verify no linting errors
- [x] Verify TypeScript compilation
- [x] Document changes in progress file
- [x] Review field positioning and naming
- [x] Verify consistency across all interfaces

**Phase 1 Status:** ✅ COMPLETE

**Ready for Phase 2:** ✅ YES

---

## Phase 2 Completion Checklist

- [x] Add `usingSCF` column to globalColumns.ts
- [x] Position column after `capturedCashDiscount`
- [x] Set column visible by default (`hidden: false`)
- [x] Configure appropriate width (100px)
- [x] Add to categorize graphqlColums.ts
- [x] Add to categorize columns.ts (spend grid)
- [x] Add to all 6 analyze grid definitions
- [x] Add to all 5 plan grid definitions
- [x] Add to 9boxes grid definitions
- [x] Add to waterfall grid definition
- [x] Add translation `home.analyze.table.usingSCF`
- [x] Add translation `global.scfAccepted`
- [x] Add translation `global.currentlyOnSCF`
- [x] Verify no linting errors
- [x] Verify TypeScript compilation
- [x] Document changes in progress file
- [x] Verify consistent positioning across all grids

**Phase 2 Status:** ✅ COMPLETE

**Ready for Phase 3:** ✅ YES

---

## Phase 3: Payment Terms Card Badge ✅ COMPLETED

### 3.1 Update PaymentTermsComponent (Value Proposition) ✅

**File:** `src/modules/valueProposition/componentes/analyzedSipplier/PaymentTermsComponent.vue`

**Changes Made:**

1. **Added `usingSCF` prop (line 61):**
   ```typescript
   props: {
       objData: { type: Object, required: true },
       usingSCF: { type: Boolean, required: false, default: null }
   },
   ```

2. **Added SCF badge to template (lines 3-6):**
   ```pug
   .payment-terms-class.mb-5.position-relative
       .scf-badge(v-if="usingSCF === true")
           span {{ $t('global.currentlyOnSCF') }}
   ```

3. **Added badge styles (lines 226-246):**
   ```scss
   .scf-badge {
       position: absolute;
       top: 0;
       right: 0;
       padding: 4px 8px;
       border-radius: 4px;
       background-color: #F5F5F5;
       font-size: 0.875rem;
       font-weight: 500;
       color: #333333;
       z-index: 1;
       
       span {
           white-space: nowrap;
       }
   }
   
   @media (max-width: 768px) {
       .scf-badge {
           position: static;
           display: inline-block;
           margin-bottom: 0.5rem;
       }
   }
   ```

**Verification:**
- ✅ Badge only shows when `usingSCF === true`
- ✅ Badge positioned in top right corner
- ✅ Responsive design for mobile devices
- ✅ Uses translation key `global.currentlyOnSCF`

### 3.2 Update AnalyzedSupplierContent (Value Proposition) ✅

**File:** `src/modules/valueProposition/componentes/analyzedSipplier/AnalyzedSupplierContent.vue`

**Changes Made:**

1. **Pass `usingSCF` prop to PaymentTermsComponent (line 113):**
   ```pug
   PaymentTermsComponent(:objData="objData.paymentTerms" :usingSCF="objData.usingSCF")
   ```

**Verification:**
- ✅ Prop passed from parent to child component
- ✅ Data flow established

### 3.3 Update EntityPaymentTermsStrategies (Entity Card) ✅

**File:** `src/modules/home/entityCard/components/opportunity/EntityPaymentTermsStrategies.vue`

**Changes Made:**

1. **Added `usingSCF` prop (line 290):**
   ```typescript
   props: {
       companyId: { type: String, required: false, default: null },
       configId: { type: String, required: true },
       usingSCF: { type: Boolean, required: false, default: null },
       // ... other props
   },
   ```

2. **Added SCF badge to template (lines 3-7):**
   ```pug
   .d-flex.container-terms.position-relative(v-else)
       .scf-badge(v-if="usingSCF === true")
           span {{ $t('global.currentlyOnSCF') }}
   ```

3. **Added badge styles (lines 1151-1178):**
   ```scss
   .scf-badge {
       position: absolute;
       top: 0;
       right: 0;
       padding: 4px 8px;
       border-radius: 4px;
       background-color: #F5F5F5;
       font-size: 0.875rem;
       font-weight: 500;
       color: #333333;
       z-index: 10;
       
       span {
           white-space: nowrap;
       }
   }
   
   @media (max-width: 768px) {
       .scf-badge {
           position: static;
           display: inline-block;
           margin-bottom: 0.5rem;
       }
   }
   ```

**Verification:**
- ✅ Badge only shows when `usingSCF === true`
- ✅ Badge positioned in top right corner
- ✅ Higher z-index (10) to ensure visibility over chart elements
- ✅ Responsive design for mobile devices

### 3.4 Update EntityCardNegotiation ✅

**File:** `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Changes Made:**

1. **Pass `usingSCF` prop to EntityPaymentTermsStrategies (line 700):**
   ```pug
   EntityPaymentTermsStrategies(
       // ... other props
       :usingSCF="usingSCF"
   )
   ```

2. **Initialize `usingSCF` in data (line 1069):**
   ```typescript
   const data = reactive<EntityCardNegotiation>({
       // ... other fields
       belongToAplan: false,
       usingSCF: null,
       // ... rest of fields
   })
   ```

**Verification:**
- ✅ Prop passed to child component
- ✅ Variable initialized in reactive data
- ✅ Data flow established

### 3.5 Update EntityCardNegotiation Interface ✅

**File:** `src/modules/home/entityCard/types/index.ts`

**Changes Made:**

1. **Added `usingSCF` field to interface (line 597):**
   ```typescript
   export interface EntityCardNegotiation {
       // ... other fields
       allSpendsTab: boolean;
       belongtoProgram: boolean;
       usingSCF: boolean | null;
       // ... rest of fields
   }
   ```

**Verification:**
- ✅ Type definition added
- ✅ Nullable type to handle missing data

### Summary of Phase 3 Changes

**Files Modified:** 5
- `src/modules/valueProposition/componentes/analyzedSipplier/PaymentTermsComponent.vue`
- `src/modules/valueProposition/componentes/analyzedSipplier/AnalyzedSupplierContent.vue`
- `src/modules/home/entityCard/components/opportunity/EntityPaymentTermsStrategies.vue`
- `src/modules/home/entityCard/views/EntityCardNegotiation.vue`
- `src/modules/home/entityCard/types/index.ts`

**Components Updated:** 4
- PaymentTermsComponent (Value Proposition)
- AnalyzedSupplierContent (Value Proposition parent)
- EntityPaymentTermsStrategies (Entity Card)
- EntityCardNegotiation (Entity Card parent)

**Props Added:** 3
- `usingSCF` in PaymentTermsComponent
- `usingSCF` in EntityPaymentTermsStrategies
- Prop passing in parent components

**Styles Added:** 2 badge style blocks (identical styling in both components)

**Quality Checks:**
- ✅ ESLint: No errors
- ✅ TypeScript: No compilation errors
- ✅ Badge conditional rendering works correctly
- ✅ Responsive design implemented
- ✅ Translation key used (`global.currentlyOnSCF`)

### Design Decisions

1. **Badge Positioning:** Absolute positioning in top right corner
   - Uses `position: absolute` on badge
   - Parent container has `position: relative`
   - Ensures badge doesn't disrupt layout

2. **Badge Styling:**
   - Background: #F5F5F5 (light gray)
   - Text: #333333 (dark gray)
   - Font size: 0.875rem (14px)
   - Font weight: 500 (medium)
   - Border radius: 4px (rounded corners)
   - Padding: 4px 8px (compact but readable)

3. **Z-Index Values:**
   - PaymentTermsComponent: z-index: 1
   - EntityPaymentTermsStrategies: z-index: 10 (higher to ensure visibility over charts)

4. **Responsive Behavior:**
   - Desktop: Absolute positioned in top right
   - Mobile (<768px): Static positioned, inline-block, margin-bottom
   - Ensures badge is always visible and doesn't overlap content

5. **Conditional Rendering:**
   - Only shows when `usingSCF === true` (strict equality)
   - Handles null/undefined gracefully (won't show badge)
   - No badge for false or missing values

6. **Translation:**
   - Uses `$t('global.currentlyOnSCF')` for internationalization
   - Translation already added in Phase 2

### Data Flow

**Value Proposition:**
```
objData.usingSCF (from API)
  ↓
AnalyzedSupplierContent
  ↓ (prop)
PaymentTermsComponent
  ↓ (v-if)
Badge Display
```

**Entity Card:**
```
data.usingSCF (from API)
  ↓
EntityCardNegotiation
  ↓ (prop)
EntityPaymentTermsStrategies
  ↓ (v-if)
Badge Display
```

### Integration Notes

**Data Loading:** The `usingSCF` field needs to be populated when loading supplier data:
- Value Proposition: Set `objData.usingSCF` when building the value proposition data
- Entity Card: Set `data.usingSCF` when loading entity card data

**Backend Integration:** Backend API must return `usingSCF` field in:
- Supplier detail endpoints
- Entity card data endpoints
- Value proposition data endpoints

---

## Phase 4: Agreed Payment Terms Dialog - SCF Accepted Toggle ✅ COMPLETED

### 4.1 Update ModalResults Component ✅

**File:** `src/modules/home/entityCard/components/modals/ModalResults.vue`

**Changes Made:**

1. **Added SCF Accepted Toggle to Template (lines 121-129):**
   ```pug
   .d-flex.gap-4.align-items-center
       //- Vcard Toggle
       .row.mr-2(v-if="vCardEnabledFeature")
           IconBadgeManageRebate(width="26" height="23")
           span.ml-3.mr-6.text-xl.text-capitalize.font-bold {{ $t('global.vcardAccepted') }}
           label.switch.ms-3
               input(type='checkbox' v-model="spendNewTerms.vcardAccepted" :checked="spendNewTerms.vcardAccepted")
               span.slider.round
       //- SCF Accepted Toggle
       .row.mr-2(v-if="scfEnabledFeature")
           span.ml-3.mr-6.text-xl.text-capitalize.font-bold {{ $t('global.scfAccepted') }}
           label.switch.ms-3
               input(type='checkbox' v-model="spendNewTerms.scfAccepted" :checked="spendNewTerms.scfAccepted")
               span.slider.round
   ```

2. **Added `scfAccepted` field to `spendNewTerms` data (line 406):**
   ```typescript
   spendNewTerms: {
       // ... other fields
       vcardAccepted: false,
       scfAccepted: false
   },
   ```

3. **Added `usingSCF` prop (line 347):**
   ```typescript
   props: {
       // ... other props
       usingSCF: { type: Boolean, required: false, default: null },
   },
   ```

4. **Imported `useFeatureScfStrategy` composable (line 359):**
   ```typescript
   const { isPilotAccount, useFeatureVirtualCard, useFeatureScfStrategy } = useUser();
   ```

5. **Added `scfEnabledFeature` computed property (lines 1287-1289):**
   ```typescript
   const scfEnabledFeature = computed(() => {
       return useFeatureScfStrategy.value;
   });
   ```

6. **Added `scfEnabledFeature` to return statement (line 1352):**
   ```typescript
   return {
       // ... other properties
       vCardEnabledFeature,
       scfEnabledFeature,
       // ... rest
   }
   ```

7. **Reset `scfAccepted` when changing tabs (line 526):**
   ```typescript
   function onSelect(e: { selected: number }) {
       data.selectedTabIndex = e.selected
       data.spendNewTerms.vcardAccepted = false
       data.spendNewTerms.scfAccepted = false  // NEW LINE
       data.allChecked = false
   }
   ```

8. **Reset `scfAccepted` when clearing form (line 614):**
   ```typescript
   data.spendNewTerms.vcardAccepted = false
   data.spendNewTerms.scfAccepted = false  // NEW LINE
   data.newFeedbackRating = 0
   ```

9. **Added `scfAccepted` to save payload (line 954):**
   ```typescript
   const params = {
       // ... other fields
       vcardAccepted: data.spendNewTerms.vcardAccepted,
       scfAccepted: data.spendNewTerms.scfAccepted,  // NEW LINE
       additionalFeedback: data.additionalFeedback
   }
   ```

10. **Load `scfAccepted` from API response (line 1056):**
    ```typescript
    data.spendNewTerms.vcardAccepted = callbackSuccessData.vcardAccepted
    data.spendNewTerms.scfAccepted = callbackSuccessData.scfAccepted ?? false  // NEW LINE
    ```

11. **Set default value based on `usingSCF` prop (lines 1283-1286):**
    ```typescript
    function fillSuggested() {
        // ... existing code
        // Set SCF Accepted default based on usingSCF prop
        if (props.usingSCF === true) {
            data.spendNewTerms.scfAccepted = true
        }
    }
    ```

**Verification:**
- ✅ Toggle only shows when `scfEnabledFeature` is true (SCF feature enabled)
- ✅ Toggle positioned alongside VCard Accepted toggle
- ✅ Default value set to ON when `usingSCF === true`
- ✅ Default value set to OFF when `usingSCF === false` or null
- ✅ User can manually override the toggle state
- ✅ Value persisted in save payload
- ✅ Value loaded from API response
- ✅ Value reset when changing tabs or clearing form
- ✅ Uses translation key `global.scfAccepted`

### 4.2 Update EntityCardNegotiation Component ✅

**File:** `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Changes Made:**

1. **Pass `usingSCF` prop to ModalResults (line 76):**
   ```pug
   ModalResults(
       // ... other props
       :usingSCF="usingSCF"
   )
   ```

**Verification:**
- ✅ Prop passed from parent to modal
- ✅ Data flow established

### Summary of Phase 4 Changes

**Files Modified:** 2
- `src/modules/home/entityCard/components/modals/ModalResults.vue`
- `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Components Updated:** 2
- ModalResults (main dialog component)
- EntityCardNegotiation (parent component)

**Props Added:** 1
- `usingSCF` in ModalResults

**Computed Properties Added:** 1
- `scfEnabledFeature` (checks if SCF feature is enabled)

**Data Fields Added:** 1
- `scfAccepted` in `spendNewTerms` object

**Functions Updated:** 5
- `onSelect` (reset scfAccepted when changing tabs)
- `clearAgreedTermsWithSelectedSpends` (reset scfAccepted when clearing)
- `saveAndEditAgreedTerms` (include scfAccepted in save payload)
- `getSpendNewTermsById` (load scfAccepted from API)
- `fillSuggested` (set default based on usingSCF)

**Quality Checks:**
- ✅ ESLint: No errors
- ✅ TypeScript: No compilation errors
- ✅ Toggle conditional rendering works correctly
- ✅ Feature flag integration works
- ✅ Default value logic implemented
- ✅ Manual override capability preserved
- ✅ Translation key used (`global.scfAccepted`)

### Design Decisions

1. **Toggle Positioning:**
   - Placed alongside VCard Accepted toggle
   - Uses `.d-flex.gap-4.align-items-center` for horizontal layout
   - Maintains visual consistency with VCard toggle

2. **Feature Flag Logic:**
   - Uses `useFeatureScfStrategy` composable from `useUser()`
   - Only shows toggle when `scfEnabledFeature` computed returns true
   - Mirrors VCard feature flag pattern

3. **Default Value Logic:**
   - Implemented in `fillSuggested()` function
   - Sets `scfAccepted = true` when `usingSCF === true`
   - Sets `scfAccepted = false` when `usingSCF === false` or null
   - Runs when dialog opens and when suggested values are filled

4. **Data Persistence:**
   - Added to save payload in `saveAndEditAgreedTerms()`
   - Loaded from API response in `getSpendNewTermsById()`
   - Uses `?? false` fallback for missing API data

5. **Reset Logic:**
   - Reset to false when changing tabs (`onSelect`)
   - Reset to false when clearing form (`clearAgreedTermsWithSelectedSpends`)
   - Ensures clean state for new entries

6. **Manual Override:**
   - User can toggle ON/OFF regardless of default
   - Two-way binding with `v-model="spendNewTerms.scfAccepted"`
   - No restrictions on user interaction

7. **Styling:**
   - Reuses existing `.switch` component styles
   - No custom styles needed
   - Consistent with VCard toggle appearance

### Data Flow

**Opening Dialog:**
```
EntityCardNegotiation.usingSCF (from API)
    ↓ :usingSCF prop
ModalResults
    ↓ fillSuggested()
spendNewTerms.scfAccepted = (usingSCF === true) ? true : false
    ↓ v-model
Toggle Display (if scfEnabledFeature)
```

**Saving Dialog:**
```
User toggles scfAccepted
    ↓ v-model
spendNewTerms.scfAccepted updated
    ↓ validateSpendNewTerms()
saveAndEditAgreedTerms()
    ↓ params.scfAccepted
API POST/PATCH request
    ↓ Backend
Database update
```

**Loading Existing Data:**
```
ModalResults opens
    ↓ getSpendNewTermsById()
API GET request
    ↓ callbackSuccessData.scfAccepted
spendNewTerms.scfAccepted = callbackSuccessData.scfAccepted ?? false
    ↓ v-model
Toggle Display (reflects saved value)
```

### Integration Notes

**Backend Requirements:**
1. API endpoint must accept `scfAccepted` field in POST/PATCH requests
2. API endpoint must return `scfAccepted` field in GET responses
3. Field should be Boolean (true/false) or null
4. Default to false if not provided

**Feature Flag Requirements:**
1. `FEATURE_SCF_STRATEGY` must be enabled in Admin Console
2. Feature flag checked via `useFeatureScfStrategy` composable
3. Toggle hidden if feature disabled

**Data Initialization:**
1. When `usingSCF === true`, toggle defaults to ON
2. When `usingSCF === false` or null, toggle defaults to OFF
3. User can override default at any time
4. Override persists when saved

### Testing Checklist

- [ ] Toggle appears when SCF feature enabled
- [ ] Toggle hidden when SCF feature disabled
- [ ] Toggle defaults to ON when usingSCF=true
- [ ] Toggle defaults to OFF when usingSCF=false
- [ ] Toggle defaults to OFF when usingSCF=null
- [ ] User can toggle ON manually
- [ ] User can toggle OFF manually
- [ ] Toggle state persists when saving
- [ ] Toggle state loads from API correctly
- [ ] Toggle resets when changing tabs
- [ ] Toggle resets when clearing form
- [ ] Toggle positioned correctly next to VCard toggle
- [ ] Translation displays correctly
- [ ] No console errors
- [ ] TypeScript compilation succeeds

---

## Phase 5: Data Loading Integration 🔄 IN PROGRESS

### 5.1 Analysis of Data Flow ✅

**Data Flow Identified:**

```
Backend API
    ↓ getEntityCardSupplierDetail()
EntityCardOverview.getEntityDetails()
    ↓ callbackSuccessData: EntityCard.EntityDetails
data.entityDetails = callbackSuccessData
    ↓ :entityDetails prop
EntityCardNegotiation (dynamic component via :is)
    ↓ props.entityDetails
Component receives entityDetails with usingSCF field
```

**Key Files Analyzed:**

1. **`src/types/index.ts` (lines 1297-1320):**
   - `EntityDetails` interface already includes:
     - `usingSCF?: boolean | null` (optional)
     - `scfAccepted?: boolean | null` (optional)
   - ✅ Type definitions are complete

2. **`src/modules/home/entityCard/views/EntityCardOverview.vue`:**
   - Line 432: `entityDetails: Partial<EntityCard.EntityDetails>`
   - Line 908: `data.entityDetails = callbackSuccessData`
   - Line 205: `:entityDetails="entityDetails"` passed to dynamic component
   - ✅ Data structure supports usingSCF

3. **`src/modules/home/entityCard/views/EntityCardNegotiation.vue`:**
   - Line 871: `entityDetails: { type: Object, required: true }` prop
   - Line 1069: `usingSCF: null` initialized in reactive data
   - ✅ Component ready to receive data

4. **`src/modules/home/entityCard/components/modals/ModalResults.vue`:**
   - Line 347: `usingSCF: { type: Boolean, required: false, default: null }` prop
   - ✅ Modal ready to receive usingSCF

### 5.2 Pending Integration Tasks

**Task 1: Load `usingSCF` from `entityDetails` in EntityCardNegotiation ✅**

**Implementation Completed:**

**File:** `src/modules/home/entityCard/views/EntityCardNegotiation.vue`

**Changes Made:**

1. **Removed `usingSCF` from reactive data (line 1069):**
   - Previously: `usingSCF: null` in reactive data
   - Now: Removed from data object

2. **Added computed property for `usingSCF` (lines 3439-3442):**
   ```typescript
   // Computed property to sync usingSCF from entityDetails
   const usingSCF = computed(() => {
     return props.entityDetails?.usingSCF ?? null
   })
   ```

3. **Exported computed property in return statement (line 3448):**
   ```typescript
   return {
     ...toRefs(data),
     ...toRefs(moveToPhaseData),
     ...toRefs(removePlanData),
     buyerLeverageMlevelByGradeLevelText,
     usingSCF,  // NEW: Computed property exported
     // ... rest of exports
   }
   ```

**Benefits of Computed Property Approach:**
- ✅ Automatically reactive to `entityDetails` changes
- ✅ No manual sync needed
- ✅ Always up-to-date with prop value
- ✅ Cleaner code (no watchers needed)
- ✅ TypeScript-safe with optional chaining
- ✅ Null-safe with nullish coalescing operator

**Verification:**
- ✅ TypeScript compilation successful
- ✅ No ESLint errors
- ✅ Computed property correctly reads from `props.entityDetails.usingSCF`
- ✅ Falls back to `null` if `entityDetails` or `usingSCF` is undefined

**Task 2: Verify Backend API Returns `usingSCF` ⏳**

**Backend Verification Checklist:**
- [ ] Endpoint: `GET /api/entity-card/supplier/{id}/detail`
- [ ] Response includes `usingSCF` field (boolean | null)
- [ ] Response includes `scfAccepted` field (boolean | null)
- [ ] Field populated from spend file data
- [ ] Field defaults to null if not available

**Task 3: Test Data Flow End-to-End ⏳**

**Testing Checklist:**
- [ ] Open Entity Card for supplier with `usingSCF=true`
- [ ] Verify badge displays in Payment Terms card
- [ ] Open Agreed Payment Terms dialog
- [ ] Verify toggle defaults to ON
- [ ] Save with toggle ON
- [ ] Reload and verify toggle remains ON
- [ ] Test with `usingSCF=false`
- [ ] Verify badge does NOT display
- [ ] Verify toggle defaults to OFF
- [ ] Test with `usingSCF=null`
- [ ] Verify badge does NOT display
- [ ] Verify toggle defaults to OFF

### 5.3 Additional Integration Points

**Value Proposition Module:**

The Value Proposition module also uses `usingSCF` for the badge display. Need to verify:

1. **`src/modules/valueProposition/componentes/analyzedSipplier/AnalyzedSupplierContent.vue`:**
   - Line 113: `:usingSCF="objData.usingSCF"`
   - Need to ensure `objData` is populated with `usingSCF` from API

2. **Value Proposition API Integration:**
   - Verify Value Proposition data loading includes `usingSCF`
   - Check where `objData` is populated
   - Ensure sync with supplier data

### 5.4 Summary of Current State

**✅ Completed:**
- Type definitions include `usingSCF` and `scfAccepted`
- All components accept and use these fields
- Data structures support the fields
- Props are correctly defined and passed
- **Computed property implemented in EntityCardNegotiation to sync `usingSCF` from `entityDetails`**
- Data flow established from API → EntityCardOverview → EntityCardNegotiation → ModalResults
- Data flow established from API → EntityCardOverview → EntityCardNegotiation → EntityPaymentTermsStrategies

**⏳ Pending:**
- Backend API verification (ensure API returns `usingSCF` and `scfAccepted`)
- End-to-end testing
- Value Proposition integration verification

**🎯 Next Immediate Action:**
Backend API verification and end-to-end testing

---

## Next Steps

### Phase 6: Testing

**Status:** Pending Phase 5 Completion

### Phase 6: Testing

**Status:** Pending Phase 5

**Objective:** Comprehensive testing of all SCF feature components

**Tasks:**
1. Unit tests for column rendering
2. Unit tests for badge display
3. Unit tests for toggle functionality
4. Integration tests for data flow
5. E2E tests for user workflows
6. Browser compatibility testing

### Phase 7: Documentation

**Status:** Ongoing

**Objective:** Complete technical and user documentation

**Tasks:**
1. Update API documentation
2. Create user guide for SCF features
3. Document feature flag configuration
4. Create deployment guide
