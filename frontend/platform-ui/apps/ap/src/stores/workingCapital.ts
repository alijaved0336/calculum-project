import { defineStore } from 'pinia'
import { ref } from 'vue'
import { secureStorage } from '@/services/pinia/index'

export const useWorkingCapitalStore = defineStore('workingCapital', () => {
  const minDaysByVersionUuid = ref<Record<string, number>>({})

  function getMinDays(versionUuid: string): number | undefined {
    return minDaysByVersionUuid.value[versionUuid]
  }

  function setMinDays(versionUuid: string, minDays: number) {
    minDaysByVersionUuid.value = { ...minDaysByVersionUuid.value, [versionUuid]: minDays }
  }

  return { minDaysByVersionUuid, getMinDays, setMinDays }
}, {
  persist: { storage: secureStorage, key: 'ada-working-capital' }
})
