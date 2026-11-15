<script setup lang="ts">
import type { DisplayVariant } from './types';

defineOptions({
  name: 'DisplayText',
});

const props = withDefaults(
  defineProps<{
    variant: DisplayVariant;
    as?: string;
  }>(),
  {
    as: 'span',
  },
);
</script>

<template>
  <component
    :is="props.as"
    class="ds-display"
    :class="`ds-display--${props.variant}`"
  >
    <slot />
  </component>
</template>

<style scoped>
.ds-display {
  font-family: var(--font-family-base);
  margin: 0;
  color: inherit;
}

.ds-display--2xl {
  font-size: 72px;
  line-height: 90px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.ds-display--lg {
  font-size: 48px;
  line-height: 60px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.ds-display--md {
  font-size: 36px;
  line-height: 44px;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.ds-display--sm {
  font-size: 30px;
  line-height: 38px;
  font-weight: 600;
  letter-spacing: -0.04em;
}
</style>
