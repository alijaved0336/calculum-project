<template>
  <a-tooltip :title="title">
    <label class="switch">
      <input
        :checked="checked"
        type="checkbox"
        :disabled="disabled"
        @change="emit('change', $event)"
      />
      <span class="track" />
      <span class="thumb" />
    </label>
  </a-tooltip>
</template>

<script setup lang="ts">
defineProps<{
  checked: boolean;
  title?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  change: [event: Event];
}>();
</script>

<style scoped>
.switch {
  position: relative;
  display: inline-flex;
  width: 38px;
  height: 22px;
  flex-shrink: 0;
}

.switch input {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.track {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: #c7d0db;
  transition: background-color 0.18s ease;
}

.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
  transition: transform 0.18s ease;
}

.switch input:checked ~ .track {
  background: #6366f1ff;
}

.switch input:checked ~ .thumb {
  transform: translateX(16px);
}
</style>
