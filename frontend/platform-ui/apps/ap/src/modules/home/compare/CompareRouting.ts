import { route } from '@/services/router/Routing'

export const homeCompare = 'HomeCompare'

export const openHomeCompare = (...params: any) => route(homeCompare, ...params)
