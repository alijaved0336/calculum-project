# Role Constants Usage Guide

This directory contains centralized constants for all application roles, organized into separate files for better maintainability.

## File Structure

- **`roles.ts`** - Main file that combines all role types together
- **`sessionRoles.ts`** - User authentication and basic permission roles
- **`moduleRoles.ts`** - Access to specific application modules
- **`featureRoles.ts`** - Access to specific features within modules

## Importing Constants

### Import All Roles Together
```typescript
// Import from the main roles file (recommended for most cases)
import { SESSION_ROLES, MODULE_ROLES, FEATURE_ROLES, ALL_ROLES } from '@/constants';

// Import individual constants
import { ROLE_ADMIN, MODULE_ANALYZE, FEATURE_VALUE_PROPOSITION } from '@/constants';
```

### Import Specific Role Types
```typescript
// Import only session roles
import { SESSION_ROLES, ROLE_ADMIN } from '@/constants/sessionRoles';

// Import only module roles
import { MODULE_ROLES, MODULE_ANALYZE } from '@/constants/moduleRoles';

// Import only feature roles
import { FEATURE_ROLES, FEATURE_VALUE_PROPOSITION } from '@/constants/featureRoles';
```

### Import Utility Functions
```typescript
// Import all utilities from main utils index
import { 
  hasSuperAdminRole, 
  hasAnalyzeModuleRole, 
  hasValuePropositionFeature 
} from '@/utils';

// Import specific utility categories
import { hasSuperAdminRole } from '@/utils/sessionRoleUtils';
import { hasAnalyzeModuleRole } from '@/utils/moduleRoleUtils';
import { hasValuePropositionFeature } from '@/utils/featureRoleUtils';
import { hasRole, getUserRoleSummary } from '@/utils/roleUtils';
```

## Available Role Constants

### Session Roles (`sessionRoles.ts`)
```typescript
SESSION_ROLES = {
  SUPER_ADMIN: "ROLE_ADMIN",
  COMPANY_ADMIN: "ROLE_COMPANY_ADMIN",
  USER: "ROLE_USER",
  VIEW_ONLY: "ROLE_VIEW",
  DATA_USER: "ROLE_DATA",
  SALES_USER: "ROLE_SALES",
  PARTNER_USER: "ROLE_PARTNER",
}
```

### Module Roles (`moduleRoles.ts`)
```typescript
MODULE_ROLES = {
  ANALYZE: "MODULE_ANALYZE",
  COMPARE: "MODULE_COMPARE",
  MANAGE: "MODULE_MANAGE",
  MATCH: "MODULE_MATCH",
  OPPORTUNITY: "MODULE_OPPORTUNITY",
  PLAN: "MODULE_PLAN",
  SUPPLIERS: "MODULE_SUPPLIERS",
}
```

### Feature Roles (`featureRoles.ts`)
```typescript
FEATURE_ROLES = {
  DOWNLOAD_EXCEL_MATCH: "FEATURE_DOWNLOAD_EXCEL_MATCH",
  DOWNLOAD_EXCEL: "FEATURE_DOWNLOAD_EXCEL",
  EMAIL_NEGOTIATIONS: "FEATURE_EMAIL_NEGOTIATIONS",
  ENTITY_CARD_NEWSLETTER: "FEATURE_ENTITY_CARD_NEWSLETTER",
  SCF_STRATEGY: "FEATURE_SCF_STRATEGY",
  NINE_BOXES_FINANCING: "FEATURE_9_BOXES_FINANCING",
  PILOT: "FEATURE_PILOT",
  VIRTUAL_CARD: "FEATURE_VIRTUAL_CARD",
  PAYMENT_TERMS_VS_PRICE: "FEATURE_PAYMENT_TERMS_VS_PRICE",
  SME: "FEATURE_SME",
  CREDIT_RATING: "FEATURE_CREDIT_RATING",
  VALUE_PROPOSITION: "FEATURE_VALUE_PROPOSITION",
  SUPPLIER_STANDARD: "FEATURE_SUPPLIER_STANDARD",
  PEER_GROUP_STANDARD: "FEATURE_PEER_GROUP_STANDARD",
}
```

### All Roles Combined (`roles.ts`)
```typescript
// Combines all role types into one object
ALL_ROLES = {
  ...SESSION_ROLES,
  ...MODULE_ROLES,
  ...FEATURE_ROLES,
}

// Combined type for all roles
type RoleValue = SessionRoleValue | ModuleRoleValue | FeatureRoleValue;
```

## Utility Functions

### Session Role Utilities (`@/utils/sessionRoleUtils`)
```typescript
import { 
  hasSuperAdminRole, 
  hasCompanyAdminRole, 
  hasAdminPrivileges,
  hasElevatedPrivileges 
} from '@/utils/sessionRoleUtils';

// Check specific session roles
if (hasSuperAdminRole(userRoles)) {
  // User is super admin
}

// Check admin privileges (super admin or company admin)
if (hasAdminPrivileges(userRoles)) {
  // User has admin access
}

// Check elevated privileges
if (hasElevatedPrivileges(userRoles)) {
  // User has elevated access above basic user
}
```

