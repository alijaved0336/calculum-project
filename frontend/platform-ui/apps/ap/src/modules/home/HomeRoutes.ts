import { isNullOrUndefined, queryRouters } from "@/utils";
import { RouteRecordRaw } from "vue-router";
import * as AnalyzeRoutes from "./analyze/AnalyzeRoutes";
import * as CategorizeRoutes from "./categorize/CategorizeRoutes";
import * as CompareRoutes from "./compare/CompareRoutes";
import * as EntityCardRoutes from "./entityCard/EntityCardRoutes";
import * as HomeRouting from "./HomeRouting";
import * as ManageModuleRoutes from "./manageModule/manageModuleRoutes";
import * as OverviewRoutes from "./overview/OverviewRoutes";
import * as PlanRoutes from "./plan/PlanRoutes";
import HomeBackend from "@/modules/home/views/HomeBackend.vue";
import HomeAllMessages from "./views/HomeMessagesDetails.vue";
import HomeAllSpendFiles from "./views/HomeAllSpendFiles.vue";
import HomeCompanyInfo from "./views/HomeCompanyInfo.vue";
import HomeCompanySettings from "./views/HomeCompanySettings.vue";
import HomeDashBoard from "./views/HomeDashBoard.vue";
import ReceivablesMockup1 from "./views/ReceivablesMockup1.vue";
import ReceivablesMockup2 from "./views/ReceivablesMockup2.vue";
import ReceivablesMockup3 from "./views/ReceivablesMockup3.vue";
import ReceivablesMockup4 from "./views/ReceivablesMockup4.vue";
import ReceivablesMockup5 from "./views/ReceivablesMockup5.vue";
import HomeFinancialData from "./views/manageAccount/HomeFinancialData.vue";
import HomeHelpSupport from "./views/HomeHelpSupport.vue";
import HomeManageTeam from "./views/HomeManageTeam.vue";
import HomePreferences from "./views/HomePreferences.vue";
import { useUserStore } from "@/stores/user";
import ValuePropositionController from "@/modules/home/views/settings/valueProposition/ValuePropositionController.vue"

const adminsOnlyAreAuthorized = (to: any, from: any, next: any) => {
  const userStore = useUserStore()

  // Redirect to home if the user is not valid or
  // if the user has no access to the Categorize module.
  const userIsAdmin: boolean | null = userStore.isAdmin;

  if (isNullOrUndefined(userIsAdmin) || !userIsAdmin) {
    HomeRouting.openHome();
    return;
  }

  // Grant access to the module
  next();
};

let homeChildrenRoutes: Array<RouteRecordRaw> = [
  {
    path: "/home/home-dashboard",
    name: HomeRouting.homeDashBoard,
    component: HomeDashBoard,
    props: true
  },

  {
    path: "/home/receivables-mockup-1",
    name: HomeRouting.receivablesMockup1,
    component: ReceivablesMockup1,
    props: true
  },
  {
    path: "/home/receivables-mockup-2",
    name: HomeRouting.receivablesMockup2,
    component: ReceivablesMockup2,
    props: true
  },
  {
    path: "/home/receivables-mockup-3",
    name: HomeRouting.receivablesMockup3,
    component: ReceivablesMockup3,
    props: true
  },
  {
    path: "/home/receivables-mockup-4",
    name: HomeRouting.receivablesMockup4,
    component: ReceivablesMockup4,
    props: true
  },
  {
    path: "/home/receivables-mockup-5",
    name: HomeRouting.receivablesMockup5,
    component: ReceivablesMockup5,
    props: true
  },
  {
    // ? - beforeEnter: adminsOnlyAreAuthorized,
    path: "/home/home-spend-files",
    name: HomeRouting.homeAllSpendFiles,
    component: HomeAllSpendFiles
  },
  {
    path: "/home/company-info",
    name: HomeRouting.homeCompanyInfo,
    component: HomeCompanyInfo
  },
  {
    path: "/home/company-settings/:selectedTab?/:section?",
    name: HomeRouting.homeCompanySettings,
    props: route => queryRouters.setQuerys(route),
    component: HomeCompanySettings,
    beforeEnter: adminsOnlyAreAuthorized,
  },
  {
    path: "/home/preferences",
    name: HomeRouting.homePreferences,
    component: HomePreferences
  },
  {
    // ? - beforeEnter: adminsOnlyAreAuthorized,
    path: "/home/manage-team",
    name: HomeRouting.homeManageTeam,
    component: HomeManageTeam
  },
  {
    path: "/home/help-support",
    name: HomeRouting.homeHelpSupport,
    component: HomeHelpSupport
  },
  {
    path: "/home/financial-data",
    name: HomeRouting.homeFinancialData,
    component: HomeFinancialData
  },
  {
    path: "/home/home-messages",
    name: HomeRouting.homeAllMessages,
    component: HomeAllMessages
  },
  {
    path: "/home/value-proposition",
    name: HomeRouting.homeValueProposition,
    component: ValuePropositionController
  },
];

/**
 * Add rest of routes
 */
homeChildrenRoutes = homeChildrenRoutes.concat(AnalyzeRoutes.getRoutes);
homeChildrenRoutes = homeChildrenRoutes.concat(CategorizeRoutes.getRoutes);
homeChildrenRoutes = homeChildrenRoutes.concat(CompareRoutes.getRoutes);
homeChildrenRoutes = homeChildrenRoutes.concat(EntityCardRoutes.getRoutes);
homeChildrenRoutes = homeChildrenRoutes.concat(OverviewRoutes.getRoutes);
homeChildrenRoutes = homeChildrenRoutes.concat(PlanRoutes.getRoutes);
homeChildrenRoutes = homeChildrenRoutes.concat(ManageModuleRoutes.getRoutes);

/**
 * Home Routes
 */
export const getRoutes: Array<RouteRecordRaw> = [
  {
    path: "/home",
    name: HomeRouting.home,
    component: HomeBackend,    
    redirect: { name: HomeRouting.homeDashBoard },
    children: homeChildrenRoutes
  }
];
