<template>
<div class="nine-box-overview">
  <CalculumLoadingAr v-if="loading" modal />
  <NoDataAvailable v-else-if="error" :title="t('arOpportunity.nineBox.loadError')" :message="error" />
  <NoDataAvailable
    v-else-if="!versionId"
    :title="t('arOpportunity.nineBox.noVersionTitle')"
    :message="t('arOpportunity.nineBox.noVersionMessage')"
  />
  <div v-else class="d-flex flex-column gap-3">
    <!-- AP's own header here (NineBoxesCF.vue / HomeAnalyzeProgramNineBoxes.vue): a "9 Boxes
         {type}" title beside a dropdown that switches between its 9-box "types" (cashFlow/vcard/
         financing/scf9Box), the whole thing (title, select, level tabs, boxes, summary table - NOT
         the rows grid below, which is its own separate section in AP too) inside one bordered
         card. AR has only its own equivalent of AP's cashFlow type ("Terms Reduction" - AP calls
         that same type "Term Extension"/"Reduction" depending on its own receivables-preview
         mode), so there is nothing to actually switch between yet - per request, a dropdown with
         a single, unchangeable option shouldn't be shown at all (the title alone already names
         it), so the select only renders once `nineBoxTypeOptions` actually has more than one
         entry - ready to reappear the day AR gains a second nine-box type. `ContentBox`/
         `header-title` is this screen's own established card chrome (OpportunityOverview.vue's
         cards use the same one), not AP's own `h4.font-semibold` + bespoke card div - AP's
         layout, AR's established card primitive. -->
    <ContentBox>
      <template #header-title>
        <span class="mb-1 font-bold text-base">
          {{ t('arOpportunity.nineBox.title', { type: t('arOpportunity.nineBox.typeTermsReduction') }) }}
        </span>
      </template>
      <template v-if="nineBoxTypeOptions.length > 1" #header-controls>
        <CustomSelect
          class="nine-box-type-select"
          label=""
          panel-width="14.375rem"
          :data-items="nineBoxTypeOptions"
          :model-value="nineBoxTypeOptions[0]"
        />
      </template>
      <ContentBoxBody>
        <div class="d-flex flex-column gap-3">
          <CustomTabs :items="levelTabs" :model-value="level" appearance="segmented" @update:model-value="onLevelChange" />

          <div class="nine-box-layout">
            <div class="nine-box-chart">
              <div class="nine-box-axis nine-box-axis--y d-flex justify-content-between">
                <span>{{ t('global.low') }}</span><span>{{ t('arOpportunity.nineBox.probabilityAxis') }}</span><span>{{ t('global.high') }}</span>
              </div>
              <div class="nine-box-grid">
                <NineBoxCard
                  v-for="(cell, cellIndex) in boxPositions"
                  :key="cellKey(cell)"
                  :badge="NINE_BOX_POSITION_NUMBERS[cellIndex]"
                  :rows="cellRows(summaryForCell(cell))"
                  :accent="NINE_BOX_POSITION_ACCENTS[cellIndex]"
                  :selected="isBoxSelected(NINE_BOX_POSITION_NUMBERS[cellIndex])"
                  :clickable="cellBuyerCount(cell) > 0"
                  :muted="cellBuyerCount(cell) === 0"
                  @click="toggleBox(NINE_BOX_POSITION_NUMBERS[cellIndex])"
                />
              </div>
              <div class="nine-box-axis nine-box-axis--x d-flex justify-content-between">
                <span>{{ t('global.low') }}</span><span>{{ t('arOpportunity.nineBox.cashFlowImpactAxis') }}</span><span>{{ t('global.high') }}</span>
              </div>
            </div>

            <NineBoxSummaryTable :summary="nineBoxSummary" :selected-boxes="selectedBoxes" :level="level" />
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>

    <!-- AB#20418: a location indicator above the rows grid, matching AP's own CalculumGridGraphql
         (`showTabsLevels` + `onlyShowActiveTab`, see GraphqlGridToolbar.vue) - a single-item tab
         showing whichever level is active, not a second level switcher (that's the boxes' own
         CustomTabs above - switching there already drives this grid via `level`). One matching
         item means CustomTabs' own click-to-select never actually fires (its `select()` is a no-op
         when the clicked id is already `modelValue`), so this reads as a static label without
         needing a `disabled` prop of its own. -->
    <CustomTabs :items="currentLevelTab" :model-value="level" appearance="segmented" />

    <NineBoxRowsGrid :version-uuid="versionUuid" :level="level" :selected-boxes="selectedBoxes" />

    <!-- Unranked section temporarily disabled (per request) - see `unrankedCount` below. Re-enable
         by uncommenting both. UC-OPP-17 A1 still applies once this comes back. -->
    <!--
    <ContentBox v-if="unrankedCount > 0">
      <template #header-title>
        <span class="font-semibold">
          {{ t('arOpportunity.nineBox.unrankedTitle', { count: unrankedCount }) }}
        </span>
      </template>
      <ContentBoxBody>
        <p class="text-gray-500 mb-2">{{ t('arOpportunity.nineBox.unrankedMessage') }}</p>
        <NineBoxRowsGrid :version-uuid="versionUuid" :level="level" unranked />
      </ContentBoxBody>
    </ContentBox>
    -->
  </div>
