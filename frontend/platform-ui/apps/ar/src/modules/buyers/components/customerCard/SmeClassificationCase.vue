<template>
<div class="d-flex justify-content-between" v-for="(item, index) in formattingLimits" :key="index">
  <span class="text-muted small">{{ item.label }}</span><span class="fw-bold">{{ item.value }}</span>
</div>
</template>

<script lang="ts">
/**
 * Ported from apps/ap/src/modules/home/entityCard/components/details/SmeClassificationCase.vue -
 * one classification case's revenue/assets/employees limits, label/value pairs. The only change
 * from the original: the label used `DetailBox` (title + empty value, just for its layout), which
 * this port does not carry over - AR gets no `DetailBox` equivalent of its own, so the label
 * renders as a plain `<span>` instead.
 */
import { computed, defineComponent } from 'vue'

export interface SmeLimitItem {
  label: string
  value: string
}

export default defineComponent({
  name: 'SmeClassificationCase',
  props: {
    description: {
      type: String,
      required: true,
    },
    limits: {
      type: Array as () => SmeLimitItem[],
      required: true,
      default: () => [],
    },
  },
  setup(props) {
    const formattingLimits = computed(() => {
      return props.limits.map((item) => ({
        label: item.label,
        value: item.value,
      }))
    })
    return {
      formattingLimits,
    }
  },
})
</script>
