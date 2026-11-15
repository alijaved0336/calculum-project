<template>
<CalculumLayout :containerClass="'version-progress-section'" :containerId="'version-progress-header-menu'">
  <template v-slot:slotTop>
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 py-2">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary" @click="goBack">
          &larr; {{ t('arMatch.progress.back') }}
        </button>
        <h4 class="mb-0">{{ t('arMatch.progress.title') }}</h4>
        <CustomBadge v-if="shownStatus" :text="statusLabel(shownStatus.status)" :variant="badgeForStatus(shownStatus.status)" />
      </div>
      <div class="d-flex align-items-center gap-2">
        <!-- UC-VAL-03 / UC-FE-05b A1: parse errors and no-match rows, surfaced in the
             application rather than only emailed. -->
        <CustomButton
          v-if="shownStatus"
          :text="t('arMatch.errorsView.title')"
          variant="plain"
          @click="onViewErrors"
        />
        <CustomButton
          v-if="shownStatus && canRecalculate(shownStatus.status)"
          :text="t('arMatch.progress.recalculate')"
          variant="plain"
          :disabled="recalculating"
          @click="onRecalculate"
        />
      </div>
    </div>
  </template>

  <template v-slot:slotContent>
    <NoDataAvailable
      v-if="invalidId || notFound"
      :title="t('arMatch.progress.notFound')"
    />

    <CalculumLoadingAr v-else-if="loading" />

    <!-- A failure with nothing to show is a full-screen state; with a status already on
         screen it becomes the inline notice inside the panel below, so a transient blip
         mid-poll (or right after an accepted recalculation) never replaces real progress
         with an error page. -->
    <div v-else-if="loadError && !shownStatus" class="d-flex flex-column align-items-start gap-2 mt-3">
      <NoDataAvailable :title="t('arMatch.progress.loadError')" />
      <CustomButton :text="t('arMatch.progress.retry')" variant="plain" @click="reload" />
    </div>

    <div v-else-if="shownStatus" class="mt-3">
      <ContentBox>
        <template #header-title>
          <BodyText variant="md" weight="semibold">
            {{ shownStatus.statusDescription ?? t('arMatch.progress.notStarted') }}
          </BodyText>
        </template>
        <ContentBoxBody>
          <!--
            A native <progress>, not Bootstrap's role="progressbar" div (Sonar S6819: the native
            element carries the semantics on every device). Determinate only when the server
            could decode "[n/total] StepNN Name"; the pipeline's initial "[0/0] (not started)"
            and any free-text status decode to nulls (UC-API-04 degrades rather than 500s), and
            a valueless <progress> is natively indeterminate - honest while the pipeline moves,
            where a 0% bar would read as "stuck at the start". On a RESTING status with no
            decoded counters the bar is omitted entirely, because the only positions available
            (0% or 100%) would each claim something nobody knows.
          -->
          <div v-if="percent !== null || isActiveStatus(shownStatus.status)" class="d-flex align-items-center gap-2">
            <progress
              class="version-progress-bar"
              :aria-label="t('arMatch.progress.title')"
              max="100"
              :value="percent ?? undefined"
            ></progress>
            <BodyText v-if="percent !== null" variant="sm">{{ percent }}%</BodyText>
          </div>

          <BodyText v-if="shownStatus.currentStep !== null && shownStatus.totalSteps !== null" variant="sm" class="d-block mt-2">
            {{ t('arMatch.progress.stepOf', { current: shownStatus.currentStep, total: shownStatus.totalSteps }) }}
          </BodyText>

          <div v-if="shownStatus.isError" class="alert alert-danger mt-3 mb-0" role="alert">
            {{ t('arMatch.progress.failed') }}
          </div>

          <div v-if="loadError" class="alert alert-warning mt-3 mb-0" role="alert">
            {{ t('arMatch.progress.loadError') }}
            <CustomButton :text="t('arMatch.progress.retry')" variant="plain" @click="retry" />
          </div>

          <div v-if="recalculateError" class="alert alert-warning mt-3 mb-0" role="alert">
            {{ recalculateError }}
          </div>

          <dl class="row mb-0 mt-3">
            <dt class="col-6 col-md-3 text-muted">{{ t('arMatch.progress.parsedAt') }}</dt>
            <dd class="col-6 col-md-9">{{ formatTimestamp(shownStatus.parsedAt) }}</dd>
            <dt class="col-6 col-md-3 text-muted">{{ t('arMatch.progress.lastRecalculated') }}</dt>
            <dd class="col-6 col-md-9">{{ formatTimestamp(shownStatus.dateLastRecalculated) }}</dd>
          </dl>
        </ContentBoxBody>
      </ContentBox>
    </div>
  </template>
</CalculumLayout>
</template>

