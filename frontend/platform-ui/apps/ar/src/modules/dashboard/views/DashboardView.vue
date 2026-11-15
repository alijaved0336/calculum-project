<template>
  <CalculumLayout :containerClass="'program-section'" :containerId="'program-header-menu'">
    <template #slotTop>
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 py-2">
        <DisplayText variant="sm" as="h1">{{ company?.name ?? 'Receivables' }}</DisplayText>
        <BodyText variant="sm" v-if="session?.email">{{ session.email }}</BodyText>
      </div>
    </template>

    <template #slotContent>
      <CalculumLoadingAr v-if="loading" :modal="true"/>

      <!--
        Refused, not broken. Checked before the generic error, because a 403 is the one failure
        here that is nobody's fault and that retrying cannot fix: the account is fine, the module
        simply has not been granted for this company.
      -->
      <NoDataAvailable
        v-else-if="forbidden"
        :title="t('arDashboard.forbidden')"
        :message="t('arDashboard.forbiddenHint')"
      />

      <NoDataAvailable
        v-else-if="error"
        :title="t('arDashboard.errorLoad')"
        :message="error"
      />

      <!--
        No company resolved. Distinct from "no files yet", which is what an unconditional fetch
        would have rendered: one is a provisioning problem and the other is an ordinary empty
        account, and they need different next steps.
      -->
      <NoDataAvailable
        v-else-if="!company"
        :title="t('arDashboard.noCompany')"
        :message="t('arDashboard.noCompanyHint')"
      />

      <div v-else class="d-flex flex-column gap-3 mt-3">
        <ContentBox>
          <template #header-title>
            <BodyText variant="md" weight="semibold">{{ t('arDashboard.title') }}</BodyText>
          </template>
          <template #header-controls>
            <CustomButton :text="t('arDashboard.refresh')" variant="plain" @click="load" />
          </template>

          <!--
            Inline, not a toast: this app has no toast host (UC-FE-05a's progress view reports the
            same way), and the outcome of a resync is worth leaving on screen — it is queued work
            whose effect appears on another screen minutes later.
          -->
          <BodyText variant="sm" v-if="resyncError" class="text-danger px-3 pt-2">{{ resyncError }}</BodyText>
          <BodyText variant="sm" v-else-if="resyncNotice" class="text-success px-3 pt-2">{{ resyncNotice }}</BodyText>

          <ContentBoxBody>
            <NoDataAvailable
              v-if="files.length === 0"
              :title="t('arDashboard.empty')"
              :message="t('arDashboard.emptyHint')"
            />

            <Grid
              v-else
              :data-items="sortedRows"
              :columns="columns"
              :sortable="true"
              :resizable="true"
              :sort="sort"
              :row-render="rowRender"
              @sortchange="onSortChange"
              @rowclick="onRowClick"
            >
              <template #status="{ props }">
                <td>
                  <!--
                    @click.stop: the row's own click opens Match, and a badge click must open
                    the progress view INSTEAD of both screens racing each other (UC-FE-05a).
                  -->
                  <button
                    type="button"
                    class="btn btn-link p-0 border-0"
                    :title="t('arMatch.progress.open')"
                    @click.stop="openProgress(props.dataItem.versionId)"
                  >
                    <CustomBadge :text="props.dataItem.statusLabel" :variant="props.dataItem.badge" />
                  </button>
                </td>
              </template>
              <template #period="{ props }">
                <td>
                  <BodyText variant="sm" v-if="props.dataItem.periodStartDate">
                    {{ props.dataItem.periodStartDate }} {{ t('arDashboard.periodTo') }} {{ props.dataItem.periodEndDate }}
                  </BodyText>
                </td>
              </template>
              <template #actions="{ props }">
                <td>
                  <!--
                    @click.stop on both, for the same reason the status badge above needs it: the
                    row's own click opens Match, and neither action must navigate away from the
                    list the user is about to watch.
                  -->
                  <!--
                    Each title sits on a wrapper, not on the button. CustomButton binds its own
                    `title` (for its icon-only mode), and a native title on a DISABLED button is
                    not shown by Chrome at all - which is exactly when the explanation is worth
                    reading, since the disabled state is the thing being explained.
                  -->
                  <div class="d-flex align-items-center gap-2">
                    <span
                      :title="canRecalculate(props.dataItem.status)
                        ? t('arDashboard.recalculateHint')
                        : t('arDashboard.recalculateUnavailable')"
                    >
                      <CustomButton
                        :text="recalculatingVersionId === props.dataItem.versionId
                          ? t('arDashboard.recalculating')
                          : t('arDashboard.recalculate')"
                        variant="plain"
                        :disabled="!canRecalculate(props.dataItem.status) || busy"
                        @click.stop="onRecalculate(props.dataItem)"
                      />
                    </span>
                    <!--
                      Bootstrap 5's own vertical rule (AR compiles full Bootstrap through
                      styles/_app.scss), rather than a border on one of the buttons: `.vr` carries
                      `align-self: stretch`, so it matches the row's height on its own instead of
                      needing a hand-set height that would drift the day a button's padding
                      changes. Purely decorative, so it stays out of the accessibility tree —
                      screen readers get the two buttons and no phantom element between them.
                    -->
                    <div class="vr" aria-hidden="true"></div>
                    <span
                      :title="canResync(props.dataItem)
                        ? t('arDashboard.resyncHint')
                        : t('arDashboard.resyncOnlyReady')"
                    >
                      <CustomButton
                        :text="resyncingVersionId === props.dataItem.versionId
                          ? t('arDashboard.resyncing')
                          : t('arDashboard.resync')"
                        variant="plain"
                        :disabled="!canResync(props.dataItem) || busy"
                        @click.stop="onResync(props.dataItem)"
                      />
                    </span>
                  </div>
                </td>
              </template>
            </Grid>
          </ContentBoxBody>
        </ContentBox>
      </div>
    </template>
  </CalculumLayout>
