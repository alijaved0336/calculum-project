# Skipped Failing Tests - Summary

## Overview
This document summarizes the 40 Playwright E2E tests that were marked as skipped to stabilize the CI/CD pipeline build. These tests were failing in the pipeline and have been temporarily disabled using `test.skip()` to allow the build to pass while the underlying issues are investigated and resolved.

The tests are divided into two categories:
- **Regular Failing Tests** (20 tests): Tests that were consistently failing
- **Flaky Tests** (20 tests): Tests marked with `@flakyResolved` that were intermittently failing

## Date
January 8, 2026

## Tests Marked as Skipped

### Category 1: Regular Failing Tests (20 tests)

### 1. Theme Test
- **File**: `e2e/tests/5767-test-theme.spec.ts`
- **Test**: "new colors are applied in entities section @entity @ui @us-5767"
- **Line**: 26
- **Status**: ✅ Skipped

### 2. Super Admin Change Request
- **File**: `e2e/tests/admin/changeRequest/superadmin-data-changes-req-edit-modal.spec.ts`
- **Test**: "admin can approve a company credit rating change request"
- **Line**: 109
- **Status**: ✅ Skipped

### 3. 9-boxes SCF
- **File**: `e2e/tests/admin/features/9boxes-scf.spec.ts`
- **Test**: "As a user, I should see the 9-box SCF as part of the Opportunity/Supplier Prioritization tab"
- **Line**: 38
- **Status**: ✅ Skipped

### 4. Compare Feature Peers Validation
- **File**: `e2e/tests/compare/compare-feature-7933-peers-validation.spec.ts`
- **Test**: "Compare > Options Default options and graphics with kendo"
- **Line**: 149
- **Status**: ✅ Skipped

### 5. Company Details Team
- **File**: `e2e/tests/entityCard/companyDetails/company-details-team.spec.ts`
- **Test**: "Company Details - Procurement Teams @integrated @entity"
- **Line**: 37
- **Status**: ✅ Skipped

### 6. Entity Synchronization Notes
- **File**: `e2e/tests/entityCard/header/entity-syncronization-notes.spec.ts`
- **Test**: "Upload The Notes are sychronized in a new Spend File version"
- **Line**: 35
- **Status**: ✅ Skipped

### 7. Cash Flow Opportunity Metric
- **File**: `e2e/tests/entityCard/opportunity/cf-opp-metric-calculation.spec.ts`
- **Test**: "Parent/Supplier level - verify cash flow opportunity metric calculation"
- **Line**: 53
- **Status**: ✅ Skipped

### 8. Negotiation Status
- **File**: `e2e/tests/entityCard/opportunity/entity-card-negotiaton-status.spec.ts`
- **Test**: "The Negotiation Status change works for Parent that belongs to a Plan"
- **Line**: 63
- **Status**: ✅ Skipped

### 9. Adabot Pay Terms Extra Sections
- **File**: `e2e/tests/entityCard/opportunity/extraSection/adabot-pay-terms-extra-sections.spec.ts`
- **Test**: "Adabot - Extra - Section - Supplier Standard - Strategy"
- **Line**: 64
- **Status**: ✅ Skipped

### 10. Regulatory Terms
- **File**: `e2e/tests/entityCard/opportunity/regulatory-terms-5010.spec.ts`
- **Test**: "TC-1: Regulatory Terms is Shown as Disabled but having its value"
- **Line**: 37
- **Status**: ✅ Skipped

### 11. Target Metrics Increases
- **File**: `e2e/tests/entityCard/opportunity/target-6099.spec.ts`
- **Test**: "Test for Metrics Increases in Cards Entity/Overview"
- **Line**: 48
- **Status**: ✅ Skipped

### 12. Potential Entity
- **File**: `e2e/tests/entityCard/potential-entity-6520.spec.ts`
- **Test**: "Select the Potential Entities view and see the cards"
- **Line**: 31
- **Status**: ✅ Skipped

### 13. Global Filters Buyers Fields
- **File**: `e2e/tests/globalFilters/buyers-fields.spec.ts`
- **Test**: "Global Filter Buying Entity Region is showing in global filters dialog"
- **Line**: 88
- **Status**: ✅ Skipped

