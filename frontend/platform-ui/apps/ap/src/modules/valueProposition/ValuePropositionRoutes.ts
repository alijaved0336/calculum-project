import { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { isNullOrUndefined } from "@/utils";
import * as HomeRouting from "@/modules/home/HomeRouting";
import { UserSession } from "@/types";
import * as ValuePropositionRouting from './ValuePropositionRouting'
import ValuePropositionMainView from './views/ValuePropositionMainView.vue'


const validateUserSession = (to: any, from: any, next: any) => {
  const userStore = useUserStore()
  const user: UserSession | null = userStore.getUser;
  if (isNullOrUndefined(user)) {
    HomeRouting.openHome();
    return;
  }  
  next();
};

export const getRoutes: Array<RouteRecordRaw> = [
  {
    path: '/value-proposition/:valuePropositionId?',
    name: ValuePropositionRouting.valueProposition,
    component: ValuePropositionMainView,    
    props: true,
  },
  {
    path: '/home/value-proposition-internal/:valuePropositionId?',
    name: ValuePropositionRouting.valuePropositionInternal,
    component: ValuePropositionMainView,    
    props: true,
    beforeEnter: validateUserSession
  }
]
