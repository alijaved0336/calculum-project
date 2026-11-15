/**
 * AB#20760: Ada.Ar.Api's `AdminClientStandardGroupsController` contract (#20759, Aldo's
 * `h-20746/client-standard-groups-api`) and its mapping to the screen's model
 * (`clientStandardGroups.ts`). The screen never sees the wire, so a contract change touches this
 * file only.
 *
 * Wire facts: group ids are uuids; operators are the engine's names (`isEqualTo`, `isGreaterThan`…,
 * `in` for list fields, which the screen edits as `multi`); `condition` is `AND|OR`; a filter value is
 * always a string; SME (and a bool custom attribute) is `type: 'bool'`, one `isEqualTo` filter with
 * `"true"` or `"false"`; a 400 lists `{ field, message }`.
 */
import type { ClientStandardGroup, ClientStandardRule, RuleFilter, RuleOperator, RuleOption } from './clientStandardGroups'

type WireOperator =
  | 'in' | 'isEqualTo' | 'isNotEqualTo' | 'isGreaterThan' | 'isGreaterThanOrEqualTo' | 'isLessThan'
  | 'isLessThanOrEqualTo' | 'contains' | 'doesNotContain' | 'startsWith' | 'endsWith'
  | 'isNull' | 'isNotNull' | 'isEmpty' | 'isNotEmpty'

interface WireFilter {
  operator: WireOperator
  value?: string | null
}

export interface WireRule {
  field: string
  level?: ClientStandardRule['level'] | null
  multi?: string[] | null
  filterOne?: WireFilter | null
  condition?: 'AND' | 'OR' | null
  filterTwo?: WireFilter | null
  top?: { type: 'topN' | 'topP'; value: number; order?: 'ASC' | 'DESC' } | null
}

export interface WireGroup extends Omit<ClientStandardGroup, 'rules'> {
  rules: WireRule[] | null
}

export interface WireRuleOption extends Omit<RuleOption, 'operators'> {
  operators: WireOperator[]
}

const TO_WIRE: Record<RuleOperator, WireOperator> = {
  eq: 'isEqualTo',
  neq: 'isNotEqualTo',
  gt: 'isGreaterThan',
  gte: 'isGreaterThanOrEqualTo',
  lt: 'isLessThan',
  lte: 'isLessThanOrEqualTo',
  contains: 'contains',
  doesnotcontain: 'doesNotContain',
  startswith: 'startsWith',
  endswith: 'endsWith',
  isnull: 'isNull',
  isnotnull: 'isNotNull',
  isempty: 'isEmpty',
  isnotempty: 'isNotEmpty',
}

const FROM_WIRE = Object.fromEntries(Object.entries(TO_WIRE).map(([screen, wire]) => [wire, screen])) as Partial<Record<WireOperator, RuleOperator>>

const filterFromWire = (filter: WireFilter | null | undefined): RuleFilter | undefined => {
  const operator = filter ? FROM_WIRE[filter.operator] : undefined
  return operator ? { operator, value: filter!.value ?? null } : undefined
}

const filterToWire = (filter: RuleFilter | undefined): WireFilter | undefined =>
  filter && {
    operator: TO_WIRE[filter.operator],
    value: filter.value === undefined || filter.value === null ? null : String(filter.value),
  }

export function ruleFromWire(rule: WireRule): ClientStandardRule {
  const result: ClientStandardRule = { field: rule.field }
  if (rule.level) result.level = rule.level
  if (rule.multi?.length) result.multi = [...rule.multi]
  if (rule.top) result.top = { ...rule.top }
  const filterOne = filterFromWire(rule.filterOne)
  if (filterOne) result.filterOne = filterOne
  const filterTwo = filterFromWire(rule.filterTwo)
  if (filterTwo && rule.condition) {
    result.condition = rule.condition === 'OR' ? 'or' : 'and'
    result.filterTwo = filterTwo
  }
  return result
}

export function ruleToWire(rule: ClientStandardRule): WireRule {
  const result: WireRule = { field: rule.field }
  if (rule.level) result.level = rule.level
  if (rule.multi) result.multi = rule.multi
  if (rule.top) result.top = rule.top
  if (rule.filterOne) result.filterOne = filterToWire(rule.filterOne)
  if (rule.condition && rule.filterTwo) {
    result.condition = rule.condition === 'or' ? 'OR' : 'AND'
    result.filterTwo = filterToWire(rule.filterTwo)
  }
  return result
}

export const groupFromWire = (group: WireGroup): ClientStandardGroup => ({ ...group, rules: (group.rules ?? []).map(ruleFromWire) })

export const groupToWire = (group: ClientStandardGroup): WireGroup => ({ ...group, rules: group.rules.map(ruleToWire) })

/** List fields offer `in` only, which the screen edits as `multi`, so it is not an operator there. */
export const ruleOptionFromWire = (option: WireRuleOption): RuleOption => ({
  ...option,
  operators: option.operators.flatMap((operator) => FROM_WIRE[operator] ?? []),
})
