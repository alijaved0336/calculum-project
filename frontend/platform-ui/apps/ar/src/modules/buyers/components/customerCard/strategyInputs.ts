import { humanizePascalCase } from '@/modules/entityCard/components/opportunity/humanize'

/** Matches the marker `formatNumber`/`formatCurrency` already use for "nothing to show here"
 * (see modules/match/utils/format.ts and modules/entityCard/components/opportunity/format.ts) - a
 * null distribution figure means the strategy did not compute it, not that it computed zero, so it
 * must not read as the string "null". */
const NO_VALUE_MARKER = '—'

/**
 * Canonical read order for a strategy's own `inputs` (ADR-0012): occurrences first, then the
 * five-number summary in reading order, then how the strategy arrived at the value. A key outside
 * this list still renders - just after these, alphabetically - so a further strategy family
 * (UC-OPP-30/32/34) needs no change here to show up (Global Constraints 2 and 3). A canonical key
 * with no entry in `inputs` is simply absent from this list's lookup, not rendered empty.
 */
const CANONICAL_INPUT_KEY_ORDER = ['occurrences', 'min', 'q1', 'avg', 'q3', 'max', 'calculationMethod']

/**
 * A strategy's `inputs` keys come off the backend in camelCase (`calculationMethod`), not the
 * PascalCase `humanizePascalCase` was written for - splitting `calculationMethod` through it
 * unchanged would read as "calculation Method", missing the capital on the leading word.
 * Capitalising the first character turns the key into PascalCase input, then hands off to
 * `humanizePascalCase`'s own split regex rather than keeping a second copy of it.
 */
export function humanizeInputKey(key: string): string {
  if (key.length === 0) {
    return key
  }
  return humanizePascalCase(key[0].toUpperCase() + key.slice(1))
}

/**
 * Unlike a strategy identifier - open vocabulary, which is exactly why one is never named in
 * front-end code - `BuyerCardStrategyResultDto.selectionOutcome` is a closed, enumerated set (see
 * that field's own doc comment in `@/api`). A label map over a closed set names no strategy and
 * breaks no constraint.
 *
 * Not exported: `formatSelectionOutcome` right below is the seam every caller (the party panel
 * and the line detail cards) goes through, so this map itself never needs a second consumer.
 */
const SELECTION_OUTCOME_I18N_KEYS: Record<string, string> = {
  selected: 'arCustomerCard.strategyResults.selectionOutcomes.selected',
  capped_by_regulation: 'arCustomerCard.strategyResults.selectionOutcomes.cappedByRegulation',
  longer_than_selected: 'arCustomerCard.strategyResults.selectionOutcomes.longerThanSelected',
  no_reduction: 'arCustomerCard.strategyResults.selectionOutcomes.noReduction',
  not_applicable: 'arCustomerCard.strategyResults.selectionOutcomes.notApplicable',
  not_a_candidate: 'arCustomerCard.strategyResults.selectionOutcomes.notACandidate',
}

/**
 * Selection-outcome codes are snake_case (`not_a_candidate`), not the camelCase `humanizeInputKey`
 * splits - underscores would pass straight through it unchanged. Used only as the fallback for a
 * code outside `SELECTION_OUTCOME_I18N_KEYS`: the backend can add a seventh outcome before the
 * front end has a translation for it, and that must still read as words, not vanish or show raw
 * underscores.
 */
function humanizeSnakeCase(value: string): string {
  if (value.length === 0) {
    return value
  }
  const spaced = value.replaceAll('_', ' ')
  return spaced[0].toUpperCase() + spaced.slice(1)
}

/**
 * A selection-outcome code, translated. Deliberately not `vue-i18n`'s `te()` to decide whether a
 * translation exists - `te()` ignores `fallbackLocale`, so a key present only in `en.json` would
 * report as missing for an `es` user and silently downgrade. Whether the code is known is decided
 * from {@link SELECTION_OUTCOME_I18N_KEYS} itself, not from the catalogue.
 */
export function formatSelectionOutcome(code: string, translate: (key: string) => string): string {
  const key = SELECTION_OUTCOME_I18N_KEYS[code]
  return key ? translate(key) : humanizeSnakeCase(code)
}

/** One `inputs` entry, ready to render: its raw key (for a `:key` binding), its humanized label,
 * and its value already reduced to a string. */
export interface StrategyInputRow {
  key: string
  label: string
  value: string
}

