<template>
  <td>
    <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'">
      <div class="align-icons">
        <span :style="'display: none;'">{{ dataItem.disabled }}</span>
        <span v-if="dataItem.isPilot" class="checkmark disabled cursor-pointer"
          :title="$t('home.analyze.table.includePilot')" @click="enableEntityForPilotAccount(false)"></span>
        <span v-if="!dataItem.isPilot" class="crossout disabled cursor-pointer"
          :title="$t('home.analyze.table.excludePilot')" @click="enableEntityForPilotAccount(true)"></span>
      </div>
    </Tooltip>
  </td>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive } from "vue";
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import { useAnalyzeStore } from "@/stores/analyze";
import { useToast } from "vue-toastification";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import * as formatData from "@/utils/FormatData";
import { useAppStore } from '@/stores/app';

export default defineComponent({
  name: "PilotColumn",
  components: {
    Tooltip
  },
  props: {
    avoidAction: { type: Boolean, required: false, default: false },
    dataItem: { type: Object, required: true },
    filter: { type: Object, required: true, default: undefined },
    levelOfGrid: { type: String, required: false, default: "spends" },
    selectedProgramId: { type: String, required: false, default: '' },
    typeGrid: { type: String, required: false, default: "master" },
  },
  emits: [
    "update-row-data",
    "close-loading"
  ],
  setup(props, { emit }) {
    const globalFiltersStore = useGlobalFiltersStore();
    const analyzeStore = useAnalyzeStore();
    const toast = useToast();
    let filters = {
      telerikFilter: formatData.convertFiltersToREST(props.filter),
      targetProgramUuid: props.selectedProgramId,
      globalFilter: formatData.convertFiltersToREST(
        globalFiltersStore.getFiltersApplied
      ),
      currencyRate: useAppStore().getCurrencyAmount
    };

    interface PilotColumnInterface {
      togglePilotCondition: boolean;
    }

    const pilotColumn = reactive<PilotColumnInterface>({
      togglePilotCondition: false
    });
    const enableEntityForPilotAccount = (include: boolean) => {

      pilotColumn.togglePilotCondition = !pilotColumn.togglePilotCondition;
      if (props.avoidAction) {
        if (import.meta.env.DEV) console.log("** avoid make actions in childs grids");
        return;
      }

      emit("close-loading");
      const changed = {
        //change to correct field property once api is finished
        key: "pilot",
        value: include
      };
      const uuids = [props.dataItem.uuid];
      const params = {
        program: props.selectedProgramId,
        changed,
        uuids,
        filters,
        level: props.levelOfGrid,
        all: false,
        callbackSuccess: (callbackSuccessData: any) => {
          emit("update-row-data", callbackSuccessData, "fullDisabled");
        },
        callbackError: (callbackError: any) => {
          if (callbackError.data.subject === "spendAlreadyInActiveProgram") {
            if (import.meta.env.DEV) console.log("** ERROR updating data. ", callbackError.data);
          } else {
            toast.error("ERROR updating data.");
          }
        }
      };
      analyzeStore.postProgramSpendConfigurationbyGroups(params);
    };
    return {
      ...toRefs(pilotColumn),
      enableEntityForPilotAccount
    };
  }
});
</script>

<style lang="scss" scoped>
@import "../../../../resources/assets/styles/variables/colors";

td.highlited.highlited--col-2.analyze-table-cell-group {
  border-top: 1px solid #dee2e6;
  text-align: center;
  padding: 0.75rem;
}

td.highlited.highlited--col-2.analyze-table-cell-grou button {
  margin: 0;
  position: absolute;
  top: 50%;
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
}

.justify-content-evenly {
  justify-content: space-evenly;
}

.align-icons {
  display: flex;
  justify-content: center;
  align-content: center;
}

.icon-disabled {
  display: contents !important;
  color: #000000;
}

.multiplestatus {
  background: $color-gray-100 !important;
  text-align: center;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  color: $color-gray-700;
  font-size: 12px;
}
</style>
