import { route } from '@/services/router/Routing'

export const valueProposition = 'valueProposition'
export const valuePropositionInternal = 'valuePropositionInternal'


export const openValueProposition = (...params: any) => route(valueProposition, ...params)
export const openValuePropositionInternal = (...params: any) => route(valuePropositionInternal, ...params)