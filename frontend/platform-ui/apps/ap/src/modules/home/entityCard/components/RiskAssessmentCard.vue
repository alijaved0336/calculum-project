<template>
<div class="rac-card">
  <div class="rac-header">
    <div class="rac-header-text"><span class="text-base font-semibold text-gray-600">Risk Assessment</span></div>
  </div>
  <div class="rac-list">
    <div class="rac-item" v-for="(item, i) in getData" :key="i">
      <div class="rac-badge-col"><span class="rac-badge" :class="`rac-badge--${item.severity.toLowerCase()}`">{{ item.severity }}</span></div>
      <div class="rac-item-body"><span class="text-gray-400 text-xs">{{ item.riskType }}</span><span class="text-gray-600 text-sm">{{ item.description }}</span></div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';
import type { RiskProfile } from '@/modules/home/entityCard/types';

export default defineComponent({
  name: 'RiskAssessmentCard',
  props: {
    data: { type: Array as PropType<RiskProfile[]>, default: () => [] }
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
.rac-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.08);
  padding: 18px 18px 12px;
  height: 100%;
}

.rac-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.rac-header-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}


.rac-subtitle {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #4e9fba;
  text-transform: uppercase;
}

.rac-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rac-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(248, 250, 252, 1);
  background: rgba(248, 250, 252, 0.3);
  transition: background 0.15s, box-shadow 0.15s;
  cursor: default;

  &:hover {
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
}

.rac-badge-col {
  flex-shrink: 0;
  padding-top: 1px;
  width: 8%;
}

.rac-badge {
  display: inline-block;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: 4px;
  padding: 2px 5px;
  color: #fff;

  &--critical { background: #7c3aed; }
  &--high     { background: #ef4444; }
  &--medium   { background: #f59e0b; }
  &--low      { background: #22c55e; }
}

.rac-item-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rac-category {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;  
  color: #94a3b8;
}

.rac-description {
  font-size: 0.75rem;
  color: #334155;
  margin: 0;
  line-height: 1.45;
}

.rac-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.rac-input-chip {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 4px;
  padding: 2px 6px;
}

.rac-mitigation {
  font-size: 0.7rem;
  color: #64748b;
  margin: 6px 0 0;
  line-height: 1.4;
  font-style: italic;
}
</style>
