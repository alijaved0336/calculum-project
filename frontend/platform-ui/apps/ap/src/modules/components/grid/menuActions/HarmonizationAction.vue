<template>
<div class="item-container"><span class="cursor-pointer" @click="callStoreMenuAction(option,false,{'param':'spend', 'param1': null})">{{ $t("home.entityCard.negotiation.harmonizationLevelSpend") }}</span></div>
<div class="item-container"><span class="cursor-pointer" @click="callStoreMenuAction(option,false,{'param':'supplier', 'param1': null})">{{ $t("home.entityCard.negotiation.harmonizationLevelSupplier") }}</span></div>
<div class="item-container"><span class="cursor-pointer" @click="callStoreMenuAction(option,false,{'param':'parent', 'param1': null})">{{ $t("home.entityCard.negotiation.harmonizationLevelParent") }}</span></div>
<div class="d-flex align-items-center justify-content-between item-container"><span class="remove-group-main cursor-pointer" @click="callStoreMenuAction(option,true,{'param':'grid-add-group', 'param1': null, 'param2':'harmonizationGroup', 'param3': null})">{{ $t("home.entityCard.negotiation.removeLevel") }}</span>
  <iconTrash class="trash-icon"></iconTrash>
</div>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import { ActionFromEditProgram } from "@/modules/components/types";
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
export default defineComponent({
  name: "HarmonizationAction",
  components: {
    iconTrash,
  },
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
.trash-icon {
  color: $color-gray-700;
  width: 18px;
  height: 18px;
  margin-left: 10px;
}
.remove-group-main {
  background: transparent !important;
  color: $color-gray-400;
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
}

</style>