</template>

<script setup lang="ts">
/**
 * The AR landing page, and the reference for how a view in this app is built:
 * shared components from @ada/design-system rather than hand-rolled Bootstrap markup, the
 * app's http client rather than a local fetch, and the context store for the active company.
 *
 * Built this way so AR inherits AP's look by sharing components, not by copying CSS between
 * apps, which the monorepo rules forbid and which would drift apart immediately.
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSession } from '@ada/auth'
import {
  BodyText,
  CalculumLayout,
  CalculumLoadingAr,
  ContentBox,
  ContentBoxBody,
  CustomBadge,
  CustomButton,
  DisplayText,
  NoDataAvailable,
} from '@ada/design-system'
import { badgeForStatus, canRecalculate, statusLabelKey } from '@/modules/match/utils/versionStatus'
// The same grid AP uses, rather than a hand-rolled table: it brings sorting, column menus and
// resizing that a plain <table> would have to reimplement, and it makes AR's data views behave
// the way the rest of the platform's already do.
import { Grid } from '@progress/kendo-vue-grid'
import type { GridRowClickEvent } from '@progress/kendo-vue-grid'
import { orderBy, type SortDescriptor } from '@progress/kendo-data-query'
import { get, getAllPages, HttpError, SessionExpiredError } from '@/api/http'
import { recalculateVersion, resyncOpportunity } from '@/api'
import { useContextStore } from '@/stores/context'
import { useLoadToken } from '@/composables/useLoadToken'
import * as MatchRouting from '@/modules/match/MatchRouting'

interface CompanyDto {
  id: number
  uuid: string
  name: string
}

interface CompaniesResponse {
  total: number
  companies: CompanyDto[]
}

interface SaleFileVersionSummary {
  id: number
  version: number
  status: string | null
  periodStartDate: string | null
  periodEndDate: string | null
  importedLineCount: number
}

interface SaleFileSummary {
  id: number
  name: string
  versions: SaleFileVersionSummary[]
}

const { t } = useI18n({ useScope: 'global' })
const { session } = useSession()
const context = useContextStore()

const loading = ref(true)
const error = ref('')

/** Held apart from `error` so a permission is never rendered as a fault (UC-ENT-05). */
const forbidden = ref(false)
const company = ref<CompanyDto | null>(null)
const files = ref<SaleFileSummary[]>([])

/** One row per version, flattened, newest file first (the API already orders them). */
const rows = computed(() =>
  files.value.flatMap((file) =>
    file.versions.map((version) => ({
      fileId: file.id,
      versionId: version.id,
      name: file.name,
      version: version.version,
      status: version.status ?? 'unknown',
      // The translated name, so the badge never shows raw wire vocabulary (`reCalculating`)
      // while the progress view one click away calls the same status "Recalculating"; the null
      // fallback is translated too, matching what the progress view shows for the same case.
      statusLabel: version.status
        ? t(statusLabelKey(version.status), version.status)
        : t('arMatch.progress.notAvailable'),
      badge: badgeForStatus(version.status),
      periodStartDate: version.periodStartDate,
      periodEndDate: version.periodEndDate,
      importedLineCount: version.importedLineCount,
    })),
  ),
)

const columns = computed(() => [
  { field: 'name', title: t('arDashboard.table.file') },
  { field: 'version', title: t('arDashboard.table.version'), width: '110px' },
  // Sorts on the label the cell displays: sorting the raw wire value while showing the
  // translation produced an order visibly uncorrelated with the text on screen.
  { field: 'statusLabel', title: t('arDashboard.table.status'), cell: 'status', width: '140px' },
  { field: 'periodStartDate', title: t('arDashboard.table.period'), cell: 'period', width: '230px' },
  { field: 'importedLineCount', title: t('arDashboard.table.imported'), width: '130px', className: 'text-end' },
  // No `field`: the cell renders actions rather than a value, so there is nothing to sort on
  // and a sortable header would offer an order the column cannot produce.
  { title: t('arDashboard.table.actions'), cell: 'actions', width: '260px', sortable: false },
])

// Newest version first by default, which is the row anyone opening this page is looking for.
//
// On `version` rather than `versionId`: the grid renders no `versionId` column, so the default
// sort was one the user could see the effect of and could not clear, and no header click could
// ever restore it. Sorting a visible column keeps the default reachable.
const sort = ref<SortDescriptor[]>([{ field: 'version', dir: 'desc' }])
const sortedRows = computed(() => orderBy(rows.value, sort.value))

function onSortChange(event: { sort: SortDescriptor[] }): void {
  sort.value = event.sort
}

/**
 * Which version's resync is in flight, or null.
 *
 * <p>One at a time across the whole list, deliberately: the outcome is reported in a single notice
 * area below the header, so two overlapping resyncs would race for one slot and the user would see
 * whichever finished last. Every row's button is therefore disabled while any one is working.</p>
 *
 * <p>An id rather than a boolean because the id is what says WHICH row is working — the busy row
 * labels itself, and the rest are merely disabled. A boolean could not tell them apart.</p>
 */
const resyncingVersionId = ref<number | null>(null)
const resyncError = ref('')
const resyncNotice = ref('')

/**
 * Which version's recalculation is in flight, or null. Same shape and same reasoning as
 * <c>resyncingVersionId</c> above, kept SEPARATE from it rather than folded into one "busyRow"
 * because the two labels differ: the working row has to say which of the two things it is doing.
 */
const recalculatingVersionId = ref<number | null>(null)

