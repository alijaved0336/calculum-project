# SCF (Supply Chain Finance) Badge Feature - Frontend Implementation Checklist

## Overview
This document outlines the frontend implementation plan for the SCF Badge feature, which adds three key enhancements to the ADA platform:
1. **"Using SCF" column** in supplier grids
2. **"Currently on SCF" badge** in the Payment Terms and Strategy card
3. **"SCF Accepted" toggle** in the Agreed Payment Terms dialog

## Prerequisites Verification

### Backend Requirements (Must be completed before frontend work)
- [ ] Backend API returns `usingSCF` field in supplier list payloads
- [ ] Backend API returns `usingSCF` and `scfAccepted` fields in supplier detail payloads
- [ ] Backend API accepts `scfAccepted` field in agreed payment terms POST/PUT requests
- [ ] Database has `scf_accepted` column (Boolean) in suppliers table
- [ ] Initial data migration completed (existing SCF suppliers have `scf_accepted = true`)
- [ ] SCF feature flag is configurable via Admin Console

### API Endpoints to Verify
- [ ] `GET /suppliers` - includes `usingSCF` field
- [ ] `GET /suppliers/{id}` - includes `usingSCF` and `scfAccepted` fields
- [ ] `POST/PUT /entity_card_spend_new_terms` - accepts `scfAccepted` field
- [ ] GraphQL queries return `usingSCF` and `scfAccepted` fields

## Implementation Tasks

### Phase 1: Type Definitions and Interfaces

#### 1.1 Update Supplier Type Definitions
**File:** `src/types/index.ts`

- [ ] Add `usingSCF: boolean | null` to supplier interface
- [ ] Add `scfAccepted: boolean | null` to supplier interface
- [ ] Verify types are exported correctly

**Expected Changes:**
```typescript
export interface Supplier {
  // ... existing fields
  usingSCF: boolean | null;
  scfAccepted: boolean | null;
}
```

#### 1.2 Update ModalResults Interface
**File:** `src/modules/home/entityCard/types/index.ts`

- [ ] Add `scfAccepted: boolean` to `spendNewTerms` interface (line ~920)
- [ ] Verify the field is included in the ModalResults type

**Expected Changes:**
```typescript
spendNewTerms: {
  // ... existing fields
  vcardAccepted: boolean;
  scfAccepted: boolean; // NEW FIELD
}
```

### Phase 2: Column Definitions for Supplier Grids

#### 2.1 Add Global Column Definition
**File:** `src/modules/home/data/globalColumns.ts`

- [ ] Create new `usingSCF` column definition after `capturedCashDiscount` (around line 796)
- [ ] Set appropriate width (80-100px)
- [ ] Configure as visible by default (`hidden: false`)
- [ ] Use boolean cell template or create custom cell renderer
- [ ] Add translation key reference

**Expected Changes:**
```typescript
export const usingSCF = [
  {
    field: "usingSCF",
    title: translate.t("home.analyze.table.usingSCF"),
    width: "100px",
    allowHide: true,
    hidden: false, // Visible by default
    sortable: true,
    filter: "boolean",
    resizable: true,
    className: "text-center",
    cell: "booleanTemplate", // or custom cell renderer
  }
];
```

#### 2.2 Update Categorize Grid Columns
**File:** `src/modules/home/categorize/data/graphqlColums.ts`

- [ ] Import `usingSCF` from globalColumns
- [ ] Add `...globalColumns.onSCF` after `capturedCashDiscount` (line 15)

**Expected Changes:**
```typescript
export const defaultColumns = [
  // ... existing columns
  ...globalColumns.capturedCashDiscount,
  ...globalColumns.onSCF, // NEW COLUMN
  ...globalColumns.buyerName,
  // ... rest of columns
]
```

#### 2.3 Update Categorize Spend Grid Columns
**File:** `src/modules/home/categorize/data/columns.ts`

- [ ] Add `usingSCF` column definition after `capturedCashDiscounts` (line 14)
- [ ] Ensure consistent styling with other boolean columns

