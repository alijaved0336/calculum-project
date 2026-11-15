<template>
<div class="item-container term_group_title"><span>{{ $t("home.entityCard.negotiation.termGroup") }}</span></div>
<div class="item-container" v-for="groupF in groupsFinan" :key="groupF.name">
  <button class="buttons_group_item" :style="setStyleBtn(groupF.color)" @click="callStoreMenuAction(option,true,false,{param:'grid-add-group', param1: groupF['id'],param2:'financingGroup'})">{{ groupF.name }}</button>
</div>
<div class="d-flex align-items-center justify-content-between item-container"><span class="remove_group_main cursor-pointer" @click="callStoreMenuAction(option,true,true,{'param':'grid-add-group', 'param1': null, 'param2':'financingGroup', 'param3': null})">{{ $t("home.entityCard.negotiation.removeGroup") }}</span>
  <iconTrash class="trash_icon"></iconTrash>
</div>
</template>

<script lang="ts">
import { PropType, computed, defineComponent } from "vue";
import { ActionFromEditProgram } from "@/modules/components/types";
import { useAnalyzeStore } from "@/stores/analyze";
import * as formatData from "@/utils/FormatData";
import iconTrash from "@/resources/assets/images/icons/iconTrash.vue";
export default defineComponent({
  name: "FinancingAction",
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
    const analyzeStore = useAnalyzeStore();
    const callStoreMenuAction = (
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      removeGroup: boolean,
      payload: any,
    ) => {
      const newPayload = { ...payload, removeGroup };
      emit("call-action", keyId, isEmit, newPayload);
    };
    const groupsFinan = computed(() => {
      return analyzeStore.getAllFinancing.length > 0
        ? analyzeStore.getAllFinancing
        : [];
    });
    const setStyleBtn = (color: string) => {
      return {
        "--color": formatData.colorText(color),
        color: formatData.colorText(color),
        background: color,
      };
    };
    return {
      callStoreMenuAction,
      groupsFinan,
      setStyleBtn,
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
}
.remove_group_main {
  background: transparent !important;
  color: $color-gray-400;
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
}
.term_group_title {
  background: transparent !important;
  color: $color-gray-700;
  font-style: normal;
  font-weight: 500;
  font-size: 16px;
}
.trash_icon {
  color: $color-gray-700;
  width: 18px;
  height: 18px;
  margin-left: 10px;
}
</style>
