# Use Case: News Setup Configuration

## Title
As an ADA Administrator I should be able to configure news search keywords and filters through a dedicated News Setup interface so I can customize news content to match my company's specific industry focus and supplier search requirements.

## Description
This use case enables ADA administrators to configure and customize the news search parameters used by the News feature through a dedicated Setup interface. The configuration allows companies to tailor news content to their specific industry context by managing keywords, selecting standard terms, and adding custom search criteria for both General News (Home Module) and Supplier News (Entity Card) features.

## Actors
- **ADA Administrator**: User with administrator-level permissions who configures News search parameters
- **ADA User**: End-user who views news articles (indirectly affected by configuration)
- **ADA System**: Application system managing the Setup module and news queries
- **Backend API**: Backend service storing and retrieving configuration
- **GNews API**: External news aggregation service

## Preconditions
1. ADA Administrator must be authenticated with administrator-level permissions
2. News feature must be enabled for the administrator's company (feature flag: `FEATURE_ENTITY_CARD_NEWSLETTER`)
3. Setup module must be functional in the ADA system
4. Backend API must have endpoints to store and retrieve News configuration
5. Existing News feature implementation must be functional

## Trigger
Administrator navigates to the Setup module and clicks on the News tab, OR administrator clicks a preference button from the General News view or Supplier News tab.

## Main Flow
1. Administrator logs into ADA system with administrator credentials
2. System authenticates administrator and grants access
3. Administrator navigates to Setup module via gear icon in left navigation
4. System displays Setup module with configuration tabs
5. Administrator observes "News" tab among other tabs
6. Administrator clicks "News" tab
7. System activates News tab and displays configuration interface
8. System retrieves current News configuration from Backend API
9. System populates General News section with retrieved data:
   - Key Words text field
   - Six checkboxes (all selected by default): Cash Flow, Supply Chain, Supply Chain Finance, SCF, Financing, Procurement
   - Add terms text field
   - Character counter
10. System populates Supplier News section with retrieved data:
    - Key Words checkboxes: Supplier Name, Parent Name (both selected by default)
    - Same six term checkboxes
    - Add terms text field
    - Character counter
11. Administrator modifies General News Key Words (e.g., "Pharma, Healthcare")
12. System updates character counter in real-time
13. Administrator selects/deselects term checkboxes as needed
14. System recalculates character count
15. Administrator adds custom terms if needed
16. System verifies character count is below 200 limit
17. Administrator reviews Supplier News configuration
18. Administrator modifies Supplier News settings as needed
19. System validates both configurations
20. System enables Save button (all validations pass)
21. Administrator clicks Save button
22. System sends configuration to Backend API
23. Backend API validates and stores configuration
24. System displays success message: "News configuration saved successfully"
25. Configuration is applied to all subsequent news queries for the company

## Alternative Flows

### A11.1: Character Limit Exceeded During Input
**Branch Point**: Step 11-15 (Administrator types in text fields)
**Condition**: Total query string exceeds 200 characters

1. System detects character count exceeds 200
2. System displays counter in red/warning color
3. System displays warning: "Note: The concatenation of Key words should not exceed 200 characters."
4. System disables Save button
5. Administrator reduces text to bring count below 200
6. System removes warning and enables Save button
7. Go to Step 16

### A3.1: Access via Preference Button from General News View
**Branch Point**: Step 3
**Condition**: Administrator clicks preference button from General News view

1. Administrator views General News in Home Module
2. Administrator clicks settings/preferences button in header
3. System navigates to Setup module automatically
4. System activates News tab with focus on General News section
5. Go to Step 8

### A3.2: Access via Preference Button from Supplier News Tab
**Branch Point**: Step 3
**Condition**: Administrator clicks preference button from Supplier News tab

1. Administrator views Supplier News tab in Entity Card
2. Administrator clicks settings/preferences button in tab header
3. System navigates to Setup module automatically
4. System activates News tab with focus on Supplier News section
5. Go to Step 8

## Exceptional Flows

### E22.1: Backend API Fails to Save Configuration
**Branch Point**: Step 22
**Condition**: Backend API unavailable or returns error

1. System detects API failure
2. System logs error with configuration data
3. System displays error: "Failed to save News configuration. Please try again."
4. System preserves unsaved configuration in form
5. Administrator can retry save operation
6. Use case terminates (changes not persisted)

### E8.1: Backend API Fails to Retrieve Configuration
**Branch Point**: Step 8
**Condition**: Backend API fails during configuration retrieval

