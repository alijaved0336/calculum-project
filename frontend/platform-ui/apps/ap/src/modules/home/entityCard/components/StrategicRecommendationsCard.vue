<template>
<div class="src-card">
  <div class="src-header">
    <div class="src-header-text"><span class="text-base font-semibold text-gray-600">Strategic Recommendations</span></div>
  </div>
  <ol class="src-list">
    <li class="src-item" v-for="(item, i) in getData" :key="i"><span class="src-number">{{ i + 1 }}</span>
      <div class="src-body"><span class="text-gray-600 text-sm font-semibold">{{ item.action }}</span></div>
    </li>
  </ol>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';
import type { NegotiationRecommendation } from '@/modules/home/entityCard/types';

export default defineComponent({
  name: 'StrategicRecommendationsCard',
  props: {
    data: { type: Array as PropType<NegotiationRecommendation[]>, default: () => [] }
  },
  setup(props) {
    const getData = computed(() => {
      return props.data
    })
    return {
      getData
    }
  }
});
</script>

<style lang="scss" scoped>
.src-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
  padding: 18px 18px 14px;
  height: 100%;
}

.src-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.src-header-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.src-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #14532d;
  margin: 0;
}

.src-subtitle {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #22c55e;
  text-transform: uppercase;
}

.src-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.src-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 0.15s;
  cursor: default;

  &:hover {
    .src-number {
      background: #064e3b;
      color: #ffffff;
      border-color: #064e3b;
    }
  }
}

.src-number {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: #a7f3d0;
  color: #064e3b;
  font-size: 0.625rem;
  font-weight: 900;
  border: 1px solid #6ee7b7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.src-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 2px 0;
}

.src-action {
  font-size: 0.875rem;
  font-weight: 700;
  color: #064e3b;
  margin: 0;
  line-height: 1.4;
}

.src-rationale {
  font-size: 0.72rem;
  color: #374151;
  margin: 0;
  line-height: 1.45;
}

.src-impact {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #16a34a;
  background: #dcfce7;
  border-radius: 4px;
  padding: 2px 7px;
  align-self: flex-start;
  margin-top: 2px;
}
</style>
