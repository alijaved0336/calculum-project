import { ref, type Ref } from "vue";
import { useToast } from "vue-toastification";
import { useI18n } from "vue-i18n";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { useNegotiationStatusStore } from "@/stores/negotiationStatus";
import { useEntityCardStore } from "@/stores/entityCard";
import { convertFiltersToREST } from "@/utils/FormatData";
import {
  classifyTransition,
  requiresModal,
  type NegotiationStatus,
  type TransitionTier
} from "@/composables/useStatusTransitions";
import { isPartialEntity } from "@/composables/usePartialNegotiationStatus";
import { useUndoToast } from "./useUndoToast";
import {
  getSavedFilterScope,
  isGlobalWarningSuppressed,
  saveFilterScope,
  suppressGlobalWarning,
  type FilterScopePreference
} from "./useKanbanSessionPreferences";
import { NumberUtils } from '@/utils'
import type { Filters } from "../types";
import useApolloClient from "@/services/graphql/useApolloClient";
import { useAppStore } from '@/stores/app';

interface ColumnRefApi {
  moveCardIn: (card: any) => void;
  removeCardByUuid: (uuid: string) => void;
  refetch: () => void | Promise<void>;
}


interface PlanPhaseAssignmentsInterface {
    spendUuid: string
    planPhaseUuid: string
  }

interface PendingMove {
  card: Record<string, any> & {
    planPhaseAssignments?: PlanPhaseAssignmentsInterface[] | null;
    planPhaseUuid?: string | null;
  };
  fromStatus: NegotiationStatus;
  toStatus: NegotiationStatus;
  levelofGrid: number;
  tier: TransitionTier;
  moved: boolean;
  scope: FilterScopePreference;
  isPartialMove: boolean;
  planPhaseId?: string;
  termsPayload?: Record<string, any>;
  resolvedStatus?: NegotiationStatus;  
}

interface UseKanbanDragAndDropDeps {
  programSelectedId: Ref<string | null | undefined>;
  spendFileVersionActiveId: Ref<string | null | undefined>;
  getColumnRef: (status: NegotiationStatus) => ColumnRefApi | null | undefined;
  isAnyFilterActive: () => boolean;
  telerikFilters?: Ref<Filters>;
}

function levelFor(levelofGrid: number): string {
  if (levelofGrid === 0) return "spend";
  if (levelofGrid === 1) return "supplier";
  return "parent";
}

