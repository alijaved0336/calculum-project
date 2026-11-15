# Frontend Audit Log Constants Standardization

## Overview
This document describes the frontend updates to align with the backend audit log constants standardization.

## Date
2025-11-18

## Changes Made

### 1. Audit Log Levels Standardization
**Previous Values:**
- `ERROR` → `Error`
- `INFO` → `Info`
- `WARNING` → `Warning`
- `DEBUG` → `Debug`

**Files Updated:**
- `src/modules/adminBackend/views/AuditLogs.vue`
  - Updated `quickFilterLevels` array to use new standardized values
  - Changed from uppercase to title case (Error, Info, Warning, Debug)

- `src/composables/useAuditLog.ts`
  - Updated `getLevelBadgeClass()` function to support both new and legacy values
  - Added legacy support for backward compatibility during migration period

### 2. Audit Types Standardization
**Previous Values:**
- Removed `API` type (not in backend enum)

**Files Updated:**
- `src/modules/adminBackend/views/AuditLogs.vue`
  - Removed `API` from `quickFilterTypes` array
  - Now only includes: Security, Data, System, User

- `src/resources/locales/languages/en.json`
  - Removed `"api": "API"` from audit types translations

- `src/resources/locales/languages/es.json`
  - Removed `"api": "API"` from audit types translations

### 3. Sources and Contexts
**Status:** No changes needed
- Sources already use correct values: Controller, Service, Command, Listener, Middleware
- Contexts already use correct values: Doctrine, Api, Worker

## Files Modified

### Core Components
1. **src/modules/adminBackend/views/AuditLogs.vue**
   - Updated `quickFilterLevels` to use title case values
   - Removed `API` from `quickFilterTypes`

2. **src/composables/useAuditLog.ts**
   - Updated `getLevelBadgeClass()` to support new standardized level values
   - Added legacy support for old uppercase values (INFO, ERROR, WARNING, DEBUG) for backward compatibility

### Translations
3. **src/resources/locales/languages/en.json**
   - Removed `"api"` from audit types

4. **src/resources/locales/languages/es.json**
   - Removed `"api"` from audit types

## Backward Compatibility

The `getLevelBadgeClass()` function in `useAuditLog.ts` includes legacy support for old uppercase values:
- `INFO` → maps to `badge-info`
- `ERROR` → maps to `badge-danger`
- `WARNING` → maps to `badge-warning`
- `DEBUG` → maps to `badge-secondary`

This ensures the UI continues to work correctly during the migration period when both old and new values may exist in the database.

## Testing

### Manual Testing Checklist
- [ ] Verify audit log filters work with new level values (Error, Info, Warning, Debug)
- [ ] Verify audit log filters work with audit types (Security, Data, System, User)
- [ ] Verify badges display correctly for both new and legacy level values
- [ ] Verify translations display correctly in both English and Spanish
- [ ] Verify no console errors when filtering by audit types

### E2E Tests
- `e2e/tests/logs/audit-logs-data-management.spec.ts`
  - No changes needed (test doesn't filter by specific audit type values)

## Migration Notes

1. **Database Migration**: The backend migration (`Version20251118015918.php`) will update existing database values from old to new format
2. **Frontend Compatibility**: Frontend code supports both old and new values during migration period
3. **Legacy Support**: Legacy support in `getLevelBadgeClass()` can be removed after migration is complete and all old values are confirmed updated

## Related Documentation
- Backend: `docs/context/change-audit-logs-standardization.md`
- Backend Migration: `migrations/Version20251118015918.php`

