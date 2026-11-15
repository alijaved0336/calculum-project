import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as SpendFilesApi from "@/modules/home/spendFiles/api"
import * as ValuePropositionApi from "@/modules/valueProposition/api"

async function createValueProposition(props: any) {
  const {
    activeProgramDefaultId,valuePropositionName, valuePropositionCurrency, expirationDays, spendFileVersion, callbackSuccess, callbackError
  }: any = props
  const response = SpendFilesApi.createValueProposition( activeProgramDefaultId,valuePropositionName, valuePropositionCurrency, expirationDays, spendFileVersion)


  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  })
}

async function cloneValueProposition(props: any) {
  const {
   uuid, callbackSuccess, callbackError
  }: any = props
  const response = SpendFilesApi.cloneValueProposition( uuid )


  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  })
}

async function setNameInGridValueProposition(props: any) {
  const {
    uuid, callbackSuccess, callbackError,valuePropositionName
  }: any = props
  const response = SpendFilesApi.setNameInGridValueProposition( uuid,valuePropositionName)


  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  })
}

async function setPersistValuePropositionJson(props: any) {
  const {
   uuid, valuePropositionData, callbackSuccess, callbackError
  }: any = props
  const response = SpendFilesApi.setPersistValuePropositionJson( uuid, valuePropositionData )


  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data['hydra:member'])
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  })
}

async function postUploadImagesValueProposition(props: any) {
  const { file, callbackSuccess, callbackError }: any = props
  const response = SpendFilesApi.postUploadImagesValueProposition(file)

  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  })
}

async function requestNewContent(props: any) {
  const { type, valuepropositionId, spendFileVersionUuid,activeProgramDefaultId, callbackSuccess, callbackError, supplierUuid }: any = props
  const response = SpendFilesApi.requestNewContent(type, valuepropositionId, spendFileVersionUuid,activeProgramDefaultId, supplierUuid)

  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  })
}

async function requestNewContentToExportSupplierPDF(props: any) {
  const { spendFileVersionUuid,activeProgramDefaultId, callbackSuccess, callbackError, entities, codeCurrency }: any = props
  const response = SpendFilesApi.requestNewContentToExportSupplierPDF(spendFileVersionUuid,activeProgramDefaultId, entities, codeCurrency)

  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  })
}

async function trackingActivityDashboard(props: any) {
  const { type, value_proposition_id, callbackSuccess, callbackError }: any = props
  const response = ValuePropositionApi.trackingActivityDashboard(type, value_proposition_id)
  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }
    if (callbackError) {
      callbackError(response)
    }
  })
}

async function updateActivityDashboard(props: any) {
  const { value_proposition_id, callbackSuccess, callbackError }: any = props
  const response = ValuePropositionApi.updateActivityDashboard(value_proposition_id)
  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }
    if (callbackError) {
      callbackError(response)
    }
  })
}

export const useValuePropositionStore = defineStore('valueProposition', () => {
  // State
  const cantValuesPropostion = ref<number>(0)

  // Getters
  function getCantValuesPropositions(): number {
    return cantValuesPropostion.value
  }

  // Mutations
  function setInitialState() {
    cantValuesPropostion.value = 0
  }

  function setCantValuesPropositions(generatedCantValueProposition: number) {
    cantValuesPropostion.value = generatedCantValueProposition
  }

  // Actions
  async function getAllValuePropositions(props: any) {
    const { spendFileVersion, callbackSuccess, callbackError }: any = props;
    const response = SpendFilesApi.getAllValuePropositions(spendFileVersion);

    await response.then((response) => {
      if (response.success) {
        setCantValuesPropositions(response.data["hydra:totalItems"]);
        if (callbackSuccess) {
          callbackSuccess(response.data["hydra:member"]);
        }
        return;
      }

      if (callbackError) {
        callbackError(response);
      }
    });
  }

  return {
    // State
    cantValuesPropostion,
    // Getters
    getCantValuesPropositions,
    // Mutations
    setInitialState,
    setCantValuesPropositions,
    // Actions
    getAllValuePropositions,
    createValueProposition,
    cloneValueProposition,
    setNameInGridValueProposition,
    setPersistValuePropositionJson,
    postUploadImagesValueProposition,
    requestNewContent,
    trackingActivityDashboard,
    updateActivityDashboard,
    requestNewContentToExportSupplierPDF
  }
})
