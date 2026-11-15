# Use Case: SCF Badge and Column Display Feature

## Title
As an ADA User (Analyst/Procurement Manager) I should be able to view Supply Chain Finance (SCF) indicators across supplier interfaces so I can quickly identify which suppliers are using SCF programs and track SCF acceptance during negotiations.

## Description
This use case enables ADA users to view and manage Supply Chain Finance (SCF) information through three integrated visual enhancements: a "Using SCF" column in supplier grids for at-a-glance portfolio visibility, a "Currently on SCF" badge on the Payment Terms card for immediate recognition when viewing supplier details, and an "SCF Accepted" toggle in the Agreed Payment Terms dialog for explicit tracking of SCF acceptance during negotiations. The system automatically defaults the SCF Accepted toggle based on spend file data, ensuring consistency between existing SCF indicators and negotiated status.

## Actors
- **ADA User (Analyst/Procurement Manager)**: Views supplier grids, supplier detail pages, and negotiates agreed payment terms with suppliers
- **ADA Frontend Application**: Renders supplier grids, supplier detail pages, the Payment Terms card, and the Agreed Payment Terms dialog
- **Backend API**: Provides supplier data including "Using_SCF" and "SCF Accepted" fields, and persists updates to the "SCF Accepted" status

## Preconditions
- The ADA User must be authenticated and have permissions to view supplier data and access the Suppliers module
- The Suppliers module and supplier grid interfaces must be functional and accessible
- The supplier detail page and Payment Terms and Strategy card must be implemented and functional
- The Agreed Payment Terms dialog must be functional with the existing "Vcard Accepted" toggle operational
- The Backend API must have endpoints to retrieve supplier lists, supplier detail data, and agreed payment terms data
- The Backend API must return the "usingSCF" field in supplier list and detail payloads
- The Backend API must return the "scfAccepted" field in supplier detail payloads
- The Backend API must accept the "scfAccepted" field in agreed payment terms POST/PUT requests
- For the "SCF Accepted" toggle to appear, the SCF feature must be enabled in the Admin Console for the user's company

## Trigger
An ADA User navigates to a supplier grid interface to view the supplier portfolio and see SCF participation indicators, or opens a supplier detail page to view the Payment Terms card with the SCF badge, or opens the Agreed Payment Terms dialog to negotiate and record SCF acceptance status for a specific supplier.

## Main Flow

