import {
  computed,
  ComputedRef,
  provide,
  reactive,
  ref,
  Ref,
  unref,
  watch,
} from "vue";
import { SpendLine } from "@/types";
import { CalculumTreeItem } from "@/modules/components/types";
import { ENTITY_SPENDFILE_LEVEL_TYPE, StringUtils } from "@/utils";
import { usePlanStore } from "@/stores/plan";
import { useModulePlan } from "@/composables";
import { fontIcons } from "@/resources/assets/assets";
import type { NegotiationPlanHeader } from "@/modules/home/entityCard/types";
import type {
  NegotiationNineBoxSlice,
  NegotiationPostByGroup,
} from "@/modules/home/entityCard/components/opportunity/negotiation-view-types";

export interface NegotiationMoveToPhaseData {
  planPhasesData: CalculumTreeItem[];
  displayModelForMoveBetween: boolean;
  emitParamsFromCalculumTreeSelect: { key: string | number; value: string };
  level: string;
  uuid: string | number;
}

export interface NegotiationRemovePlanData {
  displayModelForRemovePlan: boolean;
  dataForRemovePlan: {
    entityName: string;
    planName: string;
    phaseName: string;
    key: string | number;
    value: string;
    suppliers?: any[];
    level?: string;
  };
}

export interface UseNegotiationPlanProps {
  companyId: string;
  entityDetails: any;
  programData: any;
  retrieveAllSpends: any;
}

export interface UseNegotiationPlanOptions {
  props: Readonly<UseNegotiationPlanProps>;
  translate: { t: (key: string) => string };
  selectedTabIndex: Ref<number>;
  spendFileVersionIdActive: ComputedRef<string>;
  entityCardNegotiationSpendsSelectedId: ComputedRef<string>;
  entityCardNegotiationSpendsSpendSelected: ComputedRef<SpendLine | null>;
  levelType: Ref<string>;
  postByGroup: NegotiationPostByGroup;
  nineBoxes: NegotiationNineBoxSlice | Ref<NegotiationNineBoxSlice>;
  keyTermsStrategies: Ref<number>;
  isFinancingEnabled: ComputedRef<boolean>;
  isFinancingEnabledSCFProvider: ComputedRef<boolean>;
  /** Parent-owned shared ref; this composable writes belong-to-plan so status can read it. */
  validateBelongToAplan: Ref<boolean>;
}

