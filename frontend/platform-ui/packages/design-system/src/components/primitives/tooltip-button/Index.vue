<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  useId,
  watch,
} from "vue";
import InlineSvg from "vue-inline-svg";
import {
  Tooltip,
  type TooltipPositionEvent,
} from "@progress/kendo-vue-tooltip";
import questionTooltipUrl from "@ada/design-system/assets/icons/question-tooltip.svg?url";
import {
  TOOLTIP_BUTTON_FALLBACK_TEXT,
  type TooltipPosition,
} from "./types";

defineOptions({
  name: "TooltipButton",
});

const props = withDefaults(
  defineProps<{
    /**
     * Plain-text popup content. Also used as the trigger `title` / accessible
     * name when `#content` is provided (Kendo needs a non-empty title to open).
     * Hidden when both `text` and `#content` are empty.
     */
    text?: string;
    /**
     * Accessible name / Kendo `title` when `text` is empty and `#content` is used.
     */
    fallbackText?: string;
    /** Kendo Tooltip position relative to the trigger. */
    position?: TooltipPosition;
  }>(),
  {
    text: "",
    fallbackText: TOOLTIP_BUTTON_FALLBACK_TEXT,
    position: "top",
  },
);

/** Matches Kendo tooltip gap; keep popup aligned to the device viewport. */
const POPUP_HOST_CLASS = "tooltip-button-popup-host";
const VIEWPORT_MARGIN_PX = 8;
const ANCHOR_GAP_PX = 10;

type Placement = "top" | "bottom" | "left" | "right";

type PopupCoords = { top: number; left: number };

/**
 * Kendo types `defaultPosition` as `TooltipPosition` (string), but runtime
 * `resetPosition` passes `{ top, left }` from `setPosition`.
 */
function fallbackCoords(event: TooltipPositionEvent): PopupCoords {
  const value = event.defaultPosition as unknown;
  if (
    value &&
    typeof value === "object" &&
    "top" in value &&
    "left" in value &&
    typeof (value as PopupCoords).top === "number" &&
    typeof (value as PopupCoords).left === "number"
  ) {
    return value as PopupCoords;
  }
  return { top: 0, left: 0 };
}

defineSlots<{
  /**
   * Trigger. Defaults to the question-mark icon button.
   * Custom triggers should set `title` (and `aria-label` when there is no
   * visible text). TooltipButton also copies `text` / `fallbackText` onto a
   * wrapper and the slotted root if `title` is missing, so Kendo can still open.
   */
  default?: () => unknown;
  /**
   * Structured popup (headings, lists, CustomButton, …).
   * Replaces the plain `text` popup when present. Driven in controlled mode
   * so pointer, keyboard, and touch can reach interactive children.
   */
  content?: () => unknown;
}>();

const CLOSE_DELAY_MS = 200;
const INTERACTIVE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const hasText = computed(() => Boolean(props.text?.trim()));

/** Kendo only opens when the target (or a parent) has a non-empty `title`. */
const triggerLabel = computed(() => {
  const trimmed = props.text?.trim();
  if (trimmed) {
    return trimmed;
  }
  return props.fallbackText?.trim() || TOOLTIP_BUTTON_FALLBACK_TEXT;
});

