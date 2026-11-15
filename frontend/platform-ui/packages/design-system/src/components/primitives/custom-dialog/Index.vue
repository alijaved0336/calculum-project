<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import InlineSvg from "vue-inline-svg";
import { Dialog, DialogActionsBar } from "@progress/kendo-vue-dialogs";
import { keepFocusInContainer } from "@progress/kendo-vue-common";
import { resolveSvgAsset } from "@ada/design-system/utils/svgAssets";
import { CustomButton } from "../custom-button";
import BodyText from "../typography/body-text/Index.vue";

defineOptions({
  name: "CustomDialog",
});

const props = withDefaults(
  defineProps<{
    /**
     * Controlled open state. Bind with `v-model:visible`.
     * The dialog does not store open/closed state internally — the parent owns it.
     */
    visible?: boolean;
    title: string;
    width?: string | number;
    closeIcon?: boolean;
    modal?: boolean;
    closeOnOverlayClick?: boolean;
    /**
     * Centered Calculum logo and wrapping title in the content (Figma confirm card).
     * Close stays top-right overlay; actions stack full-width. Titlebar is hidden.
     */
    showLogo?: boolean;
    /**
     * Design-system icon name (resolved via `resolveSvgAsset`), shown in a rounded badge to the
     * left of the title, left-aligned, in place of the native title bar - a second "hidden
     * titlebar" header shape alongside `showLogo`'s, for a dialog whose title needs an icon of
     * its own rather than the fixed Calculum logo. Independent of `showLogo`; the two are not
     * meant to be combined.
     */
    icon?: string;
    /** Actions stacked full-width (primary on top), as the Figma "Condition Settings" card, without `showLogo`'s header. */
    stackedActions?: boolean;
  }>(),
  {
    visible: false,
    width: 450,
    closeIcon: true,
    modal: true,
    closeOnOverlayClick: true,
    showLogo: false,
    icon: undefined,
    stackedActions: false,
  },
);

const logoSrc = resolveSvgAsset("logo-calculum");
const iconSrc = computed(() => (props.icon ? resolveSvgAsset(props.icon) : ""));
const dialogClass = computed(() => {
  const stacked = props.stackedActions ? " ds-custom-dialog--stacked-actions" : "";
  if (props.showLogo) return `ds-custom-dialog ds-custom-dialog--logo${stacked}`;
  if (props.icon) return `ds-custom-dialog ds-custom-dialog--icon-header${stacked}`;
  return `ds-custom-dialog${stacked}`;
});
const actionsOrientation = computed(() =>
  props.showLogo || props.stackedActions ? "vertical" : "horizontal",
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  close: [];
}>();

const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
const titleId = `ds-custom-dialog-title-${instanceId}`;
const wrapperId = `ds-custom-dialog-${instanceId}`;
const closeLayerTarget = ref<HTMLElement | null>(null);

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

let previouslyFocused: HTMLElement | null = null;

function getWrapper(): HTMLElement | null {
  return document.getElementById(wrapperId);
}

function open() {
  emit("update:visible", true);
}

function onClose() {
  emit("update:visible", false);
  emit("close");
}

function onCloseClick(event: MouseEvent) {
  event.preventDefault();
  onClose();
}

function onOverlayClick() {
  if (props.closeOnOverlayClick) {
    onClose();
  }
}

function detachCloseLayer() {
  closeLayerTarget.value = null;
}

/** Tab trap only — Escape is handled by Kendo Dialog via `@close`. */
function onDocumentKeyDown(event: KeyboardEvent) {
  const wrapper = getWrapper();
  if (!wrapper) {
    return;
  }
  keepFocusInContainer(event, wrapper);
}

async function activateDialog() {
  await nextTick();
  await nextTick();

  if (!props.visible) {
    return;
  }

  const wrapper = getWrapper();
  if (!wrapper) {
    return;
  }

  if (props.closeIcon) {
    closeLayerTarget.value =
      wrapper.querySelector<HTMLElement>(".ds-custom-dialog");
    await nextTick();
    if (!props.visible) {
      return;
    }
  }

  const focusTarget =
    wrapper.querySelector<HTMLElement>(".ds-custom-dialog__close") ??
    wrapper.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
    wrapper;

  focusTarget.focus();
  document.addEventListener("keydown", onDocumentKeyDown, true);
}

function deactivateDialog() {
  detachCloseLayer();
  document.removeEventListener("keydown", onDocumentKeyDown, true);
  previouslyFocused?.focus?.();
  previouslyFocused = null;
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      void activateDialog();
      return;
    }
    deactivateDialog();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  deactivateDialog();
});
</script>

<template>
  <div class="ds-custom-dialog-host">
    <slot
      name="trigger"
      :open="open"
    />

    <Dialog
      v-if="visible"
      :id="titleId"
      :wrapper-id="wrapperId"
      :title="title"
      :width="width"
      :close-icon="false"
      :modal="modal"
      :dialog-class="dialogClass"
      @close="onClose"
      @overlayclick="onOverlayClick"
    >
      <div
        v-if="icon"
        class="ds-custom-dialog__icon-header"
      >
        <div class="ds-custom-dialog__icon-badge">
          <InlineSvg
            :src="iconSrc"
            width="20"
            height="20"
            aria-hidden="true"
          />
        </div>
        <BodyText
          class="ds-custom-dialog__icon-header-title"
          variant="lg"
          weight="semibold"
          as="p"
        >
          {{ title }}
        </BodyText>
      </div>
      <div
        v-if="showLogo || $slots.default"
        class="ds-custom-dialog__body"
      >
        <div
          v-if="showLogo"
          class="ds-custom-dialog__logo"
        >
          <InlineSvg
            :src="logoSrc"
            width="40"
            height="40"
            aria-hidden="true"
          />
        </div>
        <BodyText
          v-if="showLogo"
          class="ds-custom-dialog__content-title"
          variant="xl"
          weight="semibold"
          as="p"
        >
          {{ title }}
        </BodyText>
        <slot />
      </div>
      <DialogActionsBar
        v-if="$slots.actions"
        :orientation="actionsOrientation"
        layout="stretched"
      >
        <slot name="actions" />
      </DialogActionsBar>
    </Dialog>

    <Teleport
      v-if="visible && closeIcon && closeLayerTarget"
      :to="closeLayerTarget"
    >
      <CustomButton
        class="ds-custom-dialog__close"
        text="Close"
        variant="plain"
        icon="cross"
        :show-label="false"
        @click="onCloseClick"
      />
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.ds-custom-dialog-host {
  display: contents;
}
</style>
