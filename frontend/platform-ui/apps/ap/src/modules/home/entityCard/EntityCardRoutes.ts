import { isNullOrUndefined, queryRouters  } from "@/utils";
import { RouteRecordRaw } from "vue-router";
import { useModuleEntityCard } from "@/composables";
import { UserSession } from "@/types";
import * as EntityCardRouting from "./EntityCardRouting";
import * as HomeRouting from "@/modules/home/HomeRouting";
import EntityCard from "@/modules/home/entityCard/views/EntityCard.vue";
import EntityCardCompanyDetails from "@/modules/home/entityCard/views/EntityCardCompanyDetails.vue";
import EntityCardNegotiation from "@/modules/home/entityCard/views/EntityCardNegotiation.vue";
import EntityCardOverview from "@/modules/home/entityCard/views/EntityCardOverview.vue";
import EntityCardRatingsAndMetrics from "@/modules/home/entityCard/views/EntityCardRatingsAndMetrics.vue";
import { useUserStore } from "@/stores/user";

const moduleEntityCardRoutesAreAuthorized = (to: any, from: any, next: any) => {
  const { moduleEntityCardIsInArray } = useModuleEntityCard();
  const userStore = useUserStore();
  const user: UserSession | null = userStore.getUser;
  
  if (isNullOrUndefined(user)) {
    HomeRouting.openHome();
    return;
  }

  if (!moduleEntityCardIsInArray(user.roles)) {
    HomeRouting.openHome();
    return;
  }

  // Grant access to the module
  next();
};

export const getRoutes: Array<RouteRecordRaw> = [
  {
    path: "/home/entity_card/:selectedTab?/:section?",
    name: EntityCardRouting.entityCard,
    component: EntityCard,
    props: route => ({
      ...route.params,
      ...queryRouters.setQuerys(route),
    }),
    beforeEnter: moduleEntityCardRoutesAreAuthorized
  },
  {
    path: "/home/entity_card/overview/:companyId",
    name: EntityCardRouting.entityCardOverview,
    component: EntityCardOverview,
    props: route => queryRouters.setQuerys(route),
    beforeEnter: moduleEntityCardRoutesAreAuthorized
  },
  {
    path: "/home/entity_card/company_details/:companyId",
    name: EntityCardRouting.entityCardCompanyDetails,
    component: EntityCardCompanyDetails,
    props: true,
    beforeEnter: moduleEntityCardRoutesAreAuthorized
  },
  {
    path: "/home/entity_card/rating_financials/:companyId",
    name: EntityCardRouting.entityCardRatingsAndMetrics,
    component: EntityCardRatingsAndMetrics,
    beforeEnter: moduleEntityCardRoutesAreAuthorized
  },
  {
    path: "/home/entity_card/negotiation/:companyId",
    name: EntityCardRouting.entityCardNegotiation,
    component: EntityCardNegotiation,
    props: true,
    beforeEnter: moduleEntityCardRoutesAreAuthorized
  }
];