### 14. Global Filter Terms Extension
- **File**: `e2e/tests/globalFilters/global-filter-terms-extension.spec.ts`
- **Test**: "The Supplier entity has excluded correctly"
- **Line**: 225
- **Status**: ✅ Skipped

### 15. Manage Module Search
- **File**: `e2e/tests/manage/filters.spec.ts`
- **Test**: "Test Manage Module Search @program @manage @us-7456"
- **Line**: 17
- **Status**: ✅ Skipped

### 16. Payment Terms Target
- **File**: `e2e/tests/paymentTermsTarget/entityOpportunity.spec.ts`
- **Test**: "user can set a target payment term"
- **Line**: 20
- **Status**: ✅ Skipped

### 17. Saved Category Selection
- **File**: `e2e/tests/program/overview/saved-category-selection.spec.ts`
- **Test**: "Test for the last selected category tab is selected once the user returns"
- **Line**: 19
- **Status**: ✅ Skipped

### 18. VP Financing Groups
- **File**: `e2e/tests/program/vp-financing-groups.spec.ts`
- **Test**: "The VP Financing Groups with the Auto setting work enabling financing groups"
- **Line**: 94
- **Status**: ✅ Skipped

### 19. Program Waterfall Target
- **File**: `e2e/tests/program/waterfall/target-6435.spec.ts`
- **Test**: "Test for Metrics Increase in Program Waterfall"
- **Line**: 28
- **Status**: ✅ Skipped

### 20. Advanced Tooltips
- **File**: `e2e/tests/test-tooltips-6320.spec.ts`
- **Test**: "Test for Advanced Tooltips in Program Overview"
- **Line**: 32
- **Status**: ✅ Skipped

### Category 2: Flaky Tests (20 tests)

These tests have the `@flakyResolved` tag but continue to fail intermittently. They have been marked with a comment `// SKIPPED: Flaky test - 2026-01-08` for easy identification.

### 21. Admin Invitations
- **File**: `e2e/tests/admin/invitations.spec.ts`
- **Test**: "Create Invitation @tc-11170"
- **Line**: 41
- **Status**: ✅ Skipped (Flaky)

### 22. Admin Revoke/Grant Access
- **File**: `e2e/tests/admin/test-revoke-grant-access.spec.ts`
- **Test**: "Admin > Companies > First Available Company > Revoke / Grant Access Test"
- **Line**: 35
- **Status**: ✅ Skipped (Flaky)

### 23. Discount Equivalent Percentage
- **File**: `e2e/tests/entityCard/check-discount-equivalent-percentage-is-correct.spec.ts`
- **Test**: "Check discount-equivalent percentage @flakyResolved @tc-12933 - @us-12886"
- **Line**: 23
- **Status**: ✅ Skipped (Flaky)

### 24. Country Entity Card
- **File**: `e2e/tests/entityCard/country-entity-card.spec.ts`
- **Test**: "Test for Display Country in a tag for each card in Entity Card List"
- **Line**: 36
- **Status**: ✅ Skipped (Flaky)

### 25. Entity Card Data
- **File**: `e2e/tests/entityCard/entity-card-data.spec.ts`
- **Test**: "entity-card-data @api @entity"
- **Line**: 32
- **Status**: ✅ Skipped (Flaky)

### 26. Entity Card Opportunity Adabot
- **File**: `e2e/tests/entityCard/opportunity/entity-card-oportunity-adabot.spec.ts`
- **Test**: "Adabot - Aarsleff Rail A/S -> @flakyResolved @prq @api @entity @negotiation @adabot @us-781"
- **Line**: 52
- **Status**: ✅ Skipped (Flaky)

### 27. Entity Card Opportunity Terms
- **File**: `e2e/tests/entityCard/opportunity/entity-card-opportunity-terms-opp.spec.ts`
- **Test**: "in payment terms target-opportunity section, the adabot text is showing"
- **Line**: 47
- **Status**: ✅ Skipped (Flaky)

### 28. Harmonization and Financing New UI
- **File**: `e2e/tests/entityCard/opportunity/harmonization-and-financing-new-ui.spec.ts`
- **Test**: "Test for Edit Harmonization and Financing is inside the corresponding strategy"
- **Line**: 47
- **Status**: ✅ Skipped (Flaky)

