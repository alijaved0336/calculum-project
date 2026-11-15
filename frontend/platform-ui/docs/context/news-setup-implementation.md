# News Setup Configuration - Implementation Checklist

## Work Item Reference
- **User Story**: [#14129](https://dev.azure.com/calculum/ADA/_sprints/taskboard/ADA%20Team/ADA/Sprint%20101?workitem=14129)
- **Frontend Task**: #14141
- **Backend Task**: #14142
- **Branch**: `feature/12129-setup-news`

## Overview
Implement a News Setup interface in the Setup module allowing administrators to configure keywords and filters for news searches (General News and Supplier News).

---

## Implementation Status: COMPLETED ✓

---

## Frontend Implementation

### 1. Create NewsSetup Component ✓
- [x] Created `Front-End/src/modules/home/views/settings/NewsSetup.vue`
- [x] Implemented two configuration sections:
  - **General News Section**:
    - Heading: "General news" with description
    - Key Words text input (comma-separated)
    - "AND any of the following" heading
    - 6 checkboxes: Cash Flow, Supply Chain, Supply Chain Finance, SCF, Financing, Procurement
    - Add terms text input
    - Character counter (real-time, limit 200)
  - **Supplier News Section**:
    - Heading: "Supplier news" with description
    - Key Words checkboxes: Supplier Name, Parent Name
    - "AND any of the following" heading
    - Same 6 term checkboxes
    - Add terms text input
    - Character counter

### 2. Integrate News Tab in HomeCompanySettings ✓
- [x] Modified `Front-End/src/modules/home/views/HomeCompanySettings.vue`:
  - Imported NewsSetup component
  - Added News tab button (with feature flag `useFeatureEntityCardNewsletter`)
  - Added NewsSetup to components list
  - Handle tab navigation

### 3. Add Preference Buttons ✓
- [x] Modified `Front-End/src/modules/home/entityCard/views/EntityCardNews.vue`:
  - Added settings icon/button to Supplier News header
  - Only visible for administrators (isAdmin computed property)
  - Navigate to Setup > News tab on click (goToNewsSetup function)

### 4. Update EntityCardNews Query Construction ✓
- [x] Modified `Front-End/src/modules/home/entityCard/views/EntityCardNews.vue`:
  - Import and use `getNewsConfigForQuery` API function
  - Load configuration on component mount
  - Use configuration to build search queries dynamically
  - Support for both General News and Supplier News sections
  - Fallback to default configuration if API fails

### 5. API Functions ✓
- [x] Added to `Front-End/src/modules/home/api/index.ts`:
  - `getNewsConfig()` - Get news configuration
  - `getNewsConfigForQuery()` - Lightweight endpoint for query construction
  - `saveNewsConfig()` - Save news configuration (admin only)
  - `getNewsConfigDefaults()` - Get default values

### 6. TypeScript Types ✓
- [x] Added to `Front-End/src/types/index.ts`:
  - `NEWS_CONFIG_DEFAULT_TERMS` - Default terms constant
  - `NEWS_CONFIG_DEFAULT_ENTITIES` - Default entities constant
  - `NEWS_CONFIG_MAX_QUERY_LENGTH` - Max character limit
  - `NewsConfigGeneralNews` - General news config interface
  - `NewsConfigSupplierNews` - Supplier news config interface
  - `NewsConfig` - Complete configuration interface
  - `NewsConfigResponse` - API response interface
  - `NewsConfigDefaultsResponse` - Defaults response interface

### 7. Translations ✓
- [x] Added English translations in `en.json`:
  - `home.homeCompanySettings.news.*` - Setup tab translations
  - `home.entityCard.news.settings` - Settings button tooltip
- [x] Added Spanish translations in `es.json`:
  - Same structure as English

### 8. Icons ✓
- [x] Created `Front-End/src/resources/assets/images/icons/IconSettings.vue`

---

## Backend Implementation

### 1. Create Entity ✓
- [x] Created `Back-End/src/Entity/Company/CompanyNewsConfig.php`:
  - ManyToOne relationship with Company
  - Fields for General News: keywords, selectedTerms, additionalTerms
  - Fields for Supplier News: selectedEntities, selectedTerms, additionalTerms
  - Default values constants
  - Validation methods
  - toArray() and fromArray() conversion methods

### 2. Create Repository ✓
- [x] Created `Back-End/src/Repository/Company/CompanyNewsConfigRepository.php`:
  - findByCompany() - Find by company entity
  - findByCompanyId() - Find by company ID
  - save() - Save configuration
  - getOrCreate() - Get or create with defaults

### 3. Create Controller ✓
- [x] Created `Back-End/src/Controller/NewsConfigController.php`:
  - GET `/api/company/news-config` - Get company configuration
  - GET `/api/company/news-config/for-query` - Lightweight endpoint for queries
  - PUT/POST `/api/company/news-config` - Save configuration (admin only)
  - GET `/api/company/news-config/defaults` - Get default values
  - Input sanitization and validation
  - Admin permission checks
  - Audit logging

---

## Files Created/Modified

### Backend (New Files)
- `Back-End/src/Entity/Company/CompanyNewsConfig.php`
- `Back-End/src/Repository/Company/CompanyNewsConfigRepository.php`
- `Back-End/src/Controller/NewsConfigController.php`

### Frontend (New Files)
- `Front-End/src/modules/home/views/settings/NewsSetup.vue`
- `Front-End/src/resources/assets/images/icons/IconSettings.vue`

### Frontend (Modified Files)
- `Front-End/src/modules/home/views/HomeCompanySettings.vue` - Added News tab
- `Front-End/src/modules/home/entityCard/views/EntityCardNews.vue` - Updated query construction
- `Front-End/src/modules/home/api/index.ts` - Added API functions
- `Front-End/src/types/index.ts` - Added TypeScript types
- `Front-End/src/resources/locales/languages/en.json` - Added translations
- `Front-End/src/resources/locales/languages/es.json` - Added translations

---

## API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/company/news-config` | Get configuration | User |
| GET | `/api/company/news-config/for-query` | Get for query building | User |
| PUT | `/api/company/news-config` | Save configuration | Admin |
| GET | `/api/company/news-config/defaults` | Get default values | Public |

---

## Feature Flag
- Uses existing `useFeatureEntityCardNewsletter` feature flag
- News tab only visible when feature flag is enabled AND user is admin

---

## Database Migration Required
After deployment, run Doctrine migrations to create the `company_news_config` table.

```bash
php bin/console doctrine:migrations:diff
php bin/console doctrine:migrations:migrate
```