**Expected Changes:**
```typescript
export const defaultSpendGridColumns = [
  // ... existing columns
  { field: 'capturedCashDiscounts', title: translate.t('home.analyze.table.capturedCashDiscount'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, className: 'text-center', cell: 'moneyTemplateRound' },
  { field: 'usingSCF', title: translate.t('home.analyze.table.usingSCF'), width: '100px', allowHide: true, hidden: false, filter: 'boolean', resizable: true, className: 'text-center', cell: 'booleanTemplate' }, // NEW COLUMN
  // ... rest of columns
]
```

#### 2.4 Update Other Grid Column Files
**Files to update:**
- `src/modules/home/analyze/data/graphqlColums.ts` - Add after line 14
- `src/modules/home/plan/data/graphqlColumns.ts` - Add after line 14
- `src/modules/home/analyze/data/9boxesGraphQlColumns.ts` - Add to all grid definitions
- `src/modules/home/analyze/data/waterfallGraphQlColumns.ts` - Add after line 15

- [ ] Add `...globalColumns.onSCF` to all supplier grid column definitions
- [ ] Ensure consistent positioning (after `capturedCashDiscount`)

#### 2.5 Update GraphQL Query Edges
**Files to update:**
- `src/modules/home/categorize/data/categorizeEdges.ts`
- `src/modules/home/analyze/data/analyzeEdges.ts`
- `src/modules/home/plan/data/planEdges.ts`

- [ ] Add `usingSCF` field to GraphQL query edge definitions
- [ ] Ensure field is included in all relevant queries

### Phase 3: Payment Terms Card Badge

#### 3.1 Update PaymentTermsComponent
**File:** `src/modules/valueProposition/componentes/analyzedSipplier/PaymentTermsComponent.vue`

- [ ] Add `usingSCF` prop to component props
- [ ] Create badge element in template (top right corner)
- [ ] Add conditional rendering: `v-if="objData.usingSCF === true"`
- [ ] Style badge with neutral colors (light gray background, dark text)
- [ ] Add responsive positioning

**Expected Template Changes:**
```pug
.payment-terms-class.mb-5.position-relative
    //- SCF Badge (NEW)
    .scf-badge.position-absolute.top-0.end-0(v-if="objData.usingSCF === true")
        span.badge.bg-light.text-dark Currently on SCF
    
    //- Payment Terms (existing)
    span.text-base.font-bold {{ $t('global.paymentTerms') + ' (days)' }}
    // ... rest of template
```

**Expected Style Changes:**
```scss
.scf-badge {
  padding: 4px 8px;
  border-radius: 4px;
  background-color: #F5F5F5;
  color: #333333;
  font-weight: 500;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  margin-right: 0.5rem;
}
```

#### 3.2 Update Parent Component (AnalyzedSupplierContent)
**File:** `src/modules/valueProposition/componentes/analyzedSipplier/AnalyzedSupplierContent.vue`

- [ ] Ensure `usingSCF` is passed to PaymentTermsComponent
- [ ] Verify data flow from API response to component

**Expected Changes:**
```pug
PaymentTermsComponent(:objData="objData.paymentTerms" :usingSCF="objData.usingSCF")
```

#### 3.3 Update Entity Card Payment Terms Section
**File:** `src/modules/home/entityCard/components/opportunity/EntityPaymentTermsStrategies.vue`

- [ ] Add SCF badge to entity card payment terms section
- [ ] Ensure consistent styling with Value Proposition badge
- [ ] Add conditional rendering based on `usingSCF` field

### Phase 4: Agreed Payment Terms Dialog - SCF Accepted Toggle

#### 4.1 Update ModalResults Component
**File:** `src/modules/home/entityCard/components/modals/ModalResults.vue`

##### Template Changes (around line 109-118)
- [ ] Add SCF Accepted toggle after VCard toggle
- [ ] Position in same row as VCard toggle
- [ ] Add conditional rendering based on SCF feature flag
- [ ] Use same toggle component style as VCard

