# Role Constants Structure

This document explains the organization of role constants and utilities in the application.

## File Organization

```
frontend/src/constants/
├── index.ts              # Main export point for all constants
├── roles.ts              # Combines all role types together
├── sessionRoles.ts       # User authentication and basic permission roles
├── moduleRoles.ts        # Access to specific application modules
├── featureRoles.ts       # Access to specific features within modules
├── README.md             # Comprehensive usage guide
└── STRUCTURE.md          # This file - structure overview

frontend/src/utils/
├── index.ts              # Main export point for all utilities
├── roleUtils.ts          # General role utilities (works with all role types)
├── sessionRoleUtils.ts   # Session role specific utilities
├── moduleRoleUtils.ts    # Module role specific utilities
└── featureRoleUtils.ts   # Feature role specific utilities
```

## File Purposes

### Constants Files

#### `index.ts`
- **Purpose**: Central export point for all constants
- **Exports**: Everything from all role files
- **Usage**: `import { SESSION_ROLES, MODULE_ROLES, FEATURE_ROLES } from '@/constants'`

#### `roles.ts`
- **Purpose**: Combines all role types for cases where you need to manage them together
- **Contains**: 
  - `ALL_ROLES` object combining all role types
  - `RoleValue` type for all roles
  - Utility functions for working with all roles
- **Usage**: When you need to work with roles generically

#### `sessionRoles.ts`
- **Purpose**: User authentication and basic permission roles
- **Contains**: 
  - `SESSION_ROLES` object
  - `SessionRoleValue` type
  - Individual constants like `ROLE_ADMIN`, `ROLE_USER`
- **Usage**: When working only with user authentication

#### `moduleRoles.ts`
- **Purpose**: Access to specific application modules
- **Contains**: 
  - `MODULE_ROLES` object
  - `ModuleRoleValue` type
  - Individual constants like `MODULE_ANALYZE`, `MODULE_MANAGE`
- **Usage**: When working only with module access

#### `featureRoles.ts`
- **Purpose**: Access to specific features within modules
- **Contains**: 
  - `FEATURE_ROLES` object
  - `FeatureRoleValue` type
  - Individual constants like `FEATURE_VALUE_PROPOSITION`, `FEATURE_SME`
- **Usage**: When working only with feature access

### Utility Files

#### `@/utils/index.ts`
- **Purpose**: Central export point for all utility functions
- **Exports**: Everything from all utility files
- **Usage**: `import { hasSuperAdminRole, hasAnalyzeModuleRole } from '@/utils'`

#### `@/utils/roleUtils.ts`
- **Purpose**: General utilities for working with all role types together
- **Contains**: 
  - `hasRole()` - Check any role
  - `getUserRoleSummary()` - Get comprehensive role summary
  - `hasRequiredRoles()` - Check if user has all required roles
  - `hasAnyOfRoles()` - Check if user has any of the option roles
  - `getRoleType()` - Get role type (session, module, or feature)
  - `isValidRole()` - Validate if a role is valid
- **Usage**: When working with all role types together

#### `@/utils/sessionRoleUtils.ts`
- **Purpose**: Utilities specific to session roles
- **Contains**: 
  - `hasSessionRole()` - Generic session role check
  - `hasSuperAdminRole()` - Check super admin role
  - `hasCompanyAdminRole()` - Check company admin role
  - `hasAdminPrivileges()` - Check admin privileges (super or company admin)
  - `hasElevatedPrivileges()` - Check elevated privileges above basic user
  - `getUserSessionRoles()` - Get all session roles user has
- **Usage**: When working only with session roles

#### `@/utils/moduleRoleUtils.ts`
- **Purpose**: Utilities specific to module roles
- **Contains**: 
  - `hasModuleRole()` - Generic module role check
  - `hasAnalyzeModuleRole()` - Check analyze module access
  - `hasManageModuleRole()` - Check manage module access
  - `hasCoreModuleAccess()` - Check core module access (analyze, manage, plan)
  - `hasAdvancedModuleAccess()` - Check advanced module access (compare, match, opportunity)
  - `getUserModuleRoles()` - Get all module roles user has
- **Usage**: When working only with module roles

