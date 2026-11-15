<template>
  <section class="settings-section tones-section" :class="{ open }" id="sec-tones">
    <SetupSectionHeader
      title="Tones"
      hint="Choose available negotiation tones"
      meta-id="tones-meta"
      :open="open"
      description="Choose which tones your users can pick for this company. Tone names and descriptions are defined by Calculum and can't be edited here - toggle a tone off to remove it from your negotiators' options."
      @toggle="emit('toggle')"
    />

    <div v-if="open" class="section-body">
      <div class="tones-grid">
        <ToneCard
          v-for="tone in tones"
          :key="tone.id"
          :tone="tone"
          :can-disable="!(tone.enabled && enabledCount <= 1)"
          @update="(id, enabled) => emit('update-tone', id, enabled)"
        />
      </div>

      <div class="tone-defaults">
        <div class="tone-defaults-head">
          <h3>Default recommended tone</h3>
          <span class="sub">
            Suggested when a conversation starts under each playbook. Negotiators can still
            switch mid-conversation.
          </span>
        </div>

        <ToneDefaultRow
          v-for="item in toneMappings"
          :key="item.goal"
          :item="item"
          :available-tones="availableTones"
          @update="(goal, tone) => emit('update-mapping', goal, tone)"
        />
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
import SetupSectionHeader from "@/components/setup/SetupSectionHeader.vue";
import ToneCard from "@/components/setup/ToneCard.vue";
import ToneDefaultRow from "@/components/setup/ToneDefaultRow.vue";
import type { ToneMapping, ToneSetting } from "@/types/setup";

const props = defineProps<{
  open: boolean;
  tones: ToneSetting[];
  toneMappings: ToneMapping[];
}>();

const emit = defineEmits<{
  toggle: [];
  "update-tone": [id: string, enabled: boolean];
  "update-mapping": [goal: string, tone: string];
}>();

const availableTones = computed(() =>
  props.tones.filter((tone) => tone.enabled).map((tone) => tone.title),
);

const enabledCount = computed(
  () => props.tones.filter((tone) => tone.enabled && !tone.locked).length,
);

watch(availableTones, (available) => {
  if (!available.length) return;
  props.toneMappings.forEach((mapping) => {
    if (!available.includes(mapping.tone)) {
      emit('update-mapping', mapping.goal, available[0]);
    }
  });
});
</script>

<style scoped>
.settings-section {
  border-top: 1px solid #e5e7eb;
  padding: 26px 0 30px;
}

.section-body {
  margin-top: 22px;
}

.tones-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.tone-defaults {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid #edf1f5;
}

.tone-defaults-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tone-defaults-head h3 {
  margin: 0;
  color: #1f2937;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
}

.sub {
  margin: 0;
  color: #6f7b8c;
  font-size: 13px;
  line-height: 1.55;
}

@media (max-width: 1080px) {
  .tones-grid {
    grid-template-columns: 1fr;
  }
}
</style>
