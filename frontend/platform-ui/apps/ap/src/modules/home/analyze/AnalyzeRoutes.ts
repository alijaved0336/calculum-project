import { isNullOrUndefined, queryRouters } from "@/utils";
import { RouteRecordRaw } from "vue-router";
import { UserSession } from "@/types";
import * as AnalyzeRouting from "./AnalyzeRouting";
import * as HomeRouting from "@/modules/home/HomeRouting";
import HomeAnalyzeProgramsPanel from "./views/HomeAnalyzeProgramsPanel.vue";
import HomeAnalyzeProgramToPlan1 from "./views/HomeAnalyzeProgramToPlan1.vue";
import useModuleProgram from "./composables/useModuleProgram";
import { useUserStore } from '@/stores/user'

import HomeOpportunity from "./views/HomeOpportunity.vue";

const moduleProgramRoutesAreAuthorized = (to: any, from: any, next: any) => {
  const userStore = useUserStore()
  const { moduleProgramIsInArray } = useModuleProgram();
  
  // Redirect to home if the user is not valid or
  // if the user has no access to the Categorize module.
  const user: UserSession | null = userStore.getUser; // Cannot use useUser() here
  
  if (isNullOrUndefined(user)) {
    HomeRouting.openHome();
    return;
  }
  
  if (!moduleProgramIsInArray(user.roles)) {
    HomeRouting.openHome();
    return;
  }

  // Grant access to the Opportunity module
  next();
};

export const getRoutes: Array<RouteRecordRaw> = [
  {
    path: "/home/analyze",
    name: AnalyzeRouting.homeAnalyzeProgramsPanel,
    component: HomeAnalyzeProgramsPanel,    
    beforeEnter: moduleProgramRoutesAreAuthorized
  },
  {
    path: "/home/analyze/program_overview/:selectedProgramId?",
    name: AnalyzeRouting.homeAnalyzeProgramOverview,
    component: HomeOpportunity,
    props: route => queryRouters.setQuerys(route),    
    beforeEnter: moduleProgramRoutesAreAuthorized
  },
  {
    path: "/home/analyze/program_to_plan1/:planId?",
    name: AnalyzeRouting.homeAnalyzeProgramToPlan1,
    component: HomeAnalyzeProgramToPlan1,
    props: route => queryRouters.setQuerys(route),    
    beforeEnter: moduleProgramRoutesAreAuthorized
  }
];
