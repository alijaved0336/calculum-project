<template>
  <div class="goal-card" :class="{ locked: goal.locked }">
    <div class="goal-card-head">
      <span class="goal-dot" :style="{ backgroundColor: goal.color }" />
      <span class="goal-name">{{ goal.title }}</span>

      <span v-if="goal.locked" class="goal-lock">
        <span v-html="lockIcon" />
        Not available
      </span>

      <SetupSwitch
        v-else
        class="goal-toggle"
        title="Show this goal in the agent"
        :checked="goal.enabled"
        @change="onToggle"
      />
    </div>

    <p class="goal-desc">{{ goal.description }}</p>
    <p v-if="goal.locked" class="goal-note">
      <span class="note-icon" v-html="infoIcon" />
      Not enabled for your company - managed by Calculum.
    </p>
  </div>
</template>

<script setup lang="ts">
import SetupSwitch from "@/components/setup/SetupSwitch.vue";
import type { GoalSetting } from "@/types/setup";
import { infoIcon, lockIcon } from "@/components/setup/icons";
import { useToast } from "@/composables/useToast";

const props = defineProps<{
  goal: GoalSetting;
  canDisable?: boolean;
}>();

const emit = defineEmits<{
  update: [id: string, enabled: boolean];
}>();

const { showToast } = useToast();

function onToggle(event: Event) {
  const target = event.target as HTMLInputElement;

  if (!target.checked && props.canDisable === false) {
    target.checked = true;
    showToast("At least one goal must be enabled", "error");
    return;
  }

  emit("update", props.goal.id, target.checked);
}
</script>

<style scoped>
.goal-card {
  background: #fff;
  border: 1px solid #dde4ec;
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.02);
}

.goal-card.locked {
  border-style: dashed;
  background: #fcfdff;
  color: #97a3b6;
}

.goal-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.goal-dot {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  flex-shrink: 0;
}

.goal-name {
  color: #122033;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
}

.goal-card.locked .goal-name {
  color: #7f8ba0;
}

.goal-toggle {
  margin-left: auto;
}

.goal-lock {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #9aa5b5;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.goal-lock span {
  width: 14px;
  height: 14px;
  display: inline-flex;
}

.goal-lock span :deep(svg) {
  width: 14px;
  height: 14px;
}

.goal-desc {
  margin: 0;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.55;
}

.goal-card.locked .goal-desc {
  color: #9aa5b5;
}

.goal-note {
  margin: 12px -16px -14px;
  padding: 10px 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid #edf1f5;
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
