# SCF Badge Feature - Technical Integration Notes

## Existing SCF Infrastructure

The codebase already has some SCF-related infrastructure that can be leveraged for this implementation:

### 1. Feature Flag System

**Location:** `src/constants/featureRoles.ts` and `src/utils/featureRoleUtils.ts`

The system already has an SCF feature flag defined:

```typescript
// src/constants/featureRoles.ts
export const FEATURE_ROLES = {
  SCF_STRATEGY: "FEATURE_SCF_STRATEGY",
  // ... other features
}

export const FEATURE_SCF_STRATEGY = FEATURE_ROLES.SCF_STRATEGY;
```

**Feature Check Function:**
```typescript
// src/utils/featureRoleUtils.ts
export function hasScfStrategyFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.SCF_STRATEGY);
}
```

**Usage in Components:**
```typescript
// src/services/user/composables/useUser.ts
const useFeatureScfStrategy = () => {
  if (!user.value) {
    return false;
  }
  return hasScfStrategyFeature(user.value.roles);
}
```

### 2. Existing SCF-Related Code

**Admin Backend - SCF Grid Columns:**
- File: `src/modules/adminBackend/data/supplyChainFinanceGridColumns.ts`
- Contains grid column definitions for SCF management in admin area
- Shows pattern for SCF-related grid columns

**Data Grid Utilities:**
- File: `src/utils/dataGridClear.ts`
- Contains functions to remove SCF-related columns:
  - `scalePotentialSCFRevenue` column removal
  - `scfBox` column removal
  - `removescfGroupStandardStrategy()` function

**Type Definitions:**
- File: `src/types/index.ts`
- Already has some SCF-related fields:
  - `scfStandardStrategy: boolean` (line 214)
  - `scfBox: string | null` (line 647)
  - `ScfStrategyFeatureRole` type (line 428)

### 3. Plan Module Integration

**Files using SCF feature:**
- `src/modules/home/plan/components/PlanLists.vue`
- `src/modules/home/plan/components/PlanEditLists.vue`

These files already use `useFeatureScfStrategy()` to conditionally show/hide SCF-related columns.

## Implementation Strategy Based on Existing Patterns

### 1. Feature Flag Integration

**Use the existing SCF feature flag for the toggle:**

```typescript
// In ModalResults.vue
import { useUser } from '@/services/user/composables/useUser';

const { useFeatureScfStrategy } = useUser();
const scfEnabledFeature = computed(() => useFeatureScfStrategy());
```

**Template:**
```pug
//- SCF Accepted Toggle (only show if feature is enabled)
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

### 2. Column Management Pattern

**Follow the existing pattern from VCard columns:**

Looking at `src/modules/home/data/globalColumns.ts`, the VCard columns are defined around line 802:

```typescript
export const vCardGroup = [
  {
    field: "vCardGroupName",
    title: translate.t("global.vCard.headerColumnTitle.vCardGroup"),
    width: "300px",
    allowHide: true,
    hidden: true, // Note: VCard is hidden by default
    sortable: true,
    // ... other properties
  }
];
```

**For SCF column, we should define it similarly but visible by default:**

```typescript
export const usingSCF = [
  {
    field: "usingSCF",
    title: translate.t("home.analyze.table.usingSCF"),
    width: "100px",
    allowHide: true,
    hidden: false, // Visible by default (different from VCard)
    sortable: true,
    filter: "boolean",
    resizable: true,
    className: "text-center",
    cell: "booleanTemplate",
  }
];
```

### 3. Grid Column Removal Pattern

**If SCF feature is disabled, we may need to remove the column:**

Follow the pattern from `src/utils/dataGridClear.ts`:

```typescript
export const removeUsingSCFColumn = (columns: any, scfFeatureEnabled: boolean = false): any => {
  if (!scfFeatureEnabled) {
    const usingSCFIndex = columns.findIndex((x: any) => x.field === 'usingSCF');
    if (usingSCFIndex > -1) {
      columns.splice(usingSCFIndex, 1);
    }
  }
  return columns;
}
```

**Usage in grid components:**

```typescript
// In PlanLists.vue or similar
const { useFeatureScfStrategy } = useUser();

