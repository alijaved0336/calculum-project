<template>
<div class="match-settings">
  <div v-if="!context.hasCompany" class="text-gray-500">Select a company to review its settings.</div>
  <div v-else-if="loading" class="text-gray-500">Loading…</div>
  <div v-else>
    <div v-if="error" class="alert alert-danger" role="alert">
      <p class="mb-1">{{ error }}</p>
    </div>
    <p class="text-base text-gray-600 mb-3">
      Changing these settings only affects file versions parsed after the change — a version
      already parsed keeps whatever settings were live when it parsed.
    </p>
    <div class="row align-items-center mb-3">
      <label class="col-auto text-gray-600" for="ocr-confidence-threshold">OCR confidence threshold</label>
      <div class="col-auto d-flex align-items-center gap-2">
        <input
          id="ocr-confidence-threshold"
          type="number"
          class="form-control"
          min="0"
          max="100"
          v-model.number="ocrConfidenceThresholdPercent"
          @input="percentEdited = true"
        />
        <span class="text-gray-500">%</span>
      </div>
    </div>
    <div class="row align-items-center mb-3">
      <div class="col-auto">
        <ToggleSwitch v-model="autoMatch" />
      </div>
      <div class="col-auto text-gray-600">Auto-match</div>
    </div>
    <div class="col-12 d-flex justify-content-end">
      <button class="btn btn-primary font-md" type="button" :disabled="saving || !loaded" @click="onSave">Save</button>
    </div>
  </div>
</div>
</template>

<script lang="ts">
/**
 * UC-SET-04: OCR/matching settings, Super Admin's own Setup section (see matchSettings.ts for why
 * `MatchSettingsDto`'s two fields are this screen's own reasonable choice, not a confirmed spec).
 *
 * `ocrConfidenceThresholdPercent` is a local, view-only ref: the DTO carries a 0–1 fraction (the
 * backend fixture's own literal shape), shown here as a 0–100 whole number because a percentage
 * input reading "0.9" would read as ninety hundredths of a percent to anyone not already reading
 * the source. Converted back to a fraction on save only if the user actually edited it (see
 * `percentEdited`) - otherwise the untouched, full-precision `ocrConfidenceThreshold` is sent as-is.
 */
import { defineComponent, onMounted, ref, watch } from 'vue'
import { ToggleSwitch } from '@ada/design-system'
import { useContextStore } from '@/stores/context'
import { HttpError } from '@/api/http'
import { fetchMatchSettings, saveMatchSettings, type MatchSettingsDto } from '../api/matchSettings'

const DEFAULT_SETTINGS: MatchSettingsDto = { ocrConfidenceThreshold: 0.9, autoMatch: true }

function toPercent(fraction: number): number {
  return Math.round(fraction * 100)
}

function toFraction(percent: number): number {
  return percent / 100
}

/** Rejects anything `v-model.number` can hand back besides a genuine 0-100 number — including the
 * raw string `.number` leaves behind when the field is cleared (see thread 129832). */
function isValidPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

export default defineComponent({
  name: 'SetupMatchSettings',
  components: { ToggleSwitch },
  setup() {
    const context = useContextStore()
    // Source of truth, at full stored precision. `ocrConfidenceThresholdPercent` is only its
    // rounded, editable display - see `percentEdited` below for why the two can diverge.
    const ocrConfidenceThreshold = ref(DEFAULT_SETTINGS.ocrConfidenceThreshold)
    const ocrConfidenceThresholdPercent = ref(toPercent(DEFAULT_SETTINGS.ocrConfidenceThreshold))
    // True once the user has actually typed in the percent field since the last load/save. Unset,
    // `onSave` sends the untouched `ocrConfidenceThreshold` fraction as-is instead of round-tripping
    // it through the rounded percent display, so saving only the `autoMatch` toggle can't silently
    // rewrite a stored value like 0.755 down to 0.76.
    const percentEdited = ref(false)
    const autoMatch = ref(DEFAULT_SETTINGS.autoMatch)
    const loading = ref(true)
    const saving = ref(false)
    const error = ref<string | null>(null)
    // True only once a fetch has actually populated these fields for the current company: saving
    // before that would overwrite the stored settings with these defaults.
    const loaded = ref(false)

    function applySettings(settings: MatchSettingsDto | null): void {
      const effective = settings ?? DEFAULT_SETTINGS
      ocrConfidenceThreshold.value = effective.ocrConfidenceThreshold
      ocrConfidenceThresholdPercent.value = toPercent(effective.ocrConfidenceThreshold)
      percentEdited.value = false
      autoMatch.value = effective.autoMatch
    }

    async function load(): Promise<void> {
      const companyUuid = context.companyUuid

      if (!companyUuid) {
        applySettings(null)
        loading.value = false
        loaded.value = true
        return
      }

      loading.value = true
      loaded.value = false
      error.value = null

      // Same race guard as SetupCashFlowImpactLimits: only the still-relevant
      // call is allowed to touch state once it resolves.
      const isCurrent = () => context.companyUuid === companyUuid

      try {
        const response = await fetchMatchSettings(companyUuid)

        if (!isCurrent()) {
          return
        }

        applySettings(response.settings)
        loading.value = false
        loaded.value = true
      } catch {
        if (!isCurrent()) {
          return
        }

        error.value = 'The settings could not be loaded. Try again.'
        loading.value = false
      }
    }

    async function onSave(): Promise<void> {
      const companyUuid = context.companyUuid

      if (!companyUuid || !loaded.value) {
        return
      }

      error.value = null

      let nextThreshold = ocrConfidenceThreshold.value

      if (percentEdited.value) {
        if (!isValidPercent(ocrConfidenceThresholdPercent.value)) {
          error.value = 'Enter a whole number between 0 and 100 for the OCR confidence threshold.'
          return
        }

        nextThreshold = toFraction(ocrConfidenceThresholdPercent.value)
      }

      saving.value = true

      // Same guard as `load()`'s `isCurrent()`: the company can change while this PUT is in
      // flight, and this call must not apply its result on top of the newly loaded tenant's state.
      const isCurrent = () => context.companyUuid === companyUuid

      try {
        const response = await saveMatchSettings(companyUuid, {
          ocrConfidenceThreshold: nextThreshold,
          autoMatch: autoMatch.value,
        })

        if (!isCurrent()) {
          return
        }

        applySettings(response.settings)
      } catch (saveError) {
        if (!isCurrent()) {
          return
        }

        if (saveError instanceof HttpError && saveError.status === 400) {
          error.value = saveError.jsonBody<{ errors?: string[] }>()?.errors?.[0] ?? 'The settings could not be saved.'
        } else if (saveError instanceof HttpError && saveError.status === 409) {
          // load() clears `error` at its own start (and again on success), so the notice has to
          // be set AFTER it settles, not before - otherwise load()'s own reset wipes it before
          // the user ever sees it.
          await load()
          error.value = 'Someone else just saved these settings. Reloading the latest values.'
        } else {
          error.value = 'The settings could not be saved. Try again.'
        }
      } finally {
        saving.value = false
      }
    }

    watch(() => context.companyUuid, load)
    onMounted(load)

    return {
      context,
      ocrConfidenceThresholdPercent,
      percentEdited,
      autoMatch,
      loading,
      saving,
      error,
      loaded,
      onSave,
    }
  },
})
</script>
