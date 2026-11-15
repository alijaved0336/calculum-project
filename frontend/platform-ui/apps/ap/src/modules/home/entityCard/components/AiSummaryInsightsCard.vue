<template>
<div class="ais-card d-flex flex-column"> <span class="text-base font-semibold text-gray-600"> Executive Procurement Intelligence</span>
  <blockquote class="text-gray-600 text-sm">{{ `${data.headline} ${data.keyTakeaway} ${data.topRisk} ${data.negotiationPriority} ${data.oneLineOutlook}` }}</blockquote>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

export interface AiSummaryInsightsData {
  headline: string;
  keyTakeaway: string;
  topRisk: string;
  negotiationPriority: string;
  oneLineOutlook: string;
}

export default defineComponent({
  name: 'AiSummaryInsightsCard',
  props: {
    data: {
      type: Object as PropType<AiSummaryInsightsData>,
      required: true
    }
  }
});
</script>

<style lang="scss" scoped>
.ais-card {  
  background-color: #ffffff;
  border-radius: 12px;  
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.08);
  padding: 20px 20px 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>