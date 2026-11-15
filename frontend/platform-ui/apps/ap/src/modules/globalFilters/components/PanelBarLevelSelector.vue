<template>
  <div
    v-if="variant === 'rangeSlider'"
    class="d-flex justify-content-between mb-1"
  >
    <div class="d-flex gap-3 align-items-center">
      <div class="d-flex align-items-center">
        <span class="text-sm">{{ $t("global.selectLevel") }}</span>
      </div>

      <ButtonGroup
        :items="levels"
        :options="buttonGroupOptions"
        @active-item-changed="onLevelChanged"
      />
    </div>

    <!-- Remove filter from applied filters -->
    <button
      v-if="showClearButton"
      type="button"
      class="px-2 border bg-white rounded text-sm"
      :disabled="clearDisabled"
      @click="$emit('clear')"
    >
      {{ $t("global.clear") }}
    </button>
  </div>

  <div
    v-else
    class="d-flex gap-3 align-items-center"
  >
    <div class="d-flex align-items-center">
      <span class="text-sm">{{ $t("global.selectLevel") }}</span>
    </div>

    <ButtonGroup
      :items="levels"
      :options="buttonGroupOptions"
      @active-item-changed="onLevelChanged"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

import ButtonGroup from "@/modules/components/ButtonGroup.vue";
import type { ButtonsGroupOptions } from "@/modules/components/types";
import { KeyValue, TargetView } from "@/types";

/**
 * The "Select Level" header shared by every PanelBar filter item (Spend/Supplier/Parent
 * ButtonGroup). RangeSliderKendo fields use a wider layout that can also show a "Clear" button;
 * every other field type uses the plain layout. See panelBarItemFieldConfig.ts for which fields
 * get `showClearButton`.
 */
export default defineComponent({
  name: "PanelBarLevelSelector",
  components: { ButtonGroup },
  props: {
    levels: {
      type: Array as PropType<KeyValue<TargetView, string>[]>,
      required: true,
    },
    buttonGroupOptions: {
      type: Object as PropType<Partial<ButtonsGroupOptions>>,
      required: true,
    },
    variant: {
      type: String as PropType<"default" | "rangeSlider">,
      default: "default",
    },
    showClearButton: {
      type: Boolean,
      default: false,
    },
    clearDisabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["level-changed", "clear"],
  setup(_props, { emit }) {
    function onLevelChanged(key: TargetView) {
      emit("level-changed", key);
    }

    return { onLevelChanged };
  },
});
</script>
