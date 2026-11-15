<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import InlineSvg from "vue-inline-svg";
import BodyText from "../primitives/typography/body-text/Index.vue";
import { resolveSvgAsset } from "@ada/design-system/utils/svgAssets";
import type { TabItem, TabsAppearance } from "./types";

defineOptions({
  name: "CustomTabs",
});

const props = withDefaults(
  defineProps<{
    items: TabItem[];
    modelValue: string;
    /** segmented = button-like active tab; underline = sliding active indicator */
    appearance?: TabsAppearance;
    /** Outer bordered tray around the tab group */
    contained?: boolean;
  }>(),
  {
    appearance: "segmented",
    contained: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [id: string];
}>();

const tablistRef = ref<HTMLElement | null>(null);
const indicator = ref({ x: 0, width: 0, visible: false });
const indicatorReady = ref(false);
let resizeObserver: ResizeObserver | null = null;

const isContained = computed(() => {
  if (props.contained !== undefined) {
    return props.contained;
  }
  return props.appearance === "segmented";
});

const rootClass = computed(() => [
  "ds-tabs",
  `ds-tabs--${props.appearance}`,
  { "ds-tabs--contained": isContained.value },
]);

function iconSrc(icon: string) {
  return resolveSvgAsset(icon);
}

function select(item: TabItem) {
  if (item.disabled || item.id === props.modelValue) {
    return;
  }
  emit("update:modelValue", item.id);
}

function updateIndicator() {
  if (props.appearance !== "underline") {
    indicator.value = { x: 0, width: 0, visible: false };
    return;
  }

  const root = tablistRef.value;
  const activeEl = root?.querySelector<HTMLElement>(".ds-tabs__tab--active");
  if (!root || !activeEl) {
    indicator.value = { x: 0, width: 0, visible: false };
    return;
  }

  const rootRect = root.getBoundingClientRect();
  const tabRect = activeEl.getBoundingClientRect();
  indicator.value = {
    x: tabRect.left - rootRect.left,
    width: tabRect.width,
    visible: true,
  };
}

function observeTabs() {
  resizeObserver?.disconnect();
  resizeObserver = null;

  const root = tablistRef.value;
  if (!root || props.appearance !== "underline") {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    updateIndicator();
  });
  resizeObserver.observe(root);
  root.querySelectorAll(".ds-tabs__tab").forEach((tab) => {
    resizeObserver?.observe(tab);
  });
}

async function layoutIndicator() {
  await nextTick();
  observeTabs();
  updateIndicator();

  if (indicator.value.visible && !indicatorReady.value) {
    requestAnimationFrame(() => {
      indicatorReady.value = true;
    });
  }
}

watch(
  () => [props.modelValue, props.items, props.appearance] as const,
  () => {
    if (props.appearance !== "underline") {
      indicatorReady.value = false;
    }
    void layoutIndicator();
  },
  { deep: true },
);

onMounted(() => {
  void layoutIndicator();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});
</script>

<template>
  <div
    ref="tablistRef"
    :class="rootClass"
    role="tablist"
  >
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      role="tab"
      class="ds-tabs__tab"
      :class="{ 'ds-tabs__tab--active': item.id === modelValue }"
      :aria-selected="item.id === modelValue"
      :disabled="item.disabled"
      @click="select(item)"
    >
      <span
        v-if="item.icon"
        class="ds-tabs__icon"
        aria-hidden="true"
      >
        <InlineSvg
          :src="iconSrc(item.icon)"
          width="16"
          height="16"
        />
      </span>
      <BodyText
        variant="sm"
        weight="medium"
        as="span"
      >
        {{ item.label }}
      </BodyText>
    </button>
    <span
      v-if="appearance === 'underline'"
      class="ds-tabs__indicator"
      :class="{
        'ds-tabs__indicator--ready': indicatorReady,
        'ds-tabs__indicator--hidden': !indicator.visible,
      }"
      :style="{
        width: `${indicator.width}px`,
        transform: `translateX(${indicator.x}px)`,
      }"
      aria-hidden="true"
    />
  </div>
</template>

<style lang="scss" scoped>
.ds-tabs {
  display: inline-flex;
  align-items: stretch;
  position: relative;
  gap: 0.25rem;
  font-family: var(--font-family-base);
  overflow: hidden;

  &--contained {
    &.ds-tabs--segmented {
      padding: 0.25rem;
    }
  }

  &__tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0.5rem 0.875rem;
    border: 1px solid transparent;
    background: transparent;
    color: var(--neutral-500);
    cursor: pointer;
    transition: var(--transition-default);
    white-space: nowrap;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    &--active,
    &:hover:not(:disabled):not(.ds-tabs__tab--active) {
      color: var(--neutral-700);
    }
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: currentColor;
  }

  &--segmented {
    background: var(--bg-surface-subtle-2);
    border: 1px solid var(--border-color-default);
    border-radius: var(--border-radius-2);

    .ds-tabs__tab {
      border-radius: var(--border-radius-2);
      &--active {
        background: var(--bg-surface);
        border-color: var(--border-color-default);
        box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
      }
    }

    &:not(.ds-tabs--contained) {
      .ds-tabs__tab {
        margin: -1px;

        &--active {
          background: var(--bg-surface);
        }
      }
    }
  }

  &--underline {
    overflow: visible;

    .ds-tabs__tab {
      padding: 0.625rem 0.25rem;
      border: none;
      border-radius: 0;
    }
  }

  &__indicator {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 2px;
    background: var(--neutral-700);
    pointer-events: none;

    &--ready {
      transition: var(--transition-default);
    }

    &--hidden {
      opacity: 0;
    }
  }
}
</style>
