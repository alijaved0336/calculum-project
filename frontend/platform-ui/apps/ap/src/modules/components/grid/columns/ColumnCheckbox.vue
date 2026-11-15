<template>
  <td style="text-align: center; white-space: nowrap" :class="behavior">
    <KCheckbox :checked="checked" :default-checked="checked" :rounded="'medium'" :size="'medium'"
      @change="kcheckboxOnChange" />
    <!-- WI#18362: optional caption next to the box, used for the Active Client Auto/Manual label. -->
    <span v-if="label" style="margin-left: 6px; font-size: 11px; opacity: 0.7;">{{ label }}</span>
    <!-- WI#19987: undo a manual pin. Only rendered when the caller says the cell is resettable. -->
    <button
      v-if="resettable" type="button" class="btn active-client-reset"
      :class="{ 'is-pending': resetPending }"
      @click="$emit('reset')">{{ resetLabel }}</button>
  </td>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Checkbox, CheckboxChangeEvent } from "@progress/kendo-vue-inputs";

export default defineComponent({
  name: 'ColumnCheckbox',
  components: {
    KCheckbox: Checkbox
  },
  props: {
    behavior: { type: String, default: 'default' },
    checked: { type: Boolean, default: false },
    label: { type: String, default: '' },
    resettable: { type: Boolean, default: false },
    resetPending: { type: Boolean, default: false },
    resetLabel: { type: String, default: '' },
  },
  emits: ['item-checked', 'reset'],
  setup(props, { emit }) {
    function kcheckboxOnChange(event: CheckboxChangeEvent) {
      const checked = event.value;
      emit('item-checked', checked);
    }

    return {
      kcheckboxOnChange
    }
  }
})
</script>

<style lang="scss" scoped>
@import 'src/resources/assets/styles/variables/_colors.scss';

/**
 * WI#19987: .btn is display:flex, which makes the button a full-width block that drops onto its
 * own line inside the cell. inline-flex keeps it on the checkbox's line.
 */
.active-client-reset {
  display: inline-flex;
  vertical-align: middle;
  margin-left: 6px;
  min-height: 24px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 500;
  background-color: $color-primary-50;
  border: 1px solid $color-primary-500;
  color: $color-primary-500;

  &:hover {
    background-color: $color-primary-100;
  }

  // WI#19987: pressed and queued for Save. Clicking again unmarks it.
  &.is-pending {
    background-color: $color-primary-500;
    color: $color-white;

    &:hover {
      background-color: $color-primary-600;
    }
  }
}
</style>
