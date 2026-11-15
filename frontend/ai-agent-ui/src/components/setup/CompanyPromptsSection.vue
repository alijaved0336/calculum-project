<template>
  <section class="settings-section" :class="{ collapsed: !open }">
    <SetupSectionHeader
      title="Company Prompts"
      hint="Instructions that apply only to this company"
      meta-id="cinstr-meta"
      :open="open"
      description="Add instructions that apply only to your company. These are appended to the agent's global prompts for every conversation in your account."
      note="Added on top of the global prompts - if they conflict, the global prompt wins."
      @toggle="emit('toggle')"
    />

    <div v-if="open" class="section-body">
      <div class="prompt-summary">
        <p>
          <strong>{{ promptCount }}</strong> instructions - merged into one effective prompt at
          runtime
        </p>
        <button type="button" class="save-btn secondary" @click="emit('add')">
          + Add Instruction
        </button>
      </div>

      <div class="table-wrap">
        <table class="doc-table prompt-table">
          <thead>
            <tr>
              <th class="first">Instruction</th>
              <th>Enabled</th>
              <th class="last" />
            </tr>
          </thead>
          <tbody id="pt-rows">
            <PromptRow
              v-for="prompt in prompts"
              :key="prompt.id"
              :prompt="prompt"
              @update-draft="(id, value) => emit('update-draft', id, value)"
              @edit="(id) => emit('edit-prompt', id)"
              @save="(id) => emit('save-prompt', id)"
              @cancel="(id) => emit('cancel-prompt', id)"
              @delete="(id) => emit('delete-prompt', id)"
              @toggle="(id) => emit('toggle-prompt', id)"
            />
          </tbody>
        </table>
      </div>

      <p class="prompt-foot">
        <span class="note-icon" v-html="infoIcon" />
        At runtime your company instructions are merged with the global prompts into one effective
        prompt. Where a company instruction conflicts with a global one,
        <strong>the global prompt wins</strong> - conflicting rows are flagged below.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import PromptRow from "@/components/setup/PromptRow.vue";
import SetupSectionHeader from "@/components/setup/SetupSectionHeader.vue";
import { infoIcon } from "@/components/setup/icons";
import type { PromptRow as PromptRowType } from "@/types/setup";

defineProps<{
  open: boolean;
  prompts: PromptRowType[];
  promptCount: number;
}>();

const emit = defineEmits<{
  toggle: [];
  add: [];
  "update-draft": [id: number, value: string];
  "edit-prompt": [id: number];
  "save-prompt": [id: number];
  "cancel-prompt": [id: number];
  "delete-prompt": [id: number];
  "toggle-prompt": [id: number];
}>();
</script>

<style scoped>
.settings-section {
  border-top: 1px solid #e5e7eb;
  padding: 26px 0 30px;
}

.section-body {
  margin-top: 22px;
}

.prompt-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.prompt-summary p {
  margin: 0;
  color: #6f7b8c;
  font-size: 13px;
  line-height: 1.55;
}

.prompt-summary strong {
  color: #475467;
  font-weight: 700;
}

.save-btn {
  border: 0;
  border-radius: 999px;
  background: #6366f1ff;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  padding: 12px 18px;
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.2);
}

.save-btn.secondary {
  box-shadow: none;
}

.save-btn:hover {
  background: #5558e3;
  color: #fff;
}

.table-wrap {
  overflow: auto;
  border: 1px solid #dfe6ee;
  border-radius: 14px;
  background: #fff;
}

.prompt-table {
  width: 100%;
  border-collapse: collapse;
}

.doc-table thead th {
  text-align: left;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9aa5b5;
  padding: 12px 16px;
  background: #fbfcfe;
  border-bottom: 1px solid #edf1f5;
  white-space: nowrap;
}

.prompt-table :deep(tbody td) {
  padding: 18px 16px;
  border-bottom: 1px solid #edf1f5;
  color: #475467;
  text-align: left;
  font-size: 14px;
  font-weight: 400;
  vertical-align: middle;
}

.prompt-table th.first {
  padding-left: 24px;
}

.prompt-table :deep(tbody td.first) {
  padding-left: 24px;
}

.prompt-table th.last {
  width: 1%;
  padding-right: 26px;
  white-space: nowrap;
}

.prompt-table :deep(tbody td.last) {
  width: 1%;
  padding-right: 26px;
  white-space: nowrap;
}

.prompt-table tbody tr:last-child td {
  border-bottom: 0;
}

.prompt-table tbody tr:hover :deep(td) {
  background: #fbfcfe;
}

.prompt-foot {
  margin: 14px 0 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #6f7b8c;
  font-size: 13px;
  line-height: 1.55;
}

.note-icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.note-icon :deep(svg) {
  width: 16px;
  height: 16px;
}
</style>
