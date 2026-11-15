<script setup lang="ts">
/**
 * ConfirmDialog — a small centered confirm/cancel modal for destructive actions.
 * The parent owns the async work and drives `busy` (true while it runs): the Confirm
 * button shows a spinner and both buttons + the overlay lock until it finishes.
 */
const props = withDefaults(defineProps<{
  modelValue: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
}>(), {
  title: "Are you sure?",
  message: "",
  confirmLabel: "Delete",
  cancelLabel: "Cancel",
  busy: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "confirm"): void;
}>();

function close() {
  if (!props.busy) emit("update:modelValue", false);
}
</script>

<template>
  <div v-if="modelValue" class="overlay" @click="close">
    <div class="dialog" @click.stop role="alertdialog" aria-modal="true">
      <div class="icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></svg>
      </div>
      <h3 class="title">{{ title }}</h3>
      <p v-if="message" class="message">{{ message }}</p>
      <div class="actions">
        <button class="btn-ghost" :disabled="busy" @click="close">{{ cancelLabel }}</button>
        <button class="btn-danger" :disabled="busy" @click="emit('confirm')">
          <span v-if="busy" class="spin" />
          {{ busy ? "Deleting…" : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(18,22,27,0.5); display: flex; align-items: center; justify-content: center; z-index: 70; padding: 24px; }
.dialog { background: #fff; width: 400px; max-width: 100%; border-radius: 16px; box-shadow: 0 24px 70px rgba(15,20,25,0.32); padding: 26px 26px 22px; text-align: center; }
.icon { width: 52px; height: 52px; margin: 0 auto 14px; border-radius: 14px; background: var(--err-bg); display: flex; align-items: center; justify-content: center; }
.title { margin: 0 0 8px; font-size: 17px; font-weight: 700; color: var(--ink); }
.message { margin: 0 0 22px; font-size: 13px; line-height: 1.55; color: var(--muted); }
.actions { display: flex; gap: 12px; justify-content: center; }
.btn-ghost { border: 1px solid #e0e2e5; background: #fff; color: #3a4048; padding: 10px 22px; border-radius: var(--radius-ctrl); font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-width: 120px; border: none; background: var(--err); color: #fff; padding: 10px 22px; border-radius: var(--radius-ctrl); font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-danger:disabled { opacity: 0.75; cursor: default; }
.spin { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.5); border-top-color: #fff; border-radius: 50%; animation: sa-spin 0.7s linear infinite; }
</style>
