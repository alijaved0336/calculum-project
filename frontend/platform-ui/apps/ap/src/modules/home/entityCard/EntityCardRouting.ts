import { route } from '@/services/router/Routing'

export const entityCard = 'EntityCard'
export const entityCardOverview = 'EntityCardOverview'
export const entityCardCompanyDetails = 'EntityCardCompanyDetails'
export const entityCardRatingsAndMetrics = 'EntityCardRatingAndFinancials'
export const entityCardNegotiation = 'EntityCardNegotiation'

export const openEntityCard = (...params: any) => route(entityCard, ...params)
export const openEntityCardOverview = (...params: any) => route(entityCardOverview, ...params)