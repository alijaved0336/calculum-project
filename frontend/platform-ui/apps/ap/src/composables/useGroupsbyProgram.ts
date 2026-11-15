import { useAnalyzeStore } from "@/stores/analyze";
import { StringUtils } from '@/utils'

/**
 * User Session Composable
 */
const groupsByProgram = () => {
  const analyzeStore = useAnalyzeStore();

  function findHarmonizationByProgram(uuidProgram: string) {
    //Only return the array if exists if not return undefined
    const uuid = StringUtils.removeIRI(uuidProgram)
    const harmonizationsStore = analyzeStore.harmonizationsGroupsbyProgram
    if (harmonizationsStore && (harmonizationsStore as any)[uuid]) {
      const groups = JSON.parse(JSON.stringify((harmonizationsStore as any)[uuid]))
      return groups
    } 
    return null
  }

  /** Harmonization groups */

  function storeHarmonizationByProgram(uuidProgram: string, groups: any) {
    //To reset the store
    analyzeStore.setHarmonizationsGroupsbyProgram([])
    if (groups.length < 0) return

    //To set the new value
    const uuid = StringUtils.removeIRI(uuidProgram)    
    const harmonizations: any = []
    harmonizations[uuid] = groups
    analyzeStore.setHarmonizationsGroupsbyProgram(harmonizations)    
  }

  /** Financing groups */

  function findFinancingByProgram(uuidProgram: string) {
    const uuid = StringUtils.removeIRI(uuidProgram)
    const financingsStore = analyzeStore.financingsGroupsbyProgram
    if (financingsStore && (financingsStore as any)[uuid]) {
      const groups = JSON.parse(JSON.stringify((financingsStore as any)[uuid]))
      return groups
    } 
    return null
  }

  function storeFinancingByProgram(uuidProgram: string, groups: any) {
    //To reset the store
    analyzeStore.setFinancingsGroupsbyProgram([])
    if (groups.length < 0) return

    //To set the new value
    const uuid = StringUtils.removeIRI(uuidProgram)    
    const financings: any = []
    financings[uuid] = groups
    analyzeStore.setFinancingsGroupsbyProgram(financings)
  }

  return {
    findHarmonizationByProgram,
    findFinancingByProgram,
    storeHarmonizationByProgram,
    storeFinancingByProgram
  };
};

export default groupsByProgram;
