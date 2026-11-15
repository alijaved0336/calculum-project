# Optimize Admin Backend Company Edit View - Logo Upload Only

**Date**: 2025-12-14
**Status**: ✅ COMPLETED
**Context**: Optimize `EditCompanyAdmin.vue` to avoid sending PATCH request to company endpoint when only the logo is changed.

---

## Executive Summary

**What needs to be done**: Implement change detection in the Admin Backend Company Edit form to only send API requests when data actually changes, similar to the optimization done in `HomeCompanyInfo.vue`.

**Key improvements needed**:
- Logo-only changes should POST logo only (no PATCH to company)
- Data-only changes should PATCH company only (no logo upload)
- No changes detected → user receives info message (no API calls)
- Both changed → PATCH company then POST logo

**Files to modify**: 
- `EditCompanyAdmin.vue` (change detection logic)

**Expected result**: Reduced unnecessary API calls, improved performance, better UX feedback.

---

## Current Behavior
- When user clicks "Update", the component:
  1. Validates form (`validateform()`)
  2. If valid, calls `patchCompany()` which sends PATCH request
  3. After PATCH success, handles industry updates (`apiUpdateIndustry()` or `apiRemoveIndustryAPI()` + `apiAddIndustry()`)
  4. At the end of industry flow, if `file.value` exists, calls `uploadCompanyLogo()` to POST the logo

## Problem
- If user only changes the logo (no other company data modified), the PATCH request is unnecessary
- This creates extra network traffic and potentially triggers unnecessary backend processing
- The industry update flow also runs unnecessarily if only logo changed

## Solution
Implement change detection similar to `HomeCompanyInfo.vue`:
1. Track original company values when component loads (after `getDataCompany()`)
2. Compare current form values with original values before submit
3. Only send PATCH request if company data has changed
4. Only run industry update flow if industry data changed
5. Always send POST request if logo file has changed
6. Handle scenarios:
   - Logo only changed → POST logo only
   - Company info only changed → PATCH company only (with industry flow if needed)
   - Both changed → PATCH company + POST logo
   - Nothing changed → Show "no changes to save" message

## Implementation Checklist

### 1. Create Original Values Tracker
- [x] Add `OriginalCompanyData` interface with all company fields
- [x] Add reactive property `originalCompanyData` to store initial company values
- [ ] Store original values for:
  - `companyName`
  - `companyAddress`
  - `companyCity`
  - `companyCountry`
  - `companyZipCode`
  - `companyDomain`
  - `currency`
  - `companyIdentificationType`
  - `companyIdentificationValue`
  - `wacc`
  - `taxRate`
  - `annualSalesRevenueMillions`
  - `annualSpendMillions`
  - `accountsReceivablesMillions`
  - `averagePaymentTermsWithSuppliersDays`
  - `averagePaymentTermsWithCustomersDays`
  - `averageTimeApproveInvoicesReceivedFromSuppliersDays`
  - `limitUser`
  - `excludeForPeerGroupClustering`
  - `excludeForSupplierStandardClustering`
  - `inactivityDays`
  - `allowedDomains`
  - `newIndustry` (industry relation)
  - `revenuePercentage`
- [x] Initialize `originalCompanyData` in `getDataCompany()` callbackSuccess after all data is loaded

### 2. Implement Change Detection Functions
- [x] Create function `hasCompanyDataChanged()` that:
  - Compares current form values with `originalCompanyData`
  - Returns `true` if any field differs from original
  - Returns `false` if all fields match original
  - Handles null/undefined/empty string comparisons correctly
  - Handles number comparisons (wacc, taxRate, etc.)
  - Handles boolean comparisons
- [x] Create function `hasIndustryChanged()` that:
  - Compares `newIndustry` and `revenuePercentage` with original values
  - Returns `true` if industry data changed
- [x] Create function `updateOriginalCompanyData()` to update baseline after successful save

### 3. Modify Submit Logic
- [x] Update `validateform()` function to:
  - Check if logo has changed: `hasLogoChanged = file.value !== null`
  - Check if company data has changed: `hasDataChanged = hasCompanyDataChanged()`
  - Check if industry changed: `hasIndustryChanged = hasIndustryChanged()`
  - Implement conditional logic:
    - Nothing changed → Show "no changes to save" info message, return early
    - Logo only → POST logo only, then redirect
    - Data only (no industry change) → PATCH company only, then redirect
    - Data only (with industry change) → PATCH company, then handle industry, then redirect
    - Both logo and data → PATCH company (with industry if needed), then POST logo, then redirect

### 4. Refactor Industry Flow
- [x] Modify `apiUpdateIndustry()` to:
  - Accept a callback parameter for what to do after industry update
  - If logo changed, call `uploadCompanyLogo()` in callback
  - If no logo, redirect in callback
- [x] Modify `apiAddIndustry()` similarly
- [x] Ensure industry flow only runs if industry actually changed

### 5. Update Loading State Management
- [x] Ensure `spinnerValidation` properly handles all scenarios
- [x] Set loading state at start of submit
- [x] Clear loading state after all operations complete
- [x] Handle errors in PATCH, industry operations, and POST operations

### 6. Update Success/Error Messages
- [x] Show appropriate success message based on what was updated
- [x] Show info message when no changes detected
- [x] Handle errors for all operations independently

### 7. Update Logo Upload Function
- [x] Modify `uploadCompanyLogo()` to:
  - Show success toast message
  - Handle errors properly with loading state reset
  - Redirect after success

