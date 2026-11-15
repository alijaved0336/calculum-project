<template>
  <td class="text-center">
    <span>{{ status }}</span>
  </td>
</template>
<script lang="ts">
import { defineComponent, computed, PropType } from 'vue'

import { isNullOrUndefined } from '@/utils';
import { SpendFile } from '@/types';
import { useI18n } from 'vue-i18n'

export default defineComponent({
  name: "StatusColumn",
  props: {
    dataItem: {
      type: Object as PropType<{
        status: SpendFile.SpendFileVersionStatus
      }>, required: false
    }
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const status = computed(() => {
      try {
        // Validate
        if (isNullOrUndefined(props.dataItem)) {
          throw new Error('dataItem is null or undefined');
        }

        return translate.t(`spendFileStatus.${props.dataItem.status}`);
      } catch (error) {
        if (import.meta.env.DEV) { console.log("** (StatusColumn / status)", error); }

        return '-';
      }
    })

    return {
      status
    }
  },
})
</script>
