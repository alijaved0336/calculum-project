import { defineStore } from 'pinia'
import * as CategorizeApi from '@/modules/home/categorize/api/index'
import { FiltersAPIParam } from '@/types'
import { OverviewInfoPanels } from '@/modules/home/categorize/types'

async function getOverviewInfoPanels(props: {
  filters: FiltersAPIParam,
  callbackSuccess: (response: OverviewInfoPanels) => void
  callbackError: (error: any) => void
}) {
  const { filters, callbackSuccess, callbackError } = props

  const response = CategorizeApi.getOverviewInfoPanels(filters)

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

async function updateSpendAlias(props: any) {
  const { spendUuid, alias, callbackSuccess, callbackError }: any = props
  const response = CategorizeApi.postSpendAlias(spendUuid, alias)
  await response.then((response) => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response.data)
    }
  })
}

export const useCategorizeStore = defineStore('categorize', () => {
  // Actions
  return {
    getOverviewInfoPanels,
    updateSpendAlias
  }
})
