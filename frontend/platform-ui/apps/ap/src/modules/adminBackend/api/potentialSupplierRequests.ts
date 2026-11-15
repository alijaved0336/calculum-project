import axios from '@/utils/axios'
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { getBaseApi } from '@/utils/getBaseApi'
import { StringUtils } from '@/utils'
// import type { SpendFile } from '@/types'


export interface PotentialSupplierRequestParams {
  page?: number
  itemsPerPage?: number
  status?: string
  search?: string
  order?: { created?: 'asc' | 'desc' }
}

// API Platform Hydra collection shape
export interface HydraCollection<T> {
  'hydra:member': T[]
  'hydra:totalItems': number
  'hydra:view'?: {
    '@id': string
    'hydra:first'?: string
    'hydra:last'?: string
    'hydra:next'?: string
    'hydra:previous'?: string
  }
}

const BASE = () => getBaseApi() + '/api/admin/potential_supplier_requests'

export async function getPotentialSupplierRequests(
  params: PotentialSupplierRequestParams = {}
): Promise<ApiResponse> {
  let response = null
  try {
    response = await axios.get(BASE(), { params })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}

export async function markRequestsAsSolved(
  ids: string,
  sendEmail: boolean,
  emailMessage: string,
  potentialIdMatch: string
): Promise<ApiResponse> {
  let response = null
  try {
    response = await axios.patch(`${BASE()}/${StringUtils.removeIRI(ids)}`, { sendEmail, emailMessage, status: 'solved', potentialIdMatch }, { headers: { 'Content-Type': 'application/merge-patch+json' } })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}

export async function rejectRequests(
  ids: string,
  sendEmail: boolean,
  rejectReason: string
): Promise<ApiResponse> {
  let response = null
  try {
    response = await axios.patch(`${BASE()}/${StringUtils.removeIRI(ids)}`, { sendEmail, rejectReason, status: 'rejected' }, { headers: { 'Content-Type': 'application/merge-patch+json' } })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}

export async function getUnmatchedPotentialSuppliers(id: string | number): Promise<ApiResponse> {
  let response = null
  try {
    response = await axios.get(`${getBaseApi()}/api/admin/spend_parsed_companies/unmatched-potential-suppliers?psrUuid=${id}`)
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}

export async function exportPotentialSupplierRequests(
  params: Omit<PotentialSupplierRequestParams, 'page' | 'itemsPerPage'> = {}
): Promise<ApiResponse> {
  let response = null
  try {
    response = await axios.get(`${BASE()}/export`, { params, responseType: 'blob' })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}
