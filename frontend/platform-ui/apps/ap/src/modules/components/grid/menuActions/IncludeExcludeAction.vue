<template>
<div class="d-flex align-items-center justify-content-between gap-4 item-container" @click="callStoreMenuAction(option,true,{'param':'grid-exclude', 'param1': false})"><span class="checkmark"></span><span>{{ $t("home.analyze.analyzeHeader.include") }}</span></div>
<div class="d-flex align-items-center justify-content-between gap-4 item-container" @click="callStoreMenuAction(option,true,{'param':'grid-exclude', 'param1': true})"> <span class="crossout"></span><span>{{ $t("home.analyze.analyzeHeader.exclude") }}</span></div>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import { ActionFromEditProgram } from "@/modules/components/types";
export default defineComponent({
  name: "IncludeExcludeAction",
  props: {
    option: {
      type: String as PropType<ActionFromEditProgram>,
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
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
.item-container {
  padding: 10px 14px;
  border-radius: 8px;
  color: $color-gray-600;
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