/**
 * Whether any row is working, on either action.
 *
 * <p>One action at a time across the WHOLE list and across BOTH kinds, which is stricter than
 * disabling each action against its own in-flight id. The reason is the notice area: there is one,
 * under the header, shared by both, so a recalculation and a resync running together would race
 * for that slot and the user would read whichever finished last as the outcome of both.</p>
 */
const busy = computed(() => resyncingVersionId.value !== null || recalculatingVersionId.value !== null)

/**
 * Only a `ready` version can be resynced, and the button says so rather than letting the click
 * earn a 409. Deliberately NOT `canRecalculate()` from versionStatus: that set also admits the two
 * error statuses, because a failed calculation is exactly what you re-run — but a version that
 * never finished calculating has no output to project, which is the server's own reason for
 * refusing. The looser predicate would have been the tempting reuse and the wrong one.
 */
function canResync(row: { status: string }): boolean {
  return row.status === 'ready'
}

/**
 * Recalculation, the action the resync below cannot substitute for: a resync re-projects existing
 * calculation output, while this re-runs the calculation itself. So this is what a user needs after
 * a CALCULATION changes (a new column, a corrected formula), and the resync is what they need after
 * a PROJECTION changes.
 *
 * <p>Offered from more statuses than the resync is, through <c>canRecalculate</c> rather than a
 * predicate of its own: a failed calculation is precisely the thing worth re-running, so the two
 * error statuses are admitted alongside <c>ready</c>. The resync's own comment explains why it
 * cannot reuse that same set.</p>
 */
async function onRecalculate(row: { versionId: number; version: number; status: string }): Promise<void> {
  if (loading.value || busy.value || !canRecalculate(row.status)) {
    return
  }
  recalculatingVersionId.value = row.versionId
  resyncError.value = ''
  resyncNotice.value = ''
  try {
    await recalculateVersion(row.versionId)
    resyncNotice.value = t('arDashboard.recalculateQueued', { version: row.version })
    // RELOADED, unlike the resync: a claim moves the version's status to recalculateClaimed, and
    // that status is a column on this very grid. Leaving the row showing `ready` beside a notice
    // saying the work was queued would put the screen at odds with itself, and the status badge is
    // also the thing the user clicks to follow the run.
    await load()
  } catch (cause) {
    if (cause instanceof SessionExpiredError) {
      // The page is navigating to sign-in; nothing to render.
    } else if (cause instanceof HttpError && cause.status === 409) {
      // The status moved between this list being loaded and the click — another process holds the
      // version. Documented body shape is { error: "..." }; anything else falls back to the
      // generic refusal, and the reload shows where the version actually stands now.
      const detail = cause.jsonBody<{ error?: unknown }>()
      resyncError.value =
        typeof detail?.error === 'string' ? detail.error : t('arDashboard.recalculateRefused')
      await load()
    } else if (cause instanceof HttpError && cause.isForbidden) {
      // Handled, but far less expected than the resync's own 403: recalculation is gated on the
      // same Match policy this list already loaded under, so reaching here means the module was
      // revoked mid-session rather than that the user was always short of a narrower permission.
      resyncError.value = t('arDashboard.recalculateForbidden')
    } else if (cause instanceof HttpError && cause.status === 404) {
      resyncError.value = t('arDashboard.recalculateMissing')
      await load()
    } else if (cause instanceof HttpError) {
      resyncError.value = t('arDashboard.recalculateFailed', { status: cause.status })
    } else {
      resyncError.value = t('arDashboard.recalculateUnreachable')
    }
  } finally {
    recalculatingVersionId.value = null
  }
}

