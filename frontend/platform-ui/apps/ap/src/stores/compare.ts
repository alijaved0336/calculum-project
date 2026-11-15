import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { secureStorage } from '@/services/pinia/index'
import * as CompareApi from '@/modules/home/compare/api'
// Types
interface ChartsData {
  lastDpoComparison: Array<any>
  lastDpoYears: Array<any>
  lastDso: Array<any>
  lastDsoYears: Array<any>
  lastC2c: Array<any>
  lastC2cYears: Array<any>
  lastPaymentTerms: Array<any>
  potentialCashFlowImpact: Array<any>
}

interface CompareState {
  chartsData: ChartsData
  addedCompanies: Array<any>
  optionsCompanies: Array<any>
}

async function fetchChartLastCfiComparison(params: any) {
  const { companies, startYear, endYear, callbackSuccess, callbackError } = params
  const response = await CompareApi.getChartLastCfiComparison(companies, startYear, endYear)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getComparePeers(params: any) {
  const { callbackSuccess, callbackError } = params
  const response = await CompareApi.getComparePeers()

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function postComparePeers(params: any) {
  const { companies, callbackSuccess, callbackError } = params
  const response = await CompareApi.postComparePeers(companies)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function postComparePeersReset(params: any) {
  const { callbackSuccess, callbackError } = params
  const response = await CompareApi.postComparePeersReset()

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getCompareGrid(params: any) {
  const { startYear, endYear, metric, companies, callbackSuccess, callbackError } = params
  const response = await CompareApi.getCompareGrid(startYear, endYear, metric, companies)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

export const useCompareStore = defineStore('compare', () => {
  // State
  const chartsData = ref<ChartsData>({
    lastDpoComparison: [],
    lastDpoYears: [],
    lastDso: [],
    lastDsoYears: [],
    lastC2c: [],
    lastC2cYears: [],
    lastPaymentTerms: [],
    potentialCashFlowImpact: []
  })
  
  const addedCompanies = ref<Array<any>>([])
  const optionsCompanies = ref<Array<any>>([])

  // Getters
  const getAddedCompanies = computed(() => addedCompanies.value)
  const getOptionsCompanies = computed(() => optionsCompanies.value)
  const getLastDpoComparison = computed(() => chartsData.value.lastDpoComparison)
  const getChartLastDpoYears = computed(() => chartsData.value.lastDpoYears)
  const getLastDsoChartData = computed(() => chartsData.value.lastDso)
  const getLastDsoYearsChartData = computed(() => chartsData.value.lastDpoYears)
  const getLastC2cChartData = computed(() => chartsData.value.lastC2c)
  const getLastC2cYearsChartData = computed(() => chartsData.value.lastC2cYears)

  // Actions (Mutations)
  function setInitialState() {
    chartsData.value = {
      lastDpoComparison: [],
      lastDpoYears: [],
      lastDso: [],
      lastDsoYears: [],
      lastC2c: [],
      lastC2cYears: [],
      lastPaymentTerms: [],
      potentialCashFlowImpact: []
    }
  }

  function setAddededCompanies(companies: Array<any>) {
    addedCompanies.value = companies
  }

  function setOptionsCompanies(companies: Array<any>) {
    optionsCompanies.value = companies
  }

  function setLastDpoComparison(chartData: Array<any>) {
    chartsData.value.lastDpoComparison = chartData
  }

  function setLastDpoYears(chartData: Array<any>) {
    chartsData.value.lastDpoYears = chartData
  }

  function setLastDsoChartData(chartData: Array<any>) {
    chartsData.value.lastDso = chartData
  }

  function setLastDsoYearsChartData(chartData: Array<any>) {
    chartsData.value.lastDpoYears = chartData
  }

  function setLastC2cChartData(chartData: Array<any>) {
    chartsData.value.lastC2c = chartData
  }

  function setLastC2cYearsChartData(chartData: Array<any>) {
    chartsData.value.lastC2cYears = chartData
  }

  // API Actions
  async function fetchLastC2cChartData(params: any) {
    const { companies, startYear, endYear, callbackSuccess, callbackError } = params
    const response = await CompareApi.getC2cChartData(companies, startYear, endYear)
    
    if (response.success) {
      setLastC2cChartData(response.data)
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  }

  async function fetchLastC2cYearsChartData(params: any) {
    const { companies, startYear, endYear, callbackSuccess, callbackError } = params
    const response = await CompareApi.getC2cChartData(companies, startYear, endYear)
    
    if (response.success) {
      setLastC2cYearsChartData(response.data)
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  }

  async function fetchChartLastDpoComparison(params: any) {
    const { companies, startYear, endYear, callbackSuccess, callbackError } = params
    const response = await CompareApi.getChartLastDpoComparison(companies, startYear, endYear)
    
    if (response.success) {
      setLastDpoComparison(response.data)
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  }

  async function fetchChartLastDpoYears(params: any) {
    const { companies, startYear, endYear, callbackSuccess, callbackError } = params
    const response = await CompareApi.getChartLastDpoComparison(companies, startYear, endYear)
    
    if (response.success) {
      setLastDpoYears(response.data)
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  }

  async function fetchLastDsoChartData(params: any) {
    const { companies, startYear, endYear, callbackSuccess, callbackError } = params
    const response = await CompareApi.getDsoChartData(companies, startYear, endYear)
    
    if (response.success) {
      setLastDsoChartData(response.data)
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  }

  async function fetchLastDsoYearsChartData(params: any) {
    const { companies, startYear, endYear, callbackSuccess, callbackError } = params
    const response = await CompareApi.getDsoChartData(companies, startYear, endYear)
    
    if (response.success) {
      setLastDsoYearsChartData(response.data)
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  }

  return {
    // State
    chartsData,
    addedCompanies,
    optionsCompanies,

    // Getters
    getAddedCompanies,
    getOptionsCompanies,
    getLastDpoComparison,
    getChartLastDpoYears,
    getLastDsoChartData,
    getLastDsoYearsChartData,
    getLastC2cChartData,
    getLastC2cYearsChartData,

    // Actions (Mutations)
    setInitialState,
    setAddededCompanies,
    setOptionsCompanies,
    setLastDpoComparison,
    setLastDpoYears,
    setLastDsoChartData,
    setLastDsoYearsChartData,
    setLastC2cChartData,
    setLastC2cYearsChartData,

    // API Actions
    fetchLastC2cChartData,
    fetchLastC2cYearsChartData,
    fetchChartLastDpoComparison,
    fetchChartLastCfiComparison,
    fetchChartLastDpoYears,
    fetchLastDsoChartData,
    fetchLastDsoYearsChartData,
    getComparePeers,
    postComparePeers,
    postComparePeersReset,
    getCompareGrid
  }
}, {
  persist: {
    storage: secureStorage,
    key: 'ada-compare'
  }
}) 