// When setting up columns
let resetColumns = [...defaultColumns];
resetColumns = cacheGrid.removeUsingSCFColumn(resetColumns, useFeatureScfStrategy());
```

### 4. Store Integration Pattern

**Looking at existing store usage in PlanLists.vue:**

The plan module stores column configurations in the home store:
- `homeStore.setHomePlanColumnOrderSpendsCF()`
- `homeStore.setHomePlanPhaseColumnOrderSuppliersCF()`
- `homeStore.setHomePlanPhaseColumnOrderParentsCF()`

**For our implementation:**
- The "Using SCF" column should be included in the default column definitions
- It will be automatically cached with the rest of the columns
- No special store handling needed unless we want to persist column visibility preferences

## Key Differences from Existing SCF Implementation

### 1. Column Visibility

**Existing SCF columns:** Hidden by default, shown only when feature is enabled

**New "Using SCF" column:** Visible by default, always shown (not controlled by feature flag)

**Rationale:** The "Using SCF" column shows data from the spend file, which is always available. The feature flag only controls the "SCF Accepted" toggle in the dialog.

### 2. Feature Flag Scope

**Existing usage:** Controls visibility of entire SCF strategy features and columns

**New usage:** 
- "Using SCF" column: Always visible (no feature flag check)
- "Currently on SCF" badge: Always visible when data is true (no feature flag check)
- "SCF Accepted" toggle: Controlled by feature flag

### 3. Data Source

**Existing SCF fields:** Calculated/derived fields (e.g., `scfBox`, `scfStandardStrategy`)

**New fields:**
- `usingSCF`: Direct field from spend file (Boolean)
- `scfAccepted`: User-entered field stored in database (Boolean)

## Integration Checklist

### Phase 1: Types and Interfaces

- [ ] Add `usingSCF: boolean | null` to Supplier interface in `src/types/index.ts`
- [ ] Add `scfAccepted: boolean | null` to Supplier interface in `src/types/index.ts`
- [ ] Add `scfAccepted: boolean` to ModalResults `spendNewTerms` interface in `src/modules/home/entityCard/types/index.ts`
- [ ] Verify no conflicts with existing SCF-related types

### Phase 2: Feature Flag Integration

- [ ] Reuse existing `useFeatureScfStrategy()` from `useUser` composable
- [ ] Apply feature flag check only to "SCF Accepted" toggle, not to column or badge
- [ ] Document that column and badge are independent of feature flag

### Phase 3: Column Definitions

- [ ] Add `usingSCF` column to `src/modules/home/data/globalColumns.ts`
- [ ] Position after `capturedCashDiscount` (line ~796)
- [ ] Set `hidden: false` (visible by default)
- [ ] Add to all grid column files (categorize, analyze, plan, 9boxes, waterfall)
- [ ] Update GraphQL edges to include `usingSCF` field

### Phase 4: Cell Renderer

- [ ] Check if `booleanTemplate` cell renderer exists
- [ ] If not, create `src/modules/components/grid/cellTemplates/BooleanTemplate.vue`
- [ ] Register cell renderer in grid component
- [ ] Test rendering with true/false/null values

### Phase 5: Badge Implementation

- [ ] Update `PaymentTermsComponent.vue` to accept `usingSCF` prop
- [ ] Add badge element with conditional rendering (`v-if="objData.usingSCF === true"`)
- [ ] Style badge with neutral colors (light gray background, dark text)
- [ ] Position in top right corner without overlapping content
- [ ] Test responsive behavior

### Phase 6: Toggle Implementation

- [ ] Update `ModalResults.vue` template (around line 109-118)
- [ ] Add `scfAccepted: boolean` to data initialization (line ~404)
- [ ] Import and use `useFeatureScfStrategy()` for feature flag check
- [ ] Implement default logic: ON if `usingSCF = true`, OFF otherwise
- [ ] Include `scfAccepted` in save payload (line ~948)
- [ ] Reset `scfAccepted` in clear functions (lines ~523, 609)
- [ ] Update from API response in success callback (line ~1052)

### Phase 7: Icon Component (Optional)

- [ ] Check if SCF icon exists in `src/resources/components/icons/`
- [ ] If not, create `IconSCF.vue` similar to `IconBadgeManageRebate.vue`
- [ ] Make size configurable via props
- [ ] Use in toggle label

### Phase 8: Translations

- [ ] Add `home.analyze.table.usingSCF` to `src/locales/en.json`
- [ ] Add `global.scfAccepted` to `src/locales/en.json`
- [ ] Add `global.currentlyOnSCF` to `src/locales/en.json`
- [ ] Add Spanish translations if needed

### Phase 9: GraphQL Integration

- [ ] Update categorize edges: `src/modules/home/categorize/data/categorizeEdges.ts`
- [ ] Update analyze edges: `src/modules/home/analyze/data/analyzeEdges.ts`
- [ ] Update plan edges: `src/modules/home/plan/data/planEdges.ts`
- [ ] Add `usingSCF` field to all relevant queries
- [ ] Add `scfAccepted` field to supplier detail queries

### Phase 10: API Integration

- [ ] Verify Backend API returns `usingSCF` in supplier list responses
- [ ] Verify Backend API returns `usingSCF` and `scfAccepted` in supplier detail responses
- [ ] Verify Backend API accepts `scfAccepted` in agreed payment terms POST/PUT
- [ ] Update API call in `src/modules/home/entityCard/api/index.ts` if needed
- [ ] Add error handling for SCF-related fields

## Testing Strategy

### Unit Tests

**Test the feature flag integration:**
```typescript
describe('ModalResults - SCF Accepted Toggle', () => {
  it('should show SCF toggle when feature is enabled', () => {
    // Mock useFeatureScfStrategy to return true
    // Render component
    // Assert toggle is visible
  });

  it('should hide SCF toggle when feature is disabled', () => {
    // Mock useFeatureScfStrategy to return false
    // Render component
    // Assert toggle is not visible
  });

  it('should default toggle to ON when usingSCF is true', () => {
    // Mock supplier data with usingSCF = true
    // Render component
    // Assert toggle is checked
  });

  it('should default toggle to OFF when usingSCF is false', () => {
    // Mock supplier data with usingSCF = false
    // Render component
    // Assert toggle is not checked
  });
});
```

### E2E Tests

**Test the complete flow:**
```typescript
test('should display Using SCF column in supplier grid', async ({ page }) => {
  await page.goto('/suppliers');
  const columnHeader = page.locator('th:has-text("Using SCF")');
  await expect(columnHeader).toBeVisible();
});

