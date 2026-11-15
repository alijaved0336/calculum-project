/**
 * The signout route's name, in the same shape as every module's `*Routing` constants.
 *
 * Signout has no module of its own (it is one view, declared inline in `router/index.ts`), which
 * is why it was the one route referenced by a bare `'Signout'` string in two places. A renamed
 * route then fails at runtime as a silent no-op navigation rather than at build time, and the
 * sign-out button is exactly the control nobody exercises until they need it.
 */
export const signout = 'Signout'
