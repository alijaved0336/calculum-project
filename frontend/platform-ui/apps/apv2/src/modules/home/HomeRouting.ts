import { route } from "@/router/Routing";

export const home = "Home";

export const openHome = (params?: Record<string, unknown>) =>
  route(home, params);
