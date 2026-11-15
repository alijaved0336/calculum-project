<template>
  <section class="settings-section" :class="{ collapsed: !open }">
    <SetupSectionHeader
      title="Goal Toggles"
      hint="Enable or disable the negotiation goals available to the agent."
      meta-id="goals-meta"
      :open="open"
      description="Enable the negotiation goals your team can use. A disabled goal disappears from the agent (chat) view entirely. Goals not made available to your company are managed by Calculum."
      @toggle="emit('toggle')"
    />

    <div v-if="open" class="section-body">
      <div class="goals-grid">
        <GoalCard
          v-for="goal in goals"
          :key="goal.id"
          :goal="goal"
          :can-disable="!(goal.enabled && enabledCount <= 1)"
          @update="(id, enabled) => emit('update-goal', id, enabled)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import GoalCard from "@/components/setup/GoalCard.vue";
import SetupSectionHeader from "@/components/setup/SetupSectionHeader.vue";
import type { GoalSetting } from "@/types/setup";

const props = defineProps<{
  open: boolean;
  goals: GoalSetting[];
}>();

const emit = defineEmits<{
  toggle: [];
  "update-goal": [id: string, enabled: boolean];
}>();

const enabledCount = computed(
  () => props.goals.filter((goal) => goal.enabled && !goal.locked).length,
);
</script>

<style scoped>
.settings-section {
  border-top: 1px solid #e5e7eb;
  padding: 26px 0 30px;
}

.settings-section:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.section-body {
  margin-top: 22px;
}

.goals-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 1080px) {
  .goals-grid {
    grid-template-columns: 1fr;
  }
}
</style>
