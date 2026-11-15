<template>
  <div class="accordion-item">
    <div
      :class="[
        'accordion-header',
        { 'parent-header': isParent, 'item-header': !isParent },
      ]"
      :aria-expanded="isOpen.toString()"
      @click="toggle"
    >
      <slot name="header"></slot>
    </div>
    <div
      v-if="isOpen"
      :class="[
        'accordion-body',
        { 'parent-body': isParent, 'item-body': !isParent },
      ]"
    >
      <slot name="body"></slot>
    </div>
    <div
      v-if="isParent"
      class="accordion-footer"
    >
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
  name: "AccordionItem",
  props: {
    initiallyOpen: {
      type: Boolean,
      default: false,
    },
    isParent: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const isOpen = ref(props.initiallyOpen);

    const toggle = () => {
      isOpen.value = !isOpen.value;
    };

    return { isOpen, toggle };
  },
});
</script>

<style lang="scss">
/** No scoped */

@import "src/resources/assets/styles/variables/colors";

.accordion-item {
  width: 100%;
}

.accordion-header {
  padding: 10px 0px;
  cursor: pointer;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.accordion-footer {
  cursor: unset;
  display: flex;
  gap: 1rem;
  align-items: center;
  border-radius: 0px 0px 8px 8px;
  border: 1px solid $color-gray-200;
  background: $color-gray-50;
  justify-content: space-between;
  padding: 10px 24px 10px 1rem;
}

.accordion-body {
  background-color: white;
}

.accordion-header::before {
  content: "▼";
  transform: rotate(-180deg);
  transition: transform 0.2s ease-in-out;
  font-size: 12px;
  color: $color-gray-500;
}

.accordion-header[aria-expanded="true"]::before {
  transform: rotate(0deg);
}

.parent-header {
  border-radius: 8px 8px 0px 0px;
  border-top: 1px solid $color-gray-200;
  border-right: 1px solid $color-gray-200;
  border-left: 1px solid $color-gray-200;
  background: var(--gray-50, #f9fafb);
  padding-left: 1rem;
}

.item-header {
  border-top: 1px solid $color-gray-200;
  border-bottom: 1px solid $color-gray-200;
  border-right: 1px solid $color-gray-200;
  border-left: 1px solid $color-gray-200;
  background: $color-gray-25;
  padding-left: 2rem;
}

.item-line {
  display: flex;
  justify-content: space-between;
  padding: 10px 24px 10px 60px;
  align-items: center;
  gap: 8px;
  align-self: stretch;
  border: 1px solid $color-gray-200;
  border-top: unset !important;
  background: var(--col-6, #fff);
}

.last-line {
  border-bottom: unset !important;
  border-top: unset !important;
}

.total-item {
  padding: 10px 24px 10px 50px;
}
</style>
