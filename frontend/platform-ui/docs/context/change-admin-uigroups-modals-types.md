 # Checklist: UiGroupsAdmin – Modals typing and lint fixes
 
 ## Context
 Small refactors in `UIGroupsAdmin.vue` and `useUiGroupModals.ts` to satisfy lint rules:
 - Avoid unexpected negated conditions.
 - Remove `any` from union types when `UiGroup` is the intended shape.
 
 ## Checklist
 - [x] Replace `group != null ? group : {}` with `group ?? {}` in `currentGroupForModal` to remove negated condition.
 - [x] Update `showModalForDelete` signature to use only `UiGroup` (remove `any`).
 - [x] Update `showModalForUiCompanies` signature to use `UiGroup` and `UiGroup[]` (remove `any`).
 - [x] Run linter on affected files to confirm no remaining errors.
 
 ## Files
 - `src/modules/adminBackend/views/UIGroupsAdmin.vue`
 - `src/modules/adminBackend/views/composables/useUiGroupModals.ts`
 