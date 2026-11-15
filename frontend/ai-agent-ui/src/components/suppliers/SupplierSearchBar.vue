<template>
  <div class="supplier-toolbar">
    <div class="supplier-search-wrap">
      <SearchSvg class="supplier-search-icon" />
      <input
        :value="modelValue"
        class="supplier-search"
        type="search"
        placeholder="Search suppliers"
        aria-label="Search suppliers"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="modelValue"
        class="supplier-search-clear"
        type="button"
        title="Clear search"
        aria-label="Clear search"
        @click="emit('update:modelValue', '')"
      >
        <CloseSvg />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CloseSvg, SearchSvg } from '@/components/chat/icons'

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.supplier-toolbar {
  max-width: 960px;
  margin: 0 auto 16px;
}

.supplier-search-wrap {
  position: relative;
}

.supplier-search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  width: 18px;
  height: 18px;
  color: #6b7280;
  pointer-events: none;
  transform: translateY(-50%);
}

.supplier-search {
  width: 100%;
  height: 48px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  color: #111827;
  padding: 0 48px;
  font-size: 15px;
  outline: none;
}

.supplier-search:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.supplier-search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transform: translateY(-50%);
}

.supplier-search-clear:hover,
.supplier-search-clear:focus-visible {
  background: #f3f4f6;
  color: #111827;
}

.supplier-search-clear :deep(.ico) {
  width: 16px;
  height: 16px;
}
</style>