</div>
</template>

<script lang="ts">
/**
 * UC-UI-04: the nine-box. Boxes are multi-selectable (`selectedBoxes`, AP's own
 * `selectedBoxesArray`) and narrow the persistent grid below them (`NineBoxRowsGrid`) rather than
 * opening an inline single-cell reveal — matching AP's actual `HomeAnalyzeProgramNineBoxes.vue` +
 * `ListsNineBoxes.vue` layout: boxes, a Selection/Total/% summary beside them
 * (`NineBoxSummaryTable`), and a grid underneath scoped to whichever level and boxes are active.
 *
 * Version resolution: this route carries no `:versionId` (unlike Match's `/match/versions/:id`) -
 * Opportunity has never had one, `Overview.vue` is still hardcoded dummy data with nothing to
 * resolve. Rather than add cross-cutting routing/dashboard changes to this one story, this view
 * resolves its own version - matching MatchRouting.openMatch's own "falls back to preselecting the
 * most recent" behavior when no version is specified - silently, with nothing named on screen (per
 * request - AP's own screen doesn't name the file/version here either).
 * (Note: `OverviewList.vue`'s sibling tabs read `useContextStore().saleFileVersionUuid` instead —
 * a pre-existing inconsistency between this tab and its siblings, not something this change fixes.)
 *
 * Compared by `id`, not `version`: `version` is a PER-FILE upload counter (DashboardView's own
 * default column sort uses it the same way, but only as a display sort *within* one file's rows
 * shown alongside their file name - never to pick a single "most recent" row across different
 * files). Comparing it across files is comparing two different axes - File B's 3rd upload isn't
 * newer than File A's 1st just because 3 > 1. `id` is a single global sequence over every version
 * row regardless of which file it belongs to, so it is what a cross-file "most recent" actually
 * has to mean.
 *
 * Card visuals: the grid renders `NineBoxCard` (@ada/design-system) instead of a hand-rolled
 * cell, so this tab looks like AP's nine-box (apps/ap/src/modules/home/analyze/components/
 * NineBoxes.vue + NineBoxesBox.vue) rather than a bespoke AR style. `NINE_BOX_POSITION_ACCENTS`/
 * `NINE_BOX_POSITION_NUMBERS` are direct ports of AP's `boxGroupMap`/`boxNumberMap` (cashFlow box
 * type), keyed by row-major grid position — `aggregateNineBox()` already emits its 9 cells in that
 * same row-major order (see that file's header comment), so both arrays zip onto `aggregate.cells`
 * with no reordering.
 *
 * Badge is the box's own POSITIONAL number (AP's own 1-9, from `NINE_BOX_POSITION_NUMBERS`), not a
 * count - matching AP's real screen exactly (verified against a screenshot of its "Term Extension"
 * 9-box): each card's 3 rows carry the data instead (Cash Flow Opportunity, Sales Volume, and a
 * level-dependent count - Buyers/Sale Lines/Parents, whichever `level` is active), all from
 * `fetchNineBoxTermsReduction` - the backend's own request-time aggregate over the same buyer
 * projection (see that endpoint's own doc comment). `boxPositions` (below) is a purely structural
 * 9-cell skeleton (`aggregateNineBox([])`, always empty) used only to read each grid position's
 * probability/cash-flow-impact tier pair for labels - no buyer rows are fetched client-side any
 * more; the box-filtered grid is a `NineBoxRowsGrid` instance reading the same server-paged
 * GraphQL source `OverviewList.vue` (the List tab) uses.
 *
 * The Unranked section (UC-OPP-17 A1) is TEMPORARILY DISABLED - see the commented-out
 * `unrankedCount` and its template block below. `NineBoxRowsGrid`'s own `unranked` mode is untouched
 * and still tested independently; re-enabling this view's use of it means uncommenting both spots -
 * `ContentBox`/`ContentBoxBody` are already imported and registered above for the bordered header
 * card the boxes/table now live in, so nothing needs re-adding there.
 */
