import { route } from '@/services/router/Routing'
import {
  AUTH_ROUTE_LOGIN,
  AUTH_ROUTE_ERRORS,
  AUTH_ROUTE_OUT_OF_SERVICE,
  AUTH_ROUTE_CONTACT_SUPPORT,
  AUTH_ROUTE_CONTACT_SUPPORT_SUCCESS,
} from '@ada/auth'

export const login = AUTH_ROUTE_LOGIN
export const errors = AUTH_ROUTE_ERRORS
export const outOfService = AUTH_ROUTE_OUT_OF_SERVICE
export const loginContactSupport = AUTH_ROUTE_CONTACT_SUPPORT;
export const loginContactSupportSuccess = AUTH_ROUTE_CONTACT_SUPPORT_SUCCESS;

export const openLogin = (...params: any) => route(login, ...params)
export const openLoginContactSupport = (...params: any) => route(loginContactSupport, ...params)
export const openLoginContactSupportSuccess = (...params: any) => route(loginContactSupportSuccess, ...params)
export const openErrorScreen = (...params: any) => route(errors, ...params)
export const openOutOfService = (...params: any) => route(outOfService, ...params)
