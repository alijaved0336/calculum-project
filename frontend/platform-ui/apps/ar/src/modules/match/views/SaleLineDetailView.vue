<template>
<CalculumLayout :containerClass="'customer-card-section'" :containerId="'sale-line-detail-header-menu'">
  <template v-slot:slotTop>
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 py-2">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary" @click="goBack">
          &larr; {{ $t('arSaleLine.back') }}
        </button>
        <h4 class="mb-0">{{ $t('arSaleLine.title') }}</h4>
      </div>
    </div>
  </template>

  <template v-slot:slotContent>
    <CalculumLoadingAr v-if="loading" modal />

    <NoDataAvailable
      v-else-if="notFound"
      :title="$t('arSaleLine.notFound')"
    />

    <NoDataAvailable
      v-else-if="loadError"
      :title="$t('arSaleLine.loadError')"
    />

    <div v-else-if="detail" class="row g-3">
      <div v-for="group in fieldGroups" :key="group.titleKey" class="col-12 col-xl-6">
        <ContentBox>
          <template v-slot:header-title>
            <h5 class="mb-0">{{ $t(group.titleKey) }}</h5>
          </template>
          <ContentBoxBody>
            <dl class="row mb-0">
              <template v-for="row in group.rows" :key="row.key">
                <dt class="col-6 text-muted">{{ row.label }}</dt>
                <dd class="col-6 text-end">{{ row.value }}</dd>
              </template>
            </dl>
          </ContentBoxBody>
        </ContentBox>
      </div>

      <div class="col-12 col-xl-6">
        <ContentBox>
          <template v-slot:header-title>
            <h5 class="mb-0">{{ $t('arSaleLine.sections.customAttributes') }}</h5>
          </template>
          <ContentBoxBody>
            <NoDataAvailable
              v-if="customAttributeRows.length === 0"
              :title="$t('arSaleLine.customAttributesEmpty')"
            />
            <dl v-else class="row mb-0">
              <template v-for="row in customAttributeRows" :key="row.key">
                <dt class="col-6 text-muted">{{ row.label }}</dt>
                <dd class="col-6 text-end">{{ row.value }}</dd>
              </template>
            </dl>
          </ContentBoxBody>
        </ContentBox>
      </div>

      <div class="col-12">
        <ContentBox>
          <template v-slot:header-title>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <h5 class="mb-0">{{ $t('arSaleLine.strategyResults.title') }}</h5>
              <CustomBadge variant="warning" :text="$t('arSaleLine.strategyResults.provisional')" />
            </div>
          </template>
          <ContentBoxBody>
            <p class="text-muted mb-3">{{ $t('arSaleLine.strategyResults.description') }}</p>

            <!--
              This can only say "no row exists", never "the chain hasn't run" vs. "it ran and
              nothing applied": the Customer Card can tell those apart because its
              strategyBreakdown is null before the chain runs and an empty array after it runs
              with no result, but this line-grain read carries no such null-vs-empty signal - an
              empty array here means either. Claiming one specific cause (e.g. "no strategy
              applied") would contradict the card on an unrun version and send an engineer at the
              wrong system, so the notice states only what an empty list proves and points back at
              the card, which does know.
            -->
            <NoDataAvailable
              v-if="strategyRows.length === 0"
              :title="$t('arSaleLine.strategyResults.empty')"
            />

            <div v-else>
              <div
                v-for="row in strategyRows"
                :key="row.key"
                class="strategy-results-row pb-3 mb-3 border-bottom"
              >
                <div class="d-flex align-items-center gap-2 mb-2">
                  <CustomBadge
                    v-if="row.isWinner"
                    variant="success"
                    :text="$t('arCustomerCard.strategyResults.winner')"
                  />
                  <h6 class="mb-0">{{ row.displayName }}</h6>
                </div>

                <dl class="row mb-0">
                  <dt class="col-6 text-muted">{{ $t('arSaleLine.strategyResults.proposedTerm') }}</dt>
                  <dd class="col-6 text-end">
                    <!-- Same rule as the party-grain panel: a null term is the strategy declining
                         to apply, not a zero-day term - its applicabilityReason goes where the
                         term would be. -->
                    <span v-if="row.proposedTerm !== null">{{ formatDays(row.proposedTerm, $t) }}</span>
                    <span v-else>{{ row.applicabilityReason ?? notAvailable }}</span>
                  </dd>

                  <dt class="col-6 text-muted">{{ $t('arSaleLine.strategyResults.selectionOutcome') }}</dt>
                  <dd class="col-6 text-end">
                    <span v-if="row.selectionOutcome !== null">{{ formatSelectionOutcome(row.selectionOutcome, $t) }}</span>
                    <span v-else>{{ notAvailable }}</span>
                  </dd>

                  <template v-for="input in row.inputRows" :key="input.key">
                    <dt class="col-6 text-muted">{{ input.label }}</dt>
                    <dd class="col-6 text-end">{{ input.value }}</dd>
                  </template>
                </dl>
              </div>
            </div>
          </ContentBoxBody>
        </ContentBox>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script setup lang="ts">
/**
 * UC-UI-13's deepest provisional surface: one buyer's own sale line, everything it carries, and
 * what each strategy produced for it. Reached only from `BuyerLinesGrid`'s row click today, but
 * kept a route rather than a modal on purpose - see MatchRoutes.ts's own comment on why a
 * verification screen has to be linkable.
 *
 * Follows `CustomerCardView`'s load pattern exactly (`useLoadToken` against overlapping
 * requests, a malformed route segment treated as not-found before any request is made, 404 as
 * "not found", anything else as the load error) - three ids to parse instead of two, otherwise
 * unchanged.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalculumLayout,
  CalculumLoadingAr,
  ContentBox,
  ContentBoxBody,
  CustomBadge,
  NoDataAvailable,
} from '@ada/design-system'
import { fetchBuyerLine, type SaleLineDetailResponse } from '@/api'
import { HttpError } from '@/api/http'
import { useLoadToken } from '@/composables/useLoadToken'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { formatDays } from '@/modules/entityCard/components/opportunity/format'
import { deriveStrategyRows } from '@/modules/entityCard/components/opportunity/strategyRows'
import { parsePositiveRouteId } from '../utils/routeId'
import * as MatchRouting from '../MatchRouting'
import { deriveStrategyResultRow, formatSelectionOutcome } from '@/modules/buyers/components/customerCard/strategyInputs'
import {
  deriveCustomAttributeRows,
  deriveSaleLineFieldRows,
  SALE_LINE_FIELD_GROUPS,
} from '@/modules/buyers/components/customerCard/saleLineFields'

// props: true on the route maps :versionId/:buyerId/:lineId directly here as strings.
const props = defineProps<{ versionId: string; buyerId: string; lineId: string }>()
const { t } = useI18n({ useScope: 'global' })

const loading = ref(true)
const notFound = ref(false)
const loadError = ref(false)
const detail = ref<SaleLineDetailResponse | null>(null)

const notAvailable = computed(() => t('arSaleLine.notAvailable'))

// Same overlapping-request guard CustomerCardView applies: a route edited in place while a
// slower request is still in flight must not let that stale response land after a fresher one.
const { start, isStale } = useLoadToken()
const currenciesStore = useArCurrenciesStore()

async function load() {
  const token = start()
  loading.value = true
  notFound.value = false
  loadError.value = false
  detail.value = null

  // A malformed segment on any of the three ids (Number('abc') is NaN) must not reach the API as
  // /lines/NaN - same guard CustomerCardView and VersionProgressView apply to their own
  // route-derived ids.
  const versionId = parsePositiveRouteId(props.versionId)
  const buyerId = parsePositiveRouteId(props.buyerId)
  const lineId = parsePositiveRouteId(props.lineId)
  if (versionId === undefined || buyerId === undefined || lineId === undefined) {
    notFound.value = true
    loading.value = false
    return
  }

  try {
    const result = await fetchBuyerLine(versionId, buyerId, lineId, currenciesStore.currency)
    if (isStale(token)) {
      return
    }
    detail.value = result
  } catch (error) {
    if (isStale(token)) {
      return
    }
    if (error instanceof HttpError && error.status === 404) {
      notFound.value = true
    } else {
      loadError.value = true
    }
  } finally {
    if (!isStale(token)) {
      loading.value = false
    }
  }
}

function goBack() {
  // The Customer Card this line belongs to, not browser history: a shared link to this line has
  // no prior in-app entry to go back to, and the one place this line always belongs is its
  // buyer's card.
  const versionId = parsePositiveRouteId(props.versionId)
  const buyerId = parsePositiveRouteId(props.buyerId)
  if (versionId === undefined || buyerId === undefined) {
    MatchRouting.openMatch()
    return
  }
  MatchRouting.openCustomerCard(versionId, buyerId)
}

const fieldGroups = computed(() => {
  if (!detail.value) return []
  const line = detail.value.line
  return SALE_LINE_FIELD_GROUPS.map((group) => ({
    titleKey: group.titleKey,
    rows: deriveSaleLineFieldRows(line, group.fields, t, currenciesStore.selectedCurrencySymbol),
  }))
})

const customAttributeRows = computed(() => {
  if (!detail.value) return []
  return deriveCustomAttributeRows(detail.value.line.customAttributes, t)
})

interface DisplayStrategyRow {
  /** The raw backend identifier. Doubles as the `:key` binding, but it IS also what renders as
   * the card heading (`displayName` is this value verbatim - see `deriveStrategyResultRow`'s own
   * comment for why). Global Constraint 2 forbids the front end branching on which strategy this
   * is, not displaying its name - this screen exists so an engineer can paste the identifier
   * straight into a query, which is exactly what showing it verbatim is for. */
  key: string
  isWinner: boolean
  displayName: string
  proposedTerm: number | null
  applicabilityReason: string | null
  selectionOutcome: string | null
  inputRows: ReturnType<typeof deriveStrategyResultRow>['inputRows']
}

const strategyRows = computed<DisplayStrategyRow[]>(() => {
  if (!detail.value) return []
  const results = detail.value.strategyResults
  // The same winner rule StrategyResultsPanel uses one grain up, reused rather than
  // reimplemented: winningStrategy null means every row lost (the calculation has not reached
  // this line, or no strategy applied), never guessed from whichever row happens to carry a
  // term. deriveStrategyRows walks `results` in the same order, so zipping by index cannot
  // mismatch a row with the wrong flag. It compares against each row's own `strategy` id, not
  // `displayName` - the two are equal today only because the display name is left verbatim, and
  // that is a separate ruling that could change.
  const winnerFlags = deriveStrategyRows(results, detail.value.line.winningStrategy)
  return results.map((result, index) => ({
    key: result.strategy,
    isWinner: winnerFlags[index].isWinner,
    ...deriveStrategyResultRow(result),
  }))
})

onMounted(load)
watch([() => props.versionId, () => props.buyerId, () => props.lineId], load)
</script>
