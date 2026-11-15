import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useSubscribeStore } from "@/stores/subscribe";

export interface ProgramRecalculationValues {
  recalculationInProgress: boolean | null;
  pendingRecalculation: boolean | null;
  isBoxesRecalculating: boolean | null;
}

export interface PlanRecalculationStatus {
  pendingRecalculation: boolean | null;
  planInrecalculation: boolean | null;
}

export interface SpendFileRecalculationStatus {
  pendingRecalculation: boolean | null;
  spendFileInrecalculation: boolean | null;
}

/**
 * Cross-cutting handles `useRecalculationStatus` needs from pieces of
 * HomeNavbar.vue that are constructed later in `setup()` (company/spend-file
 * switching). Assigned once every composable is built — see the "bridge"
 * wiring note in docs/context/change-homenavbar-refactor.md.
 */
export interface RecalculationStatusBridge {
  changeCompany?: (companySelectedId: string, actionFromUser: boolean) => void;
  selectSpendFile?: (version: any) => void;
}

// value → {pendingRecalculation, recalculationInProgress, isBoxesRecalculating}
const REFRESH_PROGRAMS_STATE: Record<string, ProgramRecalculationValues> = {
  calculationPending: { pendingRecalculation: true, recalculationInProgress: false, isBoxesRecalculating: false },
  updating: { pendingRecalculation: false, recalculationInProgress: true, isBoxesRecalculating: true },
  recalculating: { pendingRecalculation: false, recalculationInProgress: true, isBoxesRecalculating: true },
  // "intermediate" ready state, still hiding the expected values
  calculationReady: { pendingRecalculation: false, recalculationInProgress: false, isBoxesRecalculating: true },
  estimationPending: { pendingRecalculation: false, recalculationInProgress: false, isBoxesRecalculating: true },
  estimating: { pendingRecalculation: false, recalculationInProgress: false, isBoxesRecalculating: true },
};
const DEFAULT_PROGRAM_VALUES: ProgramRecalculationValues = {
  pendingRecalculation: false,
  recalculationInProgress: false,
  isBoxesRecalculating: false,
};

const REFRESH_PLANS_STATE: Record<string, PlanRecalculationStatus> = {
  updatingPending: { pendingRecalculation: true, planInrecalculation: false },
  updating: { pendingRecalculation: false, planInrecalculation: true },
};
const DEFAULT_PLAN_STATUS: PlanRecalculationStatus = {
  pendingRecalculation: false,
  planInrecalculation: false,
};

// "refresh9boxes" has no default branch in the original switch: an
// unrecognized value leaves isBoxesRecalculating untouched.
const REFRESH_9BOXES_STATE: Record<string, boolean> = {
  pending: true,
  recalculating: true,
  ready: false,
};

/**
 * Program/plan/spend-file recalculation-status state, the 4 subscribeStore
 * watchers that drive it, and the navbar's recalculating-status pill
 * computeds. Extracted verbatim from HomeNavbar.vue (US-2, Sprint 116
 * refactor) — behavior-preserving, no logic change.
 */