import { computed, defineComponent, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import {
  CalculumLoadingAr,
  ContentBox,
  ContentBoxBody,
  CustomSelect,
  CustomTabs,
  NineBoxCard,
  NoDataAvailable,
  NINE_BOX_POSITION_ACCENTS,
  NINE_BOX_POSITION_NUMBERS,
  type NineBoxCardRow,
} from '@ada/design-system'
import { fetchNineBoxTermsReduction, fetchSaleFiles, type NineBoxCellRow, type NineBoxLevel } from '@/api'
import { HttpError, SessionExpiredError } from '@/api/http'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { useOpportunityGridLevelStore } from '@/stores/opportunityGridLevel'
import { formatBigNumbers } from '@/utils/chartFormatting'
import { prependMoneySymbol } from '@/utils/moneyFormatting'
import { aggregateNineBox, type NineBoxCell } from '../utils/nineBoxAggregation'
import type { OverviewGridLevel } from '../data/overviewRows'
import NineBoxRowsGrid from '../components/NineBoxRowsGrid.vue'
import NineBoxSummaryTable from '../components/NineBoxSummaryTable.vue'

// AB#20356: matches the Intl.NumberFormat options the old `formatCompact` (removed here) used -
// no forced decimal on a whole number ("150", not "150.0"), same as `formatBigNumbers`'s own
// default elsewhere in this file would NOT give, since its default `minimumFractionDigits` is 1.
const BIG_NUMBER_OPTIONS = { minimumFractionDigits: 0, maximumFractionDigits: 2 }

// Row-major, always-empty - just the probabilityTier/cashFlowImpactTier pair per grid position
// (the same PROBABILITY_TIERS_TOP_TO_BOTTOM × CASH_FLOW_IMPACT_TIERS_LEFT_TO_RIGHT cross product
// nineBoxAggregation.ts already computes), reused here rather than re-derived so a position's tier
// labels have a source without needing any buyer rows fetched.
const boxPositions = aggregateNineBox([]).cells

/** The tier pair as a plain identity string - pure, so it belongs at module scope rather than
 * being recreated on every `setup()` call. */
function cellKey(cell: NineBoxCell): string {
  return `${cell.probabilityTier}/${cell.cashFlowImpactTier}`
}

const LEVELS: OverviewGridLevel[] = ['saleLines', 'buyers', 'parents']

/** This screen's own level ids (shared with the GraphQL grid, `NineBoxRowsGrid`'s `level` prop)
 * vs. the nine-box aggregate endpoint's ('sales', not 'saleLines' — see `NineBoxCellsRequest`'s
 * own doc for why the two spellings differ; the grid's ids win here since this screen's tabs and
 * labels are shared with `OverviewList.vue`'s, and the endpoint is the one odd one out). */
const NINE_BOX_LEVEL: Record<OverviewGridLevel, NineBoxLevel> = {
  saleLines: 'sales',
  buyers: 'buyers',
  parents: 'parents',
}

/** Each card's third row is a count, but which count depends on the active level - AP's own
 * screen does the same (its "Suppliers"/"Spend Lines"/"Parents" row swaps with `selectedLevel`). */
const LEVEL_COUNT_LABEL_KEY: Record<OverviewGridLevel, string> = {
  saleLines: 'arOpportunity.nineBox.summary.saleLines',
  buyers: 'arOpportunity.nineBox.summary.buyers',
  parents: 'arOpportunity.nineBox.summary.parents',
}

export default defineComponent({
  name: 'NineBoxOverview',
  components: { CalculumLoadingAr, ContentBox, ContentBoxBody, CustomSelect, CustomTabs, NineBoxCard, NineBoxRowsGrid, NineBoxSummaryTable, NoDataAvailable },
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    const currenciesStore = useArCurrenciesStore()
    const loading = ref(true)
    const error = ref<string | null>(null)
    const versionId = ref<number | null>(null)
    const versionUuid = ref<string | null>(null)
    const nineBoxSummary = ref<NineBoxCellRow[]>([])
    // AB#20356: was local component state, reset to 'buyers' every time App.vue's <RouterView>
    // (no <KeepAlive>) unmounts this view - now backed by the shared store so the tab survives a
    // navigate-away-and-back within the same session.
    const { nineBoxLevel: level } = storeToRefs(useOpportunityGridLevelStore())
    const selectedBoxes = ref<number[]>([])

    // Single entry today (see this template block's own comment for why a lone option hides the
    // dropdown rather than rendering it disabled/unchangeable) - an array, not a plain string, so
    // the day a second nine-box type exists this is the one place that grows to show it.
    const nineBoxTypeOptions = computed(() => [t('arOpportunity.nineBox.typeTermsReduction')])

    // AR's own nouns for the GraphQL grid's level ids ('saleLines') vs. this endpoint's ('sales') -
    // see NineBoxCellsRequest.Level's own doc for why the two spellings differ.
    const levelTabs = computed(() => [
      { id: 'saleLines', label: t('arOpportunity.list.tabs.saleLines') },
      { id: 'buyers', label: t('arOpportunity.list.tabs.buyers') },
      { id: 'parents', label: t('arOpportunity.list.tabs.parents') },
    ])

    // AB#20418: the rows-grid's own location indicator - the same list as levelTabs above, narrowed
    // to just the active one, rather than a second independent tab set that could drift out of sync.
    const currentLevelTab = computed(() => levelTabs.value.filter((tab) => tab.id === level.value))

    // Temporarily disabled (per request) alongside the Unranked section in the template above -
    // re-enable both together.
    // const unrankedCount = computed(
    //   () => nineBoxSummary.value.find((row) => row.nineBox === null)?.buyerCount ?? 0,
    // )

    const summaryByKey = computed(() => {
      const map = new Map<string, NineBoxCellRow>()
      for (const summaryRow of nineBoxSummary.value) {
        if (summaryRow.probabilityTier && summaryRow.cashFlowImpactTier) {
          map.set(`${summaryRow.probabilityTier}/${summaryRow.cashFlowImpactTier}`, summaryRow)
        }
      }
      return map
    })

    function summaryForCell(cell: NineBoxCell): NineBoxCellRow | undefined {
      return summaryByKey.value.get(cellKey(cell))
    }

    /** `undefined` (no summary row for this cell yet) reads the same as an explicit 0 - both mean
     * "nothing here", which is also AP's own `boxInfo.volume === 0` empty-box criterion
     * (`NineBoxesBox.vue`'s `isMuted`/`isClickable`) - AR's analog is buyer count, not volume. */
    function cellBuyerCount(cell: NineBoxCell): number {
      return summaryForCell(cell)?.buyerCount ?? 0
    }

    function isBoxSelected(boxNumber: number): boolean {
      return selectedBoxes.value.includes(boxNumber)
    }

    function toggleBox(boxNumber: number): void {
      selectedBoxes.value = isBoxSelected(boxNumber)
        ? selectedBoxes.value.filter((box) => box !== boxNumber)
        : [...selectedBoxes.value, boxNumber]
    }

    /** UC-UI-23: a money figure's own "nothing here" dash (`== null`) stays exactly as it was -
     * this only prefixes the symbol once there is a real formatted number to prefix. */
    function moneyOrDash(value: number | null | undefined): string {
      return value == null
        ? '-'
        : prependMoneySymbol(formatBigNumbers(value, BIG_NUMBER_OPTIONS), currenciesStore.selectedCurrencySymbol)
    }

    /** The card's 3 rows, matching AP's real screen exactly (Cash Flow Opportunity / Spend Volume /
     * a level-dependent count - no "expected" row on the card itself; that one lives only in
     * `NineBoxSummaryTable`). `undefined` (no matching summary row) and a null money field both
     * read as a dash, same as `saleLineCount`/`buyerCount` of 0 does for the count row - 0 there
     * means the same "nothing here" `cellBuyerCount`'s own muted/not-clickable check already reads. */
    function cellRows(summaryRow: NineBoxCellRow | undefined): NineBoxCardRow[] {
      const count = level.value === 'saleLines' ? summaryRow?.saleLineCount : summaryRow?.buyerCount
      return [
        {
          label: t('arOpportunity.nineBox.summary.cashFlowOpportunity'),
          value: moneyOrDash(summaryRow?.totalValue),
        },
        {
          label: t('arOpportunity.nineBox.summary.volume'),
          value: moneyOrDash(summaryRow?.volume),
        },
        {
          label: t(LEVEL_COUNT_LABEL_KEY[level.value]),
          value: count ? String(count) : '-',
        },
      ]
    }

    interface ResolvedVersion {
      id: number
      uuid: string
    }

    /** Newest version across every file - see this file's own header comment for why `id`, not
     * `version`, is the field two different files' rows can honestly be compared on. */
    function mostRecentVersion(files: Awaited<ReturnType<typeof fetchSaleFiles>>): ResolvedVersion | null {
      let best: ResolvedVersion | null = null

      for (const file of files) {
        for (const version of file.versions) {
          if (best === null || version.id > best.id) {
            best = { id: version.id, uuid: version.uuid }
          }
        }
      }

      return best
    }

    /** AP's own `defaultBoxes()`: the first non-empty box, so the grid and the summary table
     * aren't blank the moment the screen opens. Only runs once, on the initial load - a level
     * switch keeps whatever the analyst already picked rather than silently replacing it.
     * AB#20854: "first" is by box number (1, then 2, ...), the order AP walks its boxes in - not
     * by grid position, whose row-major order starts at the top-left box 7. */
    function selectDefaultBox(): void {
      const byBoxNumber = NINE_BOX_POSITION_NUMBERS
        .map((boxNumber, index) => ({ boxNumber, cell: boxPositions[index] }))
        .sort((a, b) => a.boxNumber - b.boxNumber)
      const first = byBoxNumber.find(({ cell }) => cellBuyerCount(cell) > 0)
      if (first) {
        selectedBoxes.value = [first.boxNumber]
      }
    }

    async function loadSummary(): Promise<void> {
      if (!versionUuid.value) {
        return
      }
      try {
        nineBoxSummary.value = await fetchNineBoxTermsReduction(versionUuid.value, NINE_BOX_LEVEL[level.value], currenciesStore.currency)
      } catch (loadError) {
        if (loadError instanceof SessionExpiredError) {
          return
        }
        error.value =
          loadError instanceof HttpError
            ? t('arOpportunity.nineBox.serverError', { status: loadError.status })
            : t('arOpportunity.nineBox.networkError')
      }
    }

    function onLevelChange(id: string): void {
      const next = id as OverviewGridLevel
      if (next === level.value || !LEVELS.includes(next)) {
        return
      }
      level.value = next
      loadSummary()
    }

    async function load(): Promise<void> {
      loading.value = true
      error.value = null

      try {
        const files = await fetchSaleFiles()
        const resolved = mostRecentVersion(files)
        versionId.value = resolved?.id ?? null
        versionUuid.value = resolved?.uuid ?? null

        if (resolved === null) {
          loading.value = false
          return
        }

        nineBoxSummary.value = await fetchNineBoxTermsReduction(resolved.uuid, NINE_BOX_LEVEL[level.value], currenciesStore.currency)
        selectDefaultBox()
        loading.value = false
      } catch (loadError) {
        if (loadError instanceof SessionExpiredError) {
          // The page is navigating away to sign in; hold the loading state rather than flashing
          // an error over a screen that is already leaving.
          return
        }
        error.value =
          loadError instanceof HttpError
            ? t('arOpportunity.nineBox.serverError', { status: loadError.status })
            : t('arOpportunity.nineBox.networkError')
        loading.value = false
      }
    }

    onMounted(load)

    return {
      t,
      loading,
      error,
      versionId,
      versionUuid,
      nineBoxTypeOptions,
      level,
      levelTabs,
      currentLevelTab,
      onLevelChange,
      boxPositions,
      nineBoxSummary,
      // unrankedCount, (disabled with the Unranked section above)
      selectedBoxes,
      isBoxSelected,
      toggleBox,
      cellKey,
      cellRows,
      cellBuyerCount,
      summaryForCell,
      NINE_BOX_POSITION_ACCENTS,
      NINE_BOX_POSITION_NUMBERS,
    }
  },
})
</script>

