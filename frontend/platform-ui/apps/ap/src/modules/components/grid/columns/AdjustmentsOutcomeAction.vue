<!--
  AB#20259 — the action that asks what became of the last adjustments file uploaded against a
  version.

  **Rendered inside the adjustments cell it reports on, not as a column of its own.** It was one
  until the two outcome columns were folded away: "Download / Upload / Result" is one administrator's
  decision about one file, and splitting the third off put the answer two columns from the question,
  with a header ("Adjustments result") that had to name the file all over again. It is a `div` rather
  than a `td` for that reason — the `td` is `DownloadUpload`'s.

  Nothing is fetched until it is clicked. The grid loads every version at once, so a badge showing
  each row's outcome would mean one call to Receivables per row on every render; the result is asked
  for one version at a time, when somebody wants it. The cost of that choice is stated here rather
  than hidden: this cannot be scanned, and a version whose upload failed looks exactly like one whose
  upload worked until it is opened.
-->
<template>
  <div>
    <div class="text-center" :title="hint">
      <button
        class="btn-text text-gray-900"
        :class="isEnabled ? `is-enabled` : `opacity-50 cursor-not-allowed`"
        :disabled="!isEnabled"
        @click="onClick"
      >
        {{ label }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'

const I18N_PREFIX = 'adminBackend.adminUploadData.receivablesAdjustmentsOutcome'

export default defineComponent({
  name: 'AdjustmentsOutcomeAction',
  props: {
    dataItem: { type: Object, required: true },
    /**
     * Which adjustments file this action reports on. Travels back on `click` so a view showing both
     * cells can route to the right endpoint, and is compared against the row's in-flight marker
     * below so only the one actually waiting is greyed out.
     *
     * Required rather than defaulted: both call sites pass it, and a default would silently route
     * a third caller that forgot the prop to UC-SET-07's endpoint (AB#19911).
     */
    behavior: { type: String, required: true }
  },
  emits: ['click'],
  setup(props, { emit }) {
    function onClick() {
      emit('click', props.dataItem, props.behavior)
    }

    /**
     * Set by the view for the row it is asking about. The answer comes from another platform over
     * HTTP, so without this the button invites a second click while the first is still in flight.
     *
     * The row holds one entry per waiting file rather than a single marker: both cells sit on one
     * row and both can be in flight at once, so neither a plain `true` nor the last behaviour
     * clicked could say whose button to grey out.
     */
    const isLoading = computed(() => props.dataItem?.outcomeLoading?.[props.behavior] === true)

    /**
     * A version this application has no uuid for cannot be asked about at all — the uuid is the
     * only identifier the two platforms share. Disabled rather than allowed to fail on click.
     */
    const isAddressable = computed(() => typeof props.dataItem?.uuid === 'string' && props.dataItem.uuid !== '')

    const isEnabled = computed(() => isAddressable.value && !isLoading.value)

    return { onClick, isEnabled, isLoading, isAddressable }
  },
  computed: {
    label(): string {
      return this.isLoading ? this.$t('global.loading') : this.$t(`${I18N_PREFIX}.view`)
    },
    /** Two reasons the button can be off, and they send the reader to different places. */
    hint(): string {
      if (!this.isAddressable) {
        return this.$t(`${I18N_PREFIX}.unaddressable`)
      }

      return this.isLoading ? this.$t('global.loading') : this.$t(`${I18N_PREFIX}.hint`)
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
