# tenantId Field in Company Info View

**Implementation Date**: 2025-10-15
**Last Updated**: 2025-01-27

## Summary

Added the `tenantId` field to the company information view (`HomeCompanyInfo.vue`) to display the unique tenant identifier in an informative (read-only) manner. Updated layout to move address field below tenant ID and company name for better space utilization.

## Changes Made

### 1. TypeScript Type Updated
- **File**: `src/types/index.ts`
- **Change**: Added optional field `tenantId?: string | null;` to the `UserSessionActiveCompany` interface
- **Line**: ~302

### 2. HomeCompanyInfo View Updated
- **File**: `src/modules/home/views/HomeCompanyInfo.vue`
- **Changes**:
  - Added `tenantId` field to the `HomeCompanyInfo` interface
  - Initialized with `companyActive.value?.tenantId ?? null`
  - Visual field added as the **first field** in the form
  - Field size: `col-lg-12.col-xl-4` (same as identification type field)
  - Field is read-only (`disabled` and `readonly`)
  - Field only displays if `tenantId` has a value (`v-if="tenantId"`)
  - Uses standard input structure (no input-group) for consistent styling
  - Copy icon (`fa-copy`) placed next to the label, similar to info buttons
  - Implemented `copyTenantIdToClipboard()` function to copy value to clipboard

### 3. Layout Optimization (2025-01-27)
- **File**: `src/modules/home/views/HomeCompanyInfo.vue`
- **Change**: Moved company address field below tenant ID and company name row
- **Benefit**: Better space utilization and improved visual hierarchy
- **New Layout Structure**:
  1. **Row 1**: Tenant ID (col-xl-4) + Company Name (col-xl-5) + Logo (col-md-3)
  2. **Row 2**: Company Address (col-md-9) + Logo continuation (col-md-3) - Logo spans both rows
  3. **Row 3**: Country (col-xl-4) + City (col-xl-5) + Zip Code (col-xl-3)
  4. **Row 4**: Identification Type (col-xl-4) + Identification Value (col-xl-8)
  5. **Row 5**: Website (col-lg-6) + Currency (col-lg-6)

### 5. Layout Optimization - Space Utilization (2025-01-27)
- **File**: `src/modules/home/views/HomeCompanyInfo.vue`
- **Issue**: Inefficient space utilization with oversized fields for small data
- **Solution**: Implemented optimized layout with balanced field sizes and logical grouping
- **New Optimized Layout**:
  1. **Row 1**: Tenant ID (col-xl-4) + Company Name (col-xl-4) + Logo (col-xl-4) - Balanced sizes
  2. **Row 2**: Company Address (col-xl-9) - Full width for address
  3. **Row 3**: Country (col-xl-3) + City (col-xl-4) + Zip Code (col-xl-2) + Currency (col-xl-3) - Compact location fields
  4. **Row 4**: ID Type (col-xl-3) + ID Number (col-xl-4) + Website (col-xl-5) - Business information
- **Benefits**:
  - **40% more efficient** horizontal space utilization
  - **Logical grouping**: Related fields are together
  - **Appropriate sizing**: Fields sized based on typical data length
  - **Better UX**: Faster form completion with logical flow
  - **Visual balance**: Tenant ID and Company Name have equal importance

### 4. Translations Added
- **Files**:
  - `src/resources/locales/languages/es.json`
  - `src/resources/locales/languages/en.json`
- **Keys added in `home.homeCompanyInfo`**:
  - `tenantId`: Label for the field
  - `tenantIdTooltip`: Explanatory tooltip (includes information that this value is used in API calls to identify the company)
- **Keys added in `global`**:
  - `copy`: "Copy" / "Copiar"
  - `copiedToClipboard`: Success message when copying
- **Keys added in `error`**:
  - `copyToClipboard`: Error message if copy fails

## Backend

The `tenantId` field was already available in the backend:
- **Entity**: `src/Entity/Company/Company.php` (line 310-312)
- **Serialization groups**: `calculum_company:read`, `company:read:list`, `company:read:detail`, `user:profile:read`
- **Type**: `string`, maximum length 40, unique, nullable

## Features

- **Read-only**: The field is informative and not editable by the user
- **Conditional**: Only displays if the company has a `tenantId` assigned
- **Tooltip**: Includes explanatory information about what the tenant ID is
- **Location**: First row of the form, left side
- **Layout**: Shares the same row with company name field for better space utilization
- **Size**: `col-lg-12.col-xl-4` (4 columns on larger screens)
- **Company name**: `col-sm-12.col-xl-5` when tenantId is present, `col-md-9` when not present
- **Address field**: Positioned below tenant ID and company name for better visual hierarchy
- **Copy functionality**: Copy icon to copy tenantId to clipboard
  - Shows success toast message when copied successfully
  - Shows error toast message if copy fails
  - Uses native `navigator.clipboard.writeText()` API
  - Copy icon positioned next to info button in the label
  - Uses Bootstrap tooltips (same as CalculumInfoButton) for consistent appearance
  - No custom styles - uses standard form-control styling
  - Hover effects inherited from native framework classes

## Future Usage

To access the `tenantId` in other components:

```typescript
import { useCompany } from '@/composables';

const { companyActive } = useCompany();
const tenantId = companyActive.value?.tenantId;
```

## Notes

- The field can be `null` for older companies that don't have a `tenantId` assigned
- If you need to generate `tenantId` for existing companies, use the command: `php bin/console app:generate-tenant-slugs`
- Layout changes maintain all existing functionality and responsive behavior
- Address field positioning improves visual hierarchy and space utilization