test('should display SCF badge when supplier is using SCF', async ({ page }) => {
  // Navigate to supplier with usingSCF = true
  await page.goto('/supplier/123');
  const badge = page.locator('.scf-badge:has-text("Currently on SCF")');
  await expect(badge).toBeVisible();
});

test('should save SCF Accepted value when saving agreed terms', async ({ page }) => {
  // Open agreed payment terms dialog
  await page.click('[data-testid="add-results-button"]');
  
  // Toggle SCF Accepted
  await page.click('input[v-model="spendNewTerms.scfAccepted"]');
  
  // Fill required fields and save
  await page.fill('input[v-model="spendNewTerms.termsWithoutCashDiscount"]', '45');
  await page.click('button:has-text("Save")');
  
  // Verify API call includes scfAccepted
  // Verify success message
});
```

## Potential Issues and Solutions

### Issue 1: Column Positioning

**Problem:** Adding column after "Captured Cash Discount" may shift other columns

**Solution:** 
- Test grid layout with new column
- Adjust column widths if needed
- Ensure responsive behavior on smaller screens

### Issue 2: Feature Flag Confusion

**Problem:** Developers may assume all SCF features use the same feature flag

**Solution:**
- Document clearly that column and badge are independent of feature flag
- Add comments in code explaining the difference
- Update feature flag documentation

### Issue 3: GraphQL Query Performance

**Problem:** Adding new field to queries may impact performance

**Solution:**
- Verify field is indexed in database
- Test query performance with large datasets
- Consider pagination if needed

### Issue 4: Null Values

**Problem:** `usingSCF` or `scfAccepted` may be null for some suppliers

**Solution:**
- Handle null values in cell renderer (show "-" or empty)
- Handle null values in badge conditional (don't show badge)
- Handle null values in toggle default logic (default to OFF)

### Issue 5: Data Consistency

**Problem:** `usingSCF` from spend file may not match `scfAccepted` from database

**Solution:**
- Implement intelligent default logic in toggle
- Allow users to override default
- Document that `usingSCF` is source of truth from spend file
- `scfAccepted` is user-entered negotiation status

## Rollback Strategy

### Quick Rollback (Feature Flag)

**If issues arise, disable the toggle immediately:**

```typescript
// In ModalResults.vue
const scfEnabledFeature = computed(() => false); // Force disable
```

### Column Rollback

**Hide the column by default:**

```typescript
// In globalColumns.ts
export const usingSCF = [
  {
    field: "usingSCF",
    hidden: true, // Change to hidden
    // ... rest of config
  }
];
```

### Badge Rollback

**Remove badge rendering:**

```vue
<!-- In PaymentTermsComponent.vue -->
<!-- Comment out or remove badge element -->
<!-- .scf-badge(v-if="false") -->
```

### Complete Rollback

**If needed, revert all changes:**

1. Remove `usingSCF` and `scfAccepted` from type definitions
2. Remove `usingSCF` column from all grid definitions
3. Remove badge from PaymentTermsComponent
4. Remove toggle from ModalResults
5. Remove translations
6. Remove GraphQL field additions

## Next Steps After Implementation

### 1. Monitoring

- Monitor API response times for queries with new fields
- Monitor error logs for SCF-related errors
- Track feature flag usage (how many companies have it enabled)

### 2. User Feedback

- Gather feedback on column visibility (is it useful by default?)
- Gather feedback on badge placement (is it noticeable?)
- Gather feedback on toggle behavior (is default logic intuitive?)

### 3. Future Enhancements

- Add bulk update for SCF Accepted
- Add SCF reporting and analytics
- Add SCF history tracking
- Add SCF notifications

### 4. Documentation Updates

- Update user manual with screenshots
- Update API documentation
- Update developer documentation
- Create training materials

## References

### Key Files to Review

**Feature Flag System:**
- `src/constants/featureRoles.ts`
- `src/utils/featureRoleUtils.ts`
- `src/services/user/composables/useUser.ts`

**Existing SCF Code:**
- `src/modules/adminBackend/data/supplyChainFinanceGridColumns.ts`
- `src/utils/dataGridClear.ts`
- `src/modules/home/plan/components/PlanLists.vue`

**Grid Column Patterns:**
- `src/modules/home/data/globalColumns.ts`
- `src/modules/home/categorize/data/graphqlColums.ts`
- `src/modules/home/categorize/data/columns.ts`

**Modal and Toggle Patterns:**
- `src/modules/home/entityCard/components/modals/ModalResults.vue`
- Look for VCard toggle implementation (lines ~109-118)

**Badge Patterns:**
- Look for existing badge components in `src/resources/components/`
- Check Payment Terms card styling

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-22  
**Status:** Technical Reference for Implementation