**Expected Template Changes:**
```pug
.row.mr-2(v-if="vCardEnabledFeature")
    IconBadgeManageRebate(width="26" height="23")
    span.ml-3.mr-6.text-xl.text-capitalize.font-bold {{ $t('global.vcardAccepted') }}
    label.switch.ms-3
        input(
            type='checkbox'
            v-model="spendNewTerms.vcardAccepted"
            :checked="spendNewTerms.vcardAccepted"
        )
        span.slider.round

//- NEW: SCF Accepted Toggle
.row.mr-2.ml-4(v-if="scfEnabledFeature")
    IconSCF(width="26" height="23")
    span.ml-3.mr-6.text-xl.text-capitalize.font-bold {{ $t('global.scfAccepted') }}
    label.switch.ms-3
        input(
            type='checkbox'
            v-model="spendNewTerms.scfAccepted"
            :checked="spendNewTerms.scfAccepted"
        )
        span.slider.round
```

##### Script Changes

**Data Initialization (around line 404):**
- [ ] Add `scfAccepted: false` to `spendNewTerms` initial state

**Expected Changes:**
```typescript
spendNewTerms: {
  // ... existing fields
  vcardAccepted: false,
  scfAccepted: false, // NEW FIELD
}
```

**Feature Flag Check:**
- [ ] Add `scfEnabledFeature` computed property
- [ ] Check if SCF feature is enabled in company settings

**Expected Changes:**
```typescript
const scfEnabledFeature = computed(() => {
  // Check if SCF feature is enabled for the company
  return useCompanyStore().getCompanySettings?.scfEnabled ?? false;
});
```

**Load Supplier Data (when dialog opens):**
- [ ] Retrieve `usingSCF` and `scfAccepted` from supplier data
- [ ] Set default toggle state based on `usingSCF` value
- [ ] If `usingSCF === true`, set `scfAccepted = true` by default
- [ ] If `usingSCF === false`, set `scfAccepted = false` by default

**Expected Changes:**
```typescript
// When loading supplier data
if (supplierData.usingSCF === true) {
  data.spendNewTerms.scfAccepted = supplierData.scfAccepted ?? true;
} else {
  data.spendNewTerms.scfAccepted = supplierData.scfAccepted ?? false;
}
```

**Save Payload (around line 948):**
- [ ] Include `scfAccepted` in the save payload
- [ ] Send to backend API

**Expected Changes:**
```typescript
const payload = {
  // ... existing fields
  vcardAccepted: data.spendNewTerms.vcardAccepted,
  scfAccepted: data.spendNewTerms.scfAccepted, // NEW FIELD
};
```

**Reset Form (around line 523, 609):**
- [ ] Reset `scfAccepted` to false when clearing form

**Expected Changes:**
```typescript
data.spendNewTerms.scfAccepted = false;
```

**Success Callback (around line 1052):**
- [ ] Update `scfAccepted` from API response after successful save

**Expected Changes:**
```typescript
data.spendNewTerms.scfAccepted = callbackSuccessData.scfAccepted;
```

### Phase 5: Translations

#### 5.1 Add Translation Keys
**Files to update:**
- `src/locales/en.json`
- `src/locales/es.json` (if applicable)
- Other locale files as needed

- [ ] Add `home.analyze.table.usingSCF` translation
- [ ] Add `global.scfAccepted` translation
- [ ] Add `global.currentlyOnSCF` translation (for badge)

**Expected Translations:**
```json
{
  "home": {
    "analyze": {
      "table": {
        "usingSCF": "Using SCF",
        "capturedCashDiscount": "Captured Cash Discount"
      }
    }
  },
  "global": {
    "scfAccepted": "SCF Accepted",
    "currentlyOnSCF": "Currently on SCF",
    "vcardAccepted": "VCard Accepted"
  }
}
```

### Phase 6: Cell Renderers and Templates

#### 6.1 Create Boolean Cell Template (if not exists)
**File:** `src/modules/components/grid/cellTemplates/BooleanTemplate.vue`

- [ ] Create reusable boolean cell template component
- [ ] Display checkmark icon for `true` values
- [ ] Display empty or "No" for `false` values
- [ ] Handle `null` values gracefully

**Expected Implementation:**
```vue
<template>
  <td :class="className">
    <span v-if="dataItem[field] === true" class="text-success">
      <i class="fa fa-check"></i> Yes
    </span>
    <span v-else-if="dataItem[field] === false" class="text-muted">
      No
    </span>
    <span v-else class="text-muted">-</span>
  </td>
</template>
```