1. User logs into the ADA platform and authenticates successfully
2. System validates user permissions and grants access to the Suppliers module
3. User navigates to the Suppliers module from the main navigation menu
4. System loads the supplier grid interface
5. Frontend sends a GET request to the Backend API to retrieve the supplier list with all relevant columns
6. Backend API queries the database to retrieve supplier records including supplier ID, name, country, spend volume, Captured Cash Discount, Using_SCF, SCF Accepted, and other standard fields
7. Backend API constructs the supplier list payload including the "usingSCF" field for each supplier
8. Backend API returns the supplier list data to the frontend in JSON format
9. Frontend receives the supplier list payload
10. System renders the supplier grid with all columns including the standard columns and the new "Using SCF" column
11. System positions the "Using SCF" column immediately to the right of the "Captured Cash Discount" column
12. System populates the "Using SCF" column for each supplier row by reading the "usingSCF" field from the API payload
13. System displays "Yes" or a checkmark icon in the "Using SCF" column for suppliers where usingSCF = true
14. System displays "No" or leaves the cell empty/unchecked for suppliers where usingSCF = false
15. System makes the "Using SCF" column visible by default without requiring user interaction
16. User reviews the supplier grid and identifies suppliers using SCF via the "Using SCF" column
17. User optionally sorts the "Using SCF" column to group SCF suppliers together
18. System re-orders the grid rows based on the "Using SCF" column values (Yes/True suppliers at the top or bottom depending on sort direction)
19. User optionally applies a filter to the "Using SCF" column to show only suppliers using SCF
20. System filters the grid to display only rows where usingSCF = true
21. User selects a specific supplier row from the grid to view detailed information
22. User clicks on the supplier row to open the supplier detail page
23. System navigates to the supplier detail page
24. Frontend sends a GET request to the Backend API to retrieve the supplier's detailed information
25. Backend API queries the database to retrieve the supplier's full record including usingSCF, scfAccepted, payment terms, spend data, and all other detail fields
26. Backend API constructs the supplier detail payload including both usingSCF and scfAccepted fields
27. Backend API returns the supplier detail data to the frontend
28. Frontend receives the supplier detail payload
29. System renders the supplier detail page with all sections including the Payment Terms and Strategy card
30. System evaluates the supplier's usingSCF field value
31. System finds that usingSCF = true for this supplier
32. System renders the "Currently on SCF" badge in the top right corner of the Payment Terms and Strategy card
33. System displays the badge with the text "Currently on SCF" using appropriate styling (light gray background, dark text, rounded corners)
34. User views the Payment Terms card and immediately recognizes that the supplier is using SCF via the badge
35. User decides to add or update agreed payment terms for this supplier
36. User clicks the "Add Results" button or "Edit" icon in the Payment Terms section to open the Agreed Payment Terms dialog
37. System opens the Agreed Payment Terms dialog as a modal overlay
38. System checks if the SCF feature is enabled for the user's company
39. System finds that the SCF feature is enabled
40. System renders the "SCF Accepted" toggle in the Agreed Payment Terms dialog alongside the "Vcard Accepted" toggle
41. System retrieves the supplier's usingSCF value (true) and scfAccepted value from the supplier detail payload
42. System finds that usingSCF = true, indicating the supplier is using SCF according to the spend file
43. System sets the "SCF Accepted" toggle to ON (enabled/checked) by default
44. System displays the Agreed Payment Terms dialog with all fields including "Without Cash Discount (days)", "Payment Date of Change", "Max Review Date", "SCF Accepted" toggle (ON), and "Vcard Accepted" toggle
45. User reviews the dialog fields and the default "SCF Accepted" toggle state
46. User optionally adjusts the "SCF Accepted" toggle if the default state does not reflect the negotiation outcome
47. User enters or updates other agreed payment terms fields (cash discount days, payment dates, etc.)
48. User clicks the "Save" button in the Agreed Payment Terms dialog
49. Frontend validates that all required fields are completed
50. Frontend constructs a payload including all agreed terms fields and the "SCF Accepted" toggle state (true or false)
51. Frontend sends a POST or PUT request to the Backend API to save the agreed payment terms
52. Backend API receives the agreed payment terms payload including the scfAccepted value
53. Backend API validates the payload data (required fields, data types, Boolean validation for scfAccepted)
54. Backend API updates the supplier's record in the database with the agreed payment terms values
55. Backend API updates the supplier's "scfAccepted" column in the database with the value from the toggle (true or false)
56. Backend API commits the database transaction
57. Backend API returns a success response to the frontend
58. Frontend receives the success response
59. System closes the Agreed Payment Terms dialog
60. System displays a success confirmation message to the user: "Agreed payment terms saved successfully"
61. System refreshes the supplier detail page to reflect the updated agreed payment terms data
62. User returns to the supplier grid interface
63. System displays the updated supplier grid with the "Using SCF" column showing the latest data
64. Use case ends successfully

## Alternative Flows

### A31.1: Supplier Not Using SCF - Badge Not Displayed

