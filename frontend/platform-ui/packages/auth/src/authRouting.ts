// Shared route name constants for auth routes.
// Both AP and AR register these same route names so auth guards and
// redirect logic can use them without knowing which app they're in.
export const AUTH_ROUTE_LOGIN = 'Login'
export const AUTH_ROUTE_ERRORS = 'Errors'
export const AUTH_ROUTE_OUT_OF_SERVICE = 'OutOfService'
export const AUTH_ROUTE_CONTACT_SUPPORT = 'LoginContactSupport'
export const AUTH_ROUTE_CONTACT_SUPPORT_SUCCESS = 'LoginContactSupportSuccess'
