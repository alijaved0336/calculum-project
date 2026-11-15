<template>
<div class="d-flex flex-column container-sections">
  <div class="container-top-sections" v-if="hasTop" :id="containerId">
    <slot name="slotTop"></slot>
  </div>
  <div class="d-flex">
    <div class="container-main-sections show-scroll" id="container-main-id" v-if="hasContainer" :class="extraContainerClass ? extraContainerClass : containerClass" ref="scrollableDiv" :style="{ 'width' : customWidth }">
      <slot name="slotContent"></slot>
      <component :is="'AppFooter'" v-if="showFooter"></component>
    </div>
    <div class="container-activity-sections" id="container-activity-id" v-if="hasActivity" :style="{ 'width' : customWidthActivity }">
      <slot name="activityContent"></slot>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";

// No footer component is statically imported here - each app registers its
// own, globally, under the name "AppFooter" (see each app's main.ts). Apps
// that don't register one simply render nothing for this slot.
export default defineComponent({
  name: "CalculumLayout",
  props: {
    forPotentialTheme: { type: Boolean, required: false, default: false },
    containerClass: { type: String, default: "" },
    containerId: { type: String, default: "" },
    showFooter: { type: Boolean, required: false, default: true },
    extraContainerClass: { type: String, required: false, default: null },
    customWidth: { type: String, required: false, default: '100%' },
    customWidthActivity: { type: String, required: false, default: '0%' },
  },
  emits: ["load-more-entities"],
  setup(props, { emit, slots }) {
    const scrollableDiv = ref<HTMLElement | null>(null);
    //- Flags for print only the slots with some content
    const hasTop = !!slots["slotTop"];
    const hasContainer = !!slots["slotContent"];
    const hasActivity = !!slots["activityContent"];


    onMounted(() => {
      //- To send the Action to load more cards in Home entity
      if (scrollableDiv.value) {
        scrollableDiv.value.addEventListener("scroll", getMoreCards);
      }
    });

    function getMoreCards(event: any) {
      if (scrollableDiv.value) {
        const div = scrollableDiv.value;
        const isAtEnd =
          div.scrollTop >= div.scrollHeight - div.clientHeight - 2;
        if (isAtEnd) {
          emit("load-more-entities");
        }
      }
    }

    return {
      hasTop,
      hasContainer,
      hasActivity,
      slots,
      scrollableDiv,
    };
  },
});
</script>
