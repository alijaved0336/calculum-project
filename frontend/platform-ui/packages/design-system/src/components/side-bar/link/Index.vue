<script setup lang="ts">
import { computed } from "vue";
import InlineSvg from "vue-inline-svg";
import { resolveSvgAsset } from "@ada/design-system/utils/svgAssets";
import TooltipButton from "../../primitives/tooltip-button/Index.vue";

defineOptions({
  name: "SideBarLink",
});

const props = defineProps<{
  icon: string;
  title: string;
  isActive: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();

const iconSrc = computed(() => resolveSvgAsset(props.icon));
</script>

<template>
  <TooltipButton
    :text="title"
    position="right"
  >
    <a
      class="sidebar-link"
      :class="{ active: isActive }"
      :title="title"
      :aria-label="title"
      href="#"
      @click.prevent="emit('click')"
    >
      <span class="container-icon">
        <InlineSvg
          :src="iconSrc"
          width="24"
          height="24"
        />
      </span>
    </a>
  </TooltipButton>
</template>

<style lang="scss" scoped>
.sidebar-link {
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-default);
  border: none;
  width: max-content;
  color: var(--color-text-navigation);

  .container-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 6px;
    transition: var(--transition-default);
    pointer-events: none;
  }

  &.active,
  &:hover {
    .container-icon {
      color: var(--color-text-navigation-2);
      background: var(--bg-navigation-active-item);
    }
  }
}
</style>
