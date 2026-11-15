<template>
<CalculumLayout :containerClass="'version-errors-section'" :containerId="'version-errors-header-menu'">
  <template v-slot:slotTop>
    <div class="d-flex align-items-center gap-2 py-2">
      <button class="btn btn-sm btn-outline-secondary" @click="goBack">
        &larr; {{ t('arMatch.progress.back') }}
      </button>
      <h4 class="mb-0">{{ t('arMatch.errorsView.title') }}</h4>
    </div>
  </template>

  <template v-slot:slotContent>
    <NoDataAvailable
      v-if="notFound"
      :title="t('arMatch.progress.notFound')"
    />

    <CalculumLoadingAr v-else-if="loading" modal />

    <div v-else-if="loadError" class="d-flex flex-column align-items-start gap-2 mt-3">
      <NoDataAvailable :title="t('arMatch.progress.loadError')" />
      <CustomButton :text="t('arMatch.progress.retry')" variant="plain" @click="load" />
    </div>

    <div v-else-if="detail && numericVersionId !== undefined" class="mt-3">
      <div class="d-flex gap-4 mb-3">
        <span class="text-muted">
          {{ t('arMatch.summary.errors') }}: <strong>{{ detail.version.errorCount }}</strong>
        </span>
        <span class="text-muted">
          {{ t('arMatch.summary.noMatch') }}: <strong>{{ detail.version.noMatchRowCount }}</strong>
        </span>
      </div>

      <CustomTabs v-model="currentTab" appearance="segmented" :contained="true" :items="tabs" />

      <div class="mt-3">
        <template v-if="currentTab === 'errors'">
          <!-- UC-VAL-03 basic flow: the groups with their counts above, the rows behind every
               group below - same versionId, so a row's own sheet/column/code/severity always
               lines up with a group in the summary above it. -->
          <ErrorGroupsSummary :groups="detail.errorGroups" />
          <ErrorsTab :version-id="numericVersionId" />
        </template>
        <!-- UC-VAL-03 A1: a no-match row is not a malformed row, so it gets its own tab rather
             than being folded into the Errors grid above. -->
        <NoMatchTab v-else :version-id="numericVersionId" />
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script setup lang="ts">
/**
 * UC-VAL-03: an analyst whose file failed to parse sees which rows failed and why, in the
 * application - today the only signal is the notification email. `ErrorsTab.vue` and
 * `NoMatchTab.vue` already exist fully written with no import site anywhere in the app; this
 * view is that site, plus the group summary (`ErrorGroupsSummary.vue`) UC-VAL-03's basic flow
 * step 2 needs and `fetchErrors`/`fetchNoMatches` alone do not provide.
 *
 * Reached from `VersionProgressView` (UC-FE-05a's own screen - UC-FE-05b's alternate flow A1
 * names that use case as this one's precondition), rather than folded into it: the load-token,
 * malformed-route-segment and 404-vs-other-error handling below follow the Customer Card's own
 * pattern (`CustomerCardView.vue`) exactly, and mixing that lifecycle into the status-polling one
 * `VersionProgressView` already runs would couple two screens that fail independently of one
 * another.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalculumLayout,
  CalculumLoadingAr,
  CustomButton,
  CustomTabs,
  NoDataAvailable,
} from '@ada/design-system'
import type { TabItem } from '@ada/design-system'
import { fetchVersionDetail, type VersionDetailResponse } from '../api'
import { HttpError } from '@/api/http'
import { useLoadToken } from '@/composables/useLoadToken'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { parsePositiveRouteId } from '../utils/routeId'
import * as MatchRouting from '../MatchRouting'
import ErrorGroupsSummary from '../components/ErrorGroupsSummary.vue'
import ErrorsTab from '../components/ErrorsTab.vue'
import NoMatchTab from '../components/NoMatchTab.vue'

// props: true on the route maps :versionId directly here as a string, same convention as
// VersionProgressView and CustomerCardView.
const props = defineProps<{ versionId: string }>()
const { t } = useI18n({ useScope: 'global' })

const loading = ref(true)
const notFound = ref(false)
const loadError = ref(false)
const detail = ref<VersionDetailResponse | null>(null)
const currentTab = ref('errors')

const tabs = computed<TabItem[]>(() => [
  { id: 'errors', label: t('arMatch.tabs.errors') },
  { id: 'noMatch', label: t('arMatch.tabs.noMatch') },
])

// Derived from the loaded detail rather than re-parsing `props.versionId` a second time in the
// template - `numericVersionId` can only be defined once `load()` has validated the segment and
// a version actually came back, same reasoning EntityCardView applies to its own derived ids.
const numericVersionId = computed(() => (detail.value ? parsePositiveRouteId(props.versionId) : undefined))

// Guards against a slower response landing after a fresher one - browser back/forward between
// two versions in quick succession fires two overlapping fetches with no ordering guarantee,
// same as every other version/buyer-scoped view in this module.
const { start, isStale } = useLoadToken()
const currenciesStore = useArCurrenciesStore()

async function load(): Promise<void> {
  const token = start()
  loading.value = true
  notFound.value = false
  loadError.value = false
  detail.value = null

  const versionId = parsePositiveRouteId(props.versionId)
  if (versionId === undefined) {
    notFound.value = true
    loading.value = false
    return
  }

  try {
    const result = await fetchVersionDetail(versionId, currenciesStore.currency)
    if (isStale(token)) {
      // A newer load() has started since this one; that request owns the screen now.
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

function goBack(): void {
  MatchRouting.backOrOpenMatch(props.versionId)
}

onMounted(load)
watch(() => props.versionId, load)
</script>
