import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { secureStorage } from '@/services/pinia/index'
import * as OverviewApi from '@/modules/home/overview/api'
// Types
interface OverviewState {
  matchGridColumnsList: Array<any>
}

async function getSummary(params: any) {
  const { spendVersion, callbackSuccess, callbackError } = params
  const response = await OverviewApi.getSummary(spendVersion)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError()
  }
}

async function getList(params: any) {
  const { spendVersion, callbackSuccess, callbackError } = params
  const response = await OverviewApi.getList(spendVersion)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError()
  }
}

async function deleteSpendbySpendFile(params: any) {
  const { spendFileVersion, match, noMatch, callbackSuccess, callbackError } = params
  const response = await OverviewApi.deleteSpendbySpendFile(spendFileVersion, match, noMatch)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError()
  }
}

async function matchDataAPIReadAll(params: any) {
  const { spendVersion, callbackSuccess, callbackError } = params
  const response = await OverviewApi.matchDataAPIReadAll(spendVersion)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError()
  }
}

export const useOverviewStore = defineStore('overview', () => {
  // State
  const matchGridColumnsList = ref<Array<any>>([])
  const isMatchInfoLoading = ref(true)

  // Getters
  const getMatchGridColumnsList = computed(() => matchGridColumnsList.value || [])
  const getIsMatchInfoLoading = computed(() => isMatchInfoLoading.value)

  // Actions (Mutations)
  function setInitialState() {
    matchGridColumnsList.value = []
  }

  function setMatchGridColumnsList(matchGridColumnsListValue: Array<any>) {
    matchGridColumnsList.value = matchGridColumnsListValue
  }

  function setIsMatchInfoLoading(value: boolean) {
    isMatchInfoLoading.value = value
  }

  return {
    // State
    matchGridColumnsList,
    isMatchInfoLoading,

    // Getters
    getMatchGridColumnsList,
    getIsMatchInfoLoading,

    // Actions (Mutations)
    setInitialState,
    setMatchGridColumnsList,
    setIsMatchInfoLoading,

    // API Actions
    getSummary,
    getList,
    deleteSpendbySpendFile,
    matchDataAPIReadAll
  }
}, {
  persist: {
    storage: secureStorage,
    key: 'ada-overview',
    paths: ['matchGridColumnsList']
  }
})
