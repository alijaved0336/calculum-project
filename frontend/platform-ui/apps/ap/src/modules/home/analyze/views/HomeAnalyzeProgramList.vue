<template>
  <GridSkeleton v-if="!showGrids && !showLists"></GridSkeleton>
  <div
    v-if="editModeComputed"
    id="edit-mode-container"
    class="px-4 mb-4 custom-container"
  >
    <EditOptionProgram
      :selected-items="selectedItemsComputed"
      :has-harmonization="hasHarmonizationComputed"
      :has-financing="hasFinancingComputed"
      :selected-program-id="selectedProgramId"
    ></EditOptionProgram>
  </div>
  <ListsCFEdit
    v-if="showGrids"
    :key-lists="keyLists"
    :selected-program-id="selectedProgramId"
    :has-harmonization="hasHarmonizationComputed"
    :has-financing="hasFinancingComputed"
    :program-inrecalculation="programInrecalculation"
    :is-selectable="Boolean(isSelectable)"
    @update:selected-items="handleSelectedItemsUpdate"
  ></ListsCFEdit>
  <AnalyzeLists
    v-if="showLists"
    :selected-program-id="selectedProgramId"
    :program-inrecalculation="programInrecalculation"
    :key-lists="keyLists"
    :has-financing="hasFinancingComputed"
    :has-harmonization="hasHarmonizationComputed"
  ></AnalyzeLists>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  toRefs,
  computed,
  onMounted,
  watch,
  provide,
  ref,
} from "vue";

import { AnalyzeProgramList, Program } from "../types";
import { NumberUtils, isNullOrUndefined } from "@/utils";
import { useI18n } from "vue-i18n";
import * as Routing from "@/services/router/Routing";
import AnalyzeLists from "./Lists.vue";
import GridSkeleton from "@/modules/home/components/skeletons/GridSkeleton.vue";
import type { PropType } from "vue";
import EditOptionProgram from "@/modules/components/utils/EditOptionProgram.vue";
import ListsCFEdit from "./ListsCFEdit.vue";
import { useUser } from "@/composables";
import { CalculumTreeItem } from "@/modules/components/types";
import { usePlanStore } from "@/stores/plan";

export default defineComponent({
  name: "HomeAnalyzeProgramList",
  components: {
    AnalyzeLists,
    GridSkeleton,
    EditOptionProgram,
    ListsCFEdit,
  },
  props: {
    selectedProgramId: { type: String, required: true },
    programData: { type: Object as PropType<Program>, required: true },
    inRecalculation: { type: Boolean, required: true, default: false },
    editMode: { type: Boolean, required: true, default: false },
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
    const { user } = useUser();

    const analyzeProgramList = reactive<AnalyzeProgramList>({
      gridHeight: "auto",
      hasFinancing: false,
      hasHarmonization: false,
      keyLists: NumberUtils.getRandomInt(),
      loading: true,
      programInrecalculation: true,
      showLists: false,
      showGrids: false,
      showLoading: true,
      isSelectable: true,
      selectedSpendFileVersion:
        !isNullOrUndefined(user.value) &&
        !isNullOrUndefined(user.value.activeSpendFileVersion)
          ? user.value.activeSpendFileVersion["@id"]
          : "",
      selectedItems: [],
    });
    const editModeComputed = computed(() => {
      setList(props.editMode);
      return props.editMode;
    });
    const setList = (edit: boolean) => {
      analyzeProgramList.loading = true;
      if (edit) {
        analyzeProgramList.showGrids = true;
        analyzeProgramList.isSelectable = true;
        analyzeProgramList.showLists = false;
      } else {
        analyzeProgramList.showGrids = false;
        analyzeProgramList.isSelectable = false;
        analyzeProgramList.showLists = true;
        analyzeProgramList.selectedItems = [];
      }
      analyzeProgramList.loading = false;
    };
    // watch(editModeComputed, (newEditMode) => {
    //   setList(newEditMode)
    // })
    /**
     * Get program data from API
     */
    function getProgram() {
      analyzeProgramList.programInrecalculation = props.inRecalculation;
      analyzeProgramList.hasFinancing =
        props.programData.externalFinancingEnabled;
      analyzeProgramList.hasHarmonization =
        props.programData.termHarmonizationEnabled;
      setList(props.editMode);
    }

    const hasFinancingComputed = computed(() => {
      return analyzeProgramList.hasFinancing;
    });

    const hasHarmonizationComputed = computed(() => {
      return analyzeProgramList.hasHarmonization;
    });

    const selectedItemsComputed = computed(() => {
      return analyzeProgramList.selectedItems || [];
    });

    /**
     * On Mounted
     */
    function getInitProgramAPI() {
      setGridHeight();
      getProgram();
    }

    setTimeout(() => {
      analyzeProgramList.showLoading = false;
    }, 1000);

    onMounted(() => {
      getInitProgramAPI();
      getAllPlans();
    });

    function setGridHeight() {
      const getSubMain = document.getElementById("container-main-id");
      if (getSubMain) {
        analyzeProgramList.gridHeight = getSubMain.clientHeight - 115 + "px";
      }
    }

    watch(
      () => props.inRecalculation,
      () => {
        analyzeProgramList.programInrecalculation = props.inRecalculation;
      },
      { deep: true },
    );
    const gettingPlanPhases = ref<CalculumTreeItem[]>([]);
    function deepSortByLabel(data: CalculumTreeItem[]): CalculumTreeItem[] {
      // Order current pla by `label`
      const sorted = [...data].sort((a, b) => a.label.localeCompare(b.label));
      return sorted.map((item) => ({
        ...item,
        children: item.children ? deepSortByLabel(item.children) : undefined,
      }));
    }
    function extractIdFromUrl(url: string): string {
      return url.split("/").pop() || "";
    }
    function mapPhaseElement(phaseElement: any): CalculumTreeItem {
      return {
        id: extractIdFromUrl(phaseElement["@id"]),
        label: phaseElement.name
          ? phaseElement.name
          : `${translate.t("home.plan.planPhase.phase")} ${phaseElement.number}`,
        level: 2,
      };
    }
    function mapPlanElement(planElement: any): CalculumTreeItem {
      const phases =
        planElement.planPhases
          ?.filter((phaseElement: any) => phaseElement)
          .map(mapPhaseElement) || [];
      return {
        id: extractIdFromUrl(planElement["@id"]),
        level: 1,
        label: planElement.title,
        children: phases,
      };
    }
    function getAllPlans() {
      const parts =
        analyzeProgramList.selectedSpendFileVersion?.split("/") || [];
      const spendFile = parts.at(-1);
      const globalParams = { spendFileVersion: spendFile };
      const params1 = {
        marked: false,
        callbackSuccess: (callbackSuccessData: any) => {
          gettingPlanPhases.value = callbackSuccessData
            .filter(Boolean)
            .map(mapPlanElement);
          gettingPlanPhases.value = deepSortByLabel(gettingPlanPhases.value);
        },
      };
      usePlanStore().getAllPlans({ ...globalParams, ...params1 });
    }
    provide("moveToPhaseDatas", gettingPlanPhases);

    function handleSelectedItemsUpdate(items: any[]) {
      analyzeProgramList.selectedItems = items;
    }

    return {
      ...toRefs(analyzeProgramList),
      hasFinancingComputed,
      hasHarmonizationComputed,
      selectedItemsComputed,
      Routing,
      editModeComputed,
      handleSelectedItemsUpdate,
    };
  },
});
</script>
<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";
.custom-container {
  background-color: $color-white;
  border-radius: 8px;
  padding: 16px;
}
</style>
