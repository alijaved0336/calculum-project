import type { RouteRecordRaw } from "vue-router";
import LayoutView from "./Index.vue";

export const layoutRoute: RouteRecordRaw = {
  path: "/",
  name: "Apv2",
  component: LayoutView,
  children: [],
};
