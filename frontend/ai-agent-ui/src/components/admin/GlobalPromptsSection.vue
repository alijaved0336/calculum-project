<template>
  <SetupSectionCard
    title="Global Prompts"
    
    description="Give the agent specific instructions for how to formulate its responses — tone, structure, guardrails, and the negotiation tactics it should prefer or avoid. These instructions are prepended to every prompt."
  >
    <p class="warning-text">
      Non-negotiable — these override any company prompt on conflict.
    </p>

    <div class="toolbar">
      <span class="toolbar-count">
        {{ GLOBAL_PROMPT_INSTRUCTIONS.length }} instructions · merged into one effective prompt
        at runtime
      </span>
      <button class="primary-btn"><PlusSvg /> Add Instruction</button>
    </div>

    <div class="table-wrap">
      <table class="prompt-table">
        <thead>
          <tr>
            <th>INSTRUCTION</th>
            <th>AUTHOR</th>
            <th>CREATED</th>
            <th class="actions-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="instruction in GLOBAL_PROMPT_INSTRUCTIONS" :key="instruction.id">
            <td class="instruction-cell">{{ instruction.text }}</td>
            <td>
              <div class="author-cell">
                <span class="author-avatar">{{ instruction.authorInitials }}</span>
                <span>{{ instruction.author }}</span>
              </div>
            </td>
            <td class="muted-cell">{{ instruction.created }}</td>
            <td class="actions-col">
              <button class="icon-btn"><PencilSvg /></button>
              <button class="icon-btn"><TrashSvg /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="footnote">
      At runtime every instruction is concatenated, in order, into a single effective prompt
      prepended to each conversation. Keeping them as separate rows makes them easier to
      maintain.
    </p>
  </SetupSectionCard>
</template>

<script setup lang="ts">
import SetupSectionCard from '@/components/admin/SetupSectionCard.vue'
import { GLOBAL_PROMPT_INSTRUCTIONS } from '@/data/superAdmin'
import { PlusSvg, PencilSvg, TrashSvg } from '@/components/admin/icons'
</script>

<style scoped>
.warning-text {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--orange-600);
  margin: -4px 0 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 12px;
}

.toolbar-count {
  font-size: 13px;
  color: var(--muted);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--orange);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.primary-btn:hover {
  background: var(--orange-600);
}

.primary-btn :deep(.ico) {
  width: 13px;
  height: 13px;
}

.table-wrap {
  overflow-x: auto;
}

.prompt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.prompt-table thead th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}

.prompt-table tbody td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--line-2);
  color: var(--ink-2);
  vertical-align: top;
}

.instruction-cell {
  max-width: 520px;
  line-height: 1.5;
}

.author-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.author-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--teal-100);
  color: var(--teal-700);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.muted-cell {
  color: var(--muted);
  white-space: nowrap;
}

.actions-col {
  white-space: nowrap;
  text-align: right;
}

.icon-btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--muted);
  border-radius: 6px;
  cursor: pointer;
}

.icon-btn:hover {
  background: var(--line-2);
  color: var(--ink);
}

.icon-btn :deep(.ico) {
  width: 13px;
  height: 13px;
}

.footnote {
  font-size: 12px;
  color: var(--muted-2);
  font-style: italic;
  line-height: 1.5;
  margin: 14px 0 0;
}
</style>