**Branch Point:** Step 31 (System evaluates the supplier's usingSCF field value)

**Condition:** The supplier's usingSCF field is false or null, indicating the supplier is not using SCF according to the spend file

1. System finds that usingSCF = false or null for this supplier
2. System does not render the "Currently on SCF" badge in the Payment Terms and Strategy card
3. System displays the Payment Terms card with all standard content but without the SCF badge
4. User views the Payment Terms card and understands that the supplier is not using SCF (absence of badge indicates no SCF usage)
5. **Go to Step 35** (User decides to add or update agreed payment terms for this supplier)

### A38.1: SCF Feature Disabled - Toggle Not Displayed

**Branch Point:** Step 38 (System checks if the SCF feature is enabled for the user's company)

**Condition:** The SCF feature is disabled in the Admin Console for the user's company

1. System queries the company configuration and finds that the SCF feature is disabled
2. System does not render the "SCF Accepted" toggle in the Agreed Payment Terms dialog
3. System displays the Agreed Payment Terms dialog with all standard fields including "Vcard Accepted" toggle but without "SCF Accepted" toggle
4. User interacts with the dialog fields and saves agreed payment terms without SCF acceptance information
5. Backend API receives the payload without the scfAccepted field and does not update the "scfAccepted" column (remains at current value or null)
6. **Go to Step 56** (Backend API commits the database transaction)

### A42.1: Supplier Not Using SCF - Toggle Defaults to OFF

**Branch Point:** Step 42 (System finds that usingSCF = true)

**Condition:** The supplier's usingSCF field is false or null, indicating the supplier is not using SCF according to the spend file

1. System finds that usingSCF = false or null for this supplier
2. System sets the "SCF Accepted" toggle to OFF (disabled/unchecked) by default
3. System displays the Agreed Payment Terms dialog with the "SCF Accepted" toggle in the OFF state
4. User reviews the dialog and sees that "SCF Accepted" is OFF by default
5. User optionally enables the "SCF Accepted" toggle if the supplier accepts SCF during negotiations despite not currently using it
6. **Go to Step 47** (User enters or updates other agreed payment terms fields)

### A46.1: User Overrides Default SCF Accepted State

**Branch Point:** Step 46 (User optionally adjusts the "SCF Accepted" toggle)

**Condition:** The user explicitly toggles the "SCF Accepted" control to change it from the default state (e.g., toggles it OFF even though it defaulted to ON)

1. User clicks the "SCF Accepted" toggle to change its state
2. System updates the toggle visual state (from ON to OFF or OFF to ON)
3. System tracks the new toggle state to be saved with the agreed payment terms
4. **Go to Step 47** (User enters or updates other agreed payment terms fields)

## Exceptional Flows

### E6.1: Database Query Failure - Cannot Retrieve Supplier List

**Branch Point:** Step 6 (Backend API queries the database to retrieve supplier records)

**Condition:** The database query fails due to connection timeout, database unavailability, or query syntax error

1. Backend API attempts to query the database but the connection times out or returns an error
2. Backend API logs the error details including error message and stack trace
3. Backend API returns a 500 Internal Server Error response to the frontend with error message: "Unable to retrieve supplier data. Please try again later."
4. Frontend receives the error response
5. System displays an error message to the user: "Failed to load supplier list. Please refresh the page or contact support."
6. User cannot view the supplier grid or the "Using SCF" column
7. **Use case terminates.** User can retry by refreshing the page or contact technical support.

### E25.1: Database Query Failure - Cannot Retrieve Supplier Detail

**Branch Point:** Step 25 (Backend API queries the database to retrieve the supplier's full record)

**Condition:** The database query fails due to connection timeout, database unavailability, or the supplier record is not found

1. Backend API attempts to query the database but the query fails or returns no results
2. Backend API logs the error details
3. Backend API returns a 404 Not Found or 500 Internal Server Error response to the frontend
4. Frontend receives the error response
5. System displays an error message to the user: "Unable to load supplier details. Please try again later."
6. User cannot view the supplier detail page or the "Currently on SCF" badge
7. **Use case terminates.** User can return to the supplier grid and retry or contact technical support.

### E49.1: Required Field Validation Failure

**Branch Point:** Step 49 (Frontend validates that all required fields are completed)

**Condition:** One or more required fields in the Agreed Payment Terms dialog are empty or contain invalid data

1. Frontend validates the dialog fields and finds that required fields are missing or invalid
2. System highlights the invalid fields with red borders or error indicators
3. System displays inline error messages next to each invalid field (e.g., "This field is required", "Invalid date format")
4. System prevents the Save button from submitting the form
5. User reviews the error messages and corrects the invalid fields
6. User re-submits the form by clicking Save
7. **Go to Step 49** (Frontend validates that all required fields are completed - validation now passes)

### E53.1: Backend Validation Failure - Invalid SCF Accepted Value

**Branch Point:** Step 53 (Backend API validates the payload data)

**Condition:** The "scfAccepted" value in the payload is not a valid Boolean (e.g., null when required, string instead of Boolean, unexpected data type)

1. Backend API validates the payload and finds that the "scfAccepted" field contains an invalid value
2. Backend API logs the validation error details
3. Backend API returns a 400 Bad Request response to the frontend with error message: "Invalid SCF Accepted value. Expected Boolean (true/false)."
4. Frontend receives the error response
5. System displays an error message to the user: "Failed to save agreed payment terms due to invalid data. Please try again or contact support."
6. System keeps the Agreed Payment Terms dialog open so the user can retry
7. **Use case terminates.** User can retry saving or cancel the dialog and contact technical support.

### E55.1: Database Update Failure - Cannot Save SCF Accepted Value

**Branch Point:** Step 55 (Backend API updates the supplier's "scfAccepted" column in the database)

**Condition:** The database update operation fails due to connection timeout, constraint violation, or database unavailability

1. Backend API attempts to update the database but the operation fails
2. Backend API rolls back the database transaction to prevent partial updates
3. Backend API logs the error details including error message and stack trace
4. Backend API returns a 500 Internal Server Error response to the frontend with error message: "Failed to save agreed payment terms. Database update failed."
5. Frontend receives the error response
6. System displays an error message to the user: "Failed to save agreed payment terms. Please try again later."
7. System keeps the Agreed Payment Terms dialog open so the user can retry
8. **Use case terminates.** User can retry saving or cancel the dialog and contact technical support.

## Acceptance Criteria

1. **Using SCF Column Display:**
   - The "Using SCF" column appears in all supplier grid interfaces by default
   - The column is positioned immediately to the right of the "Captured Cash Discount" column
   - The column displays "Yes" or a checkmark icon for suppliers where usingSCF = true
   - The column displays "No" or empty/unchecked for suppliers where usingSCF = false
   - The column supports sorting (ascending/descending)
   - The column supports filtering (show only SCF suppliers or exclude them)
   - The column is visible by default but can be hidden by users via column customization
   - The column width is optimized to display content without truncation (80-100 pixels)

2. **Currently on SCF Badge Display:**
   - The "Currently on SCF" badge appears in the top right corner of the Payment Terms and Strategy card when usingSCF = true
   - The badge displays the text "Currently on SCF" with appropriate styling (light gray background #F5F5F5, dark text #333333, rounded corners)
   - The badge does not appear when usingSCF = false or null
   - The badge is static (non-interactive) and serves as a visual indicator only
   - The badge is visible across all viewport sizes and responsive breakpoints
   - The badge does not displace or overlap existing content in the Payment Terms card

3. **SCF Accepted Toggle Display:**
   - The "SCF Accepted" toggle appears in the Agreed Payment Terms dialog when the SCF feature is enabled
   - The toggle is positioned alongside the "Vcard Accepted" toggle in the same row or section
   - The toggle uses the same visual style as the "Vcard Accepted" toggle (switch component)
   - The toggle is labeled "SCF Accepted" clearly
   - The toggle does not appear when the SCF feature is disabled

4. **SCF Accepted Toggle Default Behavior:**
   - When usingSCF = true, the "SCF Accepted" toggle defaults to ON (enabled/checked)
   - When usingSCF = false or null, the "SCF Accepted" toggle defaults to OFF (disabled/unchecked)
   - Users can manually toggle the "SCF Accepted" control ON or OFF regardless of the default state
   - The toggle state is persisted to the database when the user saves the Agreed Payment Terms dialog

5. **Data Persistence and Retrieval:**
   - The "scfAccepted" value is saved to the database when the user clicks Save in the Agreed Payment Terms dialog
   - The "scfAccepted" value is loaded from the database when the Agreed Payment Terms dialog is opened
   - The system maintains consistency between the spend file's "usingSCF" indicator and the "scfAccepted" field through intelligent default behavior
   - The Backend API validates the "scfAccepted" field as a Boolean before saving

6. **Error Handling:**
   - The system displays user-friendly error messages when database queries fail
   - The system displays validation error messages when required fields are missing or invalid
   - The system prevents saving when validation fails
   - The system logs all errors for troubleshooting and monitoring

7. **Feature Flag Control:**
   - The "SCF Accepted" toggle only appears when the SCF feature is enabled in the Admin Console for the user's company
   - When the SCF feature is disabled, the toggle does not appear in the Agreed Payment Terms dialog
   - The "Using SCF" column and "Currently on SCF" badge are independent of the feature flag (always visible if data is available)

## Non-Functional Requirements

### Performance
- The supplier grid must load and display the "Using SCF" column within 2 seconds for grids containing up to 1,000 suppliers
- Sorting and filtering operations on the "Using SCF" column must complete within 1 second
- The supplier detail page must render the "Currently on SCF" badge within 500 milliseconds of page load
- The Agreed Payment Terms dialog must load and set the "SCF Accepted" toggle default state within 1 second

### Security
- User authentication required before accessing supplier grids, supplier detail pages, or the Agreed Payment Terms dialog
- User authorization must be enforced to ensure only users with Suppliers module permissions can view SCF data
- The Backend API must validate and sanitize the "scfAccepted" input to prevent SQL injection or data corruption
- All API requests to update the "scfAccepted" field must be authenticated and authorized

### Usability
- The "Using SCF" column header must be clearly labeled and easily distinguishable from other columns
- The "Currently on SCF" badge must be visually prominent but not overwhelming, using neutral colors that fit the ADA design system
- The "SCF Accepted" toggle must be clearly labeled and positioned alongside "Vcard Accepted" to indicate parallel functionality
- The default state of the "SCF Accepted" toggle (ON for SCF suppliers, OFF otherwise) must be intuitive and reduce user effort
- Error messages must clearly identify validation failures and guide users to corrective actions

### Reliability
- The system must handle database query failures gracefully, displaying user-friendly error messages without exposing technical details
- The Backend API must implement transaction rollback if the database update for "scfAccepted" fails, preventing partial data corruption
- The system must log all errors related to SCF data retrieval and updates for troubleshooting and monitoring

### Maintainability
- The "Using SCF" column implementation must reuse existing grid component architecture and column rendering logic
- The "Currently on SCF" badge must use a reusable badge component consistent with other badge elements in the ADA platform
- The "SCF Accepted" toggle must use the same toggle component as "Vcard Accepted" to maintain code consistency
- The SCF feature flag logic must be centralized and easily configurable via the Admin Console

### Compatibility
- The "Using SCF" column must be compatible with all existing supplier grid interfaces across the ADA platform
- The "Currently on SCF" badge must render correctly across all supported browsers (Chrome, Firefox, Safari, Edge) and viewport sizes
- The "SCF Accepted" toggle must function correctly on desktop, tablet, and mobile devices

### Data Integrity
- The system must ensure that the "scfAccepted" field is always a valid Boolean (true/false) and never null after the initial migration
- The Backend API must enforce data type validation for the "scfAccepted" field to prevent invalid values
- The system must maintain consistency between the spend file's "usingSCF" indicator and the "scfAccepted" field through intelligent default behavior

## Test Cases

### TC-MF-001: Main Flow - View Using SCF Column in Supplier Grid

**Flow Tested:** Main Flow (Steps 1-20)

**Preconditions:**
- User is authenticated with Suppliers module permissions
- Backend API returns supplier list with usingSCF field
- At least one supplier has usingSCF = true and one has usingSCF = false

**Inputs:**
- Step 3: User clicks "Suppliers" in main navigation menu
- Step 5: Frontend sends GET request to `/api/suppliers`
- Step 17: User clicks "Using SCF" column header to sort
- Step 19: User applies filter: "Using SCF" = "Yes"

**Expected Outputs:**
- Step 10: Supplier grid renders with all columns including "Using SCF"
- Step 11: "Using SCF" column is positioned immediately to the right of "Captured Cash Discount"
- Step 13: Suppliers with usingSCF = true display "Yes" or checkmark icon
- Step 14: Suppliers with usingSCF = false display "No" or empty cell
- Step 15: "Using SCF" column is visible by default
- Step 18: Grid rows are re-ordered with SCF suppliers grouped together
- Step 20: Grid displays only suppliers where usingSCF = true

### TC-MF-002: Main Flow - View Currently on SCF Badge

**Flow Tested:** Main Flow (Steps 21-34)

**Preconditions:**
- User is viewing supplier grid
- Supplier with usingSCF = true exists in grid
- Backend API returns supplier detail with usingSCF = true

**Inputs:**
- Step 22: User clicks on supplier row with usingSCF = true
- Step 24: Frontend sends GET request to `/api/suppliers/{id}`

**Expected Outputs:**
- Step 23: System navigates to supplier detail page
- Step 29: Supplier detail page renders with Payment Terms and Strategy card
- Step 32: "Currently on SCF" badge appears in top right corner of Payment Terms card
- Step 33: Badge displays text "Currently on SCF" with light gray background (#F5F5F5), dark text (#333333), rounded corners
- Step 34: User can see badge clearly without it overlapping other content

### TC-MF-003: Main Flow - SCF Accepted Toggle Defaults to ON for SCF Supplier

**Flow Tested:** Main Flow (Steps 35-64)

**Preconditions:**
- User is viewing supplier detail page for supplier with usingSCF = true
- SCF feature is enabled for user's company
- Backend API returns supplier detail with usingSCF = true, scfAccepted = true

**Inputs:**
- Step 36: User clicks "Add Results" button in Payment Terms section
- Step 47: User enters "Without Cash Discount" = 45, "Date of Agreement" = current date, "Next Review Date" = current date + 30 days
- Step 48: User clicks "Save" button

**Expected Outputs:**
- Step 37: Agreed Payment Terms dialog opens as modal overlay
- Step 40: "SCF Accepted" toggle appears alongside "Vcard Accepted" toggle
- Step 43: "SCF Accepted" toggle is set to ON (checked) by default
- Step 44: Dialog displays all fields with "SCF Accepted" toggle in ON state
- Step 50: Frontend constructs payload with scfAccepted = true
- Step 57: Backend API returns success response
- Step 59: Dialog closes
- Step 60: Success message displays: "Agreed payment terms saved successfully"
- Step 61: Supplier detail page refreshes with updated data

### TC-AF-001: Alternative Flow A31.1 - Badge Not Displayed for Non-SCF Supplier

**Flow Tested:** Alternative Flow A31.1 (branches at Step 31, returns to Step 35)

**Preconditions:**
- User is viewing supplier detail page for supplier with usingSCF = false or null
- Backend API returns supplier detail with usingSCF = false

**Inputs:**
- Step 22: User clicks on supplier row with usingSCF = false
- Step 24: Frontend sends GET request to `/api/suppliers/{id}`

**Expected Outputs:**
- Step 29: Supplier detail page renders with Payment Terms and Strategy card
- Step 31: System evaluates usingSCF field and finds usingSCF = false
- Step A31.1.2: "Currently on SCF" badge does not appear in Payment Terms card
- Step A31.1.3: Payment Terms card displays all standard content without SCF badge
- Step A31.1.4: User understands supplier is not using SCF (absence of badge)

### TC-AF-002: Alternative Flow A38.1 - Toggle Not Displayed When Feature Disabled

**Flow Tested:** Alternative Flow A38.1 (branches at Step 38, returns to Step 56)

**Preconditions:**
- User is viewing supplier detail page
- SCF feature is disabled in Admin Console for user's company
- Backend API returns supplier detail with usingSCF = true

**Inputs:**
- Step 36: User clicks "Add Results" button in Payment Terms section
- Step 47: User enters agreed payment terms fields
- Step 48: User clicks "Save" button

**Expected Outputs:**
- Step 37: Agreed Payment Terms dialog opens
- Step 38: System checks SCF feature status
- Step A38.1.1: System finds SCF feature is disabled
- Step A38.1.2: "SCF Accepted" toggle does not appear in dialog
- Step A38.1.3: Dialog displays all standard fields including "Vcard Accepted" but without "SCF Accepted"
- Step A38.1.4: User saves agreed payment terms without SCF acceptance information
- Step A38.1.5: Backend API does not update scfAccepted field (remains at current value)

### TC-AF-003: Alternative Flow A42.1 - Toggle Defaults to OFF for Non-SCF Supplier

**Flow Tested:** Alternative Flow A42.1 (branches at Step 42, returns to Step 47)

**Preconditions:**
- User is viewing supplier detail page for supplier with usingSCF = false
- SCF feature is enabled for user's company
- Backend API returns supplier detail with usingSCF = false, scfAccepted = false

**Inputs:**
- Step 36: User clicks "Add Results" button in Payment Terms section
- Step A42.1.5: User clicks "SCF Accepted" toggle to enable it
- Step 47: User enters agreed payment terms fields
- Step 48: User clicks "Save" button

**Expected Outputs:**
- Step 37: Agreed Payment Terms dialog opens
- Step A42.1.2: "SCF Accepted" toggle is set to OFF (unchecked) by default
- Step A42.1.3: Dialog displays with "SCF Accepted" toggle in OFF state
- Step A42.1.5: User can manually enable toggle if supplier accepts SCF during negotiations
- Step 50: Frontend constructs payload with scfAccepted = true (user enabled it)
- Step 57: Backend API returns success response

### TC-AF-004: Alternative Flow A46.1 - User Overrides Default SCF Accepted State

**Flow Tested:** Alternative Flow A46.1 (branches at Step 46, returns to Step 47)

**Preconditions:**
- User is viewing Agreed Payment Terms dialog
- "SCF Accepted" toggle is set to ON by default (usingSCF = true)

**Inputs:**
- Step A46.1.1: User clicks "SCF Accepted" toggle to change state from ON to OFF
- Step 47: User enters agreed payment terms fields
- Step 48: User clicks "Save" button

**Expected Outputs:**
- Step A46.1.2: Toggle visual state updates from ON to OFF
- Step A46.1.3: System tracks new toggle state (false)
- Step 50: Frontend constructs payload with scfAccepted = false
- Step 57: Backend API returns success response
- Step 55: Backend API updates scfAccepted column to false in database

### TC-EF-001: Exceptional Flow E6.1 - Database Query Failure on Supplier List

**Flow Tested:** Exceptional Flow E6.1 (branches at Step 6, terminal flow)

**Preconditions:**
- User is authenticated
- Database is unavailable or connection times out

**Inputs:**
- Step 3: User clicks "Suppliers" in main navigation menu
- Step 5: Frontend sends GET request to `/api/suppliers`
- Step 6: Backend API attempts to query database

**Expected Outputs:**
- Step E6.1.1: Database connection times out or returns error
- Step E6.1.2: Backend API logs error details (error message, stack trace)
- Step E6.1.3: Backend API returns 500 Internal Server Error with message: "Unable to retrieve supplier data. Please try again later."
- Step E6.1.5: Frontend displays error message: "Failed to load supplier list. Please refresh the page or contact support."
- Step E6.1.6: User cannot view supplier grid or "Using SCF" column
- Use case terminates (user can retry by refreshing page)

### TC-EF-002: Exceptional Flow E25.1 - Database Query Failure on Supplier Detail

**Flow Tested:** Exceptional Flow E25.1 (branches at Step 25, terminal flow)

**Preconditions:**
- User is viewing supplier grid
- User clicks on supplier row
- Database is unavailable or supplier record not found

**Inputs:**
- Step 22: User clicks on supplier row
- Step 24: Frontend sends GET request to `/api/suppliers/{id}`
- Step 25: Backend API attempts to query database

**Expected Outputs:**
- Step E25.1.1: Database query fails or returns no results
- Step E25.1.2: Backend API logs error details
- Step E25.1.3: Backend API returns 404 Not Found or 500 Internal Server Error
- Step E25.1.5: Frontend displays error message: "Unable to load supplier details. Please try again later."
- Step E25.1.6: User cannot view supplier detail page or "Currently on SCF" badge
- Use case terminates (user can return to grid and retry)

### TC-EF-003: Exceptional Flow E49.1 - Required Field Validation Failure

**Flow Tested:** Exceptional Flow E49.1 (branches at Step 49, returns to Step 49 after correction)

**Preconditions:**
- User is viewing Agreed Payment Terms dialog
- User has not filled all required fields

**Inputs:**
- Step 47: User leaves "Without Cash Discount" field empty
- Step 48: User clicks "Save" button

**Expected Outputs:**
- Step E49.1.1: Frontend validates and finds required field is missing
- Step E49.1.2: System highlights "Without Cash Discount" field with red border
- Step E49.1.3: System displays inline error message: "This field is required"
- Step E49.1.4: Save button is prevented from submitting form
- Step E49.1.5: User enters value in "Without Cash Discount" field
- Step E49.1.6: User clicks "Save" button again
- Step 49: Validation passes, form submits successfully

### TC-EF-004: Exceptional Flow E53.1 - Backend Validation Failure

**Flow Tested:** Exceptional Flow E53.1 (branches at Step 53, terminal flow)

**Preconditions:**
- User is saving Agreed Payment Terms
- Frontend sends invalid scfAccepted value (e.g., string instead of boolean)

**Inputs:**
- Step 51: Frontend sends POST request with scfAccepted = "invalid_string"
- Step 53: Backend API validates payload

**Expected Outputs:**
- Step E53.1.1: Backend API finds scfAccepted field contains invalid value
- Step E53.1.2: Backend API logs validation error details
- Step E53.1.3: Backend API returns 400 Bad Request with message: "Invalid SCF Accepted value. Expected Boolean (true/false)."
- Step E53.1.5: Frontend displays error message: "Failed to save agreed payment terms due to invalid data. Please try again or contact support."
- Step E53.1.6: Dialog remains open so user can retry
- Use case terminates (user can retry or cancel)

### TC-EF-005: Exceptional Flow E55.1 - Database Update Failure

**Flow Tested:** Exceptional Flow E55.1 (branches at Step 55, terminal flow)

**Preconditions:**
- User is saving Agreed Payment Terms
- Database is unavailable during update operation

**Inputs:**
- Step 51: Frontend sends POST request with valid payload
- Step 55: Backend API attempts to update scfAccepted column

**Expected Outputs:**
- Step E55.1.1: Database update operation fails
- Step E55.1.2: Backend API rolls back transaction to prevent partial updates
- Step E55.1.3: Backend API logs error details (error message, stack trace)
- Step E55.1.4: Backend API returns 500 Internal Server Error with message: "Failed to save agreed payment terms. Database update failed."
- Step E55.1.6: Frontend displays error message: "Failed to save agreed payment terms. Please try again later."
- Step E55.1.7: Dialog remains open so user can retry
- Use case terminates (user can retry or cancel)

---

**Document Version:** 1.0  
**Created:** 2026-01-22  
**Status:** Approved for Implementation
