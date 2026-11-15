<template>
<div class="setup-more-settings">
  <div v-if="open" class="setup-more-settings__body">
    <slot />
  </div>
  <button
    type="button"
    class="setup-more-settings__toggle"
    :disabled="disabled"
    :aria-expanded="popup ? undefined : open"
    @click="onClick"
  >
    <i class="fa-solid" :class="popup ? 'fa-chevron-right' : open ? 'fa-chevron-up' : 'fa-chevron-down'" aria-hidden="true" />
    {{ t('arSetup.strategies.moreSettings') }}
  </button>
</div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * AB#20702: a strategy's "More settings", opened in place under the strategy as the client's
 * redesign shows it (the settings above, the "More settings" toggle below them). Locking Setup
 * disables the toggle; the settings inside disable themselves. With `popup` (Peer Group Standard,
 * #20824) the link emits `open` instead, and the strategy shows its settings in a popup.
 */
export default defineComponent({
  name: 'SetupMoreSettings',
  props: {
    disabled: { type: Boolean, default: false },
    popup: { type: Boolean, default: false },
  },
  emits: ['open'],
  setup(props, { emit }) {
    const { t } = useI18n({ useScope: 'global' })
    const open = ref(false)

    function onClick(): void {
      if (props.popup) emit('open')
      else open.value = !open.value
    }

    return { t, open, onClick }
  },
})
</script>

<style lang="scss" scoped>
@import "variables/colors";

.setup-more-settings {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setup-more-settings__body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: $color-gray-700;
}

.setup-more-settings__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  font-size: 0.8125rem;
  font-weight: 500;
  color: $color-gray-700;

  i {
    font-size: 0.6875rem;
  }

  &:disabled {
    color: $color-gray-400;
    cursor: not-allowed;
  }
}
</style>
