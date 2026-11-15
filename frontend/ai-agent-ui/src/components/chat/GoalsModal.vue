<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-backdrop goals-modal-backdrop" @click.self="emit('update:modelValue', false)">
      <div class="modal modal-narrow">
        <div class="modal-h">
          <img class="modal-target-icon" src="@/assets/Target.svg" alt="" />
          <div class="modal-title-block">
            <p class="modal-title">Negotiation Goals</p>
            <p class="modal-sub">Choose the goal the assistant should follow</p>
          </div>
          <button class="modal-close-btn" @click="emit('update:modelValue', false)" title="Close">
            <CloseSvg />
          </button>
        </div>
        <div class="modal-body pb-grid">
          <div v-for="goal in goals" :key="goal.id" class="pb-card-wrap">
            <button
              :class="['pb-card', { on: selectedGoalId === goal.id && availableGoalIds.has(goal.id), disabled: !availableGoalIds.has(goal.id) }]"
              :disabled="!availableGoalIds.has(goal.id)"
              @click="emit('select', goal)"
            >
              <div class="pb-card-head">
                <span class="pb-card-name">{{ goal.title }}</span>
                <span v-if="selectedGoalId === goal.id && availableGoalIds.has(goal.id)" class="pb-card-active">ACTIVE</span>
                <span v-else-if="!availableGoalIds.has(goal.id)" class="pb-card-unavailable">UNAVAILABLE</span>
              </div>
              <div class="pb-card-desc">{{ goal.description }}</div>
              <span class="pb-scf-status">{{ goal.scfStatus }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Goal } from '@/types/chat'
import { CloseSvg } from '@/components/chat/icons'

defineProps<{
  modelValue: boolean
  goals: Goal[]
  selectedGoalId: string
  availableGoalIds: Set<string>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'select': [goal: Goal]
}>()
</script>

<!-- Not scoped: Teleport moves DOM outside component root; unique class names prevent leaks -->
<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(15, 20, 40, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}
.goals-modal-backdrop {
  --teal: #6366f1ff;
  --teal-700: #6366f1ff;
  --teal-50: #6366f16c;
  --teal-100: #6366f16c;
}
.modal {
  background: #fff;
  border-radius: 14px;
  width: 720px;
  max-width: 100%;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 80px rgba(15, 20, 40, 0.25);
  overflow: hidden;
}
.modal-narrow { width: 560px; }
.modal-h {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--line-2);
}
.modal-target-icon { width: 20px; height: 20px; flex-shrink: 0; }
.modal-title-block { flex: 1; min-width: 0; }
.modal-title { font-size: 15px; font-weight: 700; color: var(--ink); margin: 0 0 2px; }
.modal-sub { font-size: 12px; color: var(--muted); margin: 0; }
.modal-close-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  color: var(--ink-2);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
}
.modal-close-btn:hover { background: #fee2e2; color: #dc2626; }
.modal-close-btn .ico { width: 12px; height: 12px; }
.modal-body {
  overflow-y: auto;
  padding: 14px 18px 18px;
  flex: 1;
}
.pb-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 1fr;
  gap: 12px;
}
.pb-card-wrap {
  display: flex;
  flex-direction: column;
}
.pb-card {
  display: flex;
  flex-direction: column;
  text-align: left;
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  padding: 14px;
  width: 100%;
  height: 100%;
  cursor: pointer;
  transition: border-color 0.12s, box-shadow 0.12s, background 0.12s, transform 0.12s;
  box-sizing: border-box;
}
.pb-card:hover:not(:disabled) { border-color: var(--teal); background: #f0efff; transform: translateY(-1px); }
.pb-card.on { border-color: var(--teal); background: #f0efff; box-shadow: 0 0 0 3px var(--teal-50); }
.pb-card.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: #f9fafb;
}
.pb-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  flex-shrink: 0;
}
.pb-card-name { font-size: 13px; font-weight: 600; color: var(--ink); }
.pb-card-active {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--teal-700);
  background: var(--teal-50);
  padding: 2px 7px;
  border-radius: 999px;
  flex-shrink: 0;
}
.pb-card-unavailable {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  background: #f3f4f6;
  padding: 2px 7px;
  border-radius: 999px;
  flex-shrink: 0;
}
.pb-card-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
  margin-bottom: 10px;
  flex: 1;
}
.pb-scf-status {
  align-self: flex-start;
  font-size: 10.5px;
  color: var(--muted);
  background: var(--chip);
  border: 1px solid var(--line);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
