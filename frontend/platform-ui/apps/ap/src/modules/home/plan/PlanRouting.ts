import { route } from '@/services/router/Routing'

// ? - Temp fix. Point to HomeHomePlanV2 instead of HomePlan.

export const homePlanAllPlans = 'HomePlanAllPlans'
export const homeHomePlanV2 = 'HomeHomePlanV2'

export const openHomePlanAllPlans = (...params: any) => route(homePlanAllPlans, ...params)
export const openHomeHomePlanV2 = (...params: any) => route(homeHomePlanV2, ...params)
