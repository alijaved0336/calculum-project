import { route } from '@/router/Routing'

export const opportunity = 'Opportunity'

export const openOpportunity = (...params: any) => route(opportunity, ...params)
