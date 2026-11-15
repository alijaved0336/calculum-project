# SCF Accepted / VCard Accepted parity in the Kanban Agreed Terms modal

## What changed

`KanbanAgreedTermsModal.vue` (Manage Module → Kanban drag-and-drop) is a simplified
version of the Agreed Payment Terms form. The full-featured version, `ModalResults.vue`
(Entity Card → Negotiation tab), also shows two feature-flagged toggles — **SCF Accepted**
and **VCard Accepted** — and includes them in the save payload. The Kanban modal was
missing both entirely.

This change brings the Kanban modal to parity on the frontend side:

- Same feature flags as `ModalResults.vue`: `scfEnabledFeature` (`useFeature9BoxesFinancing`)
  and `vCardEnabledFeature` (`useFeatureVirtualCard && usevCardGroupsEnabled`), computed
  inside the modal itself.
- Same toggle styling (`.switch`/`.slider.round`, already global), icon
  (`IconBadgeManageRebate`), and i18n keys (`global.scfAccepted` / `global.vcardAccepted`).
- `scfAccepted` and `vcardAccepted` are included in the emitted `confirm` payload, so they
  flow through the existing generic save path
  (`entityCardStore.saveAndEditAgrreedTerms` → `POST /api/entity-card-results/create-updated-agree-terms-configs`)
  exactly like they do from `ModalResults.vue`.
- `KanbanAgreedTermsModal.vue` also gained `onSCF`/`scfAccepted` props (mirroring
  `ModalResults.vue`) and a `suggestedScfAccepted()` function that replicates
  `ModalResults.vue`'s `fillSuggested()` SCF matrix, so the SCF toggle can be pre-checked
  based on the entity's current SCF status — same as the regular modal.

## Backend gap — now fixed on a not-yet-merged branch

The GraphQL types backing the Kanban board (`ProgramListSupplier` / `ProgramListParent` /
`ProgramListSpend`, queried via `collectionQueryProgramListSuppliers/Parents/Spends`) did
**not** expose `onSCF` / `scfAccepted` when this was first investigated. The shared PHP
trait behind all three (`CalculatedProgramDataPartitionAbstract`) had no `onSCF`/`scfAccepted`
properties, unlike its sibling trait `CalculatedDataPartitionAbstract` (used by the "Data"
family of Analyze types), which already had both fully mapped.

That gap is fixed on the Back-End branch `richard/fix/expose-onscf-scfaccepted-program-graphql`
(commit `13f5a6157`, local — not pushed/merged/deployed as of this writing): see
`docs/context/change-expose-onscf-scfaccepted-program-graphql.md` in the Back-End repo for
the full change. No migration, no SQL, no resolver changes were needed — the DB columns
already existed and were already populated; only the PHP entity mapping was missing.

## Frontend — now fully wired up too

`nodesEdges` in `apps/ap/src/modules/home/manageModule/data/index.ts` now requests `onSCF`
and `scfAccepted` alongside the other Kanban card fields. Combined with the props already
plumbed through `Overview.vue` → `KanbanAgreedTermsModal.vue`, and the `suggestedScfAccepted()`
matrix already in the modal, the SCF Accepted suggestion is now fully wired end-to-end on
the frontend — no further frontend change is needed.

## ⚠️ Deployment ordering

**The backend branch must be merged and deployed before this frontend change ships.**
Today, in whatever environment is running the Back-End without that fix, `onSCF`/`scfAccepted`
are not valid fields on `ProgramListSupplier`/`Parent`/`Spend` — requesting them (as this
`nodesEdges` fragment now does) would make the Kanban board's GraphQL query fail outright
with a schema-validation error ("no field or association named onSCF"), breaking the entire
Kanban board, not just the SCF toggle. Deploy backend first, then frontend.

## "Terms without cash discount" default (frontend-only, no backend change)

`KanbanAgreedTermsModal.vue` also left "Terms without cash discount" empty on every open —
pre-existing behavior, not something introduced by the SCF/VCard work above. `ModalResults.vue`
pre-fills that same field via `fillSuggested()`:

```js
data.spendNewTerms.termsWithoutCashDiscount = props.vcardTerms > 0 ? props.vcardTerms : props.opportunityTerms;
```

`vcardTerms`/`opportunityTerms` come from a REST call scoped to a single spend-configuration
(`entityCardStore.getPaymentTermsOpportunity({ configId, companyType })`, inside
`EntityPaymentTermsStrategies.vue`) — not practical to call from the Kanban board, where a card
can represent a spend, supplier, or parent with no single `configId`.

However, `opportunityTerms`'s raw source field, `SpendProgramConfiguration.modelPaymentTerms`,
is the exact same `modelPaymentTerms` the Kanban's GraphQL types already expose (already in
`nodesEdges`, already on `pending.card`) — and `CardsByStatus.vue` already displays it as "the
target term for a not-yet-agreed card" (`setPaymentTerms` computed, falls back to
`termsWithoutCashDiscount` — the already-agreed value — only once the card *is* agreed). So
`KanbanAgreedTermsModal.vue` now takes a new `modelPaymentTerms` prop (threaded through
`Overview.vue` from `pending.card.modelPaymentTerms`, same pattern as `onSCF`/`scfAccepted`) and
pre-fills `termsWithoutCashDiscount` from it in `resetForm()` — zero backend change, since the
field was already there.

**Known, accepted gap**: this reproduces `opportunityTerms`'s fallback behavior, but not
`vcardTerms`'s VCard-specific override (`vcardTerms > 0 ? vcardTerms : ...`). `vcardTerms`'s raw
source, `SpendProgramConfiguration.vCardStrategy`, does not exist anywhere on
`CalculatedProgramDataPartitionAbstract`/`CalculatedDataPartitionAbstract` or on
`ProgramListSupplier`/`ProgramListParent`/`ProgramListSpend` today (confirmed by exhaustive grep)
— unlike the `onSCF`/`scfAccepted` gap above, there's no existing DB column/mapping to expose,
this would be new backend work (map a `vCardStrategy`-equivalent column onto the Program trait,
populate it the same way `modelPaymentTerms` already is). Out of scope for now; the Kanban modal
will simply suggest the generic opportunity term instead of the VCard-specific one for the
entities where VCard applies — a strict subset of cases, not a correctness regression.

"Terms with cash discount" and "Cash discount" are correctly left empty in both modals — neither
has a calculable target; they're purely negotiated outcomes.
