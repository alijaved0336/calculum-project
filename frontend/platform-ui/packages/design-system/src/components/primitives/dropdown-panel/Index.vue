<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import { Popup } from "@progress/kendo-vue-popup";
import type { DropdownPanelAlign, DropdownPanelPlacement } from "./types";
import {
  extractOutsideClickTarget,
  isInsideNestedChildPanel,
  registerDropdownPanel,
  unregisterDropdownPanel,
} from "./nesting";

defineOptions({
  name: "DropdownPanel",
});

/**
 * Composition shell around Kendo Popup.
 * Positioning / outside-click → Kendo. Open state + slots → us.
 *
 * Script setup does not put template refs on `$refs` the way Options API does,
 * so we set Kendo’s `kendoAnchorRef` on the instance (supported Popup lookup).
 */
const props = withDefaults(
  defineProps<{
    open?: boolean;
    align?: DropdownPanelAlign;
    /**
     * Popup attachment: `bottom` (default) under the trigger;
     * `side` to the right (submenu / nested panels).
     */
    placement?: DropdownPanelPlacement;
    /** Force outer panel width to match the trigger. Ignored when `panelWidth` is set. */
    matchTriggerWidth?: boolean;
    /**
     * Exact outer panel width (`280`, `"280px"`, `"18rem"`, …).
     * Takes precedence over `matchTriggerWidth`.
     */
    panelWidth?: string | number;
    /** Stretch root + trigger to 100% of parent (list-row submenu triggers). */
    block?: boolean;
    disabled?: boolean;
    closeOnOutsideClick?: boolean;
    closeOnEscape?: boolean;
  }>(),
  {
    open: false,
    align: "start",
    placement: "bottom",
    matchTriggerWidth: false,
    panelWidth: undefined,
    block: false,
    disabled: false,
    closeOnOutsideClick: true,
    closeOnEscape: true,
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const anchor = ref<HTMLElement | null>(null);
const contentEl = ref<HTMLElement | null>(null);
const instance = getCurrentInstance();
const panelId = Symbol("dropdown-panel");

watch(
  anchor,
  (el) => {
    const proxy = instance?.proxy as { kendoAnchorRef?: HTMLElement | null } | null;
    if (proxy) {
      proxy.kendoAnchorRef = el;
    }
  },
  { immediate: true },
);

const triggerWidthPx = ref(0);
const isOpen = computed(() => props.open && !props.disabled);
const collision = computed(() =>
  props.placement === "side"
    ? { horizontal: "flip", vertical: "flip" }
    : { horizontal: "none", vertical: "flip" },
);

const anchorAlign = computed(() => {
  if (props.placement === "side") {
    return { horizontal: "right", vertical: "top" };
  }
  return {
    horizontal: props.align === "end" ? "right" : "left",
    vertical: "bottom",
  };
});

const popupAlign = computed(() => {
  if (props.placement === "side") {
    return { horizontal: "left", vertical: "top" };
  }
  return {
    horizontal: props.align === "end" ? "right" : "left",
    vertical: "top",
  };
});

/** Outer `.ds-dropdown-surface` / `.k-popup` width (padding + border included). */
const resolvedPanelWidth = computed(() => {
  const explicit = normalizePanelWidth(props.panelWidth);
  if (explicit) {
    return explicit;
  }
  if (!props.matchTriggerWidth || !triggerWidthPx.value) {
    return undefined;
  }
  return `${triggerWidthPx.value}px`;
});

const popupClass = computed(() =>
  resolvedPanelWidth.value
    ? "ds-dropdown-surface ds-dropdown-surface--sized"
    : "ds-dropdown-surface",
);

/**
 * Lands on the animation container (Kendo ignores `style` on `.k-popup`).
 * The surface inherits it; `syncSurfaceWidthVar` also sets it on `.k-popup`.
 */
const popupCssVars = computed(() => {
  const width = resolvedPanelWidth.value;
  if (!width) {
    return undefined;
  }
  return { "--ds-dropdown-panel-width": width };
});

/**
 * Pixel box for Kendo Popup `calculatePosition`: it copies the default slot’s
 * inline `style` onto the hidden clone. Do not use this for inner layout —
 * `--fill` keeps content at 100% so padding/border stay inside the trigger.
 */
const measureStyle = computed(() => {
  const width = resolvedPanelWidth.value;
  if (!width) {
    return undefined;
  }
  return {
    width,
    minWidth: width,
    maxWidth: width,
    boxSizing: "border-box" as const,
  };
});

const slotScope = computed(() => ({
  close,
  open: isOpen.value,
}));

function normalizePanelWidth(value: string | number | undefined): string | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  return typeof value === "number" ? `${value}px` : value;
}

function syncTriggerWidth() {
  const el = anchor.value;
  if (el) {
    triggerWidthPx.value = el.getBoundingClientRect().width;
  }
}

function syncSurfaceWidthVar() {
  const surface = contentEl.value?.parentElement;
  if (!(surface instanceof HTMLElement)) {
    return;
  }
  const width = resolvedPanelWidth.value;
  if (width) {
    surface.style.setProperty("--ds-dropdown-panel-width", width);
  } else {
    surface.style.removeProperty("--ds-dropdown-panel-width");
  }
}

function setOpen(next: boolean) {
  if (props.disabled) {
    return;
  }
  if (next && props.matchTriggerWidth) {
    syncTriggerWidth();
  }
  emit("update:open", next);
}

function toggle() {
  setOpen(!props.open);
}

function openPanel() {
  setOpen(true);
}

function close() {
  if (!props.disabled) {
    emit("update:open", false);
  }
}

function syncRegistry() {
  if (!isOpen.value) {
    return;
  }
  registerDropdownPanel({
    id: panelId,
    getAnchor: () => anchor.value,
    getContent: () => contentEl.value,
    close,
    closeOnEscape: props.closeOnEscape,
    closeOnOutsideClick: props.closeOnOutsideClick,
  });
}

/**
 * Kendo fires this for outside mousedown.
 * When the anchor was clicked, skip — `toggle` on the trigger owns that click.
 * Clicks inside a nested child panel (portaled) must not close this parent.
 */
function onMouseDownOutside(event: {
  isAnchorClicked?: boolean;
  event?: MouseEvent;
  originalEvent?: MouseEvent;
  target?: EventTarget | null;
}) {
  if (!props.closeOnOutsideClick || props.disabled || event.isAnchorClicked) {
    return;
  }
  const target = extractOutsideClickTarget(event);
  if (isInsideNestedChildPanel(panelId, target)) {
    return;
  }
  close();
}

watch(isOpen, (openNow) => {
  if (openNow) {
    if (props.matchTriggerWidth) {
      syncTriggerWidth();
    }
    syncRegistry();
  } else {
    unregisterDropdownPanel(panelId);
  }
});

watch([isOpen, resolvedPanelWidth], ([openNow, width]) => {
  if (!openNow || !width) {
    return;
  }
  void nextTick(syncSurfaceWidthVar);
});

watch(
  () => [props.closeOnEscape, props.closeOnOutsideClick] as const,
  () => {
    syncRegistry();
  },
);

watch(
  () => props.disabled,
  (disabledNow) => {
    if (disabledNow && props.open) {
      emit("update:open", false);
    }
  },
);

onBeforeUnmount(() => {
  unregisterDropdownPanel(panelId);
});

defineExpose({ open: openPanel, close, toggle });
</script>

<template>
  <div
    class="ds-dropdown-panel"
    :class="{
      'ds-dropdown-panel--open': isOpen,
      'ds-dropdown-panel--disabled': disabled,
      'ds-dropdown-panel--block': block,
      'ds-dropdown-panel--side': placement === 'side',
    }"
    :aria-disabled="disabled || undefined"
  >
    <div
      ref="anchor"
      class="ds-dropdown-panel__trigger"
    >
      <slot
        name="trigger"
        :open="isOpen"
        :disabled="disabled"
        :toggle="toggle"
        :close="close"
      />
    </div>

    <Popup
      anchor="anchor"
      :show="isOpen"
      :animate="true"
      :anchor-align="anchorAlign"
      :popup-align="popupAlign"
      :collision="collision"
      :popup-class="popupClass"
      :style="popupCssVars"
      @mousedownoutside="onMouseDownOutside"
    >
      <div
        ref="contentEl"
        class="ds-dropdown-panel__content"
        :class="{ 'ds-dropdown-panel__content--fill': Boolean(resolvedPanelWidth) }"
        :style="measureStyle"
      >
        <template v-if="$slots.header">
          <div class="ds-dropdown-surface__header">
            <slot
              name="header"
              v-bind="slotScope"
            />
          </div>
          <hr class="ds-dropdown-surface__divider">
        </template>

        <div class="ds-dropdown-panel__body">
          <slot v-bind="slotScope" />
        </div>

        <template v-if="$slots.footer">
          <hr class="ds-dropdown-surface__divider">
          <div class="ds-dropdown-surface__footer">
            <slot
              name="footer"
              v-bind="slotScope"
            />
          </div>
        </template>
      </div>
    </Popup>
  </div>
</template>

<style lang="scss" scoped>
.ds-dropdown-panel {
  position: relative;
  display: inline-flex;
  width: max-content;
  max-width: 100%;
  vertical-align: top;

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--block {
    display: flex;
    width: 100%;
    max-width: none;

    .ds-dropdown-panel__trigger {
      display: flex;
      width: 100%;

      > :deep(*) {
        width: 100%;
      }
    }
  }

  &__trigger {
    display: inline-flex;
    max-width: 100%;
  }

  &__content {
    box-sizing: border-box;
    min-width: 0;

    /* Beat `measureStyle` inline width (Kendo clone only) so chrome is not added outside. */
    &--fill {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }
  }

  &__body {
    min-width: 0;
  }
}
</style>
