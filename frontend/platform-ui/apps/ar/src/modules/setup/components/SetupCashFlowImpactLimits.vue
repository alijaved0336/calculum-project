<template>
<div class="cfi-limits">
  <div v-if="!context.hasCompany" class="text-gray-500">Select a company to review its thresholds.</div>
  <div v-else-if="loading" class="text-gray-500">Loading…</div>
  <div v-else>
    <div v-if="errors.length" class="alert alert-danger" role="alert">
      <p class="mb-1" v-for="(error, index) in errors" :key="index">{{ error }}</p>
    </div>
    <div class="row cfi-row cfi-header text-gray-500">
      <div class="col-3">Tier</div>
      <div class="col-3">From</div>
      <div class="col-3">To</div>
      <div class="col-3"></div>
    </div>
    <div class="row cfi-row align-items-center" v-for="row in rows" :key="row.tier">
      <div class="col-3">{{ row.tier }}</div>
      <div class="col-3">
        <input
          type="number"
          class="form-control"
          v-model.number="row.fromAmount"
          :aria-label="`${row.tier} tier, from amount`"
        />
      </div>
      <div class="col-3">
        <input
          v-if="row.tier !== 'High'"
          type="number"
          class="form-control"
          v-model.number="row.toAmount"
          :aria-label="`${row.tier} tier, to amount`"
        />
        <span v-else class="text-gray-500">and above</span>
      </div>
      <div class="col-3">
        <CustomBadge
          :text="row.isDefault ? 'Default' : 'Override'"
          :variant="row.isDefault ? 'info' : 'success'"
        />
      </div>
    </div>
    <div class="col-12 d-flex justify-content-end mt-4">
      <button class="btn btn-primary font-md" type="button" :disabled="saving" @click="onSave">Save</button>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from 'vue'
import { CustomBadge } from '@ada/design-system'
import { useContextStore } from '@/stores/context'
import { HttpError } from '@/api/http'
import {
  fetchCashFlowImpactLimits,
  saveCashFlowImpactLimits,
  type CashFlowImpactLimitDto,
  type CashFlowImpactTier,
} from '../api/cashFlowImpactLimits'

const TIERS: CashFlowImpactTier[] = ['Low', 'Medium', 'High']

interface Row {
  tier: CashFlowImpactTier
  fromAmount: number | null
  toAmount: number | null
  isDefault: boolean
}

function defaultRows(): Row[] {
  return TIERS.map((tier) => ({ tier, fromAmount: null, toAmount: null, isDefault: true }))
}

/**
 * Vue's `v-model.number` only casts a genuinely numeric input; a field the admin cleared to
 * empty comes back as `''`, which JSON.stringify would otherwise send as a string where the API
 * expects a decimal or null. Treated as "not entered" rather than forwarded as-is.
 */
function toNumber(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseValidationErrors(error: HttpError): string[] {
  // The tolerate-garbage half lives on HttpError.jsonBody; only the { errors: [] } shape pick
  // stays here.
  const parsed = error.jsonBody<{ errors?: string[] }>()
  return parsed?.errors && parsed.errors.length > 0
    ? parsed.errors
    : ['The thresholds could not be saved.']
}

export default defineComponent({
  name: 'SetupCashFlowImpactLimits',
  components: { CustomBadge },
  setup() {
    const context = useContextStore()
    const rows = ref<Row[]>(defaultRows())
    const loading = ref(true)
    const saving = ref(false)
    const errors = ref<string[]>([])

    function applyResponse(limits: CashFlowImpactLimitDto[]): void {
      const byTier = new Map(limits.map((limit) => [limit.tier, limit]))
      rows.value = TIERS.map((tier) => {
        const limit = byTier.get(tier)
        return {
          tier,
          fromAmount: limit?.fromAmount ?? null,
          toAmount: limit?.toAmount ?? null,
          isDefault: limit?.isDefault ?? true,
        }
      })
    }

    async function load(): Promise<void> {
      const companyUuid = context.companyUuid

      if (!companyUuid) {
        rows.value = defaultRows()
        // Otherwise a stale in-flight request from the previous company, discarded below by its
        // own isCurrent() check when it settles, would leave `loading` stuck true: masked for now
        // by the template checking `!context.hasCompany` before `loading`, but real state the
        // next reader of `loading` shouldn't have to know that to trust.
        loading.value = false
        return
      }

      loading.value = true
      errors.value = []

      // The company can change again before this request settles (a second switch, or `watch`
      // firing again while this call is still in flight). Whichever `load()` call is still
      // relevant when it resolves is the one allowed to touch `rows`/`errors`/`loading`:
      // otherwise a slower, stale response arriving after a newer one would overwrite the screen
      // with the WRONG company's thresholds under the right company's name, or flip `loading`
      // back to false while the current company's own request is still pending.
      const isCurrent = () => context.companyUuid === companyUuid

      try {
        const response = await fetchCashFlowImpactLimits(companyUuid)

        if (!isCurrent()) {
          return
        }

        applyResponse(response)
        loading.value = false
      } catch {
        if (!isCurrent()) {
          return
        }

        errors.value = ['The thresholds could not be loaded. Try again.']
        loading.value = false
      }
    }

    async function onSave(): Promise<void> {
      const companyUuid = context.companyUuid

      if (!companyUuid) {
        return
      }

      errors.value = []
      saving.value = true

      try {
        // A tier left blank is "not entered," not zero: coercing it to 0 would silently persist a
        // real dollar boundary the admin never typed. Omitted instead, so a fully blank set sends
        // the empty array saveCashFlowImpactLimits documents as reverting every tier to the
        // platform default, and a partially blank set is refused by the API's own "every tier or
        // none" rule (naming the tier still missing) rather than defaulted to zero here.
        const limits = rows.value
          .filter((row) => toNumber(row.fromAmount) !== null)
          .map((row) => ({
            tier: row.tier,
            fromAmount: toNumber(row.fromAmount)!,
            // The top band carries no upper bound (CashFlowImpactLimitLayout.Validate's own
            // rule): whatever is typed into "To" for High is never sent.
            toAmount: row.tier === 'High' ? null : toNumber(row.toAmount),
          }))

        applyResponse(await saveCashFlowImpactLimits(companyUuid, limits))
      } catch (error) {
        if (error instanceof HttpError && error.status === 400) {
          errors.value = parseValidationErrors(error)
        } else {
          errors.value = ['The thresholds could not be saved. Try again.']
        }
      } finally {
        saving.value = false
      }
    }

    // A company switch mid-view must not leave one tenant's thresholds on screen under another's
    // name, the same reason useContextStore's own setCompany clears the selected file.
    watch(() => context.companyUuid, load)
    onMounted(load)

    return { context, rows, loading, saving, errors, onSave }
  },
})
</script>

<style lang="scss" scoped>
.cfi-row {
  padding: 0.5rem 0;
}

.cfi-header {
  font-size: 0.75rem;
  text-transform: uppercase;
}
</style>
