<template>
<div class="d-flex align-items-center gap-2">
  <CheckBox
    :model-value="sameBuyerIndustry"
    :label="t('arSetup.parentMin.sameBuyerIndustry')"
    :disabled="disabled"
    data-test="parent-min-industry"
    @update:model-value="$emit('update:sameBuyerIndustry', $event)"
  />
  <TooltipButton :text="t('arSetup.parentMin.sameBuyerIndustryTooltip')" />
</div>
<div class="d-flex align-items-center gap-2">
  <CheckBox
    :model-value="sameBuyerRegion"
    :label="t('arSetup.parentMin.sameBuyerRegion')"
    :disabled="disabled"
    data-test="parent-min-region"
    @update:model-value="$emit('update:sameBuyerRegion', $event)"
  />
  <TooltipButton :text="t('arSetup.parentMin.sameBuyerRegionTooltip')" />
</div>
<SetupNumberField
  :model-value="percentage"
  :label="`${t('arSetup.parentMin.minimumSalesVolume')} (%)`"
  :tooltip="t('arSetup.parentMin.minimumSalesVolumeTooltip')"
  :error="error"
  :disabled="disabled"
  data-test="parent-min-volume"
  @update:model-value="onPercentage"
/>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckBox, TooltipButton } from '@ada/design-system'
import SetupNumberField from './SetupNumberField.vue'

/**
 * AB#20717 (#20703): Parent/Buyer Min's More settings with Receivables wording. The API keeps
 * `volumePercentage` as a 0-1 fraction; the screen shows and edits it as 0-100 %. An emptied input
 * stays `NaN`, which the shared rules reject.
 */
export default defineComponent({
  name: 'SetupParentMinSettings',
  components: { CheckBox, TooltipButton, SetupNumberField },
  props: {
    sameBuyerIndustry: { type: Boolean, default: false },
    sameBuyerRegion: { type: Boolean, default: false },
    volumePercentage: { type: Number as PropType<number | undefined>, default: undefined },
    /** An i18n key. */
    error: { type: String as PropType<string | undefined>, default: undefined },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:sameBuyerIndustry', 'update:sameBuyerRegion', 'update:volumePercentage'],
  setup(props, { emit }) {
    const { t } = useI18n({ useScope: 'global' })

    const percentage = computed(() => {
      const fraction = props.volumePercentage
      return fraction === undefined || Number.isNaN(fraction) ? Number.NaN : Math.round(fraction * 10000) / 100
    })

    function onPercentage(value: number): void {
      emit('update:volumePercentage', Number.isNaN(value) ? Number.NaN : value / 100)
    }

    return { t, percentage, onPercentage }
  },
})
</script>