#### 6.2 Register Cell Template
**File:** `src/modules/components/grid/CalculumChildGrid.vue` or similar

- [ ] Register `booleanTemplate` cell renderer
- [ ] Ensure it's available for all grids using the column

### Phase 7: Icon Component (Optional)

#### 7.1 Create SCF Icon Component
**File:** `src/resources/components/icons/IconSCF.vue`

- [ ] Create SCF icon component (similar to IconBadgeManageRebate)
- [ ] Use appropriate SVG or icon library
- [ ] Make size configurable via props

**Expected Implementation:**
```vue
<template>
  <svg :width="width" :height="height" viewBox="0 0 24 24" fill="currentColor">
    <!-- SCF icon SVG path -->
  </svg>
</template>

<script lang="ts">
export default {
  props: {
    width: { type: String, default: "24" },
    height: { type: String, default: "24" }
  }
}
</script>
```

### Phase 8: Feature Flag Integration

#### 8.1 Update Company Store
**File:** `src/stores/company.ts` or `src/composables/useCompany.ts`

- [ ] Add `scfEnabled` to company settings interface
- [ ] Ensure feature flag is loaded from backend
- [ ] Create getter for SCF feature status

**Expected Changes:**
```typescript
interface CompanySettings {
  // ... existing settings
  vCardEnabled: boolean;
  scfEnabled: boolean; // NEW FIELD
}

const scfEnabledFeature = computed(() => {
  return companyStore.getCompanySettings?.scfEnabled ?? false;
});
```

#### 8.2 Update Admin Console (if applicable)
**File:** `src/modules/adminBackend/views/EditCompanyAdmin.vue`

- [ ] Add SCF feature toggle to company settings form
- [ ] Allow admins to enable/disable SCF feature per company

### Phase 9: Data Flow Verification

#### 9.1 GraphQL Query Updates
**Files to verify:**
- `src/modules/home/categorize/data/categorizeEdges.ts`
- `src/modules/home/analyze/data/analyzeEdges.ts`
- `src/modules/home/plan/data/planEdges.ts`

- [ ] Verify `usingSCF` is included in GraphQL queries
- [ ] Verify `scfAccepted` is included in supplier detail queries
- [ ] Test queries return expected data

#### 9.2 API Integration
**Files to verify:**
- `src/modules/home/entityCard/api/index.ts`

- [ ] Verify agreed payment terms API calls include `scfAccepted`
- [ ] Verify response handling includes `scfAccepted`
- [ ] Add error handling for SCF-related fields

### Phase 10: Testing

#### 10.1 Unit Tests

**Test Files to Create/Update:**
- `tests/Unit/Components/ModalResults.spec.ts`
- `tests/Unit/Components/PaymentTermsComponent.spec.ts`
- `tests/Unit/Components/SupplierGrid.spec.ts`

**Test Cases:**
- [ ] ModalResults: SCF toggle appears when feature is enabled
- [ ] ModalResults: SCF toggle hidden when feature is disabled
- [ ] ModalResults: SCF toggle defaults to ON when `usingSCF = true`
- [ ] ModalResults: SCF toggle defaults to OFF when `usingSCF = false`
- [ ] ModalResults: SCF toggle state is included in save payload
- [ ] PaymentTermsComponent: Badge appears when `usingSCF = true`
- [ ] PaymentTermsComponent: Badge hidden when `usingSCF = false`
- [ ] SupplierGrid: "Using SCF" column displays correctly
- [ ] SupplierGrid: "Using SCF" column is sortable and filterable

#### 10.2 E2E Tests

**Test Files to Create/Update:**
- `e2e/tests/entityCard/opportunity/agreed-payment-terms.spec.ts`
- `e2e/tests/suppliers/supplier-grid.spec.ts`

