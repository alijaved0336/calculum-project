<script setup lang="ts">
import { Skeleton } from "@progress/kendo-vue-indicators";
import ScenariosCards from "@/modules/home/entityCard/components/ScenariosCards.vue";
import { StringUtils } from "@/utils";
import type { CalculatorScenariosSidebarState } from "@/modules/home/entityCard/components/calculator/calculator-view-types";

defineProps<{
  state: CalculatorScenariosSidebarState;
}>();

const emit = defineEmits<{
  "new-scenario": [];
  "update-scenario": [];
  setSelectedScenario: [scenario: any];
  deleteScenario: [id: string];
}>();
</script>

<template>
  <div class="col-xl-2 d-flex flex-column">
    <button class="btn btn-primary font-md mb-4" id="new-scenario-btn" style="z-index: 1;" @click="emit('new-scenario')"><span>{{ 'Save New Scenario' }}</span></button>
    <button class="btn btn-primary font-md mb-4" v-if="state.userInputIsDirty && !StringUtils.isNullUndefinedOrEmpty(state.selectedScenario)" style="z-index: 1;"><span @click="emit('update-scenario')">{{ 'Update the Selected Scenario' }}</span></button>
    <div class="scenarios-container show-scroll" v-if="!state.someScenarioApiRequest">
      <template v-for="scenario in state.scenariosByConfig">
        <ScenariosCards :selected-scenario="state.selectedScenario ?? undefined" :scenarios="scenario" @setSelectedScenario="emit('setSelectedScenario', $event)" @deleteScenario="emit('deleteScenario', $event)"></ScenariosCards>
      </template>
      <p class="text-center text-gray-500 font-semibold" v-if="state.scenariosByConfig.length === 0">{{ "There's no scenarios saved you can start saving new one." }}</p>
    </div>
    <div class="card card-skeleton d-flex gap-2" v-else>
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '20px', borderRadius:'8px' }"></Skeleton>
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '45%', height: '20px', borderRadius:'8px' }"></Skeleton>
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '45%', height: '20px', borderRadius:'8px' }"></Skeleton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.scenarios-container {
    width: 100%;
    height: calc(100vh - 250px);
    max-height: calc(100vh - 250px);
    overflow: auto;
}
.card-skeleton {
  min-height: 100px !important;
}
</style>
