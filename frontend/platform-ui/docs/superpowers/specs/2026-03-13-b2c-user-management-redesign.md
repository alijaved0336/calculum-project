# B2C User Management Redesign — Design Spec

**Date:** 2026-03-13
**Work Item:** #14599
**Repos:** Front-End · Back-End
**Branch:** `feature/14599-b2c-user-management-redesign`

---

## 1. Overview

Redesign the Admin User Management view (`CompanyUsersGlobal.vue`) to expose Azure B2C identity information and management actions alongside the existing company-access model. The new design replaces the current flat grid+modal pattern with a **modern grid + side drawer** that surfaces B2C data per user without leaving the page.

---

## 2. Grid Redesign

### Layout
- Full-width grid with a sticky topbar: page title, Groups combo, Company combo, search box, **Add User** button.
- Rows are clickable (no separate Actions column). Clicking opens the side drawer.
- Active row: `#f3f4f6` background + red left border (`#ff2c4f`).
- Hover row: `#f3f4f6`.

### Columns
| Column | Notes |
|---|---|
| User (avatar + name + email) | Avatar color from `AVATAR_COLORS_BY_LETTER` |
| Identity Provider | Icon + label. See §3. |
| Company | Existing |
| Group | Renamed from "UI Group" |
| Status | Badge: Active (green), Disabled (red), Pending (yellow). See §2.1 |
| Last Activity | Existing |
| Active Days (30d) | Existing |

### 2.1 Status Column

Each user has a computed status based on their registration and enabled state:

| Status | Condition | Badge |
|---|---|---|
| **Active** | `userAzureId` is set AND `enabled = true` | Green `#d1fae5` |
| **Disabled** | `userAzureId` is set AND `enabled = false` | Red `#fee2e2` |
| **Pending** | `userAzureId` is null (signup pending) | Yellow `#fef9c3` |

### Filters
All filters are custom combo-dropdowns (same pattern: button with icon + label + arrow, dropdown list with checkmark on selected item, click-outside closes all).

- **Groups** combo with search + cascade: selecting a Group filters the Company combo.
- **Company** combo with search.
- **User Type** combo: "All Users" (default) / "External Only" (excludes `@calculum.ai` emails). Maps to `companyUsers` GraphQL filter.
- **Identity Provider** combo: "All Providers" / "Local" / "SSO" / "Pending Signup". Maps to `identityProvider` GraphQL filter.
- **Status** combo: "All Status" / "Active" / "Inactive" (disabled OR pending). Maps to `status` GraphQL filter.
- **Search** box: free-text filter.
- All combos are mutually exclusive (opening one closes the others).

### Export
- **Export** button in topbar (outline style, download icon).
- Exports ALL users matching current filters (not just current page) by paginating the GraphQL query in batches of 100.
- Excel columns: User, Email, Identity Provider, Company, Group, Status, Last Activity, Active Days (30d), Roles.
- Roles are formatted as readable labels (Admin, Partner, Data, Sales) — module and feature roles are excluded.
- Uses `@progress/kendo-vue-excel-export` `saveExcel`.

---

## 3. Identity Provider Column

Each user falls into one of three states, determined by data already available in the grid query:

| State | Condition | Display |
|---|---|---|
| **Local** | `azureId` set, `identityProvider` = `"local"` | Key icon + "Local" (gray badge) |
| **SSO** | `azureId` set, `identityProvider` = federated domain | Building icon + "SSO — `<domain>`" (gray badge) |
| **Signup Pending** | `azureId` is null | Yellow "Signup Pending" badge |

**Data sourcing:** Both `userAzureId` and `identityProvider` must be added to the backend `CompanyGlobalUserDTO` and included in `COMPANY_GLOBAL_USERS_QUERY` (currently only `COMPANY_USERS_QUERY` selects `userAzureId`). `userAzureId` is required to detect the Signup Pending state (`azureId is null`); `identityProvider` distinguishes Local from SSO. It is resolved once per user on the backend using the existing `getUserDetails` Graph call (which already selects `identities`). The value is persisted on the `User` entity as `identityProvider: string|null` to avoid a per-row live Graph call on grid load.

**Migration required:** Add `identity_provider` column (`VARCHAR(255) NULL`) to the `user` table. Populated by a one-time backfill command using the existing Graph client.

---

## 4. Side Drawer