<style scoped>
/* CustomSelect's own CSS is `width: 100%` (it fills whatever box a caller gives it) - undoing that
   here to a fixed, compact width is what keeps it from claiming most of the header row's space and
   squeezing the title (ContentBox's own header-title/header-controls flex split - flex: 1 vs
   flex-shrink: 0 - already gives the title everything the select doesn't need, but the select
   still needs its OWN width bounded rather than left at 100%, or "everything it doesn't need" is
   nothing). Matches its own min-width, which is already a sensible compact size on its own.

   The template's own `panel-width="14.375rem"` mirrors this value - see that prop's own doc on
   CustomSelect for why the dropdown list needs an explicit width instead of the default
   trigger-width match under this app's zoomed host. */
.nine-box-type-select {
  width: 14.375rem;
}

/* CSS Grid, not flex - a flex `align-items: stretch` did not reliably stretch `.nine-box-chart`
   (itself a grid, with a `1fr` row) to report its real content height back to the outer layout, so
   the summary table beside it kept its own shorter natural height instead of matching it. Grid's
   own row-stretch (its default `align-items`, same keyword, different algorithm) does not have that
   nested-grid intrinsic-sizing gap - and grid auto-places each child into its own column, so
   `NineBoxSummaryTable` doesn't need a sizing class of its own here any more. */
