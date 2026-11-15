# Change: Entity Card Company Details Layout Refactor

## Date
2026-02-05

## Status
✅ Implementation Complete - Pending Testing

## Objective
Refactor the `EntityCardCompanyDetails.vue` component to match the new layout design shown in the provided image. The new design reorganizes the information into a cleaner, more structured card-based layout.

## Current State Analysis
The current component has:
- Overview section with description and basic info (URL, Founded, Phone, Type, Country, Ownership)
- Two main cards on the left: Identification Number and Relationship, Industry
- One card on the right: SME Details and Location with map

## Target State (Based on Image)
The new layout should have:
- Overview section at the top (unchanged)
- Three columns layout with cards containing specific information groups:
  - **Left Column (Identification)**: Tax ID, Spend File Internal ID
  - **Middle Column (Relationship)**: Buying Entity(ies), Procurement Team, Buying Country, Relationship Since, Ultimate Parent, Last Term Negotiation
  - **Right Column (Custom Column Value)**: Multiple custom fields displayed in a structured format

## Changes Required

### 1. Template Structure Changes
- [x] Keep the overview section as is (lines 12-69)
- [x] Restructure the card layout from 2-column to 3-column grid
- [x] Create new card for "Identification" section (left column)
- [x] Create new card for "Relationship" section (middle column)  
- [x] Create new card for "Custom Column Value" section (right column)
- [x] Remove the "Industry" section (was lines 151-199)
- [x] Relocate SME Details and Location cards below the main 3-column layout (now 2-column layout)

### 2. Identification Card (Left Column)
Fields to display:
- Tax ID (with tooltip)
- Spend File Internal ID (with tooltip)

### 3. Relationship Card (Middle Column)
Fields to display:
- Buying Entity(ies) (with tooltip)
- Procurement Team (with tooltip)
- Buying Country (with tooltip)
- Relationship Since (with tooltip)
- Ultimate Parent (with tooltip)
- Last Term Negotiation (with tooltip and date formatting)

### 4. Custom Column Value Card (Right Column)
This appears to be a new section showing custom fields. Based on the image:
- Main Color: Blue
- Under regulations: No
- Shipping Zone: North
- Packaging: Recyclable
- Material Grade: A1
- Safety Rating: 5 Stars
- Export Status: Active
- Power Req: 220V
- Noise Level: 40dB
- Handling: Fragile
- Weight: 20 kg
- Preference: 0.75
- Tax ID: 44-902
- Inspection Date: 12/04/23
- Batch Size: 500
- Lead Time: 14 Days
- Warranty Period: 2 Years
- Storage Temp: 15C
- Certifications: ISO9001
- Origin: Germany

**Note**: This section needs to be dynamic and pull from custom entity fields. Need to verify data source and API endpoint.

### 5. Industry Section
- [ ] Decide placement: Remove entirely, move to a separate tab, or integrate into another card
- [ ] If keeping, determine new location in the layout

### 6. Responsive Behavior
- [ ] Ensure 3-column layout works on large screens (col-xl-4 for each)
- [ ] Stack vertically on medium screens (col-lg-12)
- [ ] Test on mobile devices

### 7. Styling Updates
- [ ] Ensure consistent card heights across the 3-column layout
- [ ] Maintain shadow-none class for cards
- [ ] Keep existing text styling classes (text-sm, font-semibold, text-gray-700, etc.)

## Data Requirements

### Existing Data (Already Available)
- `supplierDetail.idNumber` (Tax ID)
- `supplierDetail.externalID` (Spend File Internal ID)
- `supplierDetail.buyingEntity` (Buying Entity)
- `supplierDetail.procurementTeam` (Procurement Team)
- `supplierDetail.buyingCountry` (Buying Country)
- `supplierDetail.relationshipSince` (Relationship Since)
- `supplierOwnership.ultimateParent` (Ultimate Parent)
- `supplierDetail.dateOfLastTermNegotiation` (Last Term Negotiation)

### New Data Required
- Custom column values for the right card
- Need to identify API endpoint or store method to fetch custom entity fields
- Data structure for custom fields (likely key-value pairs with labels and values)

## Implementation Steps

1. **Create checklist document** ✓
2. **Analyze custom fields data source** ✓
   - Check entityCard store for custom fields methods ✓
   - Verify API endpoints for custom entity data ✓
   - Determine data structure ✓
3. **Update template structure** ✓
   - Reorganize cards into 3-column layout ✓
   - Create Identification card ✓
   - Create Relationship card ✓
   - Create Custom Column Value card ✓
4. **Update script section** ✓
   - Add reactive data for custom fields ✓
   - Create method to fetch custom fields ✓
   - Add to onMounted lifecycle hook ✓
5. **Update types** ✓
   - Add customFields loading state ✓
   - Add customFieldsData and customFieldsList ✓
6. **Add translations** ✓
   - Add English translations ✓
   - Add Spanish translations ✓
7. **Test responsive behavior** (pending)
   - Verify layout on different screen sizes
   - Ensure cards stack properly on mobile
8. **Update styling if needed** (pending)
   - Ensure consistent card heights
   - Verify spacing and alignment
