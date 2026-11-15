<template>
<div class="pac-card">
  <div class="pac-header">
    <div class="pac-header-text"><span class="text-base font-semibold text-gray-600">Pushback / Arguments</span></div>
  </div>
  <div class="pac-list">
    <div class="pac-item" v-for="(item, i) in getData" :key="i">
      <p class="pac-claim">&ldquo;{{ item.claim }}&rdquo;      </p>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';
import type { NegotiationPushback } from '@/modules/home/entityCard/types';

export default defineComponent({
  name: 'PushbackArgumentsCard',
  props: {
    data: { type: Array as PropType<NegotiationPushback[]>, default: () => [] }
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
.pac-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
  padding: 18px 18px 16px;
  height: 100%;
}

.pac-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.pac-header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pac-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #92400e;
  margin: 0;
}

.pac-subtitle {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #d97706;
  text-transform: uppercase;
}

.pac-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pac-item {
  border-radius: 12px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #fef3c7;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.15s;

  &:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
  }
}

.pac-claim {
  font-size: 0.875rem;
  color: #451a03;
  margin: 0 0 12px;
  line-height: 1.5;
  font-weight: 700;
  font-style: italic;
}

.pac-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 6px;
}

.pac-row-label {
  flex-shrink: 0;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #d97706;
  background: #fef3c7;
  border-radius: 3px;
  padding: 2px 5px;
  margin-top: 1px;
}

.pac-supporting-data {
  font-size: 0.72rem;
  color: #78350f;
  line-height: 1.45;
}

.pac-counter {
  font-size: 0.72rem;
  color: #374151;
  line-height: 1.45;
}
</style>