- Width: 440px. On viewports < 960px, the drawer overlays the grid (full-height, slides over). On ≥ 960px it pushes the grid.
- Header: colored avatar (initials), full name, email, identity badge.
- Tabs vary by user state (see below).
- Clicking outside or pressing Escape closes the drawer and deselects the row.
- **Error states:** Each tab that performs a Graph API call must handle the failure case by showing an inline error banner ("Could not load data. Try again.") with a retry button. Empty-state (no data returned) shows a neutral "No data available" message.

### 4.1 Local Account Tabs

#### Profile
- **Email** — read-only (B2C constraint: changing email would change the identity).
- **First Name** — editable.
- **Last Name** — editable.
- Save button calls existing user update endpoint.

#### Security
- **Account Status** — toggle (enabled/disabled) via `PATCH /users/{objectId}` with `accountEnabled`.
- **B2C Identity** — Last password change date (from `lastPasswordChangeDateTime` already available via `getUserDetails`).
- **MFA Methods** — list of registered methods: Software OATH Token and Phone MFA. Each has a **Remove** button. Email authentication methods are fetched but not displayed (they are system-managed in B2C and should not be user-removable from this panel). Data from `authentication/softwareOathMethods` and `authentication/phoneMethods`.
- **Security Actions:**
  - **Force password reset** — ⚠️ **Disabled in Phase 1 (shown but greyed out with tooltip "Coming soon").** Requires a coordinated IEF policy update to `B2C_1A_signin_local` — tracked as a separate work item (see §10). Implementation deferred to Phase 2.
  - **Resend invitation email** — Calls existing endpoint `GET api/admin/user/resend_invitation/{userCompanyId}` (method is GET — matches `UserController.php` line 162). When the user has multiple company rows in the Access tab, the frontend calls the endpoint once per active `userCompanyId` (sequential, not parallel). If any call fails, errors are collected and surfaced as a single warning banner: "Invitation resent to N companies. Failed for: [list]." Partial success is acceptable.
  - **Reset identity provider** — Reuses existing endpoint `POST api/admin/user/{userUuid}/company/{companyUuid}/reset-identity-provider`. Requires the primary `companyUuid` in context (first row in Access tab).
  - **Invalidate all sessions** — Calls `POST api/admin/users/{userUuid}/invalidate-sessions` (new endpoint wrapping existing `logoutUserByObjectID`).

#### Access
- 3-column table: Company / Group / Roles.
- Rows are selectable. Selected row: `#f3f4f6` + red left border.
- On selection: **Edit Roles** + **Remove from Company** actions fade in below the table.
- **Grant Access** button (top-right of table header): opens Grant Access modal (see §4.5).
- **Edit Roles** button: opens Edit Roles modal (see §4.6).
- **Remove from Company** button: opens Remove from Company confirmation modal (see §4.7).

#### Audit
- Table: Date/Time · Status (Success/Failed) · IP Address · Location.
- Shows last 20 B2C authentication events from `GET /auditLogs/directoryAudits?$filter=loggedByService eq 'B2C' and initiatedBy/user/id eq '{objectId}'&$top=20&$orderby=activityDateTime desc`.
- ⚠️ `auditLogs/signIns` is NOT available for Azure AD B2C consumer tenants. Use `directoryAudits` filtered by B2C service. Fields available: `activityDateTime`, `initiatedBy.user.ipAddress`, `result` (success/failure), `activityDisplayName`.
- **Required permission:** `AuditLog.Read.All` (application).
- Footer note: "Showing last 20 recent accesses from Azure B2C".
- Empty state: "No sign-in history available."

#### Danger Zone
- Red-bordered warning box.
- Text varies by identity type (see §7.4 Account Lifecycle).
- **Delete user account** button → confirmation dialog (user name shown, Cancel + "Yes, delete permanently"). Closes on Escape/outside click.
- On confirm: calls `DELETE api/admin/user/{userUuid}`. See §7.4 for delete flow and account lifecycle.

---

### 4.2 SSO Account Tabs

Same as Local **except**:

- **Security** tab is replaced by **Identity** tab showing: issuer domain, federated identity details (from `User.identityProvider` + `getUserDetails` identities).
- No MFA, no password actions (SSO passwords are managed by the external IdP).
- **Danger Zone:** For SSO accounts, the delete action soft-deletes the user locally and **disables** (not deletes) the B2C account. The external IdP account is **not** affected. Warning text: "This will remove the user from this platform and disable their Azure B2C account. Their corporate identity provider account will not be affected."