### Module Role Utilities (`@/utils/moduleRoleUtils`)
```typescript
import { 
  hasAnalyzeModuleRole, 
  hasManageModuleRole,
  hasCoreModuleAccess,
  hasAdvancedModuleAccess 
} from '@/utils/moduleRoleUtils';

// Check specific module access
if (hasAnalyzeModuleRole(userRoles)) {
  // User can access analyze module
}

// Check core module access
if (hasCoreModuleAccess(userRoles)) {
  // User has access to core modules (analyze, manage, plan)
}

// Check advanced module access
if (hasAdvancedModuleAccess(userRoles)) {
  // User has access to advanced modules (compare, match, opportunity)
}
```

### Feature Role Utilities (`@/utils/featureRoleUtils`)
```typescript
import { 
  hasValuePropositionFeature, 
  hasSMEFeature,
  hasExportFeatures,
  hasFinancialFeatures 
} from '@/utils/featureRoleUtils';

// Check specific features
if (hasValuePropositionFeature(userRoles)) {
  // User can access value proposition feature
}

// Check feature categories
if (hasExportFeatures(userRoles)) {
  // User has export features (download excel)
}

if (hasFinancialFeatures(userRoles)) {
  // User has financial features (SCF, financing, credit rating)
}
```

### General Role Utilities (`@/utils/roleUtils`)
```typescript
import { 
  hasRole, 
  getUserRoleSummary, 
  hasRequiredRoles,
  hasAnyOfRoles 
} from '@/utils/roleUtils';

// Check any role
if (hasRole(userRoles, SESSION_ROLES.SUPER_ADMIN)) {
  // User has super admin role
}

// Get comprehensive role summary
const summary = getUserRoleSummary(userRoles);
console.log('Session Roles:', summary.sessionRoles);
console.log('Module Roles:', summary.moduleRoles);
console.log('Feature Roles:', summary.featureRoles);

// Check if user has all required roles
if (hasRequiredRoles(userRoles, [MODULE_ROLES.ANALYZE, FEATURE_ROLES.VALUE_PROPOSITION])) {
  // User has all required roles
}

// Check if user has any of the option roles
if (hasAnyOfRoles(userRoles, [MODULE_ROLES.ANALYZE, MODULE_ROLES.MANAGE])) {
  // User has at least one of the option roles
}
```

## Usage Examples

### Direct Constant Usage
```typescript
// Instead of hardcoded strings
if (userRoles.includes("ROLE_ADMIN")) {
  // Show admin features
}

// Use constants
if (userRoles.includes(SESSION_ROLES.SUPER_ADMIN)) {
  // Show admin features
}
```

### Using Utility Functions
```typescript
import { 
  hasSuperAdminRole, 
  hasAnalyzeModuleRole, 
  hasValuePropositionFeature 
} from '@/utils';

// Check session roles
if (hasSuperAdminRole(userRoles)) {
  // Show super admin features
}

// Check module access
if (hasAnalyzeModuleRole(userRoles)) {
  // Show analyze module
}

// Check feature access
if (hasValuePropositionFeature(userRoles)) {
  // Show value proposition feature
}
```

### In Type Definitions
```typescript
// Types automatically use the constants
export type SuperAdminRole = typeof SESSION_ROLES.SUPER_ADMIN;
export type AnalyzeModuleRole = typeof MODULE_ROLES.ANALYZE;
export type ValuePropositionFeatureRole = typeof FEATURE_ROLES.VALUE_PROPOSITION;
```

## Benefits

1. **Modularity**: Separate files for different role types
2. **Maintainability**: Easy to manage specific role categories
3. **Flexibility**: Import only what you need
4. **Type Safety**: Constants provide compile-time checking
5. **Consistency**: Ensures the same values are used throughout the app
6. **IntelliSense**: Better IDE support with autocomplete
7. **Clean Code**: Utility functions make role checking more readable
8. **Separation of Concerns**: Different utility files for different role types

## When to Use Which File

- **`roles.ts`**: When you need to work with all roles together
- **`sessionRoles.ts`**: When working only with user authentication roles
- **`moduleRoles.ts`**: When working only with module access roles
- **`featureRoles.ts`**: When working only with feature access roles

## When to Use Which Utility File

- **`@/utils/roleUtils`**: When working with all role types together
- **`@/utils/sessionRoleUtils`**: When working only with session roles
- **`@/utils/moduleRoleUtils`**: When working only with module roles
- **`@/utils/featureRoleUtils`**: When working only with feature roles
- **`@/utils`**: When you need utilities from multiple categories

## Migration from Hardcoded Strings

When migrating existing code:

1. Replace hardcoded strings with constants
2. Use appropriate utility functions for common checks
3. Update imports to use `@/constants` (recommended) or specific files
4. Ensure type definitions reference the constants

## Adding New Roles

1. Add the new role to the appropriate constants file:
   - `sessionRoles.ts` for user authentication roles
   - `moduleRoles.ts` for module access roles
   - `featureRoles.ts` for feature access roles
2. Add the corresponding type in `types/index.ts`
3. Add utility functions in the appropriate utility file
4. Update this documentation

## Role Hierarchy

- **Session Roles**: User authentication and basic permissions
- **Module Roles**: Access to specific application modules
- **Feature Roles**: Access to specific features within modules

This hierarchy allows for granular permission control across the application.
