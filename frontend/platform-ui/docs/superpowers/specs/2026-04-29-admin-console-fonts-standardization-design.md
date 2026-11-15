# Admin Console Fonts Standardization — Design Spec

- **Date:** 2026-04-29
- **Work Item:** [#15062](https://dev.azure.com/calculum/ADA/_workitems/edit/15062)
- **Repo:** Front-End
- **Base branch:** `master`
- **Type:** Technical Debt
- **Sprint:** Sprint 108 (2026-04-30 → 2026-05-13)
- **Branches:**
  - `feature/15062-admin-fonts-audit`
  - `feature/15062-admin-fonts-data-change-request`
  - `feature/15062-admin-fonts-user-management`

---

## 1. Overview

Standardize the font sizes used in the **body and secondary text** of three Admin Console sections (Audit, Data Change Request, User Management) so they match the de facto convention of the rest of the platform. Page-level headers and large display values are left untouched.

The work is delivered as **three independent PRs**, one per section, all linked to a single User Story tracked as Technical Debt.

---

## 2. Root Cause — Why the AI used different font sizes

When the original AI-generated code was produced for these admin views, it ignored two project-specific facts:

1. **Global `zoom: 0.67`** declared on `<html>` in [_fonts.scss:14](src/resources/assets/styles/base/_fonts.scss#L14). The whole app renders at 67% of its declared size. The rest of the platform deliberately declares 12–14px in code knowing the visual result will be ~8–9.4px. The AI, unaware of the zoom, "compensated" by declaring larger sizes (15px for subtitles, 20–24px for headers) to make the text feel readable on its own.
2. **Internal design tokens** in [_typography.scss](src/resources/assets/styles/variables/_typography.scss). The AI defaulted to a generic Material/Tailwind scale (12/14/16/20/24px) and introduced an orphan **15px** value that does not exist in any token of the system. The rest of the platform consistently uses `$text-md` (14px) / `$text-sm` (12px) or their literal-px equivalents.

Both factors compound: the result is a fragmented font scale (11/12/13/14/15/20/22/24px in the same file) that does not match the rest of the app.

---

## 3. Scope

### 3.1 In scope — sizes that change

**Strategy: inheritance from `1rem` base** (refined during implementation — see §3.4)

| Role | Current values in admin | Standardized approach |
|---|---|---|
| Body / main content / inputs | 13/14/15px mix | **inherit `1rem` (16px)** from view root |
| Form labels | 13/14px | **inherit `1rem`** |
| Buttons | varied | **inherit `1rem`** |
| Filter chips, dropdowns, modals body | 13/14/15px | **inherit `1rem`** |
| Table cells (`<td>`, `<th>`, `.col-*`) | 12/13/14px | **inherit `1rem`** |
| Captions / metadata / timestamps | 11/12/13px | **inherit `1rem`** |
| Badges (status, level, outcome, compliance) | 10/11/12px | **inherit `1rem`** |

### 3.2 Out of scope — sizes that stay (explicit declarations preserved)

- **Page-level headers** (18/20/22/24px) — coherent with the rest of the platform, no change.
- **Sub-section / card titles** (16/18px) — intentional emphasis, kept as explicit `font-size`.
- **Large display values** (28/36/80px) — KPIs, empty-state icons, no change.

### 3.2.1 Other items out of scope

- **Page-level headers** (20/22/24px) — coherent with the rest of the platform, no change.
- **Large display values** (28/36/80px) — KPIs, empty states, no change.
- **`!important` modifiers** — left in place; removing them is a higher-risk change unrelated to the goal.
- **SCSS token adoption** — sticking with literal px values (matches the project's de facto convention). A separate initiative could later replace literals with tokens.
- **Global `zoom: 0.67`** — untouched.
- **Vue files outside the listed scope** (StatisticsAdmin, ClustersController, QueueStatistics, AdminProcess, AdminUploadData, AdminDownloadData, AdminInvitationController, AdminSpendsController, AdminDataController, AdminBackend, AdminReleaseVideo, UserStatistics, AuditEmails…) — can be aligned in future iterations.
- The orphan **15px** is removed entirely from the three sections.

### 3.3 Files affected (30 total: Audit 5, DCR 7, User Management 18)

#### Audit (5)

- [src/modules/adminBackend/views/AuditAdmin.vue](src/modules/adminBackend/views/AuditAdmin.vue)
- [src/modules/adminBackend/views/AuditEmails.vue](src/modules/adminBackend/views/AuditEmails.vue)
- [src/modules/adminBackend/views/AuditLogHealth.vue](src/modules/adminBackend/views/AuditLogHealth.vue)
- [src/modules/adminBackend/views/AuditLogMetrics.vue](src/modules/adminBackend/views/AuditLogMetrics.vue)
- [src/modules/adminBackend/views/AuditLogs.vue](src/modules/adminBackend/views/AuditLogs.vue)

#### Data Change Request (7)

- [src/modules/adminBackend/views/AdminDataChange.vue](src/modules/adminBackend/views/AdminDataChange.vue)
- [src/modules/adminBackend/components/AddChangeRequestActivity.vue](src/modules/adminBackend/components/AddChangeRequestActivity.vue)
- [src/modules/adminBackend/components/ChangeRequestActivities.vue](src/modules/adminBackend/components/ChangeRequestActivities.vue)
- [src/modules/adminBackend/components/DataChangeModal.vue](src/modules/adminBackend/components/DataChangeModal.vue)
- [src/modules/adminBackend/components/DenyRequestModal.vue](src/modules/adminBackend/components/DenyRequestModal.vue)
- [src/modules/adminBackend/components/MarkAsSolvedModal.vue](src/modules/adminBackend/components/MarkAsSolvedModal.vue)
- [src/modules/adminBackend/components/ModalApproveDenyReq.vue](src/modules/adminBackend/components/ModalApproveDenyReq.vue)

#### User Management (18)

- [src/modules/adminBackend/views/CompanyUsers.vue](src/modules/adminBackend/views/CompanyUsers.vue)
- [src/modules/adminBackend/views/CompanyUsersGlobal.vue](src/modules/adminBackend/views/CompanyUsersGlobal.vue)
- [src/modules/adminBackend/views/CreateCompanyAdminNewFlow.vue](src/modules/adminBackend/views/CreateCompanyAdminNewFlow.vue)
- [src/modules/adminBackend/views/EditCompanyAdmin.vue](src/modules/adminBackend/views/EditCompanyAdmin.vue)
- [src/modules/adminBackend/views/UIGroupsAdmin.vue](src/modules/adminBackend/views/UIGroupsAdmin.vue)
- [src/modules/adminBackend/views/UpdateUIGroupAdmin.vue](src/modules/adminBackend/views/UpdateUIGroupAdmin.vue)
- [src/modules/adminBackend/components/UserDrawer.vue](src/modules/adminBackend/components/UserDrawer.vue)
- [src/modules/adminBackend/components/UIGroupsListView.vue](src/modules/adminBackend/components/UIGroupsListView.vue)
- [src/modules/adminBackend/components/UIGroupFormCard.vue](src/modules/adminBackend/components/UIGroupFormCard.vue)
- [src/modules/adminBackend/components/drawer/DrawerTabAccess.vue](src/modules/adminBackend/components/drawer/DrawerTabAccess.vue)
- [src/modules/adminBackend/components/drawer/DrawerTabAudit.vue](src/modules/adminBackend/components/drawer/DrawerTabAudit.vue)
- [src/modules/adminBackend/components/drawer/DrawerTabDangerZone.vue](src/modules/adminBackend/components/drawer/DrawerTabDangerZone.vue)
- [src/modules/adminBackend/components/drawer/DrawerTabIdentity.vue](src/modules/adminBackend/components/drawer/DrawerTabIdentity.vue)
- [src/modules/adminBackend/components/drawer/DrawerTabProfile.vue](src/modules/adminBackend/components/drawer/DrawerTabProfile.vue)
- [src/modules/adminBackend/components/drawer/DrawerTabSecurity.vue](src/modules/adminBackend/components/drawer/DrawerTabSecurity.vue)
- [src/modules/adminBackend/components/drawer/EditRolesModal.vue](src/modules/adminBackend/components/drawer/EditRolesModal.vue)
- [src/modules/adminBackend/components/drawer/GrantAccessModal.vue](src/modules/adminBackend/components/drawer/GrantAccessModal.vue)
- [src/modules/adminBackend/components/drawer/RemoveFromCompanyModal.vue](src/modules/adminBackend/components/drawer/RemoveFromCompanyModal.vue)

> Note: `AuditEmails.vue` is listed under Audit because it lives in that section and uses the same orphan-size pattern. If it turns out to belong to a different section, move it to its corresponding PR before opening it.

### 3.4 Strategy refinement (during Audit implementation)

**Original plan (§3.1 v1):** standardize the existing px scale (15px → 14px, 10/11px → 12px, force tables to 13px, converge body to 14px).

**Problem detected after applying it to the Audit section:** the visual change was barely perceptible. Body text still rendered at ~9.4px effective (14px × `zoom: 0.67`), still noticeably smaller than what other platform sections render. Root cause: the rest of the platform (e.g. `home/manageModule/views/EmailNegotiations.vue`) declares **zero** `font-size` rules in its `<style>` blocks and relies on inheritance from the `1rem` (16px) browser default — which yields ~10.7px effective. Admin views were forcing themselves smaller via hardcoded px.

**Refined approach (§3.1 v2 — current):**

1. **Set `font-size: 1rem;` on each view's root container** (e.g. `.audit-emails-modern`, `.audit-log-health`, `.audit-log-metrics`, `.audit-logs-modern`).
2. **Remove ALL body / label / input / button / table-cell / caption / timestamp / badge `font-size: 10–14px` declarations** from `<style>` blocks. They now inherit `1rem` (16px).
3. **Keep explicit declarations only for**:
   - Headers (16/18/20/22/24px) and large displays (28/36/80px) — intentional emphasis.

**Why also dropping 12px on badges / captions:** during smoke-testing the audit section, the user reported that even after Plan C v1, log content (timestamps, route, detail labels/values, monospace IDs) and badges still rendered too small to read comfortably under `zoom: 0.67`. Allowing those elements to inherit `1rem` brings the entire view to a uniformly readable scale; intentional compactness is recovered through padding/border-radius styling, not through font-size.

**Why inheritance instead of `font-size: 14px` everywhere:** matches the convention of the rest of the platform (which doesn't override) and produces the same visual size as those sections. Smaller diff (only deletions + 1 line per view instead of dozens of value substitutions). Future style refactors propagate automatically without touching admin again.

**Trade-off accepted:** some elements that were intentionally 12–14px (compact badges, dense table cells) are now 16px. This is the desired outcome — uniform legibility — and matches non-admin views where body, labels, badges, and table cells are the same size.

---

## 4. Delivery Strategy

### 4.1 Work Item

A single **User Story** in Sprint 108, assigned to **Joel Izaguirre**, tagged as **Technical Debt**, with the RUP-format scope below (see §7).

### 4.2 Branches

Three branches off `master`, named after the WI:

- `feature/15062-admin-fonts-audit`
- `feature/15062-admin-fonts-data-change-request`
- `feature/15062-admin-fonts-user-management`

### 4.3 Pull Requests

Three PRs, one per section, each targeting `master`. Each PR:

- Modifies only the files of its section
- Includes a per-section file/line diff stat in the description
- Lists the standardization rules applied (mapping table from §3.1)
- **Confirmation is requested before pushing or opening any PR** — never auto-push, never auto-create

---

## 5. Verification per PR

For each PR, before requesting confirmation to push:

1. `npm run lint` and `npm run build` must pass
2. Smoke-test manual of the section in the local dev server: load each affected view, exercise the obvious flows (open drawers, modals, tables), check for visual regressions (text overflow, badge misalignment, modal layout breaks)
3. Side-by-side visual comparison vs `master` for the section's main views
4. PR description includes:
   - List of files modified with line stats
   - Summary of declarations changed (e.g. "removed 12 occurrences of 15px → 14px")
   - Note that no headers or large displays were touched

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Tables rendered at 13px overflow columns previously sized for 11/12px | Inspect table layouts in User Management and Audit Logs explicitly during smoke test |
| Orphan 15px → inherit `1rem` makes subtitles slightly larger than before | Acceptable — uniforms with the rest of the platform |
| 10/11px → 12px makes auxiliary text slightly larger | Acceptable — improves legibility (was ~6.7–7.4px effective) |
| 13px/14px table cells → inherited `1rem` (16px) may overflow columns dimensioned for smaller text | Adjust column max-widths in CSS if needed during smoke test |
| Body/buttons going from 14px to inherited 16px may shift compact toolbars/pagination layouts | Inspect flexbox containers (filters, pagination, toolbars) during smoke test |
| Inline `style="font-size: 1.25rem"` (rem-based) is not covered by the px sweep | Out of scope for this iteration — only `<style>` blocks in px are touched |
| Concurrent merges of the 3 PRs | Files are disjoint between sections — no conflict expected |

---

## 7. RUP-format Scope (for the Work Item description)

**Title:** Tech Debt — Standardize font sizes in Admin Console (Audit / Data Change Request / User Management)

### Actor

Front-End developer.

### Brief description

Normalize body and secondary font sizes in the three Admin Console sections (Audit, Data Change Request, User Management) so they match the de facto typography convention of the rest of the platform. Page-level headers and large display values stay unchanged. Delivered as three independent PRs (one per section).

### Pre-conditions

- Branch `master` is up to date.
- The 30 files in scope (§3.3) are not being modified by other in-flight PRs.

### Basic flow

1. Create three branches off `master`, one per section.
2. For each section, apply the inheritance approach (§3.1, §3.4): add `font-size: 1rem;` to the view's root container in `<style>`; delete all body/label/input/button/table-cell/caption/timestamp/badge `font-size` declarations of 10–14px; keep only headers (16/18/20/22/24px) and large displays (28/36/80px) as explicit declarations.
3. Run `npm run lint` and `npm run build`; smoke-test the section locally.
4. Commit the changes with a message referencing the Work Item.
5. Push the branch only after explicit confirmation from the assignee.
6. Open a PR targeting `master` only after explicit confirmation; description includes file/line stats and the rules applied.
7. Repeat steps 2–6 for the next section.

### Alternative flows

- 7a. If a section's smoke test reveals a regression (table overflow, modal layout break), document the affected file/line and either adjust the mapping for that case (keeping it in spec) or revert the offending change before push.
- 7b. If `lint`/`build` fails, fix the underlying issue rather than bypassing hooks.

### Post-conditions

- The three sections render with the same body/secondary type scale as the rest of the platform at the same `zoom: 0.67` (~10.7px effective body via inherited `1rem`).
- No occurrences of `font-size: 10px`, `11px`, `12px`, `13px`, `14px`, or `15px` remain in body/label/input/button/table/caption/badge contexts in the 30 files in scope.
- Each affected view's root container has `font-size: 1rem;` set explicitly.
- Page headers (16/18/20/22/24px) and large displays (28/36/80px) are unchanged.

### Acceptance Criteria

- [ ] AC1 — Each modified view's root container declares `font-size: 1rem;` and body/labels/inputs/buttons/table cells/captions/timestamps/badges inherit it (no explicit 10–15px remaining for those roles).
- [ ] AC2 — `font-size: 15px` is removed from all 30 files in scope.
- [ ] AC3 — `font-size: 10px`, `11px`, and `12px` are removed from all 30 files in scope (inherits `1rem` instead).
- [ ] AC4 — Page-level headers (20/22/24px) and KPI/display values (≥28px) are unchanged.
- [ ] AC5 — Three PRs are merged to `master`, one per section, each linked to this Work Item.
- [ ] AC6 — Smoke-test for each section confirms no visual regression (no overflow, no layout break, no truncated badges).

### Special Requirements

- No SCSS tokens introduced.
- No new dependencies.
- No backend changes.
- Confirmation required before push and before PR creation for each branch.

---

## 8. Out of Scope (explicit)

- Adoption of SCSS tokens (`$text-md`, `$text-sm`, etc.)
- Removing `!important` modifiers
- Changing the `zoom: 0.67` global rule
- Audit/UM/DCR-adjacent admin views not listed in §3.3
- Inline `style="font-size: …"` declarations using `rem` (not literal px)
- Backend changes
- Localization or copy changes
