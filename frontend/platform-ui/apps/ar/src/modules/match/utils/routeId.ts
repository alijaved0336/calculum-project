/**
 * Parses a route param (always a string, per Vue Router) into a valid positive integer id, or
 * `undefined` if it isn't one.
 *
 * `Number.isInteger` alone still lets an empty-string param through (`Number('')` is `0`, a
 * finite integer) as a lookup for id `0`, and a malformed segment (`Number('abc')` is `NaN`)
 * must not reach the API rather than producing a request to `/whatever/NaN`. Requiring `> 0`
 * closes both without relying on the message a failed lookup happens to produce.
 */
export function parsePositiveRouteId(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}