<script setup lang="ts">
/**
 * UC-FE-05a - watch a version being processed. Polls UC-API-04's status endpoint through
 * `useVersionStatusPoll` and renders the pipeline's own `[n/total] StepNN Name` text as
 * progress; A1 surfaces a failure with a recalculate action exactly where the status machine
 * admits one (`processed` deliberately shows none).
 *
 * While the 50 step bodies are stubs, live progress jumps from 0 to done in one poll. That is
 * the pipeline's shape, not this view's defect (the use case says so in as many words); the
 * unit tests drive the intermediate states from mock timing instead.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BodyText,
  CalculumLayout,
  CalculumLoadingAr,
  ContentBox,
  ContentBoxBody,
  CustomBadge,
  CustomButton,
  NoDataAvailable,
} from '@ada/design-system'
import { recalculateVersion } from '@/api'
import { HttpError, SessionExpiredError } from '@/api/http'
import { useVersionStatusPoll } from '@/composables/useVersionStatusPoll'
import { badgeForStatus, canRecalculate, isActiveStatus, statusLabelKey } from '../utils/versionStatus'
import { formatDateTime } from '../utils/format'
import { parsePositiveRouteId } from '../utils/routeId'
import * as MatchRouting from '../MatchRouting'

// props: true on the route maps :versionId directly here as a string.
const props = defineProps<{ versionId: string }>()
const { t } = useI18n({ useScope: 'global' })

const { status, loading, notFound, loadError, start, refresh, stop } = useVersionStatusPoll()

const recalculating = ref(false)
const recalculateError = ref('')

/**
 * A malformed route segment must not reach the API as /sale-file-versions/NaN/status - same
 * guard CustomerCardView applies to its own route-derived ids. Rendered as not-found by the
 * view itself (`invalidId`), never written into the poller's state: the composable keeps a
 * single writer for `notFound`/`loading`.
 */
const parsedVersionId = computed(() => parsePositiveRouteId(props.versionId))
const invalidId = computed(() => parsedVersionId.value === undefined)

/**
 * What the template renders. Distinct from the poller's own `status` for two shapes where the
 * ref still holds the last good payload: an in-place URL edit to a malformed id (reload stops
 * the poller without starting a new fetch), and a 404 arriving MID-POLL (the version deleted or
 * access revoked - the poller flags notFound but keeps the stale payload). Either way the
 * previous version's badge and recalculate button must not sit in the header above a
 * "not found" body, POSTing against a version the API just said is gone.
 */
const shownStatus = computed(() => (invalidId.value || notFound.value ? null : status.value))

/** Whole percent when the server decoded the step counters; null means undecodable. */
const percent = computed(() => {
  const current = shownStatus.value?.currentStep ?? null
  const total = shownStatus.value?.totalSteps ?? null
  if (current === null || total === null || total <= 0) {
    return null
  }
  return Math.min(100, Math.round((current / total) * 100))
})

const statusLabel = (value: string | null): string =>
  value ? t(statusLabelKey(value), value) : t('arMatch.progress.notAvailable')

/** The shared renderer, with this screen's translated fallback rather than format.ts's dash. */
const formatTimestamp = (value: string | null): string =>
  value ? formatDateTime(value) : t('arMatch.progress.notAvailable')

function reload(): void {
  recalculateError.value = ''
  const versionId = parsedVersionId.value
  if (versionId === undefined) {
    stop()
    return
  }
  start(versionId)
}

/** The inline notice's retry: one refetch that keeps the panel, unlike `reload`'s full reset. */
function retry(): void {
  const versionId = parsedVersionId.value
  if (versionId !== undefined) {
    void refresh(versionId)
  }
}

async function onRecalculate(): Promise<void> {
  const versionId = parsedVersionId.value
  if (versionId === undefined || recalculating.value) {
    return
  }
  recalculating.value = true
  recalculateError.value = ''
  try {
    await recalculateVersion(versionId)
    // 202: the version is claimed and moving again - one silent refetch re-enters the polling
    // chain without blanking the screen back to its first-load spinner. AWAITED, so the button
    // stays disabled until the refreshed status lands: released on the 202 alone, the header
    // still showed the previous recalculatable status for a beat, and a second click double-
    // claimed against the version.
    await refresh(versionId)
  } catch (cause) {
    if (cause instanceof SessionExpiredError) {
      // The page is navigating to sign-in; nothing to render.
    } else if (cause instanceof HttpError && cause.status === 409) {
      // The status moved between the last poll and this request. The body's documented shape is
      // { error: "..." }; anything else falls back to the generic refusal, and a refetch shows
      // where the version actually stands now.
      const detail = cause.jsonBody<{ error?: unknown }>()
      recalculateError.value =
        typeof detail?.error === 'string' ? detail.error : t('arMatch.progress.recalculateRefused')
      await refresh(versionId)
    } else if (cause instanceof HttpError) {
      recalculateError.value = t('arMatch.progress.recalculateFailed', { status: cause.status })
    } else {
      // A network-level rejection (fetch's TypeError) is neither an HttpError nor a redirect;
      // without this branch the button just blinked disabled and re-enabled with no feedback.
      recalculateError.value = t('arMatch.progress.recalculateUnreachable')
    }
  } finally {
    recalculating.value = false
  }
}

const goBack = (): void => MatchRouting.backOrOpenMatch(props.versionId)

function onViewErrors(): void {
  const versionId = parsedVersionId.value
  if (versionId !== undefined) {
    MatchRouting.openVersionErrors(versionId)
  }
}

onMounted(reload)
watch(() => props.versionId, reload)
onUnmounted(stop)
</script>

<style scoped>
.version-progress-bar {
  flex: 1 1 auto;
  height: 0.9rem;
  accent-color: var(--bs-primary, #0d6efd);
}
</style>
