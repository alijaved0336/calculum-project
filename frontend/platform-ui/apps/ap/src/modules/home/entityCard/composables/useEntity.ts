import { ComputedRef, computed, watch } from "vue";
import { EntityCard } from "@/types";
import { useEntityCardStore } from "@/stores/entityCard";
import useNegotiationStatus from "@/modules/negotiationStatus/composables/useNegotiationStatus";

const useEntity = () => {
  const entityCardStore = useEntityCardStore();

  const selectedEntityObj: ComputedRef<EntityCard.SelectedEntityObj> = computed(
    () => {
      return entityCardStore.getSelectedEntity;
    }
  );

  const entitySelectedTrackingNumber: ComputedRef<number> = computed(() => {
    return entityCardStore.getSelectedEntityTrackingNumber;
  });


  const refreshAfterUpdateStatusKanbanTracking: ComputedRef<number> = computed(() => {
    return entityCardStore.refreshAfterUpdateStatusKanban;
  });

  const { negotiationStatusTrackingNumber } = useNegotiationStatus();

  watch(negotiationStatusTrackingNumber, () => {
    entityCardStore.setSelectedEntityTrackingNumber(negotiationStatusTrackingNumber.value);
  });

  return {
    selectedEntityObj,
    entitySelectedTrackingNumber,
    refreshAfterUpdateStatusKanbanTracking
  };
};

export default useEntity;