#### `@/utils/featureRoleUtils.ts`
- **Purpose**: Utilities specific to feature roles
- **Contains**: 
  - `hasFeatureRole()` - Generic feature role check
  - `hasValuePropositionFeature()` - Check value proposition feature
  - `hasSMEFeature()` - Check SME feature
  - `hasExportFeatures()` - Check export features (download excel)
  - `hasFinancialFeatures()` - Check financial features (SCF, financing, credit rating)
  - `getUserFeatureRoles()` - Get all feature roles user has
- **Usage**: When working only with feature roles

## Import Strategies

### Recommended: Import from Main Indexes
```typescript
// Most common and recommended approach
import { SESSION_ROLES, MODULE_ROLES, FEATURE_ROLES } from '@/constants';
import { hasSuperAdminRole, hasAnalyzeModuleRole } from '@/utils';
```

### Specific: Import from Individual Files
```typescript
// When you only need specific role types
import { SESSION_ROLES } from '@/constants/sessionRoles';
import { hasSuperAdminRole } from '@/utils/sessionRoleUtils';
```

### Combined: Import from Roles File
```typescript
// When you need to work with all roles together
import { ALL_ROLES, RoleValue } from '@/constants/roles';
import { hasRole, getUserRoleSummary } from '@/utils/roleUtils';
```

## Benefits of This Structure

1. **Separation of Concerns**: Each file handles one type of role or utility category
2. **Maintainability**: Easy to modify specific role categories or utility functions
3. **Flexibility**: Import only what you need
4. **Scalability**: Easy to add new role types or utility functions
5. **Consistency**: All role types and utilities follow the same pattern
6. **Type Safety**: Full TypeScript support across all files
7. **Tree Shaking**: Better bundling when importing from specific files
8. **Team Collaboration**: Different developers can work on different role categories

## Adding New Roles

### Adding a New Session Role
1. Add to `sessionRoles.ts`:
   ```typescript
   export const SESSION_ROLES = {
     // ... existing roles
     NEW_ROLE: "ROLE_NEW_ROLE",
   } as const;
   ```
2. Add individual constant:
   ```typescript
   export const ROLE_NEW_ROLE = SESSION_ROLES.NEW_ROLE;
   ```
3. Add utility function in `sessionRoleUtils.ts`
4. Update types in `types/index.ts`
5. Update documentation

### Adding a New Module Role
1. Add to `moduleRoles.ts`:
   ```typescript
   export const MODULE_ROLES = {
     // ... existing roles
     NEW_MODULE: "MODULE_NEW_MODULE",
   } as const;
   ```
2. Add individual constant:
   ```typescript
   export const MODULE_NEW_MODULE = MODULE_ROLES.NEW_MODULE;
   ```
3. Add utility function in `moduleRoleUtils.ts`
4. Update types in `types/index.ts`
5. Update documentation

### Adding a New Feature Role
1. Add to `featureRoles.ts`:
   ```typescript
   export const FEATURE_ROLES = {
     // ... existing roles
     NEW_FEATURE: "FEATURE_NEW_FEATURE",
   } as const;
   ```
2. Add individual constant:
   ```typescript
   export const FEATURE_NEW_FEATURE = FEATURE_ROLES.NEW_FEATURE;
   ```
3. Add utility function in `featureRoleUtils.ts`
4. Update types in `types/index.ts`
5. Update documentation

## Adding New Utility Functions

### Adding to Session Role Utilities
1. Add function to `sessionRoleUtils.ts`
2. Export from `@/utils/index.ts` (already done)
3. Update documentation

### Adding to Module Role Utilities
1. Add function to `moduleRoleUtils.ts`
2. Export from `@/utils/index.ts` (already done)
3. Update documentation

### Adding to Feature Role Utilities
1. Add function to `featureRoleUtils.ts`
2. Export from `@/utils/index.ts` (already done)
3. Update documentation

### Adding to General Role Utilities
1. Add function to `roleUtils.ts`
2. Export from `@/utils/index.ts` (already done)
3. Update documentation

## Migration Notes

- All existing imports using `@/constants` will continue to work
- New imports can use the specific files for better tree-shaking
- The `roles.ts` file provides backward compatibility
- Utility functions are organized by role type for better maintainability
- The main utils index provides easy access to all utilities

## Best Practices

1. **Use main indexes for most imports**: `@/constants` and `@/utils`
2. **Use specific files for tree-shaking**: When you only need one role type
3. **Organize utility functions by role type**: Keep related functions together
4. **Maintain consistent naming**: All utility functions follow the same pattern
5. **Document new additions**: Update README and STRUCTURE when adding new roles or utilities
