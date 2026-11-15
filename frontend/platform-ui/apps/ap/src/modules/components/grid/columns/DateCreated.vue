<template >
  <td>
    <span class="elipsiss">{{ formatDate(created) }}</span>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import DateUtils from '@/utils/DateUtils'
import { useUser } from '@/composables';
import { Locales } from '@ada/design-system/locales/keys';

export default defineComponent({
  name: 'DateCreatedColumn',
  props: {
    created: { type: String, required: true }
  },
  setup() {
    const { user } = useUser();

    function formatDate(date: string) {
      const language = user.value?.language ?? Locales.EN

      const dateFormat = DateUtils.formatDate(date, language, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      })

      return dateFormat
    }

    return {
      formatDate
    }
  }
})
</script>
