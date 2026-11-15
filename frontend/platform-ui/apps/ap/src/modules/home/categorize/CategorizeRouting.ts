import { route } from '@/services/router/Routing'

export const homeCategorize = 'HomeCategorize'

export const openHomeCategorize = (...params: any) => route(homeCategorize, ...params)