export function useKanbanDragAndDrop(deps: UseKanbanDragAndDropDeps) {
  const globalFiltersStore = useGlobalFiltersStore();
  const negotiationStatusStore = useNegotiationStatusStore();
  const entityCardStore = useEntityCardStore();
  const toast = useToast();
  const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
  const { showUndoToast } = useUndoToast();

  const pendingMove = ref<PendingMove | null>(null);
  const showGlobalWarning = ref(false);
  const showTier2Confirm = ref<"tier2A" | "tier2B" | null>(null);
  const showPlanModal = ref(false);
  const showAgreedTermsModal = ref(false);
  const showFilterScopeDialog = ref(false);

  const { apolloClientResetStore } = useApolloClient();

  function applyMove(pending: PendingMove) {
    if (pending.moved) return;
    if (pending.isPartialMove) return;
    deps.getColumnRef(pending.fromStatus)?.removeCardByUuid(pending.card.uuid);
    deps.getColumnRef(pending.resolvedStatus ?? pending.toStatus)?.moveCardIn(pending.card);
    pending.moved = true;
  }

  function revertMove(pending: PendingMove) {
    if (!pending.moved) return;
    deps.getColumnRef(pending.resolvedStatus ?? pending.toStatus)?.removeCardByUuid(pending.card.uuid);
    deps.getColumnRef(pending.fromStatus)?.moveCardIn(pending.card);
    pending.moved = false;
  }

  function statusUpdateFailed() {
    toast.error(translate.t("home.manageModule.dragAndDrop.statusUpdateFailed"));
  }

  function statusUpdateCorrectly() {
    toast.success(translate.t("global.noty.allChangesWereApplied"));
  }


   const statusCodes: Record<string, number> = {
      analyzed: 100,
      onHold: 150,
      planned: 200,
      contacted: 300,
      agreed: 400,
      agreedExtended: 500 
    }

    function getStatusCode(status: string): number {
      return statusCodes[status]
    }

  function buildScopeParams(pending: PendingMove, sourceStatusOverride?: NegotiationStatus) {
    const level = levelFor(pending.levelofGrid);
    const isScopedToFilters = pending.levelofGrid !== 0 && pending.scope === "filtered";
    // The source column is sent as a numeric status code and the backend narrows the
    // move to it (NegotiationManager filters the spends by
    // negotiationStatusCode = :sourceStatusParam). Spend level sends none: the dragged
    // row is already the single spend line being moved.
    const sourceStatusCode = pending.levelofGrid !== 0 ? sourceStatusOverride ?? pending.fromStatus : null;

    const sourceStatus =  sourceStatusCode ? getStatusCode(sourceStatusCode) : null

    return {
      spendsIds: [pending.card.uuid],
      level,
      // all: pending.levelofGrid !== 0 ? pending.scope === "all" : false,
      filters: isScopedToFilters ? { globalFilter: convertFiltersToREST(globalFiltersStore.getFiltersApplied) } : null,
      ...(sourceStatus ? { sourceStatus } : {})
    };
  }

    function refreshAllColumns() {

      //- If some partial was applied, is neccesary update all the columns, because maybe one spendline
      // Is not present in the from - to columns

      deps.getColumnRef("analyzed")?.refetch();
      deps.getColumnRef("onHold")?.refetch();
      deps.getColumnRef("planned")?.refetch();
      deps.getColumnRef("contacted")?.refetch();
      deps.getColumnRef("agreed")?.refetch();
      deps.getColumnRef("agreedExtended")?.refetch();
    }

  function fireStatusUpdate(pending: PendingMove) {
    if (globalFiltersStore.getDisableWatchers) return;

    const scopeParams = buildScopeParams(pending);
    negotiationStatusStore.negotiationStatusAPIUpdate({
      ...scopeParams,
      negotiationStatus: pending.resolvedStatus ?? pending.toStatus,
      spendFileVersionUuid: deps.spendFileVersionActiveId.value,
      planPhaseId: pending.planPhaseId,
      callbackSuccess: () => {        

         if (pending.isPartialMove) {
          statusUpdateCorrectly()
          apolloClientResetStore();          
          setTimeout(() => {
            refreshAllColumns()
          }, 100)
         } else {
          const destinationLabel = translate.t(`home.manageModule.${pending.toStatus}`);
          showUndoToast(pending.card.entityName ?? "", destinationLabel, () => handleUndo(pending));
          applyMove(pending);        
          entityCardStore.setRefreshAfterUpdateStatusKanban(NumberUtils.getRandomInt());
         }        
      },
      callbackError: () => {
        revertMove(pending);
        statusUpdateFailed();
      }
    });
  }

  function fireAgreedTermsPath(pending: PendingMove) {
    if (globalFiltersStore.getDisableWatchers) return;

    const appStore = useAppStore();
    let currencyRate: number = appStore.getCurrencyAmount;
    const scopeParams = buildScopeParams(pending);

    let setLevel = ''
    switch (pending.levelofGrid) {
      case 0:
        setLevel = 'spend'
        break;
      case 1:
        setLevel = 'supplier'
        break;
      case 2:
        setLevel = 'parent'
        break;
    }

    const params = {
      ...scopeParams,
      spendsUuid: [pending.card.uuid],
      entity: pending.card.entityUuid,
      spendsTerms: pending.termsPayload,
      all: false,
      level: setLevel,
      filters: {
        telerikFilter: [],
        targetProgramUuid: deps.programSelectedId.value,
        currencyRate
      },
      callbackSuccess: (response: any) => {
        pending.resolvedStatus = (response?.negotiationStatus as NegotiationStatus) ?? pending.toStatus;
        applyMove(pending);
        fireStatusUpdate(pending);
      },
      callbackError: () => {
        statusUpdateFailed();
      }
    }
    entityCardStore.saveAndEditAgrreedTerms(params);    
  }

  function fire(pending: PendingMove) {
    if (requiresModal(pending.toStatus) === "agreedTerms") {
      fireAgreedTermsPath(pending);
    } else {
      fireStatusUpdate(pending);
    }
  }

  function afterFilterScopeResolved(pending: PendingMove) {
    showFilterScopeDialog.value = false;
    pendingMove.value = null;
    fire(pending);
  }

  function proceedToFilterScopeGate(pending: PendingMove) {
    const needsFilterScope = pending.levelofGrid !== 0 && deps.isAnyFilterActive();

    if (!needsFilterScope) {
      pending.scope = "all";
      fire(pending);
      return;
    }

    const savedScope = getSavedFilterScope();
    if (savedScope) {
      pending.scope = savedScope;
      fire(pending);
      return;
    }

    pendingMove.value = pending;
    showFilterScopeDialog.value = true;
  }

  function proceedAfterTargetModal(pending: PendingMove) {
    proceedToFilterScopeGate(pending);
  }

  function proceedToTargetModalGate(pending: PendingMove) {
    const modalKind = requiresModal(pending.toStatus);

    if (modalKind === "plan") {
      pendingMove.value = pending;
      showPlanModal.value = true;
      return;
    }

    if (modalKind === "agreedTerms") {
      pendingMove.value = pending;
      showAgreedTermsModal.value = true;
      return;
    }

    if (!pending.moved) applyMove(pending);
    proceedAfterTargetModal(pending);
  }

  function proceedAfterTier2(pending: PendingMove) {
    if (pending.tier === "tier1Backward") {
      if (!pending.moved) applyMove(pending);      
    }
    proceedToTargetModalGate(pending);
  }

  function proceedToTier2Gate(pending: PendingMove) {
    if (pending.tier === "tier2ABackward") {
      pendingMove.value = pending;
      showTier2Confirm.value = "tier2A";
      return;
    }
    if (pending.tier === "tier2BReclassify") {
      pendingMove.value = pending;
      showTier2Confirm.value = "tier2B";
      return;
    }
    proceedAfterTier2(pending);
  }

  async function handleUndo(pending: PendingMove) {

    revertMove(pending);
    const sourceStatus = pending.resolvedStatus ?? pending.toStatus;
    const scopeParams = buildScopeParams(pending, sourceStatus);

    if (pending.levelofGrid !== 0 && pending.fromStatus === 'planned') {
      // At supplier/parent level, "planned" is a rollup of multiple spend lines, each
      // possibly assigned to a different plan phase. A single negotiationStatus call can't
      // undo all of them (only one planPhaseId), so fire one update per assignment instead
      // and skip the generic single-call revert below.
      const planPhaseAssignments = pending.card.planPhaseAssignments ?? [];
      await Promise.all(
        planPhaseAssignments.map((assignment) =>
          negotiationStatusStore.negotiationStatusAPIUpdate({
            ...scopeParams,
            spendsIds: [assignment.spendUuid],
            negotiationStatus: 'planned',
            spendFileVersionUuid: deps.spendFileVersionActiveId.value,
            filters: null,
            level: 'spend',
            planPhaseId: assignment.planPhaseUuid
          })
        )
      );
      entityCardStore.setRefreshAfterUpdateStatusKanban(NumberUtils.getRandomInt());
      return false;
    }

    negotiationStatusStore.negotiationStatusAPIUpdate({
      ...scopeParams,
      negotiationStatus: pending.fromStatus,
      spendFileVersionUuid: deps.spendFileVersionActiveId.value,
      planPhaseId: pending.card.planPhaseUuid ?? null,
      callbackSuccess: () => {
        if (pending.isPartialMove) {
          statusUpdateCorrectly()
          apolloClientResetStore();
          setTimeout(() => {
            refreshAllColumns()
          }, 100)
        } else {
          entityCardStore.setRefreshAfterUpdateStatusKanban(NumberUtils.getRandomInt());
        }        
      },      
      callbackError: () => {
        statusUpdateFailed();
      }      
    });
  }

  function handleCardMoved({
    card,
    fromStatus,
    toStatus,
    levelofGrid
  }: {
    card: any;
    fromStatus: NegotiationStatus | undefined;
    toStatus: NegotiationStatus;
    levelofGrid: number;
  }) {
    if (!fromStatus || fromStatus === toStatus) return;

    const tier = classifyTransition(fromStatus, toStatus);
    if (!tier) return;

    const modalKind = requiresModal(toStatus);
    const isTier1IntoPlanned = tier === "tier1Backward" && modalKind === "plan";
    
    const isPartialMove = levelofGrid !== 0 && isPartialEntity(card.negotiationStatusCodes);
    // vue-draggable-plus already moved the card in the DOM/array eagerly on drop.
    const pending: PendingMove = {
      card,
      fromStatus,
      toStatus,
      levelofGrid,
      tier,
      moved: true,
      scope: "all",
      isPartialMove
    };

    const spendLineCount = levelofGrid !== 0 ? card.spendCounts ?? card.supplierCounts ?? 0 : 0;
    const noFiltersActive = !deps.isAnyFilterActive();
    const needsGlobalWarning =
      levelofGrid !== 0 && noFiltersActive && spendLineCount > 1 && !isGlobalWarningSuppressed();
    const needsTier2Confirm = tier === "tier2ABackward" || tier === "tier2BReclassify";
    const needsModalBeforeMove = !!modalKind && !isTier1IntoPlanned;

    // Partial entities never keep the library's eager local move — the true post-move
    // column set can only be known after a server refetch (see applyMove/fireStatusUpdate).
    if (isPartialMove || needsGlobalWarning || needsTier2Confirm || needsModalBeforeMove) {
      revertMove(pending);
    }

    if (needsGlobalWarning) {
      pendingMove.value = pending;
      showGlobalWarning.value = true;
      return;
    }
    proceedToTier2Gate(pending);
  }

  function onGlobalWarningContinue({ dontShowAgain }: { dontShowAgain: boolean }) {
    if (dontShowAgain) suppressGlobalWarning();
    const pending = pendingMove.value;
    showGlobalWarning.value = false;
    pendingMove.value = null;
    if (pending) proceedToTier2Gate(pending);
  }

  function onGlobalWarningCancel() {
    showGlobalWarning.value = false;
    pendingMove.value = null;
  }

  function onTier2Continue() {
    const pending = pendingMove.value;
    showTier2Confirm.value = null;
    pendingMove.value = null;
    if (pending) proceedAfterTier2(pending);
  }

  function onTier2Cancel() {
    showTier2Confirm.value = null;
    pendingMove.value = null;
  }

  function onPlanModalConfirm({ planPhaseId }: { planPhaseId: string }) {
    const pending = pendingMove.value;
    showPlanModal.value = false;
    pendingMove.value = null;
    if (!pending) return;
    pending.planPhaseId = planPhaseId;
    if (!pending.moved) applyMove(pending);
    proceedAfterTargetModal(pending);
  }

  function onPlanModalCancel() {
    const pending = pendingMove.value;
    showPlanModal.value = false;
    pendingMove.value = null;
    // Tier1-backward-into-Planned is the one case where the move was already
    // standing (with its undo toast) before this modal opened — no valid API
    // call exists without a phase, so cancelling here must undo that move too.
    if (pending && pending.moved) revertMove(pending);
  }

  function onAgreedTermsModalConfirm(termsPayload: Record<string, any>) {
    const pending = pendingMove.value;
    showAgreedTermsModal.value = false;
    pendingMove.value = null;
    if (!pending) return;
    pending.termsPayload = termsPayload;
    proceedAfterTargetModal(pending);
  }

  function onAgreedTermsModalCancel() {
    showAgreedTermsModal.value = false;
    pendingMove.value = null;
  }

  function onFilterScopeConfirm({
    scope,
    savePreference
  }: {
    scope: FilterScopePreference;
    savePreference: boolean;
  }) {
    const pending = pendingMove.value;
    if (savePreference) saveFilterScope(scope);
    if (!pending) return;
    pending.scope = scope;
    afterFilterScopeResolved(pending);
  }

  function onFilterScopeCancel() {
    const pending = pendingMove.value;
    showFilterScopeDialog.value = false;
    pendingMove.value = null;
    if (pending) revertMove(pending);
  }

  return {
    pendingMove,
    showGlobalWarning,
    showTier2Confirm,
    showPlanModal,
    showAgreedTermsModal,
    showFilterScopeDialog,
    handleCardMoved,
    onGlobalWarningContinue,
    onGlobalWarningCancel,
    onTier2Continue,
    onTier2Cancel,
    onPlanModalConfirm,
    onPlanModalCancel,
    onAgreedTermsModalConfirm,
    onAgreedTermsModalCancel,
    onFilterScopeConfirm,
    onFilterScopeCancel
  };
}
