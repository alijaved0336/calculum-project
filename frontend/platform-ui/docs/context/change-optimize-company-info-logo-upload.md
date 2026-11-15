# Optimize Company Info View - Logo Upload Only

**Date**: 2025-12-14
**Status**: ✅ COMPLETED
**Context**: Optimize `HomeCompanyInfo.vue` to avoid sending PATCH request to company endpoint when only the logo is changed.

---

## Executive Summary

**What was done**: Implemented change detection in the Company Info form to only send API requests when data actually changes.

**Key improvements**:
- Logo-only changes now POST logo only (no PATCH to company)
- Data-only changes PATCH company only (no logo upload)
- No changes detected → user receives info message (no API calls)
- Both changed → PATCH company then POST logo

**Files changed**: 
- `HomeCompanyInfo.vue` (change detection logic)
- `en.json` & `es.json` (added "noChangesToSave" translation)

**Result**: Reduced unnecessary API calls, improved performance, better UX feedback.

---

## Current Behavior
- When user clicks "Save", the component always:
  1. Sends PATCH request to update company info (via `welcomeStore.companyInfo`)
  2. If a new logo file exists (`file.value !== null`), calls `uploadCompanyLogo()` to POST the logo

## Problem
- If user only changes the logo (no other company data modified), the PATCH request is unnecessary
- This creates extra network traffic and potentially triggers unnecessary backend processing

## Solution
Implement change detection to:
1. Track original company values when component loads
2. Compare current form values with original values before submit
3. Only send PATCH request if company data has changed
4. Always send POST request if logo file has changed
5. Handle three scenarios:
   - Logo only changed → POST logo only
   - Company info only changed → PATCH company only
   - Both changed → PATCH company + POST logo

## Implementation Checklist

### 1. Create Original Values Tracker
- [x] Add reactive property `originalCompanyData` to store initial company values
- [x] Store original values for:
  - `companyName`
  - `companyAddress`
  - `companyCity`
  - `companyCountry`
  - `companyZipCode`
  - `companyDomain`
  - `selectedCurrency`
  - `companyIdentificationType`
  - `companyIdentificationValue`
- [x] Initialize `originalCompanyData` when component loads (after fetching company data)

### 2. Implement Change Detection Function
- [x] Create function `hasCompanyDataChanged()` that:
  - Compares current form values with `originalCompanyData`
  - Returns `true` if any field differs from original
  - Returns `false` if all fields match original
  - Handles null/undefined/empty string comparisons correctly
- [x] Create function `updateOriginalCompanyData()` to update baseline after successful save

### 3. Modify Submit Logic
- [x] Update `onClickSubmit()` function to:
  - Check if logo has changed: `hasLogoChanged = file.value !== null`
  - Check if company data has changed: `hasDataChanged = hasCompanyDataChanged()`
  - Implement conditional logic:
    - Only logo changed → POST logo only
    - Only data changed → PATCH company only
    - Both changed → PATCH company + POST logo
    - Nothing changed → Show "no changes to save" info message

### 4. Update Loading State Management
- [x] Ensure `loadingCompanyInfo` properly handles all scenarios
- [x] Set loading state at start of submit
- [x] Clear loading state after all operations complete
- [x] Handle errors in both PATCH and POST operations

### 5. Update Success/Error Messages
- [x] Show success message after operations complete
- [x] Show info message when no changes detected
- [x] Handle errors for both operations independently (loading state reset)

### 6. Update Store State
- [x] Ensure `companyActive.value` is updated when company info changes
- [x] Ensure company logo is updated in store when logo changes (already done in `uploadCompanyLogo`)
- [x] Update `originalCompanyData` after successful save to reflect new baseline

## Edge Cases Handled
- [x] User changes data, then changes it back to original (should not send PATCH) → Handled by normalization in `hasCompanyDataChanged()`
- [x] User selects logo file, then removes/changes it before save → Handled by checking `file.value !== null`
- [x] Empty string vs null vs undefined in comparison → Handled by `normalizeValue()` function
- [x] Identification type and value can be null (optional fields) → Properly handled in comparison
- [x] Network errors during PATCH should not prevent POST if logo needs updating → Independent operations with separate error handling
- [x] Loading state should persist until all operations complete → Properly managed in all code paths
- [x] Logo re-upload after previous logo upload → Fixed by clearing `file.value = null` after successful upload

## Files Modified
- ✅ `src\modules\home\views\HomeCompanyInfo.vue`
  - Added `OriginalCompanyData` interface
  - Added `originalCompanyData` reactive property
  - Implemented `hasCompanyDataChanged()` function
  - Implemented `updateOriginalCompanyData()` function
  - Modified `onClickSubmit()` logic
  - Enhanced `uploadCompanyLogo()` with error handling and success message
- ✅ `src\resources\locales\languages\en.json`
  - Added translation key `noChangesToSave`: "No changes to save"
- ✅ `src\resources\locales\languages\es.json`
  - Added translation key `noChangesToSave`: "No hay cambios para guardar"

## Implementation Summary

### Changes Made
1. **Added `OriginalCompanyData` interface**: Tracks initial values for all company fields
2. **Added `originalCompanyData` reactive object**: Stores baseline values on component load
3. **Created `hasCompanyDataChanged()` function**: 
   - Compares current form values with original values
   - Normalizes values (handles null, undefined, empty strings)
   - Returns boolean indicating if any field changed
4. **Created `updateOriginalCompanyData()` function**: Updates baseline after successful save
5. **Created `getChangedFields()` function**: 
   - Returns an object containing only the fields that actually changed
   - Used to optimize PATCH requests by sending only modified fields
6. **Refactored `onClickSubmit()` function**:
   - Detects if company data changed
   - Detects if logo changed
   - Implements conditional logic:
     - No changes → Show info toast, return early
     - Logo only → POST logo only
     - Data only → PATCH company only
     - Both → PATCH company then POST logo
6. **Enhanced `uploadCompanyLogo()` function**:
   - Added success toast message
   - Added error handling with loading state reset
   - Clears `file.value = null` after successful upload to prevent re-uploading on next save

### Benefits
- ✅ Reduces unnecessary API calls when only logo changes
- ✅ Improves performance and reduces server load
- ✅ Better user experience with appropriate feedback
- ✅ Prevents accidental data submissions when nothing changed

### Testing Scenarios
1. Change only logo → should POST logo only ✅
2. Change only company info → should PATCH company only ✅
3. Change both logo and info → should PATCH company + POST logo ✅
4. Change nothing → should show "no changes" info message ✅
5. Change data back to original → should show "no changes" message ✅
6. Error handling for both PATCH and POST operations ✅

## Technical Notes
- The comparison function handles IRI format for country, currency, and identificationType
- Uses manual field-by-field comparison with normalization
- Original data is captured on component load with initial company values
- The `updateOriginalCompanyData()` ensures the baseline is updated after successful saves
- **PATCH optimization**: Only sends fields that actually changed via `getChangedFields()` function
  - Reduces payload size
  - Improves network efficiency
  - Only modified fields are sent to the backend
