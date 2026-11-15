import { route } from '@/router/Routing'

export const setup = 'Setup'

export const openSetup = (...params: any) => route(setup, ...params)