1. System detects API failure
2. System logs error
3. System displays default configuration values (all checkboxes selected, empty text fields)
4. System displays notification: "Using default settings (configuration unavailable)"
5. Go to Step 9 with defaults

### E19.1: Empty Configuration Validation Error
**Branch Point**: Step 19
**Condition**: No terms selected in either section

1. System detects no terms selected
2. System displays validation error: "[Section] must include at least one keyword or term."
3. System disables Save button
4. Administrator selects at least one term
5. Go to Step 19

## Acceptance Criteria

1. **AC: Preference Button Navigation from General News View**
   - Given an ADA Administrator viewing General News in Home Module
   - When clicking the settings button in the header
   - Then system navigates to Setup > News tab with focus on General News section

2. **AC: Preference Button Navigation from Supplier News Tab**
   - Given an ADA Administrator viewing Supplier News in Entity Card
   - When clicking the settings button in the tab header
   - Then system navigates to Setup > News tab with focus on Supplier News section

3. **AC: General News Configuration Interface**
   - Interface must include Key Words text input for comma-separated keywords
   - Interface must include six checkboxes (all selected by default)
   - Interface must include Add terms text input
   - Real-time character counter must update on input changes
   - Warning must display when exceeding 200 characters

4. **AC: Supplier News Configuration Interface**
   - Interface must include checkboxes for "Supplier Name" and "Parent Name" (both selected by default)
   - Same six term checkboxes as General News
   - Add terms text input with character counter
   
5. **AC: Character Limit Validation**
   - Counter must display in red when > 200 characters
   - Warning message must be displayed
   - Save button must be disabled

6. **AC: Configuration Persistence**
   - Save button sends configuration to Backend API
   - Success message displays after successful save
   - Configuration persists across sessions

7. **AC: Configuration Application to Queries**
   - General News queries use configured keywords and terms
   - Supplier News queries use configured entity identifiers and terms
   - Fallback to defaults if no custom configuration exists

## Non-Functional Requirements

### Security
- Only administrators can access News Setup tab
- Preference buttons only visible to administrators
- Input validation on frontend and backend (XSS, SQL injection prevention)
- API communications use HTTPS
- Configuration changes logged for audit

### Usability
- Interface follows existing Setup module visual patterns
- Clear section headings and explanatory text
- Prominent character counter
- Clear warning messages for validation errors

### Reliability
- Graceful handling of API failures
- Fallback to default queries if configuration unavailable
- Atomic save operations (all or nothing)

### Maintainability
- Character limit (200) configurable via constant
- Standard terms list externalized for easy updates
- Query construction logic centralized

## Test Cases

### TC-MF-001: Main Flow - Successful Configuration Save
- **Flow Tested**: Main Flow (Steps 1-25)
- **Preconditions**: Administrator logged in, News feature enabled
- **Inputs**:
  - General News Key Words: "Pharma, Healthcare"
  - General News checkboxes: Cash Flow, Supply Chain, Financing selected
  - Supplier News: Both entity checkboxes selected, all terms selected
- **Expected Outputs**:
  - Character counter shows < 200
  - Save button enabled
  - Success message displayed
  - Configuration persisted in database

### TC-AF-001: Character Limit Exceeded
- **Flow Tested**: Alternative Flow A11.1
- **Preconditions**: Administrator on News Setup tab
- **Inputs**:
  - Key Words: Very long text exceeding 200 characters combined with terms
- **Expected Outputs**:
  - Counter displays in red
  - Warning message visible
  - Save button disabled

### TC-AF-002: Navigation from General News Preference Button
- **Flow Tested**: Alternative Flow A3.1
- **Preconditions**: Administrator viewing General News
- **Inputs**: Click on preference/settings button
- **Expected Outputs**:
  - Navigates to Setup module
  - News tab activated
  - General News section focused

### TC-EF-001: Backend API Save Failure
- **Flow Tested**: Exceptional Flow E22.1
- **Preconditions**: Backend API unavailable
- **Inputs**: Click Save button
- **Expected Outputs**:
  - Error message displayed
  - Form data preserved
  - No data persisted

---

**Work Item Reference**: [Azure DevOps #14129](https://dev.azure.com/calculum/ADA/_sprints/taskboard/ADA%20Team/ADA/Sprint%20101?workitem=14129)
**Related Tasks**: #14141 (Frontend), #14142 (Backend)
