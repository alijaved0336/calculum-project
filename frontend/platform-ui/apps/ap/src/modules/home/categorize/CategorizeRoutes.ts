import { isNullOrUndefined } from "@/utils";
import { RouteRecordRaw } from "vue-router";
import { useModuleCategorize } from "@/composables";
import { UserSession } from "@/types";
import * as CategorizeRouting from "./CategorizeRouting";
import * as HomeRouting from "@/modules/home/HomeRouting";
import HomeCategorize from "./views/HomeCategorize.vue";
import { useUserStore } from '@/stores/user'

const moduleCategorizeRoutesAreAuthorized = (to: any, from: any, next: any) => {
  const userStore = useUserStore()
  const { moduleCategorizeIsInArray } = useModuleCategorize();
  
  // Redirect to home if the user is not valid or
  // if the user has no access to the Categorize module.
  const user: UserSession | null = userStore.getUser;
  
  if (isNullOrUndefined(user)) {
    HomeRouting.openHome();
    return;
  }

  if (!moduleCategorizeIsInArray(user.roles)) {
    HomeRouting.openHome();
    return;
  }

  // Grant access to the Categorize module
  next();
};

export const getRoutes: Array<RouteRecordRaw> = [
  {
    beforeEnter: moduleCategorizeRoutesAreAuthorized,
    path: "/home/categorize",
    name: CategorizeRouting.homeCategorize,
    component: HomeCategorize
  }
];
