<template>
<CalculumTreeSelect v-if="newList.length>0" :items="newList" :maxExpectedWidth="0" @select="showMoveBetweenModalFn" @remove-plan="showMoveBetweenModalFn"></CalculumTreeSelect>
<div class="empty-span" v-else><span>{{ $t('home.analyze.moveBetweenPlanPhasesEmptyList') }}</span></div>
</template>

<script lang="ts">
import { PropType, Ref, computed, defineComponent, inject, ref } from "vue";
import {
  ActionFromEditProgram,
  CalculumTreeItem,
} from "@/modules/components/types";
import CalculumTreeSelect from "@/modules/components/tree/CalculumTreeSelect.vue";
export default defineComponent({
  name: "MovePhasesAction",
  components: {
    CalculumTreeSelect,
  },
  props: {
    option: {
      type: String as PropType<ActionFromEditProgram>,
      required: true,
    },
  },
  emits: ["call-action"],
  setup(props, { emit }) {
    const moveToPhaseData = inject<Ref<CalculumTreeItem[]>>(
      "moveToPhaseDatas",
      ref([]),
    );
    const newList = computed<CalculumTreeItem[]>(() => {
      if (moveToPhaseData.value.length === 0) {
        return [];
      }else {
        return [
          ...moveToPhaseData.value,
          {
            id: "remove-plan",
            level: 1,
            label: "Remove Plan",
            children: [],
          },
        ];
      }
      });
    function showMoveBetweenModalFn(emitParamsFromCalculumTreeSelect: any) {
      let payloadChanged = emitParamsFromCalculumTreeSelect;
      if (emitParamsFromCalculumTreeSelect.value === "remove-plan") {
        payloadChanged.value = null;
      }
      callStoreMenuAction(props.option, true, {
        param: "show-move-between-modal",
        param1: payloadChanged,
      });
    }
    const callStoreMenuAction = (
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      payload: any,
    ) => {
      emit("call-action", keyId, isEmit, payload);
    };
    return {
      newList,
      showMoveBetweenModalFn,
    };
  },
});
</script>
<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";

.empty-span {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  padding: 8px;
  text-align: center;
  font-size: clamp(12px, 2.5vw, 14px);
  word-break: break-word;
  line-height: 1.4;
}
</style>
