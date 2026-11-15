<template>
<td><span class="status-badge" :class="`status-${getStatus}`">{{ getStatusLabel }}  </span></td>
</template>

<script lang="ts">

import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n'

export default defineComponent({
    name: "PotentialRequestsStatus",
    props: {
        dataItem: { type: Object, required: true },
    },
    setup(props: any) {
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
        
        const getStatus = computed(() => {
            return props.dataItem.status
        })


        const getStatusLabel = computed(() => {
        
            const map: Record<string, string> = {
                pending: translate.t('global.pending') || 'Pending',
                solved: translate.t('adminBackend.potentialSupplierRequest.status.solved') || 'Solved',
                rejected: translate.t('global.rejected') || 'Rejected'
            }
            return map[props.dataItem.status?.toLowerCase()] || props.dataItem.status
      })
    





        return {
            getStatus,
            getStatusLabel
        }


    }

})
</script>

<style lang="scss" scope>
@import '@/resources/assets/styles/variables/_colors.scss';


.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;

  &.status-pending {
    background: lighten($color-pending, 40%);
    color: darken($color-pending, 20%);
  }
  &.status-solved {
    background: lighten($color-solved, 40%);
    color: $color-solved;
  }
  &.status-rejected {
    background: lighten($color-rejected, 40%);
    color: $color-rejected;
  }
}


</style>