const useNegotiationPlan = (options: UseNegotiationPlanOptions) => {
  const {
    props,
    translate,
    selectedTabIndex,
    spendFileVersionIdActive,
    entityCardNegotiationSpendsSelectedId,
    entityCardNegotiationSpendsSpendSelected,
    levelType,
    postByGroup,
    nineBoxes,
    keyTermsStrategies,
    isFinancingEnabled,
    isFinancingEnabledSCFProvider,
  } = options;

  const planStore = usePlanStore();
  const { modulePlanIsAvailable } = useModulePlan();

  const moveToPhaseData = reactive<NegotiationMoveToPhaseData>({
    planPhasesData: [],
    displayModelForMoveBetween: false,
    emitParamsFromCalculumTreeSelect: { key: "", value: "" },
    level: "",
    uuid: "",
  });
  const removePlanData = reactive<NegotiationRemovePlanData>({
    displayModelForRemovePlan: false,
    dataForRemovePlan: {
      entityName: "",
      planName: "",
      phaseName: "",
      key: "",
      value: "",
    },
  });

  const showMoveBetween = ref(false);
  const toggleShowMoveBetween = () => {
    showMoveBetween.value = !showMoveBetween.value;
  };

  const gettingPlanPhases = ref<CalculumTreeItem[]>([]);

  /** Plan status */
  const setPlanName = computed(() => {
    if (
      entityCardNegotiationSpendsSpendSelected.value &&
      selectedTabIndex.value !== 0
    ) {
      const spendData = props.retrieveAllSpends.find(
        (x: any) =>
          x.spendUUID ===
          entityCardNegotiationSpendsSpendSelected.value?.spendUUID,
      );
      if (spendData) {
        return spendData.planName
          ? `${spendData.planName} - ${spendData.planPhase} - ${spendData.planStatus}`
          : translate.t("global.doesNotBelongToAnyPlan");
      } else {
        return translate.t("global.doesNotBelongToAnyPlan");
      }
    } else {
      return (
        props.entityDetails.planNamePhaseStatus ??
        translate.t("global.doesNotBelongToAnyPlan")
      );
    }
  });

  const belongToAplanComputed: ComputedRef<boolean> = computed(() => {
    if (
      entityCardNegotiationSpendsSpendSelected.value &&
      selectedTabIndex.value !== 0
    ) {
      const spendData = props.retrieveAllSpends.find(
        (x: SpendLine) =>
          x.spendUUID ===
          entityCardNegotiationSpendsSpendSelected.value?.spendUUID,
      );
      if (spendData) {
        return !StringUtils.isNullUndefinedOrEmpty(spendData.planName);
      } else {
        return false;
      }
    } else {
      return !StringUtils.isNullUndefinedOrEmpty(
        props.entityDetails.planNamePhaseStatus,
      );
    }
  });

  watch(
    belongToAplanComputed,
    (value) => {
      options.validateBelongToAplan.value = value;
    },
    { immediate: true },
  );

  function deepSortByLabel(treeData: CalculumTreeItem[]): CalculumTreeItem[] {
    // Order current pla by `label`
    const sorted = [...treeData].sort((a, b) => a.label.localeCompare(b.label));
    return sorted.map((item) => ({
      ...item,
      children: item.children ? deepSortByLabel(item.children) : undefined,
    }));
  }

  function extractIdFromUrl(url: string): string {
    return url.split("/").pop() || "";
  }

  function getAllPlans() {
    if (!modulePlanIsAvailable.value) {
      return;
    }

    const parts = spendFileVersionIdActive.value.split("/");
    const spendFile = parts.at(-1);
    const globalParams = { spendFileVersion: spendFile };
    moveToPhaseData.planPhasesData = [];
    const params1 = {
      marked: false,
      callbackSuccess: (callbackSuccessData: any) => {
        gettingPlanPhases.value = callbackSuccessData
          .filter(Boolean) // Filters null/undefined elements
          .map((planElement: any) => {
            const idPlan = extractIdFromUrl(planElement["@id"]);
            const level = 1;
            const phases = [];

            for (const phaseElement of planElement.planPhases ?? []) {
              if (!phaseElement) continue;

              phases.push({
                id: extractIdFromUrl(phaseElement["@id"]),
                label: phaseElement.name
                  ? phaseElement.name
                  : `${translate.t("home.plan.planPhase.phase")} ${phaseElement.number}`,
                level: level + 1,
              });
            }

            return {
              id: idPlan,
              level: level,
              label: planElement.title,
              children: phases,
            };
          });
        gettingPlanPhases.value = deepSortByLabel(gettingPlanPhases.value);
        if (
          setPlanName.value !== translate.t("global.doesNotBelongToAnyPlan")
        ) {
          gettingPlanPhases.value.push({
            id: "remove-plan",
            level: 1,
            label: "Remove plan",
            children: [],
          });
        }

        moveToPhaseData.planPhasesData = gettingPlanPhases.value;
      },
    };
    planStore.getAllPlans({ ...globalParams, ...params1 });
  }

  function getDataMoveBetweenModal(emitParamsFromCalculumTreeSelect: any) {
    moveToPhaseData.displayModelForMoveBetween = true;
    moveToPhaseData.emitParamsFromCalculumTreeSelect =
      emitParamsFromCalculumTreeSelect;
  }

  function findLevel2Id(
    level1Label: string,
    level2Label: string,
    treeData: CalculumTreeItem[],
  ) {
    // Buscar el objeto de nivel 1 que coincida con el label
    const level1Item = treeData.find(
      (item: CalculumTreeItem) =>
        item.level === 1 && item.label === level1Label,
    );

    // Si no se encuentra el nivel 1, retornar null
    if (!level1Item?.children) {
      return null;
    }

    // Buscar el hijo de nivel 2 que coincida con el label
    const level2Item = level1Item.children.find(
      (child: CalculumTreeItem) =>
        child.level === 2 && child.label === level2Label,
    );

    // Retornar el ID si se encuentra, de lo contrario null
    return level2Item ? level2Item.id : null;
  }

  function removePlanFromBadge(emitParamsFromCalculumNestedItem: any) {
    if (setPlanName.value !== translate.t("global.doesNotBelongToAnyPlan")) {
      const getPlanName = setPlanName.value.split(" - ");
      if (emitParamsFromCalculumNestedItem.levelGridFromGrid !== undefined) {
        removePlanData.dataForRemovePlan = {
          entityName: "suppliers",
          planName: getPlanName[0],
          phaseName: getPlanName[1],
          key: "removeSpendToPhases",
          value: String(
            findLevel2Id(
              getPlanName[0],
              getPlanName[1],
              moveToPhaseData.planPhasesData,
            ),
          ),
          level: emitParamsFromCalculumNestedItem.levelGridFromGrid,
          suppliers: emitParamsFromCalculumNestedItem.selectedItems,
        };
      } else {
        removePlanData.dataForRemovePlan = {
          entityName: props.entityDetails.supplierName,
          planName: getPlanName[0],
          phaseName: getPlanName[1],
          key: "removeSpendToPhases",
          value: String(
            findLevel2Id(
              getPlanName[0],
              getPlanName[1],
              moveToPhaseData.planPhasesData,
            ),
          ),
        };
      }
    }
    // This is only for test dev
    else {
      removePlanData.dataForRemovePlan = {
        entityName: props.entityDetails.supplierName,
        planName: "Plan Name",
        phaseName: "Phase Name",
        key: "removeSpendToPhases",
        value: "",
      };
    }
    removePlanData.displayModelForRemovePlan = true;
  }

  function userApprovedRemovePlan() {
    removePlanData.displayModelForRemovePlan =
      !removePlanData.displayModelForRemovePlan;
    const changed = removePlanData.dataForRemovePlan;
    const params = {
      program: props.programData["@id"].replace("/api/analyze/programs/", ""),
      changed,
    };
    let spend_uuid = "";
    let set_level = "";

    if (removePlanData.dataForRemovePlan.suppliers !== undefined) {
      set_level =
        levelType.value === ENTITY_SPENDFILE_LEVEL_TYPE.SUPPLIER
          ? "suppliers"
          : "parents";

      if (removePlanData.dataForRemovePlan.level !== undefined) {
        set_level = String(removePlanData.dataForRemovePlan.level);
      }
      const spendList = removePlanData.dataForRemovePlan.suppliers.map(
        (item) => item.uuid,
      );
      postByGroup(params, "removeSpendToPhases", spendList, set_level);
    } else {
      if (levelType.value === ENTITY_SPENDFILE_LEVEL_TYPE.SPEND_LINE) {
        spend_uuid = entityCardNegotiationSpendsSelectedId.value;
        set_level = "spends";
      } else {
        spend_uuid = props.companyId;
        set_level =
          levelType.value === ENTITY_SPENDFILE_LEVEL_TYPE.SUPPLIER
            ? "suppliers"
            : "parents";
      }
      postByGroup(params, "removeSpendToPhases", [spend_uuid], set_level);
    }
  }

  function userRejectedRemovePlan() {
    removePlanData.displayModelForRemovePlan =
      !removePlanData.displayModelForRemovePlan;
  }

  function userApprovedMoveBetween() {
    moveToPhaseData.displayModelForMoveBetween =
      !moveToPhaseData.displayModelForMoveBetween;
    const changed = moveToPhaseData.emitParamsFromCalculumTreeSelect;
    const params = {
      program: props.programData["@id"].replace("/api/analyze/programs/", ""),
      changed,
    };
    let spend_uuid = "";
    let set_level = "";

    if (levelType.value === ENTITY_SPENDFILE_LEVEL_TYPE.SPEND_LINE) {
      spend_uuid = entityCardNegotiationSpendsSelectedId.value;
      set_level = "spends";
    } else {
      spend_uuid = props.companyId;
      set_level =
        levelType.value === ENTITY_SPENDFILE_LEVEL_TYPE.SUPPLIER
          ? "suppliers"
          : "parents";
    }
    postByGroup(params, "moveSpendToPhases", [spend_uuid], set_level);
  }

  function userRejectedMoveBetween() {
    moveToPhaseData.displayModelForMoveBetween =
      !moveToPhaseData.displayModelForMoveBetween;
  }

  provide("moveToPhaseDatas", gettingPlanPhases);

  const planHeader = computed<NegotiationPlanHeader>(() => {
    const boxes = unref(nineBoxes);
    return {
      boxesSelected: boxes.boxesSelected,
      boxesSelectedFinancing: boxes.boxesSelectedFinancing,
      boxesSelectedSCF: boxes.boxesSelectedSCF,
      isFinancingEnabledSCFProvider: isFinancingEnabledSCFProvider.value,
      isFinancingEnabled: isFinancingEnabled.value,
      keyTermsStrategies: keyTermsStrategies.value,
      modulePlanIsAvailable: modulePlanIsAvailable.value,
      setPlanName: setPlanName.value,
      showMoveBetween: showMoveBetween.value,
      planPhasesData: moveToPhaseData.planPhasesData,
      planIcon: fontIcons.plan,
    };
  });

  return {
    planHeader,
    moveToPhaseData,
    removePlanData,
    setPlanName,
    validateBelongToAplan: belongToAplanComputed,
    showMoveBetween,
    toggleShowMoveBetween,
    gettingPlanPhases,
    getAllPlans,
    getDataMoveBetweenModal,
    removePlanFromBadge,
    userApprovedMoveBetween,
    userRejectedMoveBetween,
    userApprovedRemovePlan,
    userRejectedRemovePlan,
    modulePlanIsAvailable,
  };
};

export default useNegotiationPlan;
