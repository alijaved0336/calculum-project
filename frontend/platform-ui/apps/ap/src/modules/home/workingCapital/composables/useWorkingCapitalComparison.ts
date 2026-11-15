import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useWorkingCapitalStore } from '@/stores/workingCapital'
import useSpendFile from '@/composables/useSpendFile'
import type { WCVersion, WCVersionsApiResponse, WorkingCapitalCompareApiResponse, WorkingCapitalComparisonResult } from '../types'
import { fetchWorkingCapitalVersions, fetchWorkingCapitalComparison } from '../api'
import { mapApiResponseToResult } from '../utils/mapper'

export function useWorkingCapitalComparison() {
  const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' })
  const toast = useToast()
  const globalFiltersStore = useGlobalFiltersStore()
  const wcStore = useWorkingCapitalStore()
  const { spendFileVersionActiveId, spendFileVersionActive } = useSpendFile()

  const readyVersions = ref<WCVersion[]>([])
  const fromVersion   = ref<WCVersion | null>(null)

  // "to" version: the platform-level active spend file version itself, built
  // directly from useSpendFile() — NOT looked up inside readyVersions. The
  // backend's /working-capital/versions deliberately excludes the active
  // version from that list (you don't compare a file against itself), so a
  // find()-based lookup here could never match and always fell through to an
  // arbitrary "first eligible other version" instead of the true active file
  // (a real bug: wrong file/date in the "Active Spend File" chip, and
  // fromVersionOptions filtering against the wrong finalDate).
  const toVersion = computed<WCVersion | null>(() => {
    const active = spendFileVersionActive.value
    const activeId = spendFileVersionActiveId.value
    // Guard on the id too, not just finalDate: an empty/undefined id here would
    // build a WCVersion with no uuid, which fromVersionOptions' `v.uuid !==
    // toVersion.value?.uuid` exclusion can't match against — letting the active
    // version leak into its own candidate list — and would key wcStore's
    // per-version minDays storage on '' instead of the real active version.
    if (!active?.finalDate || !activeId) return null
    return {
      uuid: activeId,
      version: active.version,
      name: active.name,
      initialDate: active.initialDate,
      finalDate: active.finalDate,
      year: active.initialDate?.slice(0, 4) ?? '',
    }
  })

  // Versions from any earlier spend file — valid "from" baselines. Eligibility is
  // finalDate-based, not version-number-based: version numbers are only comparable
  // within the same named spend file, never across different files.
  const fromVersionOptions = computed(() => {
    const activeFinalDate = toVersion.value?.finalDate
    if (!activeFinalDate) return []
    return readyVersions.value.filter(v =>
      v.uuid !== toVersion.value?.uuid &&
      new Date(v.finalDate).getTime() < new Date(activeFinalDate).getTime()
    )
  })

  const platformMinDays = ref(5)
  const minDays         = ref(5)
  const comparisonResult = ref<WorkingCapitalComparisonResult | null>(null)
  const isLoading       = ref(false)
  const hasError        = ref(false)

  async function runComparison() {
    if (globalFiltersStore.getDisableWatchers) return
    if (!fromVersion.value) return

    isLoading.value = true
    hasError.value  = false

    const response = await fetchWorkingCapitalComparison(fromVersion.value.uuid, minDays.value, toVersion.value?.uuid)
    isLoading.value = false

    if (response.success) {
      const data = response.data as WorkingCapitalCompareApiResponse
      minDays.value          = data.minDays
      wcStore.setMinDays(toVersion.value?.uuid ?? '', data.minDays)
      comparisonResult.value = mapApiResponseToResult(data)
      return
    }

    // Story 3 bug fix: the backend returns the actual, already user-facing
    // message under `error` (e.g. "The comparison base must end before the
    // active spend file version..."), not a stable code — there's no
    // 'LATER_END_DATE_REJECTED' constant to match against. Show it as-is.
    if (response.data?.error) {
      toast.error(response.data.error)
    }
    hasError.value = true
  }

  function selectFromVersion(version: WCVersion) {
    const previous = fromVersion.value
    fromVersion.value = version
    if (globalFiltersStore.getDisableWatchers) return
    runComparison().then(() => {
      if (hasError.value) fromVersion.value = previous
    })
  }

  async function updateMinDays(days: number) {
    if (days < 1) return
    if (!fromVersion.value) return
    const previous = minDays.value
    minDays.value   = days

    isLoading.value = true
    const response  = await fetchWorkingCapitalComparison(fromVersion.value.uuid, days, toVersion.value?.uuid)
    isLoading.value = false

    if (!response.success) {
      minDays.value = previous
      toast.error(t('home.workingCapital.error.saveFailed'))
      return
    }

    const data             = response.data as WorkingCapitalCompareApiResponse
    minDays.value          = data.minDays
    wcStore.setMinDays(toVersion.value?.uuid ?? '', data.minDays)
    comparisonResult.value = mapApiResponseToResult(data)
  }

  function incrementMinDays() { updateMinDays(minDays.value + 1) }
  function decrementMinDays()  {
    if (minDays.value <= 1) return
    updateMinDays(minDays.value - 1)
  }

  // Loads the eligible comparison candidates and (re)runs the comparison. Used both
  // for the initial mount and as a live-refresh when the platform-level active spend
  // file changes while the user stays on this tab (see the recovery watcher below) —
  // without this, `toVersion` (reactive) would show the new file while
  // `comparisonResult` kept showing the old one.
  async function loadVersionsAndCompare() {
    if (globalFiltersStore.getDisableWatchers) return
    if (isLoading.value) return // guard against overlapping refreshes

    isLoading.value = true
    hasError.value  = false

    const versionsResponse = await fetchWorkingCapitalVersions()
    if (!versionsResponse.success) {
      isLoading.value = false
      hasError.value  = true
      return
    }

    const versionsData    = versionsResponse.data as WCVersionsApiResponse
    readyVersions.value   = versionsData.versions ?? []
    platformMinDays.value = versionsData.minDays ?? 5

    if (fromVersionOptions.value.length === 0) {
      fromVersion.value      = null
      comparisonResult.value = null
      isLoading.value        = false
      return
    }

    // Keep the user's chosen baseline if it's still a valid candidate after the
    // refresh, instead of silently resetting their selection.
    const stillEligible = fromVersion.value
      ? fromVersionOptions.value.find(v => v.uuid === fromVersion.value!.uuid)
      : undefined
    fromVersion.value = stillEligible ?? fromVersionOptions.value[0]
    minDays.value = wcStore.getMinDays(toVersion.value?.uuid ?? '') ?? platformMinDays.value
    await runComparison() // sets/clears isLoading and hasError itself on this path
  }

  onMounted(loadVersionsAndCompare)

  // Recovery watcher: a platform-level company/spend-file switch sets
  // getDisableWatchers=true for its async duration and false once it fully
  // completes (see docs/context/race-condition-company-change.md). Refreshing on
  // that true→false transition — rather than watching spendFileVersionActiveId
  // directly — matches the pattern already used elsewhere in the app and avoids a
  // double-fetch, since the id itself always changes while the guard is still up.
  watch(() => globalFiltersStore.getDisableWatchers, (isDisabled, wasDisabled) => {
    if (wasDisabled && !isDisabled) loadVersionsAndCompare()
  })

  return {
    readyVersions,
    fromVersionOptions,
    toVersion,
    fromVersion,
    minDays,
    comparisonResult,
    isLoading,
    hasError,
    runComparison,
    selectFromVersion,
    incrementMinDays,
    decrementMinDays,
  }
}