9. **Handle Industry section** ✓
   - Removed from Company Details view

### DetailBox optional click (2026-02-06)
- `DetailBox.vue`: click event is optional. Template uses `v-on="isUrl ? { click: handleClick } : {}"` so `@click` is only bound when `isUrl` is true. No new prop; existing usage (URL with `@clickUrl`) unchanged.

### SmeClassificationCase component (2026-02-06)
- New component `SmeClassificationCase.vue` in `entityCard/components/details/`: renders SME classification case block (description + list of label/value limits). Props: `description` (string), `limits` (array of `{ label: string, value: string }`). Replaces inline HTML from i18n cards (e.g. United Kingdom). Parent passes translated description and limits.
- **Integration**: `SMEDetails.vue` and `SmeDetailBox.vue` now use SmeClassificationCase instead of `v-html="getSource()"`. Added i18n keys `cardDescription` and `cardLimits` (array) per source in en.json and es.json: brazil, default, europe, india, singapure, switzerland, unitedKingdom, notSME.default. Removed getSource(), DOMPurify and console.log from both components. Computed `classificationCase` resolves base key (notSME.default when !isSME && source null/empty, else source or "default") and returns { description, limits } from t().

## Questions Resolved
1. ✓ Custom column values come from `getEntityOrSpendFileDetails` API endpoint
   - Endpoint: `/api/entity-card/details/{id}/{type}`
   - Returns entity details with customDataPoint1-20 fields
2. Industry section should be removed from this view (based on image)
3. Custom fields are read-only in this view
4. Only non-null custom fields should be displayed

## Testing Checklist
- [ ] Layout displays correctly on desktop (3 columns)
- [ ] Layout displays correctly on tablet (stacked)
- [ ] Layout displays correctly on mobile (stacked)
- [ ] All tooltips work correctly
- [ ] Custom fields load and display properly
- [ ] Loading states work correctly
- [ ] No console errors
- [ ] Data updates correctly when switching entities

## Notes
- The image shows a very specific set of custom fields. Need to verify if this is a fixed set or dynamic based on entity type/configuration.
- The current component uses Pug template syntax - maintain consistency.
- Keep existing loading states and error handling patterns.

## Summary of Changes

### Files Modified

1. **EntityCardCompanyDetails.vue** (`src/modules/home/entityCard/views/EntityCardCompanyDetails.vue`)
   - Restructured template from 2-column to 3-column layout
   - Removed Industry section (was displayed in a separate card)
   - Added Custom Column Value card with dynamic custom fields
   - Reorganized Identification and Relationship cards
   - Moved SME and Location cards to 2-column layout below main cards
   - Added `getCustomFields()` function to fetch entity details with custom fields
   - Added `processCustomFields()` function to filter and format custom fields
   - Added reactive data: `customFieldsData`, `customFieldsList`, `loading.customFields`

2. **index.ts** (`src/modules/home/entityCard/types/index.ts`)
   - Updated `EntityCardCompanyDetails` interface:
     - Added `customFields: boolean` to loading object
     - Added `customFieldsData: any` property
     - Added `customFieldsList: Array<{ key: string; label: string; value: string }>` property

3. **en.json** (`src/resources/locales/languages/en.json`)
   - Added `customColumnValue: "Custom Column Value"`
   - Added `noCustomFields: "No custom fields available"`

4. **es.json** (`src/resources/locales/languages/es.json`)
   - Added `customColumnValue: "Valor de Columna Personalizada"`
   - Added `noCustomFields: "No hay campos personalizados disponibles"`

### Key Features

1. **Three-Column Layout**
   - Left: Identification (Tax ID, Spend File Internal ID)
   - Middle: Relationship (Buying Entity, Procurement Team, Buying Country, Relationship Since, Ultimate Parent, Last Term Negotiation)
   - Right: Custom Column Value (Dynamic custom fields from customDataPoint1-20)

2. **Dynamic Custom Fields**
   - Fetches entity details using `getEntityOrSpendFileDetails` API
   - Filters out null/empty custom fields
   - Displays only populated custom fields with their labels from translations
   - Shows "No custom fields available" message when no fields exist

3. **Responsive Design**
   - 3 columns on extra-large screens (col-xl-4)
   - Stacks vertically on large and smaller screens (col-lg-12)
   - SME and Location cards in 2-column layout (col-xl-6) below main cards

4. **Removed Industry Section**
   - Industry information (NAICS, Industry, ISIC, Commodities, HS Code) removed from this view
   - Can be added to a different tab/section if needed in the future

### API Integration

- Uses existing `getEntityOrSpendFileDetails` endpoint from entityCard store
- Endpoint: `/api/entity-card/details/{id}/{type}`
- Returns entity data including customDataPoint1 through customDataPoint20
- Custom field labels come from translation keys: `global.globalFilters.customDataPoint{1-20}`

### Testing Recommendations

1. Test with entities that have custom fields populated
2. Test with entities that have no custom fields
3. Verify responsive behavior on different screen sizes
4. Verify all tooltips work correctly
5. Verify loading states display correctly
6. Test with different entity types (supplier, parent)
7. Verify translations work in both English and Spanish
