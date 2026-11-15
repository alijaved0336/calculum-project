import { isNullOrUndefined, queryRouters } from "@/utils";
import { RouteRecordRaw } from "vue-router";
import { useModulePlan } from "@/composables";
import { UserSession } from "@/types";
import * as HomeRouting from "@/modules/home/HomeRouting";
import * as PlanRouting from "./PlanRouting";
import HomePlanAllPlans from "./views/HomePlanAllPlans.vue";
import HomePlanV2 from "./views/HomePlanV2.vue";
import * as Routing from '@/services/router/Routing'
import { useUserStore } from '@/stores/user'

const modulePlanRoutesAreAuthorized = (to: any, from: any, next: any) => {
  const userStore = useUserStore()
  const { modulePlanIsInArray } = useModulePlan();
  
  // Redirect to home if the user is not valid or
  // if the user has no access to the Plan module.
  const user: UserSession | null = userStore.getUser;
  
  if (isNullOrUndefined(user)) {
    Routing.openMain();
    return;
  }

  if (!modulePlanIsInArray(user.roles)) {
    HomeRouting.openHome();
    return;
  }

  // Grant access to the Plan module
  next();
};

export const getRoutes: Array<RouteRecordRaw> = [
  {
    path: "/home/plan/all_plans",
    name: PlanRouting.homePlanAllPlans,
    component: HomePlanAllPlans,
    beforeEnter: modulePlanRoutesAreAuthorized,
  },
  {
    path: "/home/plan/:planId?",
    name: PlanRouting.homeHomePlanV2,
    component: HomePlanV2,
    props: route => ({
      ...(route.params || {}),
      ...(queryRouters.setQuerys(route) || {}),
    }),
    beforeEnter: modulePlanRoutesAreAuthorized,
  }
];
