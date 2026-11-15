<template>
  <div
    class="tone-card"
    :class="{ off: !tone.enabled, locked: tone.locked }"
    :data-tone="tone.title"
  >
    <div class="tone-card-head">
      <span class="tone-dot" :style="{ background: tone.color }" />
      <span class="tone-name">{{ tone.title }}</span>

      <span v-if="tone.locked" class="tone-lock">
        <span v-html="lockIcon" />
        Not available
      </span>

      <SetupSwitch
        v-else
        class="tone-toggle"
        title="Available to this company's users"
        :checked="tone.enabled"
        @change="onToggle"
      />
    </div>

    <p class="tone-desc">{{ tone.description }}</p>

    <p v-if="tone.locked" class="tone-note">
      <span class="note-icon" v-html="infoIcon" />
      Not enabled for your company - managed by Calculum.
    </p>
  </div>
</template>

<script setup lang="ts">
import SetupSwitch from "@/components/setup/SetupSwitch.vue";
import type { ToneSetting } from "@/types/setup";
import { infoIcon, lockIcon } from "@/components/setup/icons";
import { useToast } from "@/composables/useToast";

const props = defineProps<{
  tone: ToneSetting;
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
    showToast("At least one tone must be enabled", "error");
    return;
  }

  emit("update", props.tone.id, target.checked);
}
</script>

<style scoped>
.tone-card {
  background: #fff;
  border: 1px solid #dde4ec;
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.02);
}

.tone-card.off {
  background: #fcfdff;
  border-style: dashed;
  color: #97a3b6;
}

.tone-card.locked {
  border-style: dashed;
  background: #fcfdff;
  color: #97a3b6;
}

.tone-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.tone-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.tone-card[data-tone="Methodical"] .tone-dot {
  background: oklch(0.64 0.13 250) !important;
}

.tone-card.off[data-tone="Methodical"] .tone-dot {
  opacity: 0.4;
}

.tone-name {
  color: #122033;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
}

.tone-card.off .tone-name,
.tone-card.locked .tone-name {
  color: #7f8ba0;
}

.tone-toggle {
  margin-left: auto;
}

.tone-lock {
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

.tone-lock span {
  width: 14px;
  height: 14px;
  display: inline-flex;
}

.tone-lock span :deep(svg) {
  width: 14px;
  height: 14px;
}

.tone-note {
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

.tone-desc {
  margin: 0;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.55;
}

.tone-card.off .tone-desc,
.tone-card.locked .tone-desc {
  color: #9aa5b5;
}
</style>
