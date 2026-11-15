<template>
<div class="nine-box-summary" :class="{ 'nine-box-summary--bordered': !showEmptyState }">
  <!-- AP's own empty state here (HomeAnalyzeProgramNineBoxes.vue: the table is v-else'd out
       entirely, replaced by its own emptyState9box illustration + this same global.selectOneOrMore
       text) - unlike NineBoxRowsGrid below the boxes, which stays visible with zero rows regardless
       of selection; this is a different region with a different rule. NineBoxEmptyState carries its
       own card border/shadow, so `--bordered` above only applies while the table (which has none of
       its own) is what's showing - otherwise the two borders would nest.

       Gated on `hasSelectableCell` too, not just `selectedBoxes.length === 0`: in a sparse/empty
       environment (every box reads 0 buyers - the exact case NineBoxRowsGrid's own "always render"
       change exists for), NO box is ever clickable (NineBoxOverview.vue's `:clickable="cellBuyerCount
       > 0"`), so `selectedBoxes` can never leave `[]` - a prompt telling the user to click a box they
       can never click is a dead end. Falling back to the (all-zero) table there mirrors the sibling
       grid's own resolution of the same sparse-data case. -->
  <NineBoxEmptyState v-if="showEmptyState" class="nine-box-summary__empty" :message="t('global.selectOneOrMore')" />
  <table v-else class="nine-box-summary-table">
    <thead>
      <tr>
        <th></th>
        <th>{{ t('global.selection') }}</th>
        <th>{{ t('global.total') }}</th>
        <th>%</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.label">
        <th scope="row">{{ row.label }}</th>
        <td>{{ row.selected }}</td>
        <td>{{ row.total }}</td>
        <td>{{ row.percentage }}</td>
      </tr>
    </tbody>
  </table>
</div>
</template>

<script setup lang="ts">
/**
 * UC-UI-04's side panel — AP's `AnalyzeProgramNineBoxesTable.vue` counterpart (Selection / Total /
 * % per metric), computed here purely client-side from `fetchNineBoxTermsReduction`'s own 9-cell
 * response: "total" sums every classified cell (nineBox not null — Unranked is a different bucket,
 * not part of "the 9 boxes"), "selection" sums only the currently-selected ones. No second
 * endpoint call, unlike AP's own table (`useNineBoxesTableLogic`, fed by the boxes' full info
 * object already in memory) — the same info is already in memory here too, just shaped as an
 * array instead of a per-box map.
 *
 * Row list matches AP's own `AnalyzeProgramNineBoxesTable.vue` for its `typeOf9Boxes: 'cashFlow'`
 * box (the "Term Extension" one AR's own boxes were ported from, confirmed against a screenshot of
 * that real screen), `showOpportunityExpectedOpportunity: 'OPPORTUNITY_AND_EXPECTED'` — AP's own
 * default. The four payment-term metrics that list carries (Contractual Payment Terms, Avg. Days
 * Paid, Payment Terms Opportunity, Expected Payment Terms) used to render as `-`/`-`/`-` because
 * `fetchNineBoxTermsReduction`'s response had no fields for them at all — shown that way rather
 * than as invented numbers, structural parity with AP without fabricating data. The endpoint
 * carries all four now, so `daysRow` below reports them: volume-weighted averages in whole days,
 * with `-` kept for the genuinely absent case (no volume on a side, or every cell null).
 *
 * Not replicated: AP's own SEPARATE, always-shown "Buying/Supplier Entities" row alongside its own
 * single level-conditional one — real AP data shows those as two genuinely different counts (its
 * screenshot: "Suppliers" 82, "Buying Entities" 8), because AP's own domain has two independent
 * counterparty axes. AR has only one (buyers), so its level-dependent row alone already covers
 * "how many things" at whichever level is active; a second, always-"Buyers" row next to it would
 * just repeat the same number under a different label rather than carry AP's actual second axis.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NineBoxEmptyState } from '@ada/design-system'
import { formatBigNumbers } from '@/utils/chartFormatting'
import { prependMoneySymbol } from '@/utils/moneyFormatting'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import type { NineBoxCellRow } from '@/api'
import type { OverviewGridLevel } from '../data/overviewRows'

// AB#20356: matches the Intl.NumberFormat options the old `formatCompact` (removed here) used -
// no forced decimal on a whole number ("150", not "150.0"), unlike `formatBigNumbers`'s own
// default (minimumFractionDigits: 1).
const BIG_NUMBER_OPTIONS = { minimumFractionDigits: 0, maximumFractionDigits: 2 }

const props = defineProps<{
  summary: NineBoxCellRow[]
  selectedBoxes: number[]
  level: OverviewGridLevel
}>()

const { t } = useI18n({ useScope: 'global' })
const currenciesStore = useArCurrenciesStore()

type MoneyMetric = 'volume' | 'totalValue' | 'expectedTotalValue' | 'economicProfitImpact'
type DaysMetric =
  | 'contractualPaymentTerms'
  | 'averageDaysPaid'
  | 'paymentTermsOpportunity'
  | 'expectedPaymentTerms'

// The two the server nulls per cell when nobody in it has a proposal, and the only two that fall
// back to the contractual term — see contributedTerm. Contractual and Avg. Days Paid are measured
// rather than forecast, so a null there is genuinely no data and has nothing to fall back to.
const FORECAST_METRICS: Set<DaysMetric> = new Set(['paymentTermsOpportunity', 'expectedPaymentTerms'])

// Mirrors NineBoxOverview.vue's own LEVEL_COUNT_LABEL_KEY - the two tables (this one, and each
// card's own 3rd row) show the same level-dependent count, so they agree on what it's labeled.
// 'parents' has no field of its own in NineBoxCellRow - same as the party-level grid, it reads
// buyerCount (already scoped server-side to parents+standalone buyers at that level, per
// fetchNineBoxTermsReduction's own `level` param - see NineBoxSummaryTable.spec.ts's own test for
// this row).
const LEVEL_COUNT_FIELD: Record<OverviewGridLevel, 'buyerCount' | 'saleLineCount'> = {
  saleLines: 'saleLineCount',
  buyers: 'buyerCount',
  parents: 'buyerCount',
}
const LEVEL_COUNT_LABEL_KEY: Record<OverviewGridLevel, string> = {
  saleLines: 'arOpportunity.nineBox.summary.saleLines',
  buyers: 'arOpportunity.nineBox.summary.buyers',
  parents: 'arOpportunity.nineBox.summary.parents',
}

const classifiedCells = computed(() => props.summary.filter((cell) => cell.nineBox !== null))
const selectedCells = computed(() =>
  classifiedCells.value.filter((cell) => props.selectedBoxes.includes(cell.nineBox!)),
)

/** Whether at least one of the 9 boxes has a buyer in it - i.e. whether the "click a box" prompt
 * is an instruction the user could actually follow. See the template's own comment on why an
 * empty-selection state with nothing selectable falls back to the table instead. */
const hasSelectableCell = computed(() => classifiedCells.value.some((cell) => cell.buyerCount > 0))
const showEmptyState = computed(() => props.selectedBoxes.length === 0 && hasSelectableCell.value)

function sumCount(cells: NineBoxCellRow[], field: 'buyerCount' | 'saleLineCount'): number {
  return cells.reduce((total, cell) => total + cell[field], 0)
}

function sumMoney(cells: NineBoxCellRow[], field: MoneyMetric): number {
  return cells.reduce((total, cell) => total + (cell[field] ?? 0), 0)
}

/**
 * TWO DECIMALS, matching AP's own `calculatePercentage` (`.toFixed(2)`), and the reason is not
 * parity for its own sake: a selection that is a real but small share of the portfolio reads 0%
 * under `Math.round`, which looks like a bug or like nothing. A single cell holding 59.32K of a
 * 15.26M portfolio is 0.39% and used to render `0%`; the money rows on a real file are almost all
 * in that range, so rounding to whole percent made the column useless on exactly the rows it exists
 * for.
 *
 * `-` rather than AP's own `'0'` when the total is zero: nothing to take a share OF is a different
 * answer from a zero share, which is the same null-not-zero rule the money cells follow, and this
 * table's own suite already pinned it.
 */
function percentageOf(selected: number, total: number): string {
  return total > 0 ? `${((selected / total) * 100).toFixed(2)}%` : '-'
}

function countRow(label: string, field: 'buyerCount' | 'saleLineCount') {
  const selected = sumCount(selectedCells.value, field)
  const total = sumCount(classifiedCells.value, field)
  return { label, selected: String(selected), total: String(total), percentage: percentageOf(selected, total) }
}

function moneyRow(label: string, field: MoneyMetric) {
  const selected = sumMoney(selectedCells.value, field)
  const total = sumMoney(classifiedCells.value, field)
  const symbol = currenciesStore.selectedCurrencySymbol
  return {
    label,
    selected: prependMoneySymbol(formatBigNumbers(selected, BIG_NUMBER_OPTIONS), symbol),
    total: prependMoneySymbol(formatBigNumbers(total, BIG_NUMBER_OPTIONS), symbol),
    percentage: percentageOf(selected, total),
  }
}

/**
 * A payment-term row: whole DAYS, so it is never passed through `formatBigNumbers` — that shortens
 * thousands into "1.2K", which is right for money and wrong for a term. Selection and Total are
 * each the volume-weighted average of the cells on their side, which is why they are recomputed
 * from the cells rather than summed: averaging averages by volume is the only way the panel's
 * Total can equal what the server would report for the same set.
 *
 * The weight is the MAGNITUDE of `volume`, `Math.abs`, matching the server's own `Weight` — which
 * is also `SUM(ABS(volume))` and for the reason `GetSummary` states there: a credit note carries a
 * negative volume, and a weight that can go negative can cancel a real one out. That is a
 * deliberate difference from the Sales Volume row above, which sums `volume` SIGNED because it is
 * money and a credit really does reduce the portfolio. A weight and a total are not the same
 * question, so they do not take the same sign.
 *
 * A cell with no volume contributes nothing to either side rather than counting as zero days, and a
 * side with no volume at all reads `-`, the same absence the money rows show — the alternative,
 * dividing by zero, renders NaN.
 */
function daysRow(label: string, field: DaysMetric) {
  return {
    label,
    selected: formatDays(weightedDays(selectedCells.value, field)),
    total: formatDays(weightedDays(classifiedCells.value, field)),
    percentage: '-',
  }
}

/**
 * The term a cell contributes to `field`'s average — which for the two FORECAST metrics is not
 * simply `cell[field]`, and getting that wrong was a review finding on this PR.
 *
 * The server nulls `paymentTermsOpportunity` / `expectedPaymentTerms` for a cell where NOBODY has a
 * proposal, but the parties in that cell still carry real volume at a real term, and the server's
 * own whole-set figure counts them at the term they already have (`recommended ?? contractual ??
 * actual` — AB#20060's one-population rule). Dropping them here made the panel's Total an average
 * over only the boxes containing proposals, which is not what the server would report for the same
 * set — the exact property this file claims the re-weighting preserves.
 *
 * Folding them in at the cell's own `contractualPaymentTerms` is EXACT rather than an
 * approximation: the cell is null only when every party in it lacks a proposal, so for all of them
 * the server's term IS `contractual ?? actual`, and the cell's contractual figure is already that
 * weighted sum over those same parties.
 *
 * `contractualPaymentTerms` IS THAT FALLBACK rather than the raw contractual column, which is the
 * whole reason nothing needs to follow it — a review on this PR read the line as dropping the
 * parties that have an actual term but no contractual one, and proposed `?? averageDaysPaid`. The
 * server builds this row from `SUM((contractual ?? actual) × |volume|)`, so such a party is ALREADY
 * counted here, at its actual term. The field goes null only when nobody in the cell has either,
 * and `averageDaysPaid` — `AVG(actual)` over those same parties — is null exactly then, so the
 * extra fallback could not fire on any cell that the current one misses.
 */
function contributedTerm(cell: NineBoxCellRow, field: DaysMetric): number | null {
  if (cell[field] != null) return cell[field]!

  // Loose != null on purpose, so an undefined field — a response from a server that predates these
  // four, or a partial fixture — is treated as absent rather than multiplied into NaN.
  return FORECAST_METRICS.has(field) ? cell.contractualPaymentTerms ?? null : null
}

function weightedDays(cells: NineBoxCellRow[], field: DaysMetric): number | null {
  // The server's gate, restated at set level: it nulls a forecast when nobody in the SET has a
  // proposal. Without this the fallback above would manufacture a forecast out of contractual terms
  // alone, and "expected 60" would read as a forecast rather than as the absence of one.
  if (!cells.some((cell) => cell[field] != null)) return null

  const contributing = cells
    .map((cell) => ({ term: contributedTerm(cell, field), weight: Math.abs(cell.volume ?? 0) }))
    .filter((contribution) => contribution.term !== null && contribution.weight !== 0)

  const weight = contributing.reduce((total, contribution) => total + contribution.weight, 0)

  if (weight === 0) return null

  const weighted = contributing.reduce(
    (total, contribution) => total + contribution.term! * contribution.weight,
    0,
  )

  return Math.round(weighted / weight)
}

function formatDays(days: number | null): string {
  return days === null ? '-' : String(days)
}

const rows = computed(() => [
  countRow(t(LEVEL_COUNT_LABEL_KEY[props.level]), LEVEL_COUNT_FIELD[props.level]),
  moneyRow(t('arOpportunity.nineBox.summary.volume'), 'volume'),
  moneyRow(t('arOpportunity.nineBox.summary.cashFlowOpportunity'), 'totalValue'),
  moneyRow(t('arOpportunity.nineBox.summary.expectedCashFlow'), 'expectedTotalValue'),
  daysRow(t('arOpportunity.nineBox.summary.contractualPaymentTerms'), 'contractualPaymentTerms'),
  daysRow(t('arOpportunity.nineBox.summary.avgDaysPaid'), 'averageDaysPaid'),
  daysRow(t('arOpportunity.nineBox.summary.paymentTermsOpportunity'), 'paymentTermsOpportunity'),
  daysRow(t('arOpportunity.nineBox.summary.expectedPaymentTerms'), 'expectedPaymentTerms'),
  moneyRow(t('arOpportunity.nineBox.summary.economicProfitImpact'), 'economicProfitImpact'),
])
</script>

<style scoped>
/* The card chrome (border/radius/clip) lives HERE, not on the table - this whole box is what
   stretches to match the sibling 3x3 grid's height (NineBoxOverview.vue's `.nine-box-layout` is a
   CSS grid, whose default row-stretch sizes both columns to the tallest one). The table itself
   also gets `flex: 1` below so it, not empty space beneath it, is what fills that matched height -
   per request, the container should read as one solid table rather than a table with a gap under
   it. Native `<table>` layout distributes any extra box height it's given across its own rows when
   none of them have an explicit height, which is what visually grows each row here. */
.nine-box-summary {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.nine-box-summary--bordered {
  border: 1px solid var(--neutral-200);
  border-radius: 8px;
  overflow: hidden;
}

.nine-box-summary__empty {
  flex: 1;
}

.nine-box-summary-table {
  width: 100%;
  flex: 1;
  border-collapse: collapse;
}

.nine-box-summary-table th,
.nine-box-summary-table td {
  padding: 0.5rem 0.75rem;
  text-align: right;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--neutral-200);
}

.nine-box-summary-table thead th {
  background: var(--neutral-50);
  font-weight: 600;
  color: var(--neutral-600);
}

.nine-box-summary-table tbody th {
  text-align: left;
  font-weight: 500;
  color: var(--neutral-700);
}

.nine-box-summary-table tbody tr:last-child th,
.nine-box-summary-table tbody tr:last-child td {
  border-bottom: none;
}

/* AB#20419: matches AP's own `.table-body-9box tr:nth-child(even)` (_table_9box.scss). */
.nine-box-summary-table tbody tr:nth-child(even) {
  background: var(--neutral-50);
}
</style>
