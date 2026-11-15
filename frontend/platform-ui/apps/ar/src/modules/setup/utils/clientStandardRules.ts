/**
 * AB#20760 (#20746): Client Standard group validation (AC-03), rule chip text (AC-05) and the
 * selected-currency ⇄ USD conversion of money rules (AC-06). Shared by the tab and its mock.
 */
import type { ClientStandardGroup, ClientStandardRule, RuleOption } from '../api/clientStandardGroups'

export const MAX_GROUP_NAME = 15
export const MIN_GROUP_DAYS = 1
export const MAX_GROUP_DAYS = 360
export const NEW_GROUP_DAYS = 15

export interface GroupErrors {
  name?: string
  paymentTerms?: string
}

export function validateGroup(group: ClientStandardGroup): GroupErrors {
  const errors: GroupErrors = {}
  const name = group.name.trim()
  if (name.length === 0 || name.length > MAX_GROUP_NAME) errors.name = 'arSetup.clientStandard.errors.name'
  const days = group.paymentTerms
  if (!Number.isInteger(days) || days < MIN_GROUP_DAYS || days > MAX_GROUP_DAYS) {
    errors.paymentTerms = 'arSetup.clientStandard.errors.days'
  }
  return errors
}

export const hasErrors = (errors: GroupErrors) => Boolean(errors.name || errors.paymentTerms)

/** "CSG{n}, {days}D, {name}" (AP's BSG badge, Client Standard prefix). */
export const groupBadge = (index: number, group: ClientStandardGroup) =>
  `CSG${index + 1}, ${Number.isFinite(group.paymentTerms) ? group.paymentTerms : '–'}D, ${group.name.trim()}`

/** AP adds "Group{n}" with the next number no group already uses. */
export function nextGroupName(groups: ClientStandardGroup[]): string {
  const used = new Set(groups.map((group) => group.name.trim()))
  let n = groups.length + 1
  while (used.has(`Group${n}`)) n += 1
  return `Group${n}`
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** `rate` is USD → selected currency (`useArCurrenciesStore().currency`, 1 for USD). */
export const usdToDisplay = (usd: number, rate: number) => round2(usd * rate)
export const displayToUsd = (shown: number, rate: number) => round2(shown / rate)

/** A filter value as a number, or null when it is not one (the API sends numbers as strings). */
export function numericValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/** Converts a money rule's filter values with `convert`; Top N / Top % and non-money rules are untouched. */
export function convertRuleMoney(rule: ClientStandardRule, option: RuleOption | undefined, convert: (value: number) => number): ClientStandardRule {
  if (!option?.isMoney) return rule
  const mapFilter = (filter: ClientStandardRule['filterOne']) => {
    const number = numericValue(filter?.value)
    return filter && number !== null ? { ...filter, value: convert(number) } : filter
  }
  return { ...rule, filterOne: mapFilter(rule.filterOne), filterTwo: mapFilter(rule.filterTwo) }
}

/** The chip text: "Field: a, b" for a list, "Field: Yes|No" for a bool, "Field op value [AND|OR op value]" otherwise, plus Top. */
export function ruleChipText(
  rule: ClientStandardRule,
  option: RuleOption | undefined,
  t: (key: string) => string,
  formatValue: (value: string | number | null | undefined) => string,
): string {
  const label = option?.label ?? rule.field
  if (rule.top) {
    const topLabel = t(`arSetup.clientStandard.rule.${rule.top.type}`)
    return `${label}: ${topLabel} ${rule.top.value}`
  }
  if (rule.multi && rule.multi.length > 0) {
    const names = rule.multi.map((key) => option?.values?.find((value) => value.key === key)?.value ?? key)
    return `${label}: ${names.join(', ')}`
  }
  if (option?.type === 'bool' && rule.filterOne) {
    const key = String(rule.filterOne.value)
    return `${label}: ${option.values?.find((value) => value.key === key)?.value ?? key}`
  }
  const filterText = (filter: NonNullable<ClientStandardRule['filterOne']>) => {
    const operator = t(`arSetup.clientStandard.rule.operators.${filter.operator}`)
    return filter.value === undefined || filter.value === null ? operator : `${operator} ${formatValue(filter.value)}`
  }
  let text = rule.filterOne ? `${label} ${filterText(rule.filterOne)}` : label
  if (rule.condition && rule.filterTwo) {
    const conditionLabel = t(`arSetup.clientStandard.rule.${rule.condition}`)
    text += ` ${conditionLabel} ${filterText(rule.filterTwo)}`
  }
  return text
}

export const NO_VALUE_OPERATORS = new Set(['isnull', 'isnotnull', 'isempty', 'isnotempty'])
