<template>
  <tr :data-id="prompt.id" :class="{ 'row-conflicted': prompt.flag && !prompt.isEditing }">
    <td v-if="prompt.isEditing" class="first">
      <textarea
        :value="prompt.draftInstruction"
        class="pt-input"
        :data-id="prompt.id"
        placeholder="Write one clear instruction..."
        @input="onDraftInput"
      />
    </td>
    <td v-else class="first">
      <div class="pt-instr">
        <span class="pt-text">{{ prompt.instruction }}</span>
        <div v-if="prompt.flag" class="pt-conflict">
          <span class="pt-conflict-icon" v-html="alertTriangleIcon" />
          {{ prompt.flag }}
        </div>
      </div>
    </td>
    <td>
      <SetupSwitch
        :checked="prompt.enabled ?? true"
        @change="emit('toggle', prompt.id)"
      />
    </td>
    <td class="last">
      <div class="pr-actions">
        <template v-if="prompt.isEditing">
          <a-tooltip title="Save">
            <button
              type="button"
              class="pr-btn save"
              :data-act="'save'"
              :data-id="prompt.id"
              aria-label="Save"
              @click="emit('save', prompt.id)"
            >
              <span v-html="checkBoldIcon" />
            </button>
          </a-tooltip>
          <a-tooltip title="Cancel">
            <button
              type="button"
              class="pr-btn"
              :data-act="'cancel'"
              :data-id="prompt.id"
              aria-label="Cancel"
              @click="emit('cancel', prompt.id)"
            >
              <span v-html="closeIcon" />
            </button>
          </a-tooltip>
        </template>
        <template v-else>
          <a-tooltip title="Edit">
            <button
              type="button"
              class="pr-btn"
              :data-act="'edit'"
              :data-id="prompt.id"
              aria-label="Edit"
              @click="emit('edit', prompt.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
          </a-tooltip>
          <a-tooltip title="Delete">
            <button
              type="button"
              class="pr-btn danger"
              :data-act="'delete'"
              :data-id="prompt.id"
              aria-label="Delete"
              @click="emit('delete', prompt.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          </a-tooltip>
        </template>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { PromptRow } from "@/types/setup";
import { alertTriangleIcon, checkBoldIcon, closeIcon } from "@/components/setup/icons";
import SetupSwitch from "@/components/setup/SetupSwitch.vue";

const props = defineProps<{
  prompt: PromptRow;
}>();

const emit = defineEmits<{
  "update-draft": [id: number, value: string];
  edit: [id: number];
  save: [id: number];
  cancel: [id: number];
  delete: [id: number];
  toggle: [id: number];
}>();

function onDraftInput(event: Event) {
  emit("update-draft", props.prompt.id, (event.target as HTMLTextAreaElement).value);
}
</script>

<style scoped>
.pt-instr {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  line-height: 1.45;
}

.pt-text {
  color: #475467;
  font-size: 14px;
  line-height: 1.45;
}

.pt-input {
  width: 100%;
  min-height: 62px;
  resize: vertical;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  font-size: 13px;
  line-height: 1.45;
  color: #122033;
  background: #fff;
  outline: none;
}

.pt-input::placeholder {
  color: #97a3b6;
}

.pt-input:focus,
.pt-input:focus-visible {
  border-color: #6366f1ff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.14);
}

.pt-conflict {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 0;
  color: #8a5a12;
  background: #fdf5e8;
  border: 1px solid #efc98e;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.1;
  white-space: nowrap;
  transform: translateY(-1px);
}

.pt-conflict-icon {
  display: inline-flex;
  width: 13px;
  height: 13px;
  color: #c47b12;
}

.pt-conflict-icon :deep(svg) {
  width: 13px;
  height: 13px;
}

.row-conflicted > td {
  background: #fffbf2 !important;
}

.row-conflicted > td.first {
  border-left: 3px solid #efc98e;
}

.author {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #475467;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.45;
}

.av-mini {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f2f4f7;
  color: #8c97a8;
  font-size: 10px;
  font-weight: 700;
}

.created {
  color: #475467;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.45;
}

.pr-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.pr-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #dfe6ee;
  border-radius: 9px;
  background: #fff;
  color: #7b8797;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background-color 0.18s ease;
}

.pr-btn :deep(svg) {
  width: 16px;
  height: 16px;
}

.pr-btn:hover {
  border-color: #cfd8e3;
  color: #475467;
  background: #fbfcfe;
}

.pr-btn.save {
  background: #2bab7e;
  border-color: #2bab7e;
  color: #fff;
}

.pr-btn.save:hover {
  background: #2bab7e;
  border-color: #2bab7e;
  color: #fff;
}

.pr-btn.danger:hover {
  border-color: #d9483b;
  color: #d9483b;
  background: #fdeeec;
}
</style>
