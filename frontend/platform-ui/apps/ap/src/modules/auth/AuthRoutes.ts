import { RouteRecordRaw } from 'vue-router'
import * as AuthRouting from './AuthRouting'
import Login from '@/modules/auth/views/Login.vue'
import OutOfService from '@/modules/main/OutOfService.vue'

/**
 * Use this routes because don't have the b2c guard validation
 */

export const getRoutes: Array<RouteRecordRaw> = [
  {
    path: '/message/:errorType/:message/:errorb2c?',
    name: AuthRouting.errors,
    component: Login,    
    props: true
  },
  {
    path: '/out-of-service',    
    name: AuthRouting.outOfService,
    component: OutOfService,    
  },
]