## Edge Cases Handled
- [x] User changes data, then changes it back to original (should not send PATCH) → Handled by normalization in `hasCompanyDataChanged()`
- [x] User selects logo file, then removes/changes it before save → Handled by checking `file.value !== null`
- [x] Empty string vs null vs undefined in comparison → Handled by `normalizeValue()` function
- [x] Number fields (wacc, taxRate) - handle decimal comparisons → Handled by `normalizeNumber()` function
- [x] Industry changes (adding, removing, updating) → Handled by `hasIndustryChanged()` and conditional flow
- [x] Network errors during PATCH should not prevent POST if logo needs updating → Independent operations with separate error handling
- [x] Loading state should persist until all operations complete → Properly managed in all code paths
- [x] Industry flow should only run if industry data actually changed → Checked before calling industry functions
- [x] Logo re-upload after previous logo upload → Fixed by clearing `file.value = null` after successful upload
- [x] `userLanguage` and `paymentTermDays` being included unnecessarily → Fixed by only including `userLanguage` if it changed
- [x] `paymentTermDays` field removed → This field doesn't exist in Company entity, was being sent unnecessarily

## Files Modified
- ✅ `src\modules\adminBackend\views\EditCompanyAdmin.vue`
- ✅ `src\modules\adminBackend\api\company.ts`
  - Modified `patchCompany()` function to only include defined fields in payload
  - Prevents sending `null` values for fields that weren't changed
  - Validates numeric fields before including them
  - Removed `paymentTermDays` parameter - this field doesn't exist in Company entity
  - Added `OriginalCompanyData` interface
  - Added `originalCompanyData` reactive property
  - Implemented `hasCompanyDataChanged()` function
  - Implemented `hasIndustryChanged()` function
  - Implemented `updateOriginalCompanyData()` function
  - Modified `validateform()` logic to detect changes before submit
  - Refactored industry update flow with callbacks
  - Enhanced `uploadCompanyLogo()` with error handling and success messages
  - Modified `patchCompany()` to accept change flags as parameters

## Implementation Summary

### Changes Made
1. **Added `OriginalCompanyData` interface**: Tracks initial values for all company fields including industry
2. **Added `originalCompanyData` reactive object**: Stores baseline values on component load
3. **Created `hasCompanyDataChanged()` function**: 
   - Compares current form values with original values
   - Normalizes values (handles null, undefined, empty strings, numbers)
   - Returns boolean indicating if any field changed
4. **Created `hasIndustryChanged()` function**: 
   - Compares industry and revenue percentage with original values
   - Returns boolean indicating if industry data changed
5. **Created `updateOriginalCompanyData()` function**: Updates baseline after successful save
6. **Created `getChangedFields()` function**: 
   - Returns an object containing only the fields that actually changed
   - Used to optimize PATCH requests by sending only modified fields
   - Handles all field types: strings, numbers, booleans, null values
   - Converts wacc and taxRate from percentage to decimal format
   - **Fixed**: Only includes `userLanguage` if it actually changed (not always when other fields change)
   - **Removed**: `paymentTermDays` - this field doesn't exist in Company entity and was being sent unnecessarily
7. **Refactored `validateform()` function**:
   - Detects if company data changed
   - Detects if industry changed
   - Detects if logo changed
   - Implements conditional logic:
     - No changes → Show info toast, return early
     - Logo only → POST logo only
     - Data/industry only → PATCH company (with industry if needed)
     - Both → PATCH company then POST logo
8. **Refactored industry flow**:
   - `apiUpdateIndustry()` and `apiAddIndustry()` now accept callbacks
   - Industry flow only runs if industry actually changed
9. **Enhanced `uploadCompanyLogo()` function**:
   - Added success toast message
   - Added error handling with loading state reset
   - Clears `file.value = null` after successful upload to prevent re-uploading on next save
10. **Modified `patchCompany()` function**:
   - Now accepts change flags as parameters
   - Handles industry and logo updates conditionally

### Benefits
- ✅ Reduces unnecessary API calls when only logo changes
- ✅ Improves performance and reduces server load
- ✅ Better user experience with appropriate feedback
- ✅ Prevents accidental data submissions when nothing changed
- ✅ Industry updates only run when industry actually changed
- ✅ **PATCH requests only send changed fields** - significantly reduces payload size
- ✅ More efficient network usage - only modified data is transmitted

### Testing Scenarios
1. Change only logo → should POST logo only ✅
2. Change only company info → should PATCH company only ✅
3. Change only industry → should PATCH company with industry update ✅
4. Change both logo and info → should PATCH company + POST logo ✅
5. Change nothing → should show "no changes" info message ✅
6. Change data back to original → should show "no changes" message ✅
7. Error handling for PATCH, industry, and POST operations ✅

## Technical Notes
- The comparison function must handle IRI format for country, currency, and identificationType
- Must handle number comparisons (wacc, taxRate are stored as percentages, need to convert)
- Industry comparison needs to check both `newIndustry` and `revenuePercentage`
- Original data should be captured after `getDataCompany()` completes and all data is loaded
- The `updateOriginalCompanyData()` ensures the baseline is updated after successful saves
- Industry flow is more complex - need to ensure it only runs when industry actually changed
- **PATCH optimization**: Only sends fields that actually changed via `getChangedFields()` function
  - Reduces payload size significantly (especially important for forms with many fields)
  - Improves network efficiency
  - Only modified fields are sent to the backend
  - Handles all field types: strings, numbers, booleans, null values
  - **Fixed**: API function `patchCompany()` now only includes defined fields, preventing `null` values from being sent when fields didn't change
  - Fields with `undefined` are completely omitted from payload (not sent as `null`)