**Test Scenarios:**
- [ ] User can see "Using SCF" column in supplier grid
- [ ] User can sort by "Using SCF" column
- [ ] User can filter by "Using SCF" column
- [ ] User sees "Currently on SCF" badge on supplier detail page when applicable
- [ ] User sees SCF Accepted toggle in Agreed Payment Terms dialog
- [ ] User can toggle SCF Accepted ON/OFF
- [ ] SCF Accepted toggle defaults to ON for SCF suppliers
- [ ] SCF Accepted toggle defaults to OFF for non-SCF suppliers
- [ ] SCF Accepted value is saved correctly
- [ ] SCF toggle is hidden when feature is disabled

**E2E Test Implementation:**
```typescript
test('should display "Using SCF" column in supplier grid', async ({ page }) => {
  await page.goto('/suppliers');
  await page.waitForSelector('[data-testid="supplier-grid"]');
  
  const columnHeader = page.locator('th:has-text("Using SCF")');
  await expect(columnHeader).toBeVisible();
});

test('should display SCF badge when supplier is using SCF', async ({ page }) => {
  // Navigate to supplier detail page with usingSCF = true
  await page.goto('/supplier/123');
  
  const badge = page.locator('.scf-badge:has-text("Currently on SCF")');
  await expect(badge).toBeVisible();
});

test('should display SCF Accepted toggle in Agreed Payment Terms dialog', async ({ page }) => {
  // Open agreed payment terms dialog
  await page.click('[data-testid="add-results-button"]');
  
  const scfToggle = page.locator('input[type="checkbox"][v-model="spendNewTerms.scfAccepted"]');
  await expect(scfToggle).toBeVisible();
});

test('SCF Accepted toggle should default to ON for SCF suppliers', async ({ page }) => {
  // Open dialog for supplier with usingSCF = true
  await page.click('[data-testid="add-results-button"]');
  
  const scfToggle = page.locator('input[type="checkbox"][v-model="spendNewTerms.scfAccepted"]');
  await expect(scfToggle).toBeChecked();
});
```

### Phase 11: Documentation

#### 11.1 Update Component Documentation
- [ ] Add JSDoc comments to new components and functions
- [ ] Document props, events, and data structures
- [ ] Add usage examples

#### 11.2 Update User Documentation
- [ ] Document new "Using SCF" column in user manual
- [ ] Document "Currently on SCF" badge in user manual
- [ ] Document "SCF Accepted" toggle in user manual
- [ ] Add screenshots/examples

### Phase 12: Code Review and Quality Checks

#### 12.1 Linting and Formatting
- [ ] Run ESLint on all modified files
- [ ] Run Prettier on all modified files
- [ ] Fix any linting errors
- [ ] Ensure consistent code style

#### 12.2 Type Safety
- [ ] Verify all TypeScript types are correct
- [ ] Fix any type errors
- [ ] Ensure no `any` types are used unnecessarily

#### 12.3 Performance
- [ ] Verify grid performance with "Using SCF" column
- [ ] Ensure no unnecessary re-renders
- [ ] Optimize GraphQL queries if needed

#### 12.4 Accessibility
- [ ] Ensure badge has appropriate ARIA labels
- [ ] Ensure toggle has appropriate labels
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility

### Phase 13: Browser Testing

#### 13.1 Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge

#### 13.2 Responsive Testing
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify badge positioning on all screen sizes
- [ ] Verify grid column display on all screen sizes

### Phase 14: Integration Testing

#### 14.1 End-to-End Integration
- [ ] Test complete flow: View grid → View supplier detail → Edit agreed terms → Save
- [ ] Verify data consistency across all views
- [ ] Test with real backend API
- [ ] Verify feature flag behavior

#### 14.2 Edge Cases
- [ ] Test with `usingSCF = null`
- [ ] Test with `scfAccepted = null`
- [ ] Test with SCF feature disabled
- [ ] Test with no SCF suppliers in dataset
- [ ] Test with all suppliers using SCF
- [ ] Test concurrent edits by multiple users

## Implementation Order

### Recommended Implementation Sequence:
1. **Phase 1**: Type Definitions (Foundation)
2. **Phase 2**: Column Definitions (Grid functionality)
3. **Phase 5**: Translations (Required for display)
4. **Phase 6**: Cell Renderers (Grid display)
5. **Phase 3**: Payment Terms Badge (Visual indicator)
6. **Phase 7**: Icon Component (If needed for toggle)
7. **Phase 4**: Agreed Payment Terms Toggle (Main feature)
8. **Phase 8**: Feature Flag Integration (Control visibility)
9. **Phase 9**: Data Flow Verification (Integration)
10. **Phase 10**: Testing (Quality assurance)
11. **Phase 11**: Documentation (Knowledge transfer)
12. **Phase 12-14**: Quality Checks and Integration Testing

