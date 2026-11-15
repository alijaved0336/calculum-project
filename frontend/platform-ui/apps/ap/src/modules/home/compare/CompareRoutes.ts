import { isNullOrUndefined } from "@/utils";
import { RouteRecordRaw } from "vue-router";
import { useModuleCompare } from "@/composables";
import { UserSession } from "@/types";
import * as CompareRouting from "./CompareRouting";
import * as HomeRouting from "@/modules/home/HomeRouting";
import HomeCompare from "./views/HomeCompare.vue";
import { useUserStore } from '@/stores/user'

const moduleCompareRoutesAreAuthorized = (to: any, from: any, next: any) => {
  const userStore = useUserStore()
  const { moduleCompareIsInArray } = useModuleCompare();
  
  // Redirect to home if the user is not valid or
  // if the user has no access to the Compare module.
  const user: UserSession | null = userStore.getUser;
  
  if (isNullOrUndefined(user)) {
    HomeRouting.openHome();
    return;
  }
  
  if (!moduleCompareIsInArray(user.roles)) {
    HomeRouting.openHome();
    return;
  }

  // Grant access to the Compare module
  next();
};

export const getRoutes: Array<RouteRecordRaw> = [
  {
    path: "/home/compare",
    name: CompareRouting.homeCompare,
    component: HomeCompare,
    beforeEnter: moduleCompareRoutesAreAuthorized
  }
];
