<template>
<section class="setup-card">
  <header class="setup-card__head" @click="open = !open">
    <div class="setup-card__titles">
      <h2 class="setup-card__title">{{ title }}</h2>
      <p v-if="description" class="setup-card__description">{{ description }}</p>
    </div>
    <button type="button" class="setup-card__chevron" :aria-expanded="open" :aria-label="title" @click.stop="open = !open">
      <i class="fa-solid" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'" aria-hidden="true" />
    </button>
  </header>
  <div v-show="open" class="setup-card__body">
    <slot />
  </div>
  <footer v-if="$slots.footer" v-show="open" class="setup-card__foot">
    <slot name="footer" />
  </footer>
</section>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

/**
 * AB#20702: one Setup section as the client's redesign draws it - title and description over a
 * divider, the content, and a footer (Cancel / Save changes) of its own. The body uses v-show so a
 * collapsed section keeps its unsaved edits and stays registered.
 */
export default defineComponent({
  name: 'SetupSectionCard',
  props: {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    collapsedByDefault: { type: Boolean, default: false },
  },
  setup(props) {
    const open = ref(!props.collapsedByDefault)
    return { open }
  },
})
</script>

<style lang="scss" scoped>
@import "variables/colors";

.setup-card {
  border: 1px solid $color-gray-200;
  border-radius: 0.75rem;
  background: #ffffff;
}

.setup-card__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 1.25rem;
  padding: 1.25rem 0 1rem;
  border-bottom: 1px solid $color-gray-200;
  cursor: pointer;
}

.setup-card__title {
  margin: 0 0 0.25rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: $color-gray-900;
}

.setup-card__description {
  margin: 0;
  max-width: 72ch;
  font-size: 0.8125rem;
  color: $color-gray-500;
}

.setup-card__chevron {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: $color-gray-400;
}

.setup-card__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
}

.setup-card__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid $color-gray-200;
}
</style>