async function onResync(row: { versionId: number; version: number; status: string }): Promise<void> {
  if (loading.value || busy.value || !canResync(row)) {
    return
  }
  resyncingVersionId.value = row.versionId
  resyncError.value = ''
  resyncNotice.value = ''
  try {
    await resyncOpportunity(row.versionId)
    // 202, not 200: the projections are rebuilt by the worker, so there is nothing to refetch
    // here — this list shows the version's calculation status, which a resync does not move. The
    // notice says the work was accepted rather than done, because that is what happened.
    resyncNotice.value = t('arDashboard.resyncQueued', { version: row.version })
  } catch (cause) {
    if (cause instanceof SessionExpiredError) {
      // The page is navigating to sign-in; nothing to render.
    } else if (cause instanceof HttpError && cause.status === 409) {
      // The status moved between this list being loaded and the click. The documented body is
      // { error: "..." }; anything else falls back to the generic refusal, and a reload shows
      // where the version actually stands now.
      const detail = cause.jsonBody<{ error?: unknown }>()
      resyncError.value =
        typeof detail?.error === 'string' ? detail.error : t('arDashboard.resyncRefused')
      await load()
    } else if (cause instanceof HttpError && cause.isForbidden) {
      // A permission, not a fault, and a NARROWER one than the module this screen already checks:
      // the list loads under the receivables module while the resync is gated on the Opportunity
      // policy, so a user can legitimately see these rows and still not be allowed this action.
      // Reported as an entitlement, the same distinction `applyLoadFailure` draws for the screen.
      resyncError.value = t('arDashboard.resyncForbidden')
    } else if (cause instanceof HttpError && cause.status === 404) {
      // Unknown, or another tenant's. Either way the row this was clicked from is not what the
      // server has, so a reload is the honest next step rather than a status code.
      resyncError.value = t('arDashboard.resyncMissing')
      await load()
    } else if (cause instanceof HttpError) {
      resyncError.value = t('arDashboard.resyncFailed', { status: cause.status })
    } else {
      resyncError.value = t('arDashboard.resyncUnreachable')
    }
  } finally {
    resyncingVersionId.value = null
  }
}

function openProgress(versionId: number): void {
  // Same reasoning as onRowClick's guard below: a click during an in-flight reload resolves
  // against rows about to be replaced.
  if (loading.value) {
    return
  }
  MatchRouting.openVersionProgress(versionId)
}

// Every row here has a real version behind it (unlike CompaniesTab's rows, which are inert for
// non-buyers), so every row is clickable - no isBuyer-style predicate needed here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches Kendo's own untyped row-render signature.
function rowRender(h: any, trElement: any, defaultSlots: any, rowProps: any) {
  // trElement.props.class, not rowProps.class: they aren't guaranteed to carry the same value
  // (Kendo's own alternating-row/selected classes live on trElement.props), and the explicit
  // `class: finalClass` below overrides whatever the ...trElement.props spread would otherwise
  // have contributed.
  const finalClass = `${trElement.props.class ?? ''} dashboard-row--clickable`.trim()
  return h('tr', { ...trElement.props, class: finalClass }, defaultSlots)
}

function onRowClick(event: GridRowClickEvent) {
  // A click during an in-flight reload (the refresh button re-runs load() while the grid still
  // shows the previous response) would navigate on a row about to be replaced - the rows the
  // click resolved against and the rows the winning response is about to render can already
  // disagree by the time the click handler runs.
  if (loading.value) {
    return
  }
  const row = event.dataItem as { fileId: number; versionId: number }
  MatchRouting.openMatch(row.fileId, row.versionId)
}

// `load` runs both from `onMounted` and from the refresh button, and nothing stops a user
// clicking refresh while the previous call is still in flight — two overlapping calls race, and
// network timing gives no guarantee the one that started first also resolves first. Without this
// guard, a slower, stale response can land after a fresher one and overwrite `company`/`files`,
// and — worse — call `context.clear()` or `context.setCompany()` on the shared, persisted store
// after a newer response already set it correctly, wiping `companyId` for the whole app on a
// signal that was already stale by the time it arrived.
const { start, isStale } = useLoadToken()

