<script setup lang="ts">
import { TabStrip } from "@progress/kendo-vue-layout";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import type { NegotiationHeaderLoading } from "@/modules/home/entityCard/types";

const programTabSlot = "program";
const noBelongProgramTabSlot = "noBelongProgram";

defineProps<{
  tabs: any[];
  selectedTabIndex: number;
  companyType: string;
  headerLoading: NegotiationHeaderLoading;
}>();

const emit = defineEmits<{
  select: [event: any];
}>();
</script>

<template>
  <div class="tabstrip-container">
    <TabStrip
      v-if="
        !headerLoading.inRecalculation &&
        companyType !== 'parent' &&
        companyType !== 'potential-parent'
      "
      id="kendo-k-tabstrib-items-entiticard-negotiation"
      :selected="selectedTabIndex"
      :tabs="tabs"
      @select="emit('select', $event)"
    >
      <template #[programTabSlot]="{ props }: { props: { title: string } }"
        ><span class="inProgram results-tabs">{{ props.title }}</span></template
      >
      <template
        #[noBelongProgramTabSlot]="{ props }: { props: { title: string } }"
      >
        <Tooltip
          :open-delay="100"
          :anchor-element="'target'"
          :position="'top'"
          ><span
            class="outProgram results-tabs"
            :title="'This Spend does not belong to a program'"
            >{{ props.title }}</span
          ></Tooltip
        >
      </template>
    </TabStrip>
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

#kendo-k-tabstrib-items-entiticard-negotiation
  > .k-tabstrip-items-wrapper
  > .k-tabstrip-items {
  flex-wrap: nowrap !important;
}
</style>