const popupInstanceClass = `tooltip-button-popup-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
const richPopupClassName = `tooltip-button__popup tooltip-button__popup--rich ${popupInstanceClass}`;
const plainPopupClassName = `tooltip-button__popup ${popupInstanceClass}`;

const documentBody = typeof document !== "undefined" ? document.body : null;

const triggerRef = ref<HTMLElement | null>(null);
const triggerTarget = computed(() => triggerRef.value ?? undefined);
const isOpen = ref(false);
const stickyOpen = ref(false);
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let openedByThisFocus = false;
let suppressFocusOpen = false;
let popupRoleObserver: MutationObserver | null = null;

function placementOrder(position: TooltipPosition): Placement[] {
  switch (position) {
    case "bottom":
      return ["bottom", "top", "right", "left"];
    case "left":
      return ["left", "right", "top", "bottom"];
    case "right":
      return ["right", "left", "top", "bottom"];
    case "auto":
      return ["top", "bottom", "right", "left"];
    case "top":
    default:
      return ["top", "bottom", "right", "left"];
  }
}

function coordsForPlacement(
  placement: Placement,
  target: DOMRect,
  tipWidth: number,
  tipHeight: number,
): PopupCoords {
  switch (placement) {
    case "bottom":
      return {
        left: target.left + target.width / 2 - tipWidth / 2,
        top: target.bottom + ANCHOR_GAP_PX,
      };
    case "left":
      return {
        left: target.left - tipWidth - ANCHOR_GAP_PX,
        top: target.top + target.height / 2 - tipHeight / 2,
      };
    case "right":
      return {
        left: target.right + ANCHOR_GAP_PX,
        top: target.top + target.height / 2 - tipHeight / 2,
      };
    case "top":
    default:
      return {
        left: target.left + target.width / 2 - tipWidth / 2,
        top: target.top - tipHeight - ANCHOR_GAP_PX,
      };
  }
}

function overflowArea(
  coords: PopupCoords,
  tipWidth: number,
  tipHeight: number,
): number {
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const leftOverflow = Math.max(0, VIEWPORT_MARGIN_PX - coords.left);
  const topOverflow = Math.max(0, VIEWPORT_MARGIN_PX - coords.top);
  const rightOverflow = Math.max(
    0,
    coords.left + tipWidth - (viewW - VIEWPORT_MARGIN_PX),
  );
  const bottomOverflow = Math.max(
    0,
    coords.top + tipHeight - (viewH - VIEWPORT_MARGIN_PX),
  );
  return leftOverflow + topOverflow + rightOverflow + bottomOverflow;
}

function clampToViewport(
  coords: PopupCoords,
  tipWidth: number,
  tipHeight: number,
): PopupCoords {
  const maxLeft = Math.max(
    VIEWPORT_MARGIN_PX,
    window.innerWidth - VIEWPORT_MARGIN_PX - tipWidth,
  );
  const maxTop = Math.max(
    VIEWPORT_MARGIN_PX,
    window.innerHeight - VIEWPORT_MARGIN_PX - tipHeight,
  );
  return {
    left: Math.min(Math.max(VIEWPORT_MARGIN_PX, coords.left), maxLeft),
    top: Math.min(Math.max(VIEWPORT_MARGIN_PX, coords.top), maxTop),
  };
}

/**
 * Kendo Tooltip uses viewport coords with `position: fixed`, but does not
 * flip/shift when a preferred side would overflow. Also `updated` measures
 * before appending to `body`, so transformed/overflow ancestors skew layout.
 * Resolve against the device viewport and keep the host on `document.body`.
 */
function resolveViewportPosition(
  target: HTMLElement,
  tipHost: HTMLElement,
  position: TooltipPosition,
): PopupCoords {
  if (tipHost.parentElement !== document.body) {
    document.body.append(tipHost);
  }

  const tipWidth = tipHost.offsetWidth;
  const tipHeight = tipHost.offsetHeight;
  const targetRect = target.getBoundingClientRect();

  let best: PopupCoords | undefined;
  let bestOverflow = Number.POSITIVE_INFINITY;

  for (const placement of placementOrder(position)) {
    const candidate = coordsForPlacement(
      placement,
      targetRect,
      tipWidth,
      tipHeight,
    );
    const overflow = overflowArea(candidate, tipWidth, tipHeight);
    if (overflow < bestOverflow) {
      best = candidate;
      bestOverflow = overflow;
    }
    if (overflow === 0) {
      break;
    }
  }

  return clampToViewport(
    best ?? { left: VIEWPORT_MARGIN_PX, top: VIEWPORT_MARGIN_PX },
    tipWidth,
    tipHeight,
  );
}

function onUpdatePosition(event: TooltipPositionEvent): PopupCoords {
  const { element, targetElement } = event;
  if (!element || !targetElement) {
    return fallbackCoords(event);
  }
  return resolveViewportPosition(targetElement, element, props.position);
}

function getPopupHost(): HTMLElement | null {
  const popup = getPopupElement();
  return popup?.closest<HTMLElement>(".k-animation-container") ?? null;
}

function repositionOpenPopup() {
  const host = getPopupHost();
  const target =
    triggerRef.value ??
    (host
      ? document.querySelector<HTMLElement>(
          `[aria-describedby="${getPopupElement()?.id ?? ""}"]`,
        )
      : null);
  if (!host || !target) {
    return;
  }
  const next = resolveViewportPosition(target, host, props.position);
  host.style.left = `${next.left}px`;
  host.style.top = `${next.top}px`;
}

function cancelClose() {
  if (closeTimer !== null) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function closeFully() {
  cancelClose();
  stickyOpen.value = false;
  openedByThisFocus = false;
  isOpen.value = false;
}

function focusAnchor() {
  suppressFocusOpen = true;
  const anchor = triggerRef.value;
  const focusable = anchor?.querySelector<HTMLElement>(INTERACTIVE_SELECTOR);
  (focusable ?? anchor)?.focus?.();
  void nextTick(() => {
    suppressFocusOpen = false;
  });
}

function scheduleClose() {
  if (stickyOpen.value) {
    return;
  }
  cancelClose();
  closeTimer = setTimeout(() => {
    closeTimer = null;
    if (!stickyOpen.value) {
      isOpen.value = false;
    }
  }, CLOSE_DELAY_MS);
}

function getPopupElement(): HTMLElement | null {
  const describedBy = triggerRef.value?.getAttribute("aria-describedby");
  if (describedBy) {
    const byId = document.getElementById(describedBy);
    if (byId) {
      return byId;
    }
  }
  return document.querySelector<HTMLElement>(`.${popupInstanceClass}`);
}

function isOverAnchorOrPopup(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if (triggerRef.value?.contains(target)) {
    return true;
  }
  if (target.closest(`.${popupInstanceClass}`)) {
    return true;
  }
  const container = target.closest(".k-animation-container");
  return Boolean(container?.querySelector(`.${popupInstanceClass}`));
}

function popupInteractives(): HTMLElement[] {
  const popup = getPopupElement();
  const content = popup?.querySelector(".k-tooltip-content");
  if (!content) {
    return [];
  }
  return Array.from(content.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR));
}

function applyPopupRole(popup: HTMLElement) {
  const content = popup.querySelector(".k-tooltip-content");
  if (!content?.querySelector(INTERACTIVE_SELECTOR)) {
    return;
  }
  popup.setAttribute("role", "dialog");
  if (
    !popup.getAttribute("aria-label") &&
    !popup.getAttribute("aria-labelledby")
  ) {
    popup.setAttribute("aria-label", triggerLabel.value);
  }
}

function disconnectPopupRoleObserver() {
  popupRoleObserver?.disconnect();
  popupRoleObserver = null;
}

async function syncPopupA11y() {
  await nextTick();
  await nextTick();
  disconnectPopupRoleObserver();
  const popup = getPopupElement();
  if (!popup) {
    return;
  }
  applyPopupRole(popup);
  popupRoleObserver = new MutationObserver(() => applyPopupRole(popup));
  popupRoleObserver.observe(popup, {
    attributes: true,
    attributeFilter: ["role"],
  });
  // Re-measure after rich content / max-width layout settles.
  repositionOpenPopup();
  requestAnimationFrame(() => repositionOpenPopup());
}

function onDocumentPointerOver(event: PointerEvent) {
  if (!isOpen.value) {
    return;
  }
  if (isOverAnchorOrPopup(event.target)) {
    cancelClose();
  }
}

function onDocumentPointerOut(event: PointerEvent) {
  if (!isOpen.value || stickyOpen.value) {
    return;
  }
  if (isOverAnchorOrPopup(event.relatedTarget)) {
    return;
  }
  if (isOverAnchorOrPopup(event.target)) {
    scheduleClose();
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!isOpen.value) {
    return;
  }
  if (isOverAnchorOrPopup(event.target)) {
    return;
  }
  closeFully();
}

function onDocumentFocusIn(event: FocusEvent) {
  if (!isOpen.value) {
    return;
  }
  if (isOverAnchorOrPopup(event.target)) {
    return;
  }
  closeFully();
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (!isOpen.value) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeFully();
    focusAnchor();
    return;
  }
  if (event.key === "Tab" && event.shiftKey) {
    const first = popupInteractives()[0];
    if (first && document.activeElement === first) {
      event.preventDefault();
      focusAnchor();
    }
  }
}

function bindOpenListeners() {
  document.addEventListener("pointerover", onDocumentPointerOver, true);
  document.addEventListener("pointerout", onDocumentPointerOut, true);
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  document.addEventListener("focusin", onDocumentFocusIn, true);
  document.addEventListener("keydown", onDocumentKeydown, true);
}

function unbindOpenListeners() {
  document.removeEventListener("pointerover", onDocumentPointerOver, true);
  document.removeEventListener("pointerout", onDocumentPointerOut, true);
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  document.removeEventListener("focusin", onDocumentFocusIn, true);
  document.removeEventListener("keydown", onDocumentKeydown, true);
}

function onAnchorPointerEnter() {
  cancelClose();
  isOpen.value = true;
}

function onAnchorClick() {
  cancelClose();
  if (openedByThisFocus) {
    openedByThisFocus = false;
    stickyOpen.value = true;
    isOpen.value = true;
    return;
  }
  if (isOpen.value && stickyOpen.value) {
    closeFully();
    return;
  }
  stickyOpen.value = true;
  isOpen.value = true;
}

function onAnchorFocusIn() {
  if (suppressFocusOpen) {
    return;
  }
  cancelClose();
  if (!isOpen.value) {
    openedByThisFocus = true;
    stickyOpen.value = true;
  }
  isOpen.value = true;
}

function onAnchorKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && isOpen.value) {
    event.preventDefault();
    closeFully();
    return;
  }
  if (event.key !== "Tab" || event.shiftKey || !isOpen.value) {
    return;
  }
  const first = popupInteractives()[0];
  if (!first) {
    return;
  }
  event.preventDefault();
  first.focus();
}

function onKendoOpen() {
  void syncPopupA11y();
}

function onKendoClose() {
  if (isOpen.value) {
    void syncPopupA11y();
  }
}

watch(
  [triggerRef, triggerLabel, isOpen],
  () => {
    const root = triggerRef.value?.firstElementChild;
    if (!(root instanceof HTMLElement)) {
      return;
    }
    if (!root.getAttribute("title")) {
      root.setAttribute("title", triggerLabel.value);
    }
    root.setAttribute("aria-haspopup", "dialog");
    root.setAttribute("aria-expanded", isOpen.value ? "true" : "false");
  },
  { flush: "post" },
);

watch(isOpen, (open) => {
  if (open) {
    bindOpenListeners();
    void syncPopupA11y();
    return;
  }
  unbindOpenListeners();
  disconnectPopupRoleObserver();
});

onBeforeUnmount(() => {
  closeFully();
  unbindOpenListeners();
  disconnectPopupRoleObserver();
});
</script>

<template>
  <div
    class="tooltip-button-wrapper"
    :class="{ 'tooltip-button-wrapper--contents': $slots.default }"
  >
    <Tooltip
      v-if="hasText || $slots.content"
      :open-delay="$slots.content ? 0 : 50"
      :open="$slots.content ? isOpen : undefined"
      :target-element="$slots.content ? triggerTarget : undefined"
      :anchor-element="'target'"
      :parent-title="true"
      :position="position"
      :content="$slots.content ? 'tooltipContent' : undefined"
      :class-name="POPUP_HOST_CLASS"
      :append-to="documentBody"
      :update-position="onUpdatePosition"
      :tooltip-class-name="$slots.content ? richPopupClassName : plainPopupClassName"
      :show-callout="false"
      @open="onKendoOpen"
      @close="onKendoClose"
    >
      <template
        v-if="$slots.content"
        #tooltipContent
      >
        <div class="tooltip-button__content">
          <slot name="content" />
        </div>
      </template>
      <div
        v-if="$slots.content"
        ref="triggerRef"
        class="tooltip-button__anchor"
        :title="triggerLabel"
        @pointerenter="onAnchorPointerEnter"
        @click="onAnchorClick"
        @focusin="onAnchorFocusIn"
        @keydown="onAnchorKeydown"
      >
        <slot>
          <button
            type="button"
            class="tooltip-button__trigger"
            :aria-label="triggerLabel"
            aria-haspopup="dialog"
            :aria-expanded="isOpen"
          >
            <InlineSvg
              class="tooltip-button__icon"
              :src="questionTooltipUrl"
              width="16"
              height="16"
              aria-hidden="true"
            />
          </button>
        </slot>
      </div>
      <slot v-else>
        <button
          type="button"
          class="tooltip-button__trigger"
          :title="triggerLabel"
          :aria-label="triggerLabel"
        >
          <InlineSvg
            class="tooltip-button__icon"
            :src="questionTooltipUrl"
            width="16"
            height="16"
            aria-hidden="true"
          />
        </button>
      </slot>
    </Tooltip>
    <slot v-else />
  </div>
</template>

<style lang="scss" scoped>
.tooltip-button-wrapper {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;

  /* Kendo Tooltip wraps the trigger in a plain block div; its line box (inherited line-height)
     sits the inline-flex icon below the text's center when placed next to a label. */
  > :deep(div) {
    display: inline-flex;
    align-items: center;
    line-height: 0;
  }
}

.tooltip-button__anchor {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  line-height: 0;
}

.tooltip-button__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  color: var(--color-text-interactive-button-default);
  transition: var(--transition-default);
  vertical-align: middle;

  &:hover,
  &:focus-visible {
    color: var(--color-text-interactive-button-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
    border-radius: 999px;
  }
}

.tooltip-button__icon {
  width: 1rem;
  height: 1rem;
  display: block;
  /* Kendo reads `title` from event.target — SVG must not steal hover */
  pointer-events: none;
}
</style>