/**
 * Classifies a `load()` failure into the screen state it should produce. Split out of `load`
 * itself so the branching that tells a session expiry, a permission refusal and a generic
 * failure apart does not pile onto the same function that already tracks staleness.
 *
 * A 401 does not reach here as a failure: the http client redirects to the identity provider and
 * rejects with `SessionExpiredError`, which this treats as "nothing to show" rather than an
 * error — returning `true` so `load` leaves the spinner up instead of flashing an error about a
 * page that is already on its way out.
 *
 * A 403 is a different sentence. The caller is signed in and simply has not been granted the
 * receivables module for this company (UC-ENT-05), so reporting "the server answered 403" would
 * be true and useless: it reads as a fault when it is a permission, and what it needs is an
 * administrator rather than a retry.
 */
function applyLoadFailure(cause: unknown): boolean {
  if (cause instanceof SessionExpiredError) {
    return true
  }

  if (cause instanceof HttpError && cause.isForbidden) {
    forbidden.value = true
  } else {
    error.value =
      cause instanceof HttpError
        ? t('arDashboard.errorStatus', { status: cause.status })
        : t('arDashboard.errorUnreachable')
  }
  return false
}

/**
 * The two reads `load()` needs and what to do once they land, pulled out of `load` itself so its
 * own try/catch/finally is not also carrying every branch of what a successful load looks like.
 *
 * Returns nothing meaningful — the staleness and empty-company branches each already did what
 * they need to (returning early, or writing `context.clear()`), so there is no outcome for `load`
 * to act on afterward.
 */
async function fetchCompanyAndFiles(token: number): Promise<void> {
  // A single active company per session, so the catalogue returns exactly one.
  const companies = await get<CompaniesResponse>('/api/companies')
  // A newer `load()` has started since this one; that request owns the screen now.
  if (isStale(token)) {
    return
  }
  company.value = companies.companies[0] ?? null

  if (!company.value) {
    // Stop rather than fetch files anyway. Not for tenancy reasons — the backend scopes every
    // query by the company it resolved from the session, so an extra call could not return
    // another tenant's rows. It is that an empty company list means the session resolved to a
    // company this user cannot see, and fetching files then returns an empty list that renders
    // identically to "you have no files yet". One of those is a provisioning problem and the
    // other is a Tuesday, and the screen should not make them look the same.
    files.value = []

    // The persisted context still points at whatever company resolved last time, possibly for a
    // different user on this browser. Leaving it means the screen says "no company available"
    // while the shared store hands the previous company to anything that asks.
    context.clear()
    return
  }

  files.value = await getAllPages<SaleFileSummary>('/api/sale-files')
  if (isStale(token)) {
    return
  }

  // Published to the shared store only once BOTH reads have succeeded. `/api/companies` is not
  // module-scoped and `/api/sale-files` is, so a caller without the receivables module gets a
  // company from the first call and a 403 from the second. Setting it earlier would leave a
  // company context for a session whose only screen is a refusal, and the next view to read the
  // store would act as though a company had been chosen.
  //
  // It used to say "(the store persists)", and that stopped being true with UC-ENT-19: the store
  // keeps nothing across a reload now, because the session owns which company is active and the
  // picker asks the server. The reason above survives the persistence going away — it was never
  // really about the reload, it was about the store being shared within one.
  context.setCompany(company.value)
}

async function load(): Promise<void> {
  const token = start()

  loading.value = true
  error.value = ''
  forbidden.value = false

  /** Set when the http client has started the sign-in redirect, so `finally` leaves the spinner up. */
  let redirecting = false

  try {
    await fetchCompanyAndFiles(token)
  } catch (cause) {
    // A newer `load()` is already in charge; a stale request's failure is not this screen's error
    // to show.
    if (isStale(token)) {
      return
    }
    redirecting = applyLoadFailure(cause)
  } finally {
    if (!redirecting && !isStale(token)) {
      loading.value = false
    }
  }
}

onMounted(load)
</script>

<style scoped>
.dashboard-row--clickable {
  cursor: pointer;
}
</style>
