import type { RouteRecordRaw } from "vue-router";
import HomeView from "./views/home/Index.vue";
import * as HomeRouting from "./HomeRouting";

export const homeRoutes: RouteRecordRaw[] = [
  {
    path: "home",
    name: HomeRouting.home,
    component: HomeView,
  },
];
