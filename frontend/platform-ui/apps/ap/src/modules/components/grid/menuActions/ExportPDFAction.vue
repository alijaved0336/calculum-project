<template>
<div class="item-container"><span class="cursor-pointer" @click="callStoreMenuAction(option,true,null)">{{ $t('global.exportPDF' + entityLevelTabSelected) }}</span></div>
</template>

<script lang="ts">
import { PropType, defineComponent } from 'vue'
import { ActionFromEditProgram } from "@/modules/components/types";

export default defineComponent({
    name: "ExportPDFAction",
    props: {
    option: {
      type: String as PropType<ActionFromEditProgram>,
      required: true,
    },
    entityLevelTabSelected: {
      type: String,
      required: true,
    },
  },
  emits: ["call-action"],
  setup(props, { emit }) {
    const callStoreMenuAction = (
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      payload: any,
    ) => {
      emit("call-action", keyId, isEmit, payload);
    };
    return {
      callStoreMenuAction,
    };
  },
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
.item-container {
  padding: 10px 14px;
  border-radius: 8px;

  span {
    font-size: 14px;
  }

  &:hover {
    background: $color-gray-100;

    .check-svg {
      color: $color-primary-500;
    }
  }
}
</style>