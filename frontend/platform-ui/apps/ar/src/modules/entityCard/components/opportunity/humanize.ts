/**
 * Splits a PascalCase identifier (a strategy or score-component name straight off the backend
 * vocabulary, e.g. `OpportunityScoreComponents`) into space-separated words for display, with no
 * per-value copy to keep in sync as that vocabulary widens.
 *
 * Not a port of apps/ap/src/utils/StringUtils.ts's `transformFromCamelCaseToReadable`, which
 * does the same job - AR does not cross-import apps/ap's internals (every other AR port in this
 * codebase copies AP's file, it never imports it live). Written independently and simplified:
 * this only ever receives an already-PascalCase identifier, not an arbitrary camelCase field
 * name, so it needs none of that function's leading-word capitalisation handling.
 */
export function humanizePascalCase(value: string): string {
  return value.replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
}