---

### 4.3 Signup Pending Tabs

#### Profile
- Warning banner: "This user has not accepted their invitation yet."
- **Invitation Link** — fetched on drawer open via `GET api/admin/user/{userUuid}/invitation-link` (new endpoint, see §7.3). The response shape is `{ invitationLink: string, invitationToken: string }`. This avoids adding a computed column to the `user_company_graphql` DB view (which powers the global query) since `getInvitationLink()` on `UserCompany` is a computed method, not a stored column.
- **Invitation ID** — `invitationToken` (on `UserCompany`, not `User`).
- **Issued on** — `azureLastInvitationDate` (already on `User` entity).
- **Expires on** — `tokenExpiration` on `UserCompany`. Shows urgency badge if ≤ 14 days remaining.
- **Invited by** — Requires adding an `invitedByUser: User|null` relation to the `UserCompany` entity, populated when `resendInvitation` or `createUser` is called. **DB migration required:** `invited_by_user_id` FK on `user_company`. Backfill: NULL for existing records.
- **Actions:** Resend invitation (`GET api/admin/user/resend_invitation/{userCompanyId}`) · Remove user (same as Danger Zone delete).

#### Access
- Same 3-column table + row-selection behavior as Local.

#### Danger Zone
- Warning: "This will cancel the pending invitation and remove the user record from the platform."
- Same confirmation dialog and delete endpoint as Local.

---

### 4.5 Grant Access Modal

Opened from the Access tab's "Grant Access" button. Allows granting an existing user access to additional companies.

- **User info**: Name and email (read-only, from drawer context).
- **Companies list**: Searchable checkbox list with three sections:
  1. **Selectable**: Companies the user doesn't belong to, with available capacity. Checkbox + Select All.
  2. **Limited** (lock icon + yellow badge): Companies at capacity limit. Badge shows "Company user limit reached" or "Group user limit reached" depending on which limit is hit. Disabled, not selectable.
  3. **Already Assigned** (check icon, gray): Companies the user already belongs to. Informational only, not selectable. Prevents confusion about why a company is "missing".
- **Roles**: Admin / Partner checkboxes with hint: "All users have the **User** role by default."
- **Capacity checks**: Per-company (`limitUsers - externalUsers`) AND per-group (`UiGroup.maxNumberOfUsers - activeUsersCount`). `@calculum.ai` emails bypass both limits.
- **Submit**: Calls `POST /api/admin/user_companies/create_user_account` per selected company. Handles partial failures.
- **Component**: `GrantAccessModal.vue` (teleport modal).

### 4.6 Edit Roles Modal

Opened from the Access tab when a company row is selected and "Edit Roles" is clicked.

- **User info**: Name and email.
- **Company**: Badge showing the selected company name.
- **Roles**: Admin / Partner checkboxes, pre-populated with current roles. Hint about default User role.
- **Submit**: Calls `PATCH /api/admin/user_companies/update-roles` with `{ userUuid, companyUuid, roles }`.
- **Error handling**: Backend prevents removing the last admin from a company (returns error displayed inline).
- **Component**: `EditRolesModal.vue` (teleport modal).

### 4.7 Remove from Company Modal

Opened from the Access tab when a company row is selected and "Remove from Company" is clicked.

- **User info**: Name and email.
- **Company**: Badge showing the selected company name.
- **Warning**: Red banner: "This will revoke [name]'s access to [company]. This action cannot be undone."
- **Submit**: Calls `POST /api/admin/user_companies/remove` with `{ userUuid, companyUuid }`. Soft-deletes the UserCompany record.
- **Component**: `RemoveFromCompanyModal.vue` (teleport modal).

---

## 5. Add User (Drawer)

Triggered by **Add User** button in the topbar. Opens a dedicated drawer (no grid row activated).

