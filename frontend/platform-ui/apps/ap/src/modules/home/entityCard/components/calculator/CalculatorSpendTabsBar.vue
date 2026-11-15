<script setup lang="ts">
import { TabStrip } from "@progress/kendo-vue-layout";
import type { TabStripSelectEventArguments } from "@progress/kendo-vue-layout";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";

defineProps<{
  tabs: Array<any>;
  selectedTabIndex: number;
  showScenarios: boolean;
  isManualInputMode: boolean;
  loadingSpends: boolean;
  buyerHasEmptyValues: boolean;
  useFeaturePaymentTermsvsPrice: boolean;
}>();

const emit = defineEmits<{
  "select-tab": [event: TabStripSelectEventArguments];
  "toggle-scenarios": [];
}>();
</script>

<template>
  <div class="row mb-2">
    <div class="col-10 d-flex align-items-center justify-content-between" v-if="!isManualInputMode && !loadingSpends && !buyerHasEmptyValues && useFeaturePaymentTermsvsPrice">
      <div class="tabstrip-container">
        <TabStrip v-if="tabs.length > 1" @select="emit('select-tab', $event)" :selected="selectedTabIndex" :tabs="tabs" id="kendo-k-tabstrib-items-entiticard-calculator">
          <template v-slot:program="{ props }"><span class="inProgram results-tabs">{{props.title}} </span></template>
          <template v-slot:noBelongProgram="{ props }"><span class="outProgram results-tabs">{{props.title}}</span></template>
        </TabStrip>
      </div>
    </div>
    <div class="col-2 d-flex justify-content-end" v-if="!isManualInputMode && !loadingSpends">
      <button class="btn outline-secondary-btn font-md" id="show-hide-scenarios-btn" style="z-index: 1;" @click="emit('toggle-scenarios')"><span>{{  showScenarios ? 'Hide Scenarios' : 'Show Scenarios' }}</span></button>
      <CalculumTooltipIcon :infoText="'Show/Hide any saved scenarios for the calculator. Scenarios can be saved to compare potential results with different variables.'" :advancedTooltipClass="false" :extraMargin="'mr-2 mt-2'"></CalculumTooltipIcon>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.tabstrip-container {
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap !important;
  flex-wrap: nowrap !important;

  &::-webkit-scrollbar {
    height: 0.6rem;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: $scrollbar-thumb !important;

    &:hover {
      cursor: pointer;
    }
  }
}
</style>
