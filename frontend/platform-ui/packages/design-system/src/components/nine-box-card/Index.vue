<script setup lang="ts">
import { computed } from "vue";
import BodyText from "../primitives/typography/body-text/Index.vue";
import {
  NINE_BOX_CARD_ACCENT_TOKENS,
  type NineBoxCardAccent,
  type NineBoxCardRow,
} from "./types";

defineOptions({
  name: "NineBoxCard",
});

const props = withDefaults(
  defineProps<{
    /** Big circular badge content (e.g. a rank or a count). */
    badge: string | number;
    /** Card title. AP's own card has no separate title — its first row's label
     * doubles as one — so this is optional and renders nothing when omitted. */
    title?: string;
    /** Label / value metric rows shown below the title. */
    rows?: NineBoxCardRow[];
    /** Color family driving the card's background and selected-state accents. */
    accent: NineBoxCardAccent;
    /** Selection state — recolors the card to a white surface with an accent border. */
    selected?: boolean;
    /** `false` disables hover/cursor/click (AP's "not selectable" box, and its
     * separate read-only Value Proposition context) without necessarily dimming it —
     * see `muted`. */
    clickable?: boolean;
    /** `true` renders the dimmed, opacity-0.5 look (AP's "not selectable" box
     * specifically — its read-only Value Proposition context sets `clickable: false`
     * alone, without this). */
    muted?: boolean;
    /** Extra-height variant (AP's vCard 9-box). */
    tall?: boolean;
  }>(),
  {
    title: "",
    rows: () => [],
    selected: false,
    clickable: true,
    muted: false,
    tall: false,
  },
);

const emit = defineEmits<{
  click: [];
}>();

const accentTokens = computed(() => NINE_BOX_CARD_ACCENT_TOKENS[props.accent]);

function onActivate() {
  if (!props.clickable) {
    return;
  }
  emit("click");
}
</script>

<template>
  <div
    class="nine-box-card"
    :class="{
      'nine-box-card--selected': selected,
      'nine-box-card--not-clickable': !clickable,
      'nine-box-card--muted': muted,
      'nine-box-card--tall': tall,
    }"
    :style="{
      '--nine-box-card-bg': accentTokens.bg,
      '--nine-box-card-badge-border': accentTokens.badgeBorder,
      '--nine-box-card-badge-text': accentTokens.badgeText,
      '--nine-box-card-selected-border': accentTokens.selectedBorder,
      '--nine-box-card-selected-text': accentTokens.selectedText,
      '--nine-box-card-selected-badge-text': accentTokens.selectedBadgeText,
      '--nine-box-card-selected-badge-border': accentTokens.selectedBadgeBorder,
    }"
    role="button"
    :tabindex="clickable ? 0 : -1"
    :aria-pressed="selected"
    :aria-disabled="!clickable || undefined"
    @click="onActivate"
    @keydown.enter="onActivate"
    @keydown.space.prevent="onActivate"
  >
    <span class="nine-box-card__badge">
      <BodyText
        variant="lg"
        weight="bold"
        as="span"
      >
        {{ badge }}
      </BodyText>
    </span>

    <BodyText
      v-if="title"
      class="nine-box-card__title"
      variant="sm"
      weight="semibold"
      as="p"
    >
      {{ title }}
    </BodyText>

    <div
      v-if="rows.length > 0"
      class="nine-box-card__rows"
    >
      <div
        v-for="(row, rowIndex) in rows"
        :key="`${row.label}-${rowIndex}`"
        class="nine-box-card__row"
      >
        <BodyText
          class="nine-box-card__row-label"
          variant="xs"
          weight="regular"
          as="span"
        >
          {{ row.label }}
        </BodyText>
        <BodyText
          class="nine-box-card__row-value"
          variant="xs"
          weight="semibold"
          as="span"
        >
          {{ row.value }}
        </BodyText>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nine-box-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  min-height: 10.25rem;
  padding: 1rem;
  border-radius: var(--border-radius-3);
  background-color: var(--nine-box-card-bg);
  color: var(--neutral-0);
  cursor: pointer;
  transition: var(--transition-default);

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 8px -2px rgba(16, 24, 40, 0.1);
  }

  &:active {
    outline: 4px solid var(--nine-box-primary-300);
    transform: scale(0.95);
  }

  &--tall {
    min-height: 12.125rem;
  }

  // `cursor` inherits, so this alone covers the child badge/rows too.
  &--not-clickable {
    cursor: default;

    &:hover {
      transform: none;
      box-shadow: none;
    }
  }

  &--muted {
    opacity: 0.5;
  }

  &--selected {
    background-color: var(--bg-surface);
    border: 1px solid var(--nine-box-card-selected-border);
    color: var(--nine-box-card-selected-text);

    .nine-box-card__badge {
      background-color: var(--bg-surface);
      border-color: var(--nine-box-card-selected-badge-border);
      color: var(--nine-box-card-selected-badge-text);
    }
  }

  &__badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.875rem;
    height: 1.875rem;
    border: 1px solid var(--nine-box-card-badge-border);
    border-radius: 999px;
    background-color: transparent;
    color: var(--nine-box-card-badge-text);
  }

  &__title {
    margin: 0;
    color: inherit;
    text-align: center;
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
  }

  &__row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }

  &__row-label,
  &__row-value {
    margin: 0;
    color: inherit;
    min-width: 0;
  }

  &__row-value {
    text-align: right;
    flex-shrink: 0;
  }
}

// Matches AP's own breakpoint (apps/ap/.../NineBoxesBox.vue) where the card gets
// extra padding on narrower/laptop-width screens.
@media screen and (max-width: 1440px) {
  .nine-box-card {
    padding: 1.5rem;
  }
}
</style>
