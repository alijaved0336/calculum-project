import { isNullOrUndefined } from "@/utils";
import { RouteRecordRaw } from "vue-router";
import { useModuleOverview } from "@/composables";
import { UserSession } from "@/types";
import * as HomeRouting from "@/modules/home/HomeRouting";
import * as OverviewRouting from "./OverviewRouting";
import HomeOverview from "./views/HomeOverview.vue";
import { useUserStore } from '@/stores/user'

const moduleOverviewRoutesAreAuthorized = (to: any, from: any, next: any) => {
  const userStore = useUserStore()
  const { moduleOverviewIsInArray } = useModuleOverview();
  
  // Redirect to home if the user is not valid or
  // if the user has no access to the Overview module.
  const user: UserSession | null = userStore.getUser;
  
  if (isNullOrUndefined(user)) {
    HomeRouting.openHome();
    return;
  }
  
  if (!moduleOverviewIsInArray(user.roles)) {
    HomeRouting.openHome();
    return;
  }

  // Grant access to the Overview module
  next();
};

export const getRoutes: Array<RouteRecordRaw> = [
  {
    beforeEnter: moduleOverviewRoutesAreAuthorized,
    path: "/home/overview",
    name: OverviewRouting.homeOverview,
    component: HomeOverview
  }
];
