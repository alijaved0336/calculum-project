<template>
  <td>
    <PillLabelNumberBadgeParentSupplierLevel
      :label="pillLabel" :label-classes="negotiationStatusPillColorClasses"
      :labels="negotiationStatusCodes" class="justify-content-center" />
  </td>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'

import useNegotiationStatus from '@/modules/negotiationStatus/composables/useNegotiationStatus';
import PillLabelNumberBadgeParentSupplierLevel from '@/modules/components/PillLabelNumberBadgeParentSupplierLevel.vue';
import { isPartialEntity, PARTIAL_PILL_COLOR_CLASSES } from '@/composables/usePartialNegotiationStatus';
import { translate } from '@/utils/translation';

// Types
import type { PropType } from 'vue'
import { NegotiationStatus } from '@/types';

export default defineComponent({
  name: "ColumnNegotiationStatus",
  components: { PillLabelNumberBadgeParentSupplierLevel },
  props: {
    dataItem: { type: Object as PropType<{ negotiationStatusCodes: string, negotiationStatus: NegotiationStatus }>, required: true },
  },
  setup(props) {
    const { negotiationStatusGetStatusTranslated, negotiationStatusGetStatusesTranslated, negotiationStatusGetPillColorClasses } = useNegotiationStatus();

    // A spend line can never span stages, so this is always false at spend level —
    // no explicit level check needed, the same cell renderer is used for every level.
    const isPartial = computed(() => {
      return isPartialEntity(props.dataItem.negotiationStatusCodes)
    })

    const negotiationStatusFormatted = computed(() => {
      return negotiationStatusGetStatusTranslated(props.dataItem.negotiationStatus)
    })

    const pillLabel = computed(() => {
      return isPartial.value ? translate.t('home.manageModule.partialTag') : negotiationStatusFormatted.value
    })

    const negotiationStatusPillColorClasses = computed(() => {
      return isPartial.value ? PARTIAL_PILL_COLOR_CLASSES : negotiationStatusGetPillColorClasses(props.dataItem.negotiationStatus)
    })

    const negotiationStatusCodes = computed(() => {
      return negotiationStatusGetStatusesTranslated(props.dataItem.negotiationStatusCodes)
    })

    return {
      pillLabel,
      negotiationStatusPillColorClasses,
      negotiationStatusCodes
    }
  }
})
</script>
