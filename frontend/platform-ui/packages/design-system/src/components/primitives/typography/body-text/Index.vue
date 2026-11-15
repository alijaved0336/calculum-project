<script setup lang="ts">
import type { TextVariant, TextWeight } from "./types";

defineOptions({
  name: "BodyText",
});

const props = withDefaults(
  defineProps<{
    variant: TextVariant;
    /** When omitted, base weight (400) is used. */
    weight?: TextWeight;
    as?: string;
  }>(),
  {
    as: "span",
    variant: "md",
    weight: "regular",
  },
);
</script>

<template>
  <component
    :is="props.as"
    class="ds-text"
    :class="[
      `ds-text--${props.variant}`,
      props.weight ? `ds-text--weight-${props.weight}` : null,
    ]"
  >
    <slot />
  </component>
</template>

<style scoped>
.ds-text {
  font-family: var(--font-family-base);
  margin: 0;
  color: inherit;
  letter-spacing: -0.03em;
  font-weight: 400;
}

.ds-text--xl {
  font-size: 1.25rem;
  line-height: 1.5em;
}

.ds-text--lg {
  font-size: 1.125rem;
  line-height: 1.55em;
}

.ds-text--md {
  font-size: 1rem;
  line-height: 1.5em;
}

.ds-text--sm {
  font-size: 0.875rem;
  line-height: 1.43em;
}

.ds-text--xs {
  font-size: 0.75rem;
  line-height: 1.5em;
}

.ds-text--xxs {
  font-size: 0.625rem;
  line-height: 1.2em;
}

.ds-text--weight-regular {
  font-weight: 400;
}

.ds-text--weight-medium {
  font-weight: 500;
}

.ds-text--weight-semibold {
  font-weight: 600;
}

.ds-text--weight-bold {
  font-weight: 700;
}
</style>
