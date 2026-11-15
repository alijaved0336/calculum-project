# Change: Agreed Modal — Rename "Agreed Date of Change" to "Date of Agreement"

## Context

The Agreed modal panel currently shows a field labeled "Agreed Date of Change". This is renamed to "Date of Agreement" for clarity. Underlying field name (`agreedDateOfChange`), default value, min date, and validations remain unchanged.

## Scope (this task)

- Rename label in the Agreed modal to "Date of Agreement".
- Use i18n key `home.entityCard.results.dateOfAgreement` for the label.
- Update validation/warning messages that refer to this field to say "Date of Agreement".
- No API or model renames; no behavior changes.

## Checklist

- [x] Add `dateOfAgreement` in `home.entityCard.results` (en.json, es.json).
- [x] Add `dateOfAgreement` in `home.entityCard.warnings` (en.json, es.json).
- [x] Update validation error message strings to say "Date of Agreement" (en.json, es.json).
- [x] ModalResults.vue: use `dateOfAgreement` for label and warning key.

## Implemented

- **en.json**: `home.entityCard.results.dateOfAgreement`: "Date of Agreement"; `home.entityCard.warnings.dateOfAgreement`: "You must select a Date of Agreement."; validation messages now say "Date of Agreement".
- **es.json**: `home.entityCard.results.dateOfAgreement`: "Fecha de acuerdo"; `home.entityCard.warnings.dateOfAgreement`: "Debe seleccionar una Fecha de acuerdo."; validation messages updated to "Fecha de acuerdo".
- **ModalResults.vue**: Label uses `$t('home.entityCard.results.dateOfAgreement')`; required-field warning uses `translate.t("home.entityCard.warnings.dateOfAgreement")`.
- Field binding, model (`agreedDateOfChange`), validations, default value, and min date are unchanged.

---

## Add "Effective Date" Field

A new mandatory date field **Effective Date** was added to the Agreed modal.

### Implemented

- **Types** (`entityCard/types/index.ts`): `SpendNewTerms` and modal `spendNewTerms` type include `effectiveDate: string` and `effectiveDateBox: string | null` (API interface has `effectiveDate?: string` for backward compatibility with responses that do not yet return it).
- **ModalResults.vue**:
  - New input in the form (between Date of Agreement and Next Review Date), bound to `spendNewTerms.effectiveDate`, with `minStartDate`, required, i18n label `home.entityCard.results.effectiveDate`.
  - Default when opening/fillSuggested: `effectiveDate` is set to the same value as Date of Agreement (`data.currentStartDate`).
  - Required validation: adds warning `home.entityCard.warnings.effectiveDate` if empty.
  - Payload: `effectiveDate` included in the object passed to the store for POST/PATCH.
  - Callback: on load from API, `effectiveDate` and `effectiveDateBox` are set from response, with fallback to Date of Agreement when the backend does not yet return `effectiveDate`.
  - Reset: `effectiveDate` and `effectiveDateBox` cleared in `avoidCallTerms()`.
- **API** (`entityCard/api/index.ts`): `postSpendNewTerms` and `patchSpendNewTerms` accept and send `effectiveDate` in the request body.
- **Store** (`stores/entityCard.ts`): `postSpendNewTerms` and `patchSpendNewTerms` destructure and pass `effectiveDate` to the API.
- **i18n**: `home.entityCard.results.effectiveDate` ("Effective Date" / "Fecha efectiva") and `home.entityCard.warnings.effectiveDate` ("You must select an Effective Date." / "Debe seleccionar una Fecha efectiva.") in en.json and es.json.

### Backend (out of scope for front-end repo)

- Persist `effectiveDate` on **EntityCardSpendNewTerms** and in **CalculatedDataPartitionAbstract** as required by the product spec. The front-end sends `effectiveDate` in POST/PATCH payloads; the API should store and return it.