function formatInputValue(value: unknown): string {
  if (value === null) {
    return NO_VALUE_MARKER
  }
  // Covers both objects and arrays - JSON.stringify is what keeps a nested object (e.g. a
  // calculationMethod detail blob) legible instead of collapsing to "[object Object]".
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

/**
 * Turns one strategy row's opaque `inputs` into ordered, labelled, string-rendered rows.
 *
 * `inputs` is typed `unknown` rather than `Record<string, unknown> | null`, because the backend
 * serialises a raw JSON node (see `BuyerCardStrategyResultDto.inputs`'s own doc comment) - in
 * principle this can be an array or a scalar, not only an object or null. `Object.entries` does not
 * throw on a scalar, but it would silently read the scalar's own enumerable properties (e.g. a
 * string's character indices) and fabricate rows that were never in the data, so anything that is
 * not a plain object is rejected up front and yields no rows at all.
 */
export function deriveInputRows(inputs: unknown): StrategyInputRow[] {
  if (inputs === null || typeof inputs !== 'object' || Array.isArray(inputs)) {
    return []
  }

  const canonicalRank = new Map(CANONICAL_INPUT_KEY_ORDER.map((key, index) => [key, index]))

  return Object.entries(inputs)
    .sort(([keyA], [keyB]) => {
      const rankA = canonicalRank.get(keyA)
      const rankB = canonicalRank.get(keyB)
      if (rankA !== undefined && rankB !== undefined) {
        return rankA - rankB
      }
      if (rankA !== undefined) {
        return -1
      }
      if (rankB !== undefined) {
        return 1
      }
      // Code-point order, not `localeCompare`. These are backend identifiers, not prose, and
      // `localeCompare` collates by the runtime's ICU data: `'Q1'` against `'avg'` can order one
      // way locally and the other in CI, which would show as a screen whose rows moved and a sort
      // test that is green on one machine and red on another. Nothing here needs a human's
      // alphabet.
      if (keyA === keyB) {
        return 0
      }
      return keyA < keyB ? -1 : 1
    })
    .map(([key, value]) => ({
      key,
      label: humanizeInputKey(key),
      value: formatInputValue(value),
    }))
}

/**
 * One strategy's proposed outcome, ready to render - the same shape whether it came from the
 * card's party-grain breakdown (`BuyerCardStrategyResultDto`) or a line's own result
 * (`SaleLineStrategyResultDto`). The two DTOs are field-identical by design (see
 * `SaleLineStrategyResultDto`'s own doc comment), so this is deliberately typed against a
 * structural shape rather than either DTO by name: importing one would make the derivation only
 * look shared while actually being pinned to one grain, and a union of both would force a cast at
 * every call site.
 */
interface StrategyResultLike {
  strategy: string
  proposedTerm: number | null
  applicabilityReason: string | null
  selectionOutcome: string | null
  inputs: unknown
}

/** A `StrategyResultLike` reduced to what the party-grain strategy panel and the line-grain
 * detail cards both render, with nothing left for either to recompute.
 *
 * `displayName` is today identical to `strategy` (see `deriveStrategyResultRow`'s own comment for
 * why it is never humanized) - kept as its own field anyway, rather than dropped in favour of
 * reading `strategy` directly, so a later product pass can give this panel a real per-strategy
 * name without changing the row's shape. */
export interface StrategyResultRow {
  displayName: string
  proposedTerm: number | null
  applicabilityReason: string | null
  selectionOutcome: string | null
  inputRows: StrategyInputRow[]
}

/**
 * `displayName` is the raw `strategy` identifier, verbatim, in whichever casing the backend used
 * for it - deliberately NOT run through `humanizePascalCase` the way `StrategyList.vue` humanizes
 * the entity card's own strategy rows.
 *
 * A strategy identifier is open vocabulary (Global Constraint 2: the front end never names one),
 * so it is opaque data to this panel, not prose to prettify - and today's rows are a mix of
 * PascalCase (the entity card's older strategies) and snake_case (UC-OPP-31's
 * `peer_group_standard_2_0`), the latter unaffected by `humanizePascalCase`'s camelCase-boundary
 * split. Humanizing one casing and not the other would be worse than humanizing neither: the
 * reader could not tell, from the label alone, which kind of value they were looking at. This
 * panel exists so an engineer can check that the right strategy wrote a row in
 * `ar.parsed_company_strategy_result` - the key is what gets pasted into that query, and
 * `Peer Group Standard 2 0` cannot be.
 *
 * This is the opposite call from `formatSelectionOutcome` right above, deliberately: that field is
 * a closed, six-value enum declared in the DTO's own doc comment, so translating it names no
 * strategy and loses no information. `strategy` has neither property.
 */
export function deriveStrategyResultRow(result: StrategyResultLike): StrategyResultRow {
  return {
    displayName: result.strategy,
    proposedTerm: result.proposedTerm,
    applicabilityReason: result.applicabilityReason,
    selectionOutcome: result.selectionOutcome,
    inputRows: deriveInputRows(result.inputs),
  }
}
