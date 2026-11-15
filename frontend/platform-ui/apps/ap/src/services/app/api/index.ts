import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { getBaseApi } from '@/utils/getBaseApi';

export async function getCurrencies(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/currencies'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function getCountries(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/countries'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function getCountryCompanyIdTypes(countryId: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + countryId + '/company_identification_types'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function getCountryCurrencies(countryId: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + countryId + '/currencies'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function getIndustries(params?: { name?: string; page?: number }): Promise<ApiResponse> {
  let response = null
  const queryParams: Record<string, any> = { itemsPerPage: 500 }
  if (params?.name) queryParams.name = params.name
  if (params?.page) queryParams.page = params.page
  const url = getBaseApi() + '/api/industries'

  try {
    response = await axios.get(url, { params: queryParams })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function getSubIndustries(industryId: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + industryId + '/child_industries'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}