Fields:
- **Email** — required.
- **Roles** — checkboxes: Admin · Standard · Partner (same as `WelcomeTeamCreateUser.vue`).
- **Companies** — checkboxes for available companies. **Note:** `WelcomeTeamCreateUser.vue` does not currently include a Companies field — it relies on the parent context. The drawer version must include it. The payload sends `{ email, roles[], companyIds[] }` to the existing create-user endpoint (or a new one if the existing endpoint doesn't support multi-company — verify during implementation).
- Cancel / Save buttons. On save, row is added to the grid and drawer closes.

---

## 6. Avatar Colors ✅ Already implemented

`AVATAR_COLORS_BY_LETTER` in `src/utils/ColorsGroups.ts` has been updated to cycle through:

| Color | Hex |
|---|---|
| Teal | `#4ECDC4` |
| Indigo | `#6C5CE7` |
| Coral | `#E17055` |
| Emerald | `#00B894` |
| Violet | `#A78BFA` |
| Amber | `#F59E0B` |

`AVATAR_COLOR_DEFAULT` unchanged (`#98A2B3`).

---

## 7. Backend Changes

### 7.1 MicrosoftGraphService Extensions

New methods added to `MicrosoftGraphService`:

| Method | Graph endpoint | Permission |
|---|---|---|
| `getMfaMethods(string $userId)` | `GET /users/{id}/authentication/softwareOathMethods` + `phoneMethods` | `UserAuthenticationMethod.ReadWrite.All` |
| `removeMfaMethod(string $userId, string $methodType, string $methodId)` | `DELETE /users/{id}/authentication/{type}/{id}` | `UserAuthenticationMethod.ReadWrite.All` |
| `getB2CAuditLogs(string $userId, int $top = 20)` | `GET /auditLogs/directoryAudits?$filter=loggedByService eq 'B2C' and initiatedBy/user/id eq '{id}'&$top={top}&$orderby=activityDateTime desc` | `AuditLog.Read.All` |
| `setForcePasswordChange` | ⚠️ **Phase 2 only** — deferred pending IEF policy update (§10) | `User.ReadWrite.All` |
| `setAccountEnabled(string $userId, bool $enabled)` | `PATCH /users/{id}` with `accountEnabled` | `User.ReadWrite.All` |
| `deleteUser(string $userId)` | `DELETE /users/{id}` | `User.ReadWrite.All` |

**Note on force password reset:** `forceChangePasswordNextSignIn` is not supported in Azure AD B2C tenants using IEF custom policies. The extension attribute approach requires a corresponding update to `B2C_1A_signin_local` IEF policy to check `extension_forcePasswordChange` at sign-in and redirect to the password change journey. This IEF policy update is a **separate task** that must be coordinated with whoever manages the B2C tenant policies.

### 7.2 App Registration Permissions to Add

| Permission | Type | Purpose |
|---|---|---|
| `UserAuthenticationMethod.ReadWrite.All` | Application | Read/remove MFA methods |
| `AuditLog.Read.All` | Application | B2C directoryAudits |
| `User.ReadWrite.All` | Application | Account enable/disable, extension attributes, delete |

### 7.3 New API Endpoints

All new endpoints follow the existing `api/admin/user/` prefix convention. Every route with a `{userUuid}` parameter **must** carry a Symfony route requirement `'userUuid' => '[0-9a-f\-]{36}'` to prevent the wildcard from greedily matching static segments like `resend_invitation` and causing route conflicts with existing `UserController` routes.

| Method | Path | Handler | Notes |
|---|---|---|---|
| `GET` | `api/admin/user/{userUuid}/mfa-methods` | New `AdminUserB2CController` | Returns software OATH + phone methods |
| `DELETE` | `api/admin/user/{userUuid}/mfa-methods/{type}/{methodId}` | New `AdminUserB2CController` | `type` = `softwareOath` or `phone` |
| `POST` | `api/admin/user/{userUuid}/force-password-reset` | New `AdminUserB2CController` | ⚠️ Phase 2 — endpoint stub returns 501 until IEF policy is updated |
| `POST` | `api/admin/user/{userUuid}/invalidate-sessions` | New `AdminUserB2CController` | Wraps existing `logoutUserByObjectID` |
| `GET` | `api/admin/user/{userUuid}/audit-logs` | New `AdminUserB2CController` | Last 20 B2C directoryAudit events |
| `DELETE` | `api/admin/user/{userUuid}` | New `AdminUserB2CController` | Full delete — see §7.4 |
| `PATCH` | `api/admin/user/{userUuid}/account-status` | New `AdminUserB2CController` | Body: `{ enabled: bool }` |
| `GET` | `api/admin/user/{userUuid}/b2c-profile` | New `AdminUserB2CController` | Response: `{ type: 'local'|'sso'|'pending', issuerDomain: string|null, identities: array }` |
| `GET` | `api/admin/user/{userUuid}/invitation-link` | New `AdminUserB2CController` | Response: `{ invitationLink: string, invitationToken: string }`. Token sourced from `UserCompany` (not `User`). For multi-company users returns the most recently issued active invitation. Returns 404 if no active invitation exists. |

### 7.4 Account Lifecycle & Deletion

The platform implements a **three-tier approach** to user account management:

#### Tier 1: Disable Account (`PATCH /api/admin/user/{userUuid}/account-status`)

Toggles the user's active state without removing any data.

1. Calls `setAccountEnabled(azureId, enabled)` on Azure B2C — blocks/unblocks sign-in.
2. Updates `User.enabled` in local database.
3. Updates `UserCompany.enabled` for all active (non-deleted) UserCompany records.
4. Returns `{ enabled: bool }`.

**Reversible**: Yes. Can re-enable at any time.

#### Tier 1.5: Remove from Platform (`DELETE /api/admin/user/{userUuid}/remove-from-platform`)

Soft-deletes the user locally **without touching Azure B2C**. The B2C account remains fully active.

1. Soft-deletes the `User` entity (Gedmo SoftDeleteable).
2. Soft-deletes all `UserCompany` relations.
3. Returns 204.

**Use case**: When the user should be removed from this application but may still use other applications in the same B2C tenant. The user can be re-invited later without creating a new B2C identity.

**Danger Zone UI**: Yellow warning box with text: "This will remove the user from the platform but their Azure B2C account will remain active. The user will still be able to sign in to other applications that use the same B2C tenant. They can be re-invited later without creating a new B2C identity."

Only shown for non-pending users (pending users have no B2C account to preserve).

#### Tier 2: Delete User Account (`DELETE /api/admin/user/{userUuid}`)

Soft-deletes the user locally and **disables** (not deletes) the B2C account. The user will no longer be able to sign in to **any** application that uses this B2C tenant.

1. If user has an Azure ID: calls `setAccountEnabled(azureId, false)` to disable B2C account.
2. If B2C disable fails: sets warning header `X-Warning: b2c-disable-failed` and continues.
3. Soft-deletes the `User` entity (Gedmo SoftDeleteable).
4. Soft-deletes all `UserCompany` relations.
5. Returns 204.

**Important**: The user is NOT deleted from Azure B2C directory — only disabled. This blocks sign-in across all applications in the tenant.

**Danger Zone UI text by identity type:**

| Type | Text |
|---|---|
| **Local** | "This will remove the user from the platform and disable their Azure B2C account. The user will no longer be able to sign in to any application that uses this B2C tenant." |
| **SSO** | "This will remove the user from this platform and disable their Azure B2C account. The user will no longer be able to sign in to any application that uses this B2C tenant. Their corporate identity provider account will not be affected." |
| **Pending** | "This will cancel the pending invitation and remove the user record from the platform." |

#### Tier 3: Hard Delete from B2C (`DELETE /api/admin/user/{userUuid}/b2c-hard-delete`)

Permanently removes the user from the Azure B2C directory. Only available after the user has been soft-deleted locally (Tier 2).

1. Verifies user is already soft-deleted locally.
2. Calls Graph `DELETE /users/{azureId}` to permanently remove from B2C.
3. Sets `azureId = null` on the local user record.
4. Returns 204.

**Irreversible**: Yes. Use only when certain the user should be completely removed from the B2C directory.

#### Error Handling (all tiers)

- If Graph API call fails: log the error, continue with local changes where possible, return appropriate status with warning header.
- The endpoints are **not** transactional across Graph + DB — partial failure is handled by logging, not rollback.
- If local operation fails after Graph operation: log a critical alert (Sentry) for manual reconciliation.

---

## 8. Frontend Service Layer

**Caching strategy for identity data:** The drawer uses the `identityProvider` and `userAzureId` values already in the grid row to render the header badge and decide which tabs to show — no extra call needed. `fetchB2CProfile` is called lazily only when the user opens the SSO **Identity** tab (to show raw `identities` array) or the Local **Security** tab (to confirm account-enabled state). This avoids a Graph call on every drawer open.

New composable `useUserDrawer.ts` (standalone, not merged into `useCompanyUsers.ts` to keep concerns separate):

```ts
// Functions exposed:
fetchB2CProfile(userUuid: string): Promise<B2CProfile>
fetchMfaMethods(userUuid: string): Promise<MfaMethod[]>
removeMfaMethod(userUuid: string, type: 'softwareOath' | 'phone', methodId: string): Promise<void>
fetchAuditLogs(userUuid: string): Promise<AuditLogEntry[]>
deleteUser(userUuid: string): Promise<void>
setAccountEnabled(userUuid: string, enabled: boolean): Promise<void>
forcePasswordReset(userUuid: string): Promise<void>
invalidateSessions(userUuid: string): Promise<void>
resendInvitation(userCompanyId: number): Promise<void>  // reuses existing endpoint
resetIdentityProvider(userUuid: string, companyUuid: string): Promise<void>  // reuses existing endpoint
```

**Response types:**
```ts
interface B2CProfile {
  type: 'local' | 'sso' | 'pending'
  issuerDomain: string | null
  identities: Array<{ signInType: string; issuer: string; issuerAssignedId: string }>
}
interface MfaMethod {
  id: string
  type: 'softwareOath' | 'phone'
  label: string  // e.g. "Authenticator app", "+1 555 ··· 0042"
}
interface AuditLogEntry {
  activityDateTime: string
  result: 'success' | 'failure'
  ipAddress: string | null
  location: string | null  // "City, CC" or null
  activityDisplayName: string
}
```

---

## 9. Data Model Changes

| Change | Type | Notes |
|---|---|---|
| `user.identity_provider` | New column `VARCHAR(255) NULL` | `"local"`, SSO domain, or `null` for pending |
| `user.invitation_token` | New column `VARCHAR(36) NULL` | Moved from `user_company.invitation_token` |
| `user.invitation_token_expiration` | New column `DATETIME NULL` | Moved from `user_company.token_expiration` |
| `user.invited_by_user_id` | New FK → `user.id` NULL | New field — populated on invitation create/resend |
| `user_company.invitation_token` | Deprecated, nulled by migration | Kept for backward compat; drop in future migration |
| `user_company.token_expiration` | Deprecated, nulled by migration | Kept for backward compat; drop in future migration |
| Migration `Version20260314040717` | Data migration | Copies only still-active tokens (`token_expiration > NOW()`) from `user_company` to `user`; nulls source rows after copy. For multi-company users picks latest expiring token. |
| Backfill command | Symfony console command | Reads `identities` from Graph for all users with `azureId`, sets `identity_provider` |

---

## 10. IEF Policy Dependency

The **Force Password Reset** action requires a coordinated update to the `B2C_1A_signin_local` IEF custom policy XML to:
1. Read the `extension_forcePasswordChange` attribute for the authenticated user.
2. If `true`, redirect the journey to the password-change sub-journey.
3. Reset the attribute to `false` after successful password change.

This is a **separate work item** and should be tracked independently. The Force Password Reset button should be initially disabled with a tooltip "Coming soon — requires policy update" until the IEF change is deployed.

---

## 11. GraphQL Filters (CompanyUserGraphQL)

Filters are applied both in `CompanyUserGraphQLFilter.php` (API Platform filter) and `CompanyUserCollectionResolver.php` (grouped SQL query).

| Filter | Type | Values | Description |
|---|---|---|---|
| `company_uuid` | string | UUID | Filter by company |
| `company_ui_group_uuid` | string | UUID | Filter by UI group |
| `search` | string | free text | Search across name, email, job title |
| `enabled` | boolean | true/false | Filter by enabled status |
| `roles` | string | role name | Partial match in roles JSON |
| `companyUsers` | boolean | true/false | Exclude `@calculum.ai` system users |
| `identityProvider` | string | `local`, `sso`, `pending` | Filter by identity type. `local`: has azureId + local/null provider. `sso`: has azureId + non-local provider. `pending`: no azureId. |
| `status` | string | `active`, `inactive` | `active`: enabled + registered. `inactive`: disabled OR pending signup. |
| `telerikFilter` | string | JSON | Kendo grid filter (legacy) |
| `order` | array | sort objects | Column ordering |

### UiGroup Active Users Count

`UiGroup` entity exposes a virtual `activeUsersCount` field (not persisted), populated by:
- `UiGroupDataProvider` when fetching UiGroup entities directly.
- `CompanyDataProvider` when fetching companies (populates `uiGroup.activeUsersCount` on each company, with per-group caching to avoid duplicate queries).

This enables the frontend to compute group-level capacity: `maxNumberOfUsers - activeUsersCount`.

---

## 12. Out of Scope

- Editing a user's email (B2C constraint).
- Managing SSO federation configuration.
- Bulk actions on multiple users.
- Full sign-in log pagination beyond last 20.
- IEF policy modifications (tracked separately, see §10).
