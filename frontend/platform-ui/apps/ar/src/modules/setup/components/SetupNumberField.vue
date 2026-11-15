<template>
<div class="setup-number-field">
  <span class="setup-number-field__label">
    {{ label }}
    <TooltipButton v-if="tooltip" :text="tooltip" />
  </span>
  <TextInput
    :model-value="Number.isFinite(modelValue) ? modelValue : ''"
    type="number"
    :disabled="disabled"
    :class="{ 'setup-number-field--invalid': error }"
    @update:model-value="onInput"
  />
  <span v-if="error" class="setup-number-field__error">{{ errorText }}</span>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { TextInput, TooltipButton } from '@ada/design-system'

/**
 * AB#20702: a labelled number input (design-system `TextInput`) with the reason shown under it
 * (EF-4). An emptied input emits `NaN` rather than `undefined`, so the shared rules flag it instead
 * of the field silently dropping out of the payload.
 */
export default defineComponent({
  name: 'SetupNumberField',
  components: { TextInput, TooltipButton },
  props: {
    modelValue: { type: Number as PropType<number | undefined>, default: undefined },
    label: { type: String, required: true },
    tooltip: { type: String, default: '' },
    /** An i18n key. */
    error: { type: String as PropType<string | undefined>, default: undefined },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { t, te } = useI18n({ useScope: 'global' })
    // Our own validation sends an i18n key; a backend refusal sends its message as text.
    const errorText = computed(() => (props.error && te(props.error) ? t(props.error) : props.error))

    function onInput(raw: string): void {
      emit('update:modelValue', raw === '' || raw === null ? Number.NaN : Number(raw))
    }

    return { t, errorText, onInput }
  },
})
</script>

<style lang="scss" scoped>
@import "variables/colors";

.setup-number-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-width: 16rem;
}

.setup-number-field__label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: $color-gray-700;
}

.setup-number-field__error {
  font-size: 0.75rem;
  color: $color-error-600;
}

.setup-number-field--invalid :deep(.k-input) {
  border-color: $color-error-600;
}
</style>
