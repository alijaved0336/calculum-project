<!--
  ButtonColumn variant
 -->
<template>
<td>
  <!--
    The title sits on a wrapper, not on the button: a native title on a DISABLED button is not shown
    by Chrome at all, which is exactly when the explanation is worth reading. Same solution AR's own
    dashboard uses for the same action.
  -->
  <div class="col-12 text-center" :title="hint">
    <button class="btn-text text-gray-900" @click="onClick" :class="isEnabled ? `is-enabled` : `opacity-50 cursor-not-allowed`" :disabled="!isEnabled">{{ label }}</button>
  </div>
</td>
</template>

<script lang='ts'>
import { StringUtils, isNullOrUndefined } from '@/utils'
import { computed, defineComponent } from 'vue'

/**
 * The statuses AR admits for a recalculation: `EfSaleFileCalculationStore.AllowedForRecalculation`,
 * minus `recalculateClaimed` — which AR accepts as an idempotent re-claim for a lost publish, a
 * recovery path rather than something to offer on a grid.
 *
 * `processed` is deliberately absent, on both sides: a version that has never been calculated must
 * take its FIRST calculation through the finalize hand-off, and a recalculate claim would race it.
 *
 * Widening this set without widening AR's produces a button that offers an action AR answers 409 to.
 */
const RECALCULATABLE_STATUSES = new Set(['ready', 'errorCalculating', 'errorReCalculating'])

const I18N_PREFIX = 'adminBackend.adminUploadData.receivablesRecalculate'

export default defineComponent({
  name: 'RecalculateButtonColumn',
  props: {
    dataItem: { type: Object, required: true },
    text: { type: String, required: true },
    enabled: { type: Boolean, default: true }
  },
  emits: ['click'],
  setup(props, { emit }) {
    function onClick() {
      emit('click', { action: 'recalculate', dataItem: props.dataItem })
    }

    /**
     * Set by the view for the row whose request is in flight. It matters because the row still
     * reads `ready` until the grid refreshes, so without it the button invites a second click that
     * AR answers 409 to.
     */
    const isRecalculating = computed(() => props.dataItem?.recalculating === true)

    /**
     * Some row's request is in flight — not necessarily this one's. The view runs one at a time, so
     * a click here would be dropped; an enabled button that silently does nothing is worse than a
     * disabled one that says why. AR's dashboard disables its whole Actions column the same way.
     */
    const isBusyElsewhere = computed(() =>
      props.dataItem?.busy === true && !isRecalculating.value
    )

    /**
     * Whether this VERSION could ever be recalculated — its status alone, with nothing about what
     * the screen is doing right now.
     *
     * Kept apart from {@link isEnabled} because the two answer different questions and the tooltip
     * needs the difference: "not now" is a wait, "not this version" is not.
     */
    const admitsRecalculation = computed(() => {
      try {// Validate
        if (isNullOrUndefined(props.dataItem)) {
          throw new Error('dataItem is null or undefined')
        }

        if (isNullOrUndefined(props.dataItem.status)) {
          throw new Error('dataItem.status is null or undefined')
        }

        if (StringUtils.isNullUndefinedOrEmpty(props.dataItem.status)) {
          throw new Error('dataItem.status is null or undefined or empty')
        }

        return RECALCULATABLE_STATUSES.has(props.dataItem.status)

      } catch (error) {
        if (import.meta.env.DEV) { console.error("** (admitsRecalculation)", error); }

        return false
      }
    })

    const isEnabled = computed(() =>
      admitsRecalculation.value && !isRecalculating.value && !isBusyElsewhere.value
    )

    return {
      onClick,
      isEnabled,
      isRecalculating,
      isBusyElsewhere,
      admitsRecalculation
    }
  },
  computed: {
    label(): string {
      return this.isRecalculating ? this.$t(`${I18N_PREFIX}.inFlight`) : this.text
    },
    /**
     * Three reasons a button can be disabled, and they are not interchangeable: this version's
     * status does not admit a recalculation at all, this row is running, or another row is.
     *
     * **The version-level reason is checked first, and that order is the point.** The view flags
     * every row busy while a request is in flight, recalculable or not, so a `processed` version
     * would otherwise be told to wait for a recalculation it will never be offered. "Not now" and
     * "not this version" have to stay distinguishable.
     */
    hint(): string {
      if (!this.admitsRecalculation) {
        return this.$t(`${I18N_PREFIX}.unavailable`)
      }

      if (this.isRecalculating) {
        return this.$t(`${I18N_PREFIX}.inFlight`)
      }

      if (this.isBusyElsewhere) {
        return this.$t(`${I18N_PREFIX}.busy`)
      }

      return this.$t(`${I18N_PREFIX}.hint`)
    }
  }
})
</script>
<style lang="scss" scoped>
button.is-enabled {
  &:hover {
    text-underline-position: under;
    text-decoration: underline;
  }
}
</style>
