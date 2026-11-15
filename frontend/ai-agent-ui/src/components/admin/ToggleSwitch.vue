<template>
  <a-tooltip :title="title">
    <button
      class="toggle"
      :class="{ on: modelValue, disabled }"
      :disabled="disabled"
      type="button"
      @click="emit('update:modelValue', !modelValue)"
    >
      <span class="knob" />
    </button>
  </a-tooltip>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; disabled?: boolean; title?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<style scoped>
.toggle {
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: var(--line);
  border: none;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
  padding: 0;
}

.toggle.on {
  background: var(--orange);
}

.toggle.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s;
}

.toggle.on .knob {
  transform: translateX(16px);
}
</style>
