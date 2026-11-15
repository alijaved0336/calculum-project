<template>
  <SetupSectionCard
    title="Tones"
    description="Enable or disable the preset tones available to your negotiators."
  >
    <div class="tone-grid">
      <div v-for="tone in tones" :key="tone.id" class="tone-card">
        <div class="tone-card-top">
          <div class="tone-title-row">
            <span class="dot" :style="{ background: tone.dotColor }" />
            <span class="tone-title">{{ tone.title }}</span>
          </div>
          <ToggleSwitch
            :model-value="tone.enabled"
            title="Enable this tone for negotiators"
            @update:model-value="(value) => onToneToggle(tone, value)"
          />
        </div>
        <p class="tone-desc">{{ tone.description }}</p>
      </div>
    </div>

    <h3 class="sub-title">Default recommended tone</h3>
    <p class="sub-desc">
      Suggested when a conversation starts under each playbook. Negotiators can still switch
      mid-conversation.
    </p>

    <div class="mapping-rows">
      <div v-for="mapping in DEFAULT_TONE_MAPPINGS" :key="mapping.playbook" class="mapping-row">
        <span class="mapping-playbook">{{ mapping.playbook }}</span>
        <ArrowRightSvg class="arrow" />
        <button class="tone-select">
          {{ mapping.tone }}
          <ChevronDownSvg />
        </button>
      </div>
    </div>

    <div class="actions-row">
      <button class="primary-btn"><CheckSvg /> Save Tones</button>
    </div>
  </SetupSectionCard>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import SetupSectionCard from '@/components/admin/SetupSectionCard.vue'
import ToggleSwitch from '@/components/admin/ToggleSwitch.vue'
import { TONES, DEFAULT_TONE_MAPPINGS } from '@/data/superAdmin'
import { CheckSvg, ChevronDownSvg, ArrowRightSvg } from '@/components/admin/icons'
import { useToast } from '@/composables/useToast'

const tones = reactive(TONES.map((t) => ({ ...t })))
const { showToast } = useToast()

const enabledCount = computed(() => tones.filter((t) => t.enabled).length)

function onToneToggle(tone: { enabled: boolean }, value: boolean) {
  if (!value && enabledCount.value <= 1) {
    showToast('At least one tone must be enabled', 'error')
    return
  }
  tone.enabled = value
}
</script>

<style scoped>
.tone-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 720px) {
  .tone-grid {
    grid-template-columns: 1fr;
  }
}

.tone-card {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 16px;
}

.tone-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tone-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tone-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.tone-desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  margin: 10px 0 0;
}

.sub-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  margin: 22px 0 4px;
}

.sub-desc {
  font-size: 12.5px;
  color: var(--muted);
  margin: 0 0 14px;
}

.mapping-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mapping-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.mapping-playbook {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  width: 160px;
  flex-shrink: 0;
}

.arrow {
  width: 14px;
  height: 14px;
  color: var(--muted-2);
  flex-shrink: 0;
}

.tone-select {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 7px 12px;
  background: #fff;
  font-size: 13px;
  color: var(--ink-2);
  cursor: pointer;
  min-width: 160px;
}

.tone-select :deep(.ico) {
  width: 12px;
  height: 12px;
  color: var(--muted);
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--orange);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn:hover {
  background: var(--orange-600);
}

.primary-btn :deep(.ico) {
  width: 13px;
  height: 13px;
}
</style>