## Dependencies

### External Dependencies
- Backend API must be ready with required fields
- Feature flag must be configurable in Admin Console
- Database migration must be completed

### Internal Dependencies
- Company store must support SCF feature flag
- Grid components must support boolean cell templates
- Modal components must support dynamic toggles

## Rollback Plan

### If Issues Arise:
1. **Feature Flag**: Disable SCF feature via Admin Console (immediate rollback)
2. **Column Visibility**: Hide "Using SCF" column by default in column definitions
3. **Badge**: Remove conditional rendering (hide badge)
4. **Toggle**: Hide toggle with feature flag check

### Rollback Steps:
1. Set `scfEnabled = false` in company settings
2. Set `hidden: true` for `usingSCF` column in all grid definitions
3. Remove badge from PaymentTermsComponent template
4. Verify no errors in console
5. Verify existing functionality still works

## Success Criteria

### Feature is Complete When:
- [ ] "Using SCF" column appears in all supplier grids by default
- [ ] "Using SCF" column is positioned after "Captured Cash Discount"
- [ ] "Using SCF" column displays "Yes" for SCF suppliers, "No" for others
- [ ] "Using SCF" column is sortable and filterable
- [ ] "Currently on SCF" badge appears on Payment Terms card when `usingSCF = true`
- [ ] Badge is positioned in top right corner with appropriate styling
- [ ] Badge does not appear when `usingSCF = false`
- [ ] "SCF Accepted" toggle appears in Agreed Payment Terms dialog when feature is enabled
- [ ] Toggle is positioned alongside "VCard Accepted" toggle
- [ ] Toggle defaults to ON when `usingSCF = true`
- [ ] Toggle defaults to OFF when `usingSCF = false`
- [ ] Toggle state is saved to backend API
- [ ] Toggle state is loaded from backend API
- [ ] Feature flag controls visibility of toggle
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] No linting errors
- [ ] No type errors
- [ ] Works in all supported browsers
- [ ] Works on all screen sizes
- [ ] Accessible via keyboard and screen readers
- [ ] Documentation is complete

## Notes

### Design Considerations:
- Badge should be subtle but visible (neutral colors)
- Toggle should match existing VCard toggle styling
- Column should be visible by default but hideable by users
- Feature should degrade gracefully if backend data is missing

### Performance Considerations:
- Adding column to grids may impact performance for large datasets
- Consider pagination and virtualization if needed
- GraphQL queries should be optimized to include only necessary fields

### Security Considerations:
- Validate user permissions before displaying SCF data
- Ensure feature flag is enforced server-side as well
- Validate `scfAccepted` input on backend before saving

### Future Enhancements:
- Bulk update SCF Accepted for multiple suppliers
- SCF reporting and analytics
- SCF history tracking
- SCF notifications and alerts

## Related Files

### Key Files Modified:
- `src/types/index.ts`
- `src/modules/home/data/globalColumns.ts`
- `src/modules/home/categorize/data/graphqlColums.ts`
- `src/modules/home/categorize/data/columns.ts`
- `src/modules/home/entityCard/types/index.ts`
- `src/modules/home/entityCard/components/modals/ModalResults.vue`
- `src/modules/valueProposition/componentes/analyzedSipplier/PaymentTermsComponent.vue`
- `src/locales/en.json`

### Key Files to Review:
- `src/modules/components/grid/SupplierGrid.vue`
- `src/modules/home/entityCard/api/index.ts`
- `src/stores/company.ts`
- `e2e/tests/entityCard/opportunity/agreed-payment-terms.spec.ts`

## Contact and Support

### Questions or Issues:
- Review this checklist thoroughly before starting implementation
- Verify backend API is ready before frontend work
- Test each phase independently before moving to next phase
- Document any deviations from this plan

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-22  
**Status:** Ready for Implementation
