# Documentation Standards

## Language Requirements

### Markdown Files (.md)
**All final Markdown documentation files must be written in English.**

This applies to:
- Final documentation files in `docs/context/`
- README files
- Technical documentation
- Test summaries and reports
- Any permanent documentation files

**Exceptions:**
- Temporary checklist files created during development (these should be merged into final English documentation or deleted)
- Translation files or locale-specific documentation
- User-facing content that is intentionally in another language

### Rationale
- Ensures consistency across the codebase
- Facilitates collaboration with international teams
- Aligns with industry standards for technical documentation
- Makes the codebase more accessible to a wider audience

### Implementation
When creating or updating documentation:
1. Write all final `.md` files in English
2. If temporary files are created in another language during development, ensure they are:
   - Translated to English before finalizing
   - Merged into the appropriate English documentation file
   - Deleted after consolidation

### Examples
- ✅ `playwright-test-optimization-final-summary.md` (English)
- ✅ `testing-strategy.md` (English)
- ❌ `resumen-optimizacion-tests.md` (Spanish - should be English)
- ✅ `change-feature-name.md` (Temporary checklist - can be deleted after merging)

## JSDoc for Utility Functions

When documenting exported functions (e.g. in `src/utils/*.ts`):

- Use `@param` with descriptive name and type
- Use `@returns` with a brief description
- Include `@example` with 2–4 usage examples (typical and edge cases)
- Reference: `src/utils/globalFiltersUtils.ts` for the convention

## Inline Comments in Vue Components

For complex Vue components (e.g. `MainLayoutFilters.vue`):

- Add module-level JSDoc at top of script describing the component’s role
- Add brief JSDoc or single-line comments above helper functions
- Prefer one-line comments for internal helpers; full JSDoc for public/complex logic
- Keep comments up to date when restructuring code blocks

## Circular Dependency Mitigation

When a util function in `utils/index.ts` depends on another util (e.g. `ArrayUtils`), prefer inlining simple logic if that dependency can be undefined during circular module load (e.g. `isEmpty` uses `value.length === 0` instead of `ArrayUtils.isEmpty(value)`).