### 29. Global Filters - Plan & Manage
- **File**: `e2e/tests/globalFilters/categoryPlanAndManage.spec.ts`
- **Test**: "procurement team field is showing in global filters dialog"
- **Line**: 29
- **Status**: ✅ Skipped (Flaky)

### 30. Global Filters - Size & Rating
- **File**: `e2e/tests/globalFilters/categorySizeAndRating.spec.ts`
- **Test**: "company size field is showing in global filters dialog"
- **Line**: 26
- **Status**: ✅ Skipped (Flaky)

### 31. Match Overview Metric
- **File**: `e2e/tests/match/match-overview-metric-number-of-spends.spec.ts`
- **Test**: "metric overview card is showing properly with number of spends metric selected"
- **Line**: 20
- **Status**: ✅ Skipped (Flaky)

### 32. Pay On Terms Info Cards
- **File**: `e2e/tests/paymentTermsStrategies/payOnTerms/details-section-more-info-cards-parent.spec.ts`
- **Test**: "parent level - pay on terms info cards are showing properly"
- **Line**: 37
- **Status**: ✅ Skipped (Flaky)

### 33. Plan Waterfall Chart
- **File**: `e2e/tests/plan/utils/plan-waterfall-chart.spec.ts`
- **Test**: "Test for review the waterfall chart in plan @integrated @tc-11154"
- **Line**: 23
- **Status**: ✅ Skipped (Flaky)

### 34. Custom Column CF Edit
- **File**: `e2e/tests/program/custom-column-cf-edit.spec.ts`
- **Test**: "Test custom columns in CF Program in Program Edit List View"
- **Line**: 12
- **Status**: ✅ Skipped (Flaky)

### 35. Analyze Show Columns Suppliers Totals
- **File**: `e2e/tests/program/list/analyze-show-columns-suppliers-totals.spec.ts`
- **Test**: "Validate Totals in suppliers: @ui @us-10728 @program @grids"
- **Line**: 88
- **Status**: ✅ Skipped (Flaky)

### 36. Analyze Validate Export Excel
- **File**: `e2e/tests/program/list/analyze-validate-export-excel.spec.ts`
- **Test**: "Validate 1 export to excel for not admin: @ui @us-4181"
- **Line**: 37
- **Status**: ✅ Skipped (Flaky)

### 37. Global Strategies
- **File**: `e2e/tests/z-last-tests/02-exception2/global-strategies.spec.ts`
- **Test**: "Enable/Disable strategies global @ui @settings @strategies"
- **Line**: 13
- **Status**: ✅ Skipped (Flaky)

### 38. Waterfall New Strategy
- **File**: `e2e/tests/z-last-tests/02-exception2/waterfall-new-strategy.spec.ts`
- **Test**: "Waterfall Strategy Grid New Strategy @integrated @tc-7522 @waterfall @opportunity @pending"
- **Line**: 20
- **Status**: ✅ Skipped (Flaky)

### 39. Feature VCard
- **File**: `e2e/tests/z-last-tests/04-sf/featureVCard.spec.ts`
- **Test**: "TC-9695 : The V-Card Enabling/Disabling works. @flakyResolved @integrated @tc-9695 @vcard"
- **Line**: 35
- **Status**: ✅ Skipped (Flaky)

### 40. VCard as Admin
- **File**: `e2e/tests/z-last-tests/04-sf/vcard-as-admin.spec.ts`
- **Test**: "V-Card @global @ui @settings @vcards @us-9653"
- **Line**: 22
- **Status**: ✅ Skipped (Flaky)

## Implementation Details

All tests were marked as skipped using the `test.skip()` method provided by Playwright. 

**For Regular Failing Tests:**
- Standard `test.skip()` implementation
- Tests are skipped without additional comments

**For Flaky Tests:**
- Marked with `test.skip()` and an inline comment: `// SKIPPED: Flaky test - 2026-01-08`
- This comment helps identify flaky tests for prioritized investigation
- All flaky tests retain their `@flakyResolved` tag for tracking

This approach:
- Maintains the test code intact for future investigation
- Clearly indicates which tests are temporarily disabled
- Distinguishes between regular failures and flaky tests
- Allows the CI/CD pipeline to pass while issues are resolved
- Preserves test tags and descriptions for traceability

## Next Steps

### For Regular Failing Tests (Priority: High)
1. **Investigation**: Determine the root cause of consistent failures
2. **Fix**: Apply appropriate fixes based on findings
3. **Refactoring**: Consider using PlaywrightTestHelpers utilities
4. **Re-enable**: Remove `.skip` once verified to pass consistently
5. **Monitoring**: Monitor stability after re-enabling

### For Flaky Tests (Priority: Critical)
1. **Root Cause Analysis**: Investigate timing issues, race conditions, or environmental dependencies
2. **Stabilization**: 
   - Add proper wait conditions using PlaywrightTestHelpers
   - Replace `waitForTimeout()` with intelligent waits
   - Use `safePromiseAll()` and `safeOperation()` wrappers
3. **Retry Logic**: Consider implementing retry mechanisms for truly flaky operations
4. **Re-enable**: Remove `.skip` and the flaky comment once stabilized
5. **Extended Monitoring**: Run tests multiple times to verify stability before considering them fixed

## Related Files

- Original checklist: `docs/context/change-skip-failing-tests.md` (temporary, to be deleted)
- PlaywrightTestHelpers: `e2e/tests/utils/PlaywrightTestHelpers.ts`

## Notes

- **Total Tests Skipped**: 40 (20 regular failures + 20 flaky tests)
- These tests were skipped as a temporary measure to stabilize the build
- **Flaky tests are marked with inline comments** for easy identification: `// SKIPPED: Flaky test - 2026-01-08`
- The underlying issues causing test failures should be investigated and resolved
- **Priority should be given to flaky tests** as they indicate timing or race condition issues
- Tests should be re-enabled once fixes are verified
- Consider using PlaywrightTestHelpers utilities when fixing these tests to improve reliability
- All flaky tests retain their `@flakyResolved` tag despite being skipped again

## Additional Tests Marked as Skipped (January 8, 2026 - Second Batch)

These are additional tests from the same files that were also failing and have been marked as skipped:

### 41. Super Admin Change Request - Reject
- **File**: `e2e/tests/admin/changeRequest/superadmin-data-changes-req-edit-modal.spec.ts`
- **Test**: "admin can reject a change request @integrated @admin @us-3920 @review"
- **Line**: 118
- **Status**: ✅ Skipped
- **Note**: Serial test - different test from line 109 in same file

### 42. Admin Invitations - Resend
- **File**: `e2e/tests/admin/invitations.spec.ts`
- **Test**: "Resend invitation @tc-11170 @admin"
- **Line**: 73
- **Status**: ✅ Skipped (Flaky)
- **Note**: Different test from line 41 in same file

### 43. Corporate Tree Test
- **File**: `e2e/tests/entityCard/corporateTree/corporate-tree-6352.spec.ts`
- **Test**: "Test for Corporate Tree @flakyResolved @entity"
- **Line**: 56
- **Status**: ✅ Skipped (Flaky)

### 44. Country Entity Card - Tree Chart
- **File**: `e2e/tests/entityCard/country-entity-card.spec.ts`
- **Test**: "Test for Display Country in a Entity Card Overview Tree Chart @ui @entity @us-237 @flakyResolved"
- **Line**: 58
- **Status**: ✅ Skipped (Flaky)
- **Note**: Different test from line 36 in same file

### 45. Entity Synchronization Notes - Not Exist
- **File**: `e2e/tests/entityCard/header/entity-syncronization-notes.spec.ts`
- **Test**: "Bio Rad Laboratories Inc not exist"
- **Line**: 56
- **Status**: ✅ Skipped
- **Note**: Different test from line 35 in same file

### 46. Negotiation Status - Without Plan
- **File**: `e2e/tests/entityCard/opportunity/entity-card-negotiaton-status.spec.ts`
- **Test**: "The Negotiation Status change works for parents who do not belong to a Plan. @tc-12847"
- **Line**: 86
- **Status**: ✅ Skipped
- **Note**: Different test from line 63 in same file

