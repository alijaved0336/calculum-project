import { defineStore } from 'pinia'
import { ref } from 'vue'
import { NegotiationStatus } from "@/types"
import { NumberUtils } from "@/utils"
import * as API from "@/modules/negotiationStatus/api"

async function negotiationStatusAPIUpdate(params: any) {
  // Init
  const {
    spendsIds,
    negotiationStatus,
    spendFileVersionUuid,
    filters,
    all,
    level,
    planPhaseId,
    sourceStatus,
    callbackSuccess,
    callbackError
  }: {
    spendsIds: string[];
    negotiationStatus: NegotiationStatus;
    spendFileVersionUuid: string;
    filters: any;
    all: boolean | null;
    level: string;
    planPhaseId?: string;
    sourceStatus?: number;
    callbackSuccess: any;
    callbackError: any;
  } = params || {};


  const response = await API.negotiationStatusAPIUpdate({
    spendsIds,
    negotiationStatus,
    spendFileVersionUuid,
    filters,
    all,
    level,
    planPhaseId,
    sourceStatus
  });

  if (response.success && callbackSuccess) {
    callbackSuccess(response.data);
  } else if (callbackError) {
    callbackError(response);
  }
}

export const useNegotiationStatusStore = defineStore('negotiationStatus', () => {
  // State
  const trackingNumber = ref<number>(NumberUtils.getRandomInt())
  const refresNotes = ref<number>(0)

  // Getters
  function getTrackingNumber(): number {
    return trackingNumber.value
  }

  function getRefresNotes(): number {
    return refresNotes.value
  }

  // Mutations
  function setTrackingNumber(trackingNumberValue: number) {
    trackingNumber.value = trackingNumberValue
  }

  function setRefresNotes(refresNotesValue: number) {
    refresNotes.value = refresNotesValue
  }

  return {
    // State
    trackingNumber,
    refresNotes,
    // Getters
    getTrackingNumber,
    getRefresNotes,
    // Mutations
    setTrackingNumber,
    setRefresNotes,
    // Actions
    negotiationStatusAPIUpdate
  }
})
