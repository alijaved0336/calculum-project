import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { getBaseApi } from '@/utils/getBaseApi';

export async function getC2cChartData (
  companies: Array<string>,
  startYear: string,
  endYear: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/statistics/compare/per_years_c2c'
  const params = {
    companies: companies,
    startYear: startYear,
    endYear: endYear
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}

export async function getChartLastDpoComparison (
  companies: Array<string>,
  startYear: string,
  endYear: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/statistics/compare/per_years_dpo'
  const params = {
    companies: companies,
    startYear: startYear,
    endYear: endYear
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}


export async function getChartLastCfiComparison (
  companies: Array<string>,
  startYear: string,
  endYear: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/statistics/compare/per_years_cfi'
  const params = {
    companies: companies,
    startYear: startYear,
    endYear: endYear
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}



export async function getDsoChartData (
  companies: Array<string>,
  startYear: string,
  endYear: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/statistics/compare/per_years_dso'
  const params = {
    companies: companies,
    startYear: startYear,
    endYear: endYear
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}


export async function getComparePeers (): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/statistics/compare/peers'
  
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}


export async function postComparePeers(companies: any): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/statistics/compare/peers'
  
  const params = {
    companies: companies
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function postComparePeersReset(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/statistics/compare/peers-reset'
  
  const params = {}

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}


export async function getCompareGrid (
  startYear: number, 
  endYear: number,   
  metric: string, 
  companies: Array<string>
): Promise<ApiResponse> {
  let response = null
  
  let setFinalMetric = ''
  if (metric === 'dpoComparison' || metric === 'lastDpoYears') {
    setFinalMetric = 'per_years_dpo'
  }

  if (metric === 'lastDso' || metric === 'lastDsoYears') {
    setFinalMetric = 'per_years_dso'
  }

  if (metric === 'lastC2c' || metric === 'lastC2cYears') {
    setFinalMetric = 'per_years_c2c'
  }

  if (metric === 'lastCfi') {
    setFinalMetric = 'per_years_cfi'
  }

  
  const url = getBaseApi() + '/api/statistics/compare/grid/'+setFinalMetric
  
  const params = {
    endYear,
    startYear,
    companies
  }
  
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}
