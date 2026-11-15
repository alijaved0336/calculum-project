<template>
  <div class="tone-default-row">
    <span class="tdr-pb">
      <span class="pb-dot" />
      {{ item.goal }}
    </span>
    <svg
      class="tdr-arrow"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
    <select
      :value="item.tone"
      class="tone-select"
      :aria-label="`Default tone for ${item.goal}`"
      @change="onChange"
    >
      <option v-for="tone in availableTones" :key="tone" :value="tone">
        {{ tone }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { ToneMapping } from "@/types/setup";

const props = defineProps<{
  item: ToneMapping;
  availableTones: string[];
}>();

const emit = defineEmits<{
  update: [goal: string, tone: string];
}>();

function onChange(event: Event) {
  emit("update", props.item.goal, (event.target as HTMLSelectElement).value);
}
</script>

<style scoped>
.tone-default-row {
  display: grid;
  grid-template-columns: minmax(180px, 220px) 24px 1fr;
  align-items: center;
  gap: 16px;
  margin-top: 0;
  padding: 14px 10px;
  border-top: 1px solid #edf1f5;
  font-size: 13px;
}

.tdr-pb {
  display: inline-flex;
  align-items: center;
  gap: 0;
  color: #1f2937;
  font-weight: 600;
}

.pb-dot {
  display: none;
}

.tdr-arrow {
  color: #b4bdc9;
  justify-self: center;
}

.tone-select {
  appearance: none;
  -webkit-appearance: none;
  width: 150px;
  min-width: 150px;
  border: 1px solid #d9e1ea;
  border-radius: 9px;
  padding: 7px 32px 7px 12px;
  background:
    #fff
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2398A0AC' stroke-width='2.4'><path d='m6 9 6 6 6-6'/></svg>")
    no-repeat right 11px center;
  color: #2f3947;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.12s, box-shadow 0.12s;
}

.tone-select:focus,
.tone-select:focus-visible {
  outline: none;
  border-color: #2563eb;
  box-shadow: none;
}

@media (max-width: 1080px) {
  .tone-default-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .tdr-arrow {
    display: none;
  }

  .tone-select {
    width: 100%;
  }
}
</style>
