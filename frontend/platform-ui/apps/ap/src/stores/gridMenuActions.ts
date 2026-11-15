import { ActionFromEditProgram } from "@/modules/components/types";
import { UserSessionActiveCompanyCommodity, UserSessionActiveCompanyTeam } from "@/types";
import { NumberUtils } from "@/utils";
import { defineStore } from "pinia";
import { ref } from "vue";

function convertToTuple(obj: Record<string, any>): any[] {
  // Extraer índices numéricos de las propiedades param
  const indices = Object.keys(obj)
    .map(key => key.match(/^param(\d+)$/))
    .filter(match => match !== null)
    .map(match => parseInt(match![1], 10));

  if (indices.length === 0) return [];

  const maxIndex = Math.max(...indices);

  // Create array based on sorted values
  return Array.from({ length: maxIndex + 1 }, (_, i) => {
    const key = i === 0 ? 'param' : `param${i}`;
    return obj[key] ?? null;
  });
}

export const useGridMenuActionsStore = defineStore("gridMenuActions", () => {
  const trackingNumber = ref<string>("");
  const actionFromEditProgram = ref(null);
  const disabledFilterValue = ref<string | null>("No");
  const activeTeams = ref<UserSessionActiveCompanyTeam[]>([]);
  const activeCommodities = ref<UserSessionActiveCompanyCommodity[]>([]);

  function changeAction(action: ActionFromEditProgram, payload: any) {
    actionFromEditProgram.value = payload;
    trackingNumber.value = `${action}-${NumberUtils.getRandomInt()}`;
  }

  function setDisabledFilter(value: string | null) {
    disabledFilterValue.value = value;
  }

  function initializeTeams(teams: UserSessionActiveCompanyTeam[]) {
    activeTeams.value = teams;
  }
  
  function addTeam(team: UserSessionActiveCompanyTeam) {
    activeTeams.value.push(team);
  }
  
  function updateTeam(teamId: string, updatedTeam: Partial<UserSessionActiveCompanyTeam>) {
    const index = activeTeams.value.findIndex(t => t['@id'] === teamId);
    if (index !== -1) {
      activeTeams.value[index] = { ...activeTeams.value[index], ...updatedTeam };
    }
  }
  
  function removeTeam(teamId: string) {
    activeTeams.value = activeTeams.value.filter(t => t['@id'] !== teamId);
  }

  function initializeCommodities(commodities: UserSessionActiveCompanyCommodity[]) {
    activeCommodities.value = commodities;
  }

  function addCommodity(commodity: UserSessionActiveCompanyCommodity) {
    activeCommodities.value.push(commodity);
  }

  function updateCommodity(commodityId: string, updatedCommodity: Partial<UserSessionActiveCompanyCommodity>) {
    const index = activeCommodities.value.findIndex(c => c['@id'] === commodityId);
    if (index !== -1) {
      activeCommodities.value[index] = { ...activeCommodities.value[index], ...updatedCommodity };
    }
  }

  function removeCommodity(commodityId: string) {
    activeCommodities.value = activeCommodities.value.filter(c => c['@id'] !== commodityId);
  }

  return {
    trackingNumber,
    actionFromEditProgram,
    disabledFilterValue,
    activeTeams,
    activeCommodities,
    changeAction,
    setDisabledFilter,
    convertToTuple,
    initializeTeams,
    addTeam,
    updateTeam,
    removeTeam,
    initializeCommodities,
    addCommodity,
    updateCommodity,
    removeCommodity,
  };
});
