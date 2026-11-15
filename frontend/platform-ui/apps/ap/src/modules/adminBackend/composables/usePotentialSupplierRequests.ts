import { ref, computed, Ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import axios, { shouldShowErrorToasts } from '@/utils/axios'
import { giveAnswer } from '@/services/api/response'
import { translate } from "@/utils/translation";
import { getBaseApi } from '@/utils/getBaseApi'
import { getISODate } from '@/utils/FormatData'
import { saveExcel } from '@progress/kendo-vue-excel-export'
import {
  markRequestsAsSolved,
  rejectRequests as apiRejectRequests,
} from '@/modules/adminBackend/api/potentialSupplierRequests'

import { PotentialSupplierRequest } from "@/types";

export interface PotentialSupplierRequestFilters {
  status?: string
  search?: string
  companyUuid?: string
  spendFileVersionUuid?: string
}

export interface PotentialSupplierRequestPagination {
  page?: number
  itemsPerPage?: number
}

export function usePotentialSupplierRequests(
  filters: Ref<PotentialSupplierRequestFilters> = ref({}),
  pagination: Ref<PotentialSupplierRequestPagination> = ref({ page: 1, itemsPerPage: 25 }),
  sortOrder: Ref<'asc' | 'desc'> = ref('desc')
) {
  const toast = useToast()
  const requests = ref<PotentialSupplierRequest[]>([])
  const loading = ref(false)
  const error = ref<any>(null)
  const totalCount = ref(0)
  const pageInfo = ref({ hasNextPage: false, hasPreviousPage: false })

  const buildQueryParams = () => {
    const params: Record<string, string | number> = {
      page: pagination.value.page || 1,
      itemsPerPage: Math.max(1, Math.min(pagination.value.itemsPerPage || 25, 100))
    }
    if (filters.value.status) params['status'] = filters.value.status
    if (filters.value.search?.trim()) params['search'] = filters.value.search.trim()
    if (filters.value.companyUuid) params['companyUuid'] = filters.value.companyUuid.split('/').pop()!
    if (filters.value.spendFileVersionUuid) params['spendFileVersionUuid'] = filters.value.spendFileVersionUuid
    params['order[created]'] = sortOrder.value
    return params
  }

  const fetchRequests = async () => {
    loading.value = true
    error.value = null
    try {
      const params = buildQueryParams()
      const response = await axios.get(getBaseApi() + '/api/admin/potential_supplier_requests', { params })
      const apiResponse = giveAnswer(response)

      if (apiResponse.success && apiResponse.data) {
        const members = apiResponse.data['hydra:member'] || []
        const totalItems = apiResponse.data['hydra:totalItems'] || 0
        const currentPage = pagination.value.page || 1
        const itemsPerPage = pagination.value.itemsPerPage || 25
        const lastPage = Math.ceil(totalItems / itemsPerPage)

        requests.value = members
        totalCount.value = totalItems
        pageInfo.value = {
          hasNextPage: currentPage < lastPage,
          hasPreviousPage: currentPage > 1
        }
      } else {
        error.value = 'Failed to load requests'
        if (shouldShowErrorToasts()) toast.error('Could not load potential supplier requests')
      }
    } catch (err: any) {
      error.value = err
      if (shouldShowErrorToasts()) toast.error('Could not load potential supplier requests')
    } finally {
      loading.value = false
    }
  }

  const resetPagination = () => { pagination.value.page = 1 }

  let isPageChangeProgrammatic = false

  const loadNextPage = () => {
    if (pageInfo.value.hasNextPage && !loading.value) {
      isPageChangeProgrammatic = true
      pagination.value.page = (pagination.value.page || 1) + 1
      fetchRequests()
    }
  }

  const loadPreviousPage = () => {
    if (pageInfo.value.hasPreviousPage && !loading.value) {
      isPageChangeProgrammatic = true
      pagination.value.page = Math.max(1, (pagination.value.page || 1) - 1)
      fetchRequests()
    }
  }

  watch(
    () => filters.value,
    () => {
      resetPagination()
      fetchRequests()
    },
    { deep: true, immediate: false }
  )

  watch(
    () => sortOrder.value,
    () => {
      resetPagination()
      fetchRequests()
    }
  )

  watch(
    () => pagination.value.itemsPerPage,
    () => {
      resetPagination()
      fetchRequests()
    }
  )

  watch(
    () => pagination.value.page,
    () => {
      if (pagination.value.page && !isPageChangeProgrammatic) {
        fetchRequests()
      }
    }
  )

  const paginationInfo = computed(() => {
    const itemsPerPage = pagination.value.itemsPerPage || 25
    const currentPage = pagination.value.page || 1
    const total = totalCount.value
    const lastPage = Math.ceil(total / itemsPerPage) || 1
    return { itemsPerPage, lastPage, totalCount: total, currentPage }
  })

  async function markAsSolved(ids: string, sendEmail: boolean, emailMessage: string, potentialIdMatch: string): Promise<boolean> {
    const res = await markRequestsAsSolved(ids, sendEmail, emailMessage, potentialIdMatch)
    if (res.success) {
      requests.value = requests.value.map(r =>
        ids.includes(r['@id']) ? { ...r, status: 'solved' as const } : r
      )
      toast.success(`The request(s) marked as solved`)
      return true
    }
    toast.error('Could not mark requests as solved')
    return false
  }

  async function rejectRequests(ids: string, sendEmail: boolean, rejectReason: string): Promise<boolean> {
    const res = await apiRejectRequests(ids, sendEmail, rejectReason)
    if (res.success) {
      requests.value = requests.value.map(r =>
        ids.includes(r['@id']) ? { ...r, status: 'rejected' as const } : r
      )
      toast.success(`The request(s) rejected`)
      return true
    }
    toast.error('Could not reject requests')
    return false
  }

  async function exportToExcel() {
    try {
      const params: Record<string, string | number> = { page: 1, itemsPerPage: 10000 }
      if (filters.value.status) params['status'] = filters.value.status
      if (filters.value.search?.trim()) params['search'] = filters.value.search.trim()
      if (filters.value.companyUuid) params['companyUuid'] = filters.value.companyUuid.split('/').pop()!
      if (filters.value.spendFileVersionUuid) params['spendFileVersionUuid'] = filters.value.spendFileVersionUuid
      params['order[created]'] = sortOrder.value

      const response = await axios.get(getBaseApi() + '/api/admin/potential_supplier_requests', { params })
      const apiResponse = giveAnswer(response)

      if (!apiResponse.success || !apiResponse.data) {
        toast.error('Export failed')
        return
      }

      const members: PotentialSupplierRequest[] = apiResponse.data['hydra:member'] || []

      const data = members.map(row => ({
        name: row.name,
        companyName: row.spendFileVersion?.companyName ?? '',
        spendFile: row.spendFileVersion ? `${row.spendFileVersion.name} v${row.spendFileVersion.version}` : '',
        country: row.country?.localizedName ?? '',
        buyer: row.buyer?.name ?? '',
        currency: row.currency?.code ?? '',
        paymentTerms: row.estimateAvgPaymentTerms ?? '',
        estimatedAnnualSpend: row.estimatedAnnualSpendVolume ?? '',
        commodity: Array.isArray(row.commodity) ? row.commodity.join(', ') : '',
        requestedDate: row.created ? (getISODate(row.created) ?? '') : '',
        status: row.status,
      }))

      saveExcel({
        data,
        fileName: `potential-supplier-requests-${new Date().toISOString().slice(0, 10)}`,
        columns: [
          { field: 'name', title: translate.t('adminBackend.potentialSupplierRequest.columns.supplierName'), width: 200 },
          { field: 'companyName', title: translate.t('adminBackend.drawer.grid.company'), width: 160 },
          { field: 'spendFile', title: translate.t('adminBackend.potentialSupplierRequest.columns.spendFile'), width: 180 },
          { field: 'country', title: translate.t('adminBackend.potentialSupplierRequest.columns.country'), width: 140 },
          { field: 'buyer', title: translate.t('adminBackend.potentialSupplierRequest.columns.buyerEntity'), width: 160 },
          { field: 'currency', title: translate.t('adminBackend.potentialSupplierRequest.columns.currency'), width: 100 },
          { field: 'paymentTerms', title: translate.t('global.globalFilters.paymentTerms'), width: 130 },
          { field: 'estimatedAnnualSpend', title: translate.t('adminBackend.potentialSupplierRequest.columns.estAnnualSpend'), width: 160 },
          { field: 'commodity', title: translate.t('adminBackend.potentialSupplierRequest.columns.commodity'), width: 200 },
          { field: 'requestedDate', title: translate.t('adminBackend.potentialSupplierRequest.columns.requestedDate'), width: 140 },
          { field: 'status', title: translate.t('adminBackend.potentialSupplierRequest.columns.status'), width: 110 },
        ],
        filterable: true,
      })
    } catch {
      toast.error('Export failed')
    }
  }

  fetchRequests()

  return {
    requests,
    loading,
    error,
    totalCount,
    paginationInfo,
    pageInfo,
    refetch: fetchRequests,
    resetPagination,
    loadNextPage,
    loadPreviousPage,
    markAsSolved,
    rejectRequests,
    exportToExcel
  }
}