const useRecalculationStatus = (
  getSelectedCompany: () => string,
  getIsLoadingChangeSpendFile: () => boolean,
  // Getter, not a Ref: `useSpendFile()` (which owns spendFileVersionActive)
  // registers its own watcher and is constructed later in HomeNavbar.vue's
  // setup() — a getter defers the read to call-time so this composable can
  // still be constructed at its original point without reordering either
  // watcher's registration.
  getSpendFileVersionActive: () => any,
  bridge: RecalculationStatusBridge,
) => {
  const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
  const subscribeStore = useSubscribeStore();

  const programValues = reactive<ProgramRecalculationValues>({
    recalculationInProgress: null,
    pendingRecalculation: null,
    isBoxesRecalculating: null,
  });
  const planStatus = reactive<PlanRecalculationStatus>({
    pendingRecalculation: null,
    planInrecalculation: null,
  });
  const spendFileStatus = reactive<SpendFileRecalculationStatus>({
    pendingRecalculation: null,
    spendFileInrecalculation: null,
  });

  /**
   * Resets program/plan/spend-file recalculation state back to its
   * "nothing in progress" baseline — called when the user switches company
   * or spend file.
   */
  function cleanValues() {
    Object.assign(programValues, DEFAULT_PROGRAM_VALUES);
    Object.assign(spendFileStatus, { pendingRecalculation: false, spendFileInrecalculation: false });
    Object.assign(planStatus, DEFAULT_PLAN_STATUS);
  }

  const labelForRecalculatingStatus = computed(() => {
    if (
      programValues.recalculationInProgress ||
      programValues.isBoxesRecalculating ||
      planStatus.planInrecalculation
    ) {
      return translate.t("global.programInrecalculation");
    }
    if (programValues.pendingRecalculation || planStatus.pendingRecalculation) {
      return translate.t("global.pendingRecalculation");
    }
    return null;
  });

  // Live whole-pipeline recalculation % of the active spend file (WI#18023),
  // fed by useSpendFileFirebase from the Firebase progress.global payload.
  // null while queued / before the first progress write / once finished.
  const spendFileProgressValue = computed<number | null>(
    () => subscribeStore.getSpendFileProgress,
  );

  // True only while actively recalculating AND a real % is available — this is
  // when the pill turns into a fill gauge and shows the number.
  const spendFileHasProgressFill = computed(
    () => spendFileStatus.spendFileInrecalculation && spendFileProgressValue.value !== null,
  );

  const labelForRecalculatingStatusSpendFile = computed(() => {
    if (spendFileStatus.spendFileInrecalculation || spendFileStatus.pendingRecalculation) {
      if (spendFileHasProgressFill.value) {
        return `Updating Data · ${Math.round(spendFileProgressValue.value as number)}%`;
      }
      return "Updating Data";
    }
    return null;
  });

  // Hover tooltip with the estimated time remaining (progress.global.times.remain).
  // Shown only while actively recalculating; falls back to an "estimating" hint
  // until the backend produces a real estimate.
  const spendFileEtaTitle = computed<string | undefined>(() => {
    if (!spendFileStatus.spendFileInrecalculation) return undefined;
    const remain = subscribeStore.getSpendFileProgressRemain;
    if (typeof remain !== "number" || remain <= 0) {
      return "Estimating time remaining…";
    }
    const seconds = Math.round(remain);
    let human: string;
    if (seconds < 60) {
      human = "less than a minute";
    } else if (seconds < 3600) {
      human = `~${Math.round(seconds / 60)} min`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      human = minutes > 0 ? `~${hours}h ${minutes}m` : `~${hours}h`;
    }
    return `Estimated time remaining: ${human}`;
  });

  const showSpendFileRecalculatingStatus = computed(() => {
    return Boolean(
      spendFileStatus.spendFileInrecalculation || spendFileStatus.pendingRecalculation,
    );
  });

  const showRecalculatingStatus = computed(() => {
    return Boolean(
      programValues.recalculationInProgress ||
        programValues.pendingRecalculation ||
        programValues.isBoxesRecalculating ||
        planStatus.planInrecalculation ||
        planStatus.pendingRecalculation,
    );
  });

  watch(
    () => subscribeStore.refreshPrograms,
    (newValue) => {
      // Object.hasOwn (not `in` / a bare ?? fallback on bracket access) — both would
      // resolve an inherited Object.prototype key (e.g. "toString") to a real,
      // non-nullish function value instead of falling back to the default.
      Object.assign(programValues, Object.hasOwn(REFRESH_PROGRAMS_STATE, newValue) ? REFRESH_PROGRAMS_STATE[newValue] : DEFAULT_PROGRAM_VALUES);
    },
  );

  watch(
    () => subscribeStore.setRefeshPlans,
    (newValue) => {
      const key = newValue as string;
      Object.assign(planStatus, Object.hasOwn(REFRESH_PLANS_STATE, key) ? REFRESH_PLANS_STATE[key] : DEFAULT_PLAN_STATUS);
    },
  );

  const setRefeshSpendFilesHandlers: Record<string, () => void> = {
    calculatingPending: () => {
      Object.assign(spendFileStatus, { pendingRecalculation: true, spendFileInrecalculation: false });
      subscribeStore.setAllowActionsInModules(false);
    },
    updating: () => {
      Object.assign(spendFileStatus, { pendingRecalculation: false, spendFileInrecalculation: true });
      subscribeStore.setAllowActionsInModules(false);
    },
    calculating: () => {
      Object.assign(spendFileStatus, { pendingRecalculation: false, spendFileInrecalculation: true });
      subscribeStore.setAllowActionsInModules(false);
    },
    // If the spend file is deleted, refresh all the data company
    deleted: () => {
      bridge.changeCompany?.(getSelectedCompany(), true);
    },
    ready: () => {
      Object.assign(spendFileStatus, { pendingRecalculation: false, spendFileInrecalculation: false });
      subscribeStore.setAllowActionsInModules(true);
      const urlContainsString = globalThis.location.href.includes("home/analyze/step/4?selectedProgramId");
      const urlIsProgramOverview = globalThis.location.href.includes("home/analyze/program_overview");
      if (!getIsLoadingChangeSpendFile() && !urlContainsString && !urlIsProgramOverview) {
        bridge.selectSpendFile?.(getSpendFileVersionActive());
      }
    },
  };
  const defaultSetRefeshSpendFilesHandler = () => {
    Object.assign(spendFileStatus, { pendingRecalculation: false, spendFileInrecalculation: false });
    subscribeStore.setAllowActionsInModules(true);
  };

  watch(
    () => subscribeStore.setRefeshSpendFiles,
    (newValue) => {
      const key = newValue as string;
      (Object.hasOwn(setRefeshSpendFilesHandlers, key) ? setRefeshSpendFilesHandlers[key] : defaultSetRefeshSpendFilesHandler)();
    },
  );

  watch(
    () => subscribeStore.refresh9boxes,
    (newValue) => {
      if (Object.hasOwn(REFRESH_9BOXES_STATE, newValue)) {
        programValues.isBoxesRecalculating = REFRESH_9BOXES_STATE[newValue];
      }
    },
  );

  return {
    programValues,
    planStatus,
    spendFileStatus,
    cleanValues,
    labelForRecalculatingStatus,
    spendFileProgressValue,
    spendFileHasProgressFill,
    labelForRecalculatingStatusSpendFile,
    spendFileEtaTitle,
    showSpendFileRecalculatingStatus,
    showRecalculatingStatus,
  };
};

export default useRecalculationStatus;