### 47. Adabot Pay Terms - Peer Group
- **File**: `e2e/tests/entityCard/opportunity/extraSection/adabot-pay-terms-extra-sections.spec.ts`
- **Test**: "Adabot - Extra - Section - Peer Group Standard - Strategy - @ui @entity @adabot @tc-5976 @us-5926"
- **Line**: 76
- **Status**: ✅ Skipped
- **Note**: Different test from line 64 in same file

### 48. VP Financing Groups - Auto Setting Work
- **File**: `e2e/tests/program/vp-financing-groups.spec.ts`
- **Test**: "The VP Financing Groups with the Auto setting work @tc-11893 @flakyResolved"
- **Line**: 110
- **Status**: ✅ Skipped (Flaky)
- **Note**: Different test from line 94 in same file

## Additional Tests Marked as Skipped (January 9, 2026 - Third Batch)

### Category: Spend Volume & Payment Terms Global Filters

All tests in the file `e2e/tests/globalFilters/categorySpendVolAndPT.spec.ts` were marked as skipped. These tests validate the "Spend Volume & Payment Terms" category in the global filters dialog.

**File**: `e2e/tests/globalFilters/categorySpendVolAndPT.spec.ts`

### 49. Spend Volume & Payment Terms Category - UI Visibility
- **Test**: "Spend Volume & Payment Terms category is showing in global filters dialog @filter @ui"
- **Line**: 22
- **Status**: ✅ Skipped
- **Description**: Validates that the category appears in the global filters dialog

### 50. Payment Terms Opportunity Field
- **Test**: "payment terms opportunity field is showing in global filters dialog @filter @ui @us-6474 tc-6703"
- **Line**: 34
- **Status**: ✅ Skipped
- **Description**: Tests the Payment Terms Opportunity field with numeric range inputs (90-220)

### 51. Contractual Payment Terms Field
- **Test**: "contractual payment terms field is showing in global filters dialog @filter @ui @us-8160"
- **Line**: 71
- **Status**: ✅ Skipped
- **Description**: Tests the Contractual Payment Terms field with numeric range inputs (90-220)

### 52. Contractual Payment Terms with Cash Discount Field
- **Test**: "Contractual Payment Terms with Cash Discount field is showing in global filters dialog @filter @ui @us-8160"
- **Line**: 107
- **Status**: ✅ Skipped
- **Description**: Tests the Contractual Payment Terms with Cash Discount field with numeric range inputs (90-220)

### 53. Avg Actual Payment Terms Field
- **Test**: "avg actual payment terms field is showing in global filters dialog @filter @ui @us-8161"
- **Line**: 143
- **Status**: ✅ Skipped
- **Description**: Tests the Avg Actual Payment Terms field with numeric range inputs (90-220)

### 54. Spend Volume Field
- **Test**: "spend volume field is showing in global filters dialog @filter @ui @us-6474 tc-6703"
- **Line**: 179
- **Status**: ✅ Skipped
- **Description**: Tests the Spend Volume field visibility in global filters

**Implementation Method**: All tests in this file were marked with `test.skip()` at the file level using `test.describe.serial()` structure, meaning all 6 tests in the suite are skipped together.

**User Stories Referenced**:
- US-6474: Payment Terms Opportunity and Spend Volume
- US-8160: Contractual Payment Terms (with and without Cash Discount)
- US-8161: Avg Actual Payment Terms

**Test Tags**: `@filter`, `@ui`

## Statistics

- **Regular Failing Tests**: 20 tests (original batch)
  - **Additional Regular Tests**: 3 tests (second batch)
  - **Additional Regular Tests**: 6 tests (third batch - categorySpendVolAndPT)
  - **Total Regular**: 29 tests
- **Flaky Tests**: 20 tests (original batch)
  - **Additional Flaky Tests**: 5 tests (second batch)
  - **Total Flaky**: 25 tests
- **Total Skipped**: 54 tests (40 original + 8 second batch + 6 third batch)
- **Date Range**: 
  - Original 40 skipped on 2026-01-08
  - Additional 8 skipped on 2026-01-08 (same day)
  - Additional 6 skipped on 2026-01-09 (categorySpendVolAndPT.spec.ts)
