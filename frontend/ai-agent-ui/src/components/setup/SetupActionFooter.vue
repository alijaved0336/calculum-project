<template>
  <div class="setup-actions">
    <span v-if="saved" class="instr-saved" :id="savedId">
      <span v-html="checkIcon" />
      Saved
    </span>
    <button
      type="button"
      class="btn-primary"
      :class="{ saving }"
      :id="buttonId"
      :disabled="saving"
      @click="emit('save')"
    >
      <span v-if="saving" class="spinner" />
      <span v-else v-html="checkIcon" />
      {{ saving ? 'Saving…' : buttonLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { checkIcon } from "@/components/setup/icons";

defineProps<{
  saved: boolean;
  buttonLabel: string;
  saving?: boolean;
  buttonId?: string;
  savedId?: string;
}>();

const emit = defineEmits<{
  save: [];
}>();
</script>

<style scoped>
.setup-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
}

.instr-saved {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #2bab7e;
  font-size: 13px;
  font-weight: 700;
}

.instr-saved span,
.btn-primary span {
  width: 16px;
  height: 16px;
  display: inline-flex;
}

.instr-saved span :deep(svg),
.btn-primary span :deep(svg) {
  width: 16px;
  height: 16px;
}

.btn-primary {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  background: #6366f1ff;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  padding: 12px 18px;
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.2);
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: #5558e3;
  color: #fff;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
</style>
