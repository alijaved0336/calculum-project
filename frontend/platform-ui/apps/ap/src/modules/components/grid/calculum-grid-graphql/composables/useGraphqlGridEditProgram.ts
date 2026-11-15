import {
  onBeforeUnmount,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import { storeToRefs } from "pinia";
import { useGridMenuActionsStore } from "@/stores/gridMenuActions";
import type { ActionFromEditProgram } from "@/modules/components/types";

export type GraphqlGridEditProgramEmit = (
  event:
    | "show-multiple-export-modal"
    | "manage-team-move"
    | "manage-team-remove"
    | "manage-commodity-move"
    | "manage-commodity-remove"
    | "manage-custom-column-move"
    | "manage-custom-column-remove"
    | "manage-supplier-industry-move"
    | "manage-supplier-credit-rating-move"
    | "manage-supplier-ultima-parent-move",
  ...args: unknown[]
) => void;

export type GraphqlGridEditProgramPayload = {
  isEmit?: boolean;
  removeGroup?: boolean;
  levelOfGrid?: string | null;
  uuid?: string | null;
  param?: unknown;
  [key: string]: unknown;
};

export type GraphqlGridManageTeamOpenPayload = {
  open?: boolean;
  rowKey?: string | null;
};

export interface GraphqlGridEditProgramHandlers {
  gridAddGroup: (
    groupId: unknown,
    type: unknown,
    typeharmonization?: unknown,
  ) => void;
  gridAddVGroup: (groupId: unknown) => void;
  gridExclude: (action: unknown) => void;
  showTargetModal: (myTargetObject: Record<string, unknown>) => void;
  showTargetClearModal: () => void;
  closeHarmonizationModal: (level: unknown) => void;
  closeMoveBetweenModal: (emitParams: unknown) => void;
  negotiationStatusOnChanged: (negotiationStatus: unknown) => void;
}

export interface UseGraphqlGridEditProgramOptions {
  handleEditProgramAction: MaybeRefOrGetter<boolean>;
  levelOfGrid: MaybeRefOrGetter<string>;
  handlers: GraphqlGridEditProgramHandlers;
  emit: GraphqlGridEditProgramEmit;
}

/**
 * Edit-program store actions apply to this grid when `levelOfGrid` is unset
 * or matches the grid. Other TabStrip levels are ignored.
 */
export function isGraphqlGridEditProgramForThisLevel(
  payloadLevelOfGrid: unknown,
  gridLevelOfGrid: string,
): boolean {
  return (
    payloadLevelOfGrid == null || payloadLevelOfGrid === gridLevelOfGrid
  );
}

function emitMoveOrRemove(
  emit: GraphqlGridEditProgramEmit,
  moveEvent:
    | "manage-team-move"
    | "manage-commodity-move"
    | "manage-custom-column-move",
  removeEvent:
    | "manage-team-remove"
    | "manage-commodity-remove"
    | "manage-custom-column-remove",
  payload: GraphqlGridEditProgramPayload,
) {
  if (payload.removeGroup) {
    emit(removeEvent, payload);
    return;
  }
  emit(moveEvent, payload);
}

/**
 * `useGridMenuActionsStore` watch and manage-team row dropdown for
 * CalculumGridGraphql. Column-menu emits stay on those handlers; this only
 * maps edit-program action keys onto them. `#teamNameColumn` markup lives
 * in `TeamNameCell`.
 */
export function useGraphqlGridEditProgram(
  options: UseGraphqlGridEditProgramOptions,
) {
  const gridMenuActionsStore = useGridMenuActionsStore();
  const { actionFromEditProgram, trackingNumber } = storeToRefs(
    gridMenuActionsStore,
  );
  const { handlers } = options;

  const activeManageTeamRowKey = ref<string | null>(null);

  function handleVcardGroup(
    payload: GraphqlGridEditProgramPayload,
    tuple: unknown[],
  ) {
    if (!payload.isEmit) return;

    if (payload.removeGroup) {
      handlers.gridAddGroup(tuple[1], tuple[2], tuple[3]);
    } else {
      handlers.gridAddVGroup(tuple[1]);
    }
  }

  function handleSetTarget(
    payload: GraphqlGridEditProgramPayload,
    tuple: unknown[],
  ) {
    if (!payload.isEmit) return;

    if (payload.removeGroup) {
      handlers.showTargetClearModal();
    } else {
      handlers.showTargetModal({
        key: tuple[0],
        value: tuple[1],
      });
    }
  }

  function handleFinancingGroup(
    payload: GraphqlGridEditProgramPayload,
    tuple: unknown[],
  ) {
    if (!payload.isEmit) return;

    if (payload.removeGroup) {
      handlers.gridAddGroup(tuple[1], tuple[2], tuple[3]);
    } else {
      handlers.gridAddGroup(tuple[1], tuple[2]);
    }
  }

  function handleHarmonizationGroup(
    payload: GraphqlGridEditProgramPayload,
    tuple: unknown[],
  ) {
    if (payload.isEmit) {
      if (payload.removeGroup) {
        handlers.gridAddGroup(tuple[1], tuple[2], tuple[3]);
      }
    } else {
      handlers.closeHarmonizationModal(tuple[0]);
    }
  }

  function callMethodFromEditProgram(newAction: string) {
    const payload = actionFromEditProgram.value as
      | GraphqlGridEditProgramPayload
      | null;
    if (!payload) return;
    if (
      !isGraphqlGridEditProgramForThisLevel(
        payload.levelOfGrid,
        toValue(options.levelOfGrid),
      )
    ) {
      return;
    }

    const tuple = gridMenuActionsStore.convertToTuple(payload);

    const actionHandlers: Partial<
      Record<NonNullable<ActionFromEditProgram>, () => void>
    > = {
      vcardGroup: () => handleVcardGroup(payload, tuple),
      setTarget: () => handleSetTarget(payload, tuple),
      financingGroup: () => handleFinancingGroup(payload, tuple),
      harmonizationGroup: () => handleHarmonizationGroup(payload, tuple),
      includeExclude: () => {
        if (payload.isEmit) handlers.gridExclude(tuple[1]);
      },
      moveBetween: () => {
        if (payload.isEmit) handlers.closeMoveBetweenModal(tuple[1]);
      },
      exportPdf: () => {
        if (payload.isEmit) {
          options.emit(
            "show-multiple-export-modal",
            toValue(options.levelOfGrid),
          );
        }
      },
      updateStatus: () => {
        if (payload.isEmit) {
          handlers.negotiationStatusOnChanged(payload.param);
        }
      },
      manageTeam: () => {
        if (payload.isEmit) {
          emitMoveOrRemove(
            options.emit,
            "manage-team-move",
            "manage-team-remove",
            payload,
          );
        }
      },
      commodity: () => {
        if (payload.isEmit) {
          emitMoveOrRemove(
            options.emit,
            "manage-commodity-move",
            "manage-commodity-remove",
            payload,
          );
        }
      },
      customColumn: () => {
        if (payload.isEmit) {
          emitMoveOrRemove(
            options.emit,
            "manage-custom-column-move",
            "manage-custom-column-remove",
            payload,
          );
        }
      },
      supplierIndustry: () => {
        if (payload.isEmit) {
          options.emit("manage-supplier-industry-move", payload);
        }
      },
      supplierCreditRating: () => {
        if (payload.isEmit) {
          options.emit("manage-supplier-credit-rating-move", payload);
        }
      },
      supplierUltimateParent: () => {
        if (payload.isEmit) {
          options.emit("manage-supplier-ultima-parent-move", payload);
        }
      },
    };

    const handler = actionHandlers[newAction as ActionFromEditProgram];
    if (handler) {
      handler();
    }
  }

  if (toValue(options.handleEditProgramAction)) {
    watch(trackingNumber, (newAction) => {
      const action = newAction.split("-")[0];
      callMethodFromEditProgram(action);
    });
  }

  function onManageTeamOpen(payload: GraphqlGridManageTeamOpenPayload) {
    if (!payload?.open) return;
    const { rowKey } = payload;
    if (activeManageTeamRowKey.value === rowKey) {
      activeManageTeamRowKey.value = null;
      return;
    }
    activeManageTeamRowKey.value = rowKey ?? null;
  }

  function closeManageTeam() {
    activeManageTeamRowKey.value = null;
  }

  /** Toggle (`.manage-team-wrapper`) and open menu; ignore those as "outside". */
  const MANAGE_TEAM_INSIDE_SELECTOR =
    ".manage-team-wrapper, .manage-team-dropdown";

  function handleManageTeamClickOutside(event: MouseEvent) {
    if (activeManageTeamRowKey.value == null) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(MANAGE_TEAM_INSIDE_SELECTOR)
    ) {
      return;
    }
    closeManageTeam();
  }

  watch(activeManageTeamRowKey, (key, prevKey) => {
    if (key) {
      // Attach only on null→open; A→B must not add a second listener.
      if (!prevKey) {
        setTimeout(
          () =>
            document.addEventListener("click", handleManageTeamClickOutside),
          0,
        );
      }
    } else {
      document.removeEventListener("click", handleManageTeamClickOutside);
    }
  });

  function handleTeamChange(
    keyId: ActionFromEditProgram,
    isEmit: boolean,
    payload: GraphqlGridEditProgramPayload | null,
  ) {
    const newPayload = {
      ...payload,
      isEmit,
      levelOfGrid: toValue(options.levelOfGrid),
      uuid: activeManageTeamRowKey.value,
    };
    actionFromEditProgram.value = newPayload;
    callMethodFromEditProgram(keyId ?? "");
    closeManageTeam();
  }

  onBeforeUnmount(() => {
    document.removeEventListener("click", handleManageTeamClickOutside);
  });

  return {
    activeManageTeamRowKey,
    onManageTeamOpen,
    closeManageTeam,
    handleTeamChange,
  };
}
