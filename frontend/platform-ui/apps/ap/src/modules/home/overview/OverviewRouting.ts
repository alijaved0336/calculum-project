import { route } from '@/services/router/Routing'

export const homeOverview = 'HomeOverview'

export const openHomeOverview = (...params: any) => route(homeOverview, ...params)