.nine-box-layout {
  display: grid;
  grid-template-columns: minmax(420px, 2fr) minmax(280px, 1fr);
  gap: 1rem;
}

/* Container query, not a viewport media query: this view can render inside something narrower
   than the viewport (a side panel, a split pane), and a viewport-based breakpoint stays 2-column
   there even once `.nine-box-overview` itself has shrunk below the ~716px (420+280+gap) two-column
   floor, overflowing horizontally instead of stacking. Querying the actual container width keeps
   the stack breakpoint tied to the space this layout really has. */
.nine-box-overview {
  container-type: inline-size;
}

@container (max-width: 760px) {
  .nine-box-layout {
    grid-template-columns: 1fr;
  }
}

.nine-box-chart {
  display: grid;
  grid-template-columns: min-content 1fr;
  grid-template-rows: 1fr min-content;
}

.nine-box-axis {
  padding-block: 3px;
  padding-inline: 10px;
  background-color: var(--neutral-100);
}

.nine-box-axis span {
  font-size: 12px;
  font-weight: 500;
  color: var(--neutral-500);
}

.nine-box-axis--x {
  grid-column: 2;
  grid-row: 2;
  height: min-content;
  max-height: 24px;
  border-radius: 0 4px 4px 4px;
}

.nine-box-axis--y {
  grid-column: 1;
  grid-row: 1;
  writing-mode: vertical-lr;
  transform: rotate(180deg);
  max-width: 24px;
  border-radius: 0 0 4px 4px;
}

.nine-box-grid {
  grid-column: 2;
  grid-row: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 6px;
}
</style>
