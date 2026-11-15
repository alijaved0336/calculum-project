<template>
  <div
    class="d-inline on-hover-svg"
    @click="popoverShowAdvancedTooltip"
  >
    <button class="rounded-lg transition-colors on-hover-svg">
      <slot></slot>
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent, onMounted, onUnmounted } from "vue";
import usePopoverComposable from "@/composables/usePopoverComposable";
import * as clickOutsideRelated from "@/utils/clickOutsideRelated";

export default defineComponent({
  name: "ButtonIconStandard",
  components: {},
  props: {
    uniqueIdentifier: { type: String, default: "" },
    keyPopOver: { type: String, default: "" },
    ignorePopOver: { type: Boolean, default: false },
    popOverBody: { type: String, required: false, default: "" },
  },
  emits: ["click", "clicked"],
  setup(props, { emit }) {
    // Get popover based on key. Send the unique identifier.
    const popover = usePopoverComposable(
      props.uniqueIdentifier,
      props.keyPopOver,
      props.popOverBody,
    );

    function popoverShowAdvancedTooltip() {
      // Re-emit the click event
      emit("click");

      //- To hide the default tooltip
      emit("clicked");

      //- To hide the other tooltips opened
      const toHideTooltips: any | null =
        document.getElementById("header-calculum");
      if (toHideTooltips !== null) {
        toHideTooltips.click();
      }

      // Check if popover and popoverComposable exist before calling start
      if (popover && popover.popoverComposable && typeof popover.popoverComposable.start === 'function') {
        popover.popoverComposable.start();
      } else if (import.meta.env.DEV) {
        console.warn('Popover or popoverComposable is not properly initialized');
      }
    }

    function handleClickTooltip(e: any) {
      const clickedInside = clickOutsideRelated.menuPopup(
        e,
        ".tooltipIcon",
        ".shepherd-content",
      );

      if (clickedInside !== undefined) {
        if (!clickedInside) {
          // Check if popover or popover.popoverComposable is defined
          if (
            popover &&
            popover.popoverComposable &&
            popover.popoverComposable.cancel
          ) {
            popover.popoverComposable.cancel();
          }
          return true;
        }
      }
    }

    onMounted(() => {
      // Check if props.ignorePopOver is defined and not false
      if (props && props.ignorePopOver === false) {
        document.addEventListener("click", handleClickTooltip);
      }
    });

    onUnmounted(() => {
      // Check if popover, popover.popoverComposable, and the cancel method are defined
      if (
        popover &&
        popover.popoverComposable &&
        popover.popoverComposable.cancel
      ) {
        popover.popoverComposable.cancel();
      }

      // Ensure props and the click listener were previously set up before trying to remove it
      if (props && props.ignorePopOver === false) {
        document.removeEventListener("click", handleClickTooltip);
      }
    });

    return {
      popoverShowAdvancedTooltip,
    };
  },
});
</script>
<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

button {
  position: relative;
    /* margin-top: 0.5rem; */
    background: none;
    border: none;
    justify-content: center;
    /* display: inline-flex; */
    /* padding: 3px 0.35rem; */


  &:hover {
    background-color: $color-primary-100;
  }
}
</style>
