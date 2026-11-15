import { route } from "@/services/router/Routing";

export const homeManageModule = "Manage";

export const openHomeManageModule = (...params: any) =>
  route(homeManageModule, ...params);
