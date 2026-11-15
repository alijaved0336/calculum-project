import { isNullOrUndefined } from "@/utils";
import { RouteRecordRaw } from "vue-router";
import { UserSession } from "@/types";
import * as HomeRouting from "@/modules/home/HomeRouting";
import * as manageModuleRouting from "./manageModuleRouting";
import Manage from "./views/Manage.vue";
import { useUserStore } from "@/stores/user";

const manageModuleRoutesAreAuthorized = (to: any, from: any, next: any) => {
  const userStore = useUserStore()
  
  // Redirect to home if the user is not valid or
  // if the user has no access to the Module module.
  const user: UserSession | null = userStore.getUser;
  if (isNullOrUndefined(user)) {
    HomeRouting.openHome();
    return;
  }
  // Grant access to the Manage module
  next();
};

export const getRoutes: Array<RouteRecordRaw> = [
  {
    beforeEnter: manageModuleRoutesAreAuthorized,
    
    path: "/home/manage-module",
    name: manageModuleRouting.homeManageModule,
    component: Manage,
    props: {}
  }
];