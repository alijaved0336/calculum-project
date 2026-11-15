/**
 * AB#20760: in-memory stand-in for the Client Standard groups endpoints (#20759): two seeded
 * groups, the rule catalog, 400 on invalid groups, and a company-wide recalculation on save. It
 * answers in the screen's model (`clientStandardGroups.ts`); the wire mapping is only for the real API.
 * Delete with the other mocks once `SETUP_API_MOCKED` is off.
 */
import { HttpError } from '@/api/http'
import { useContextStore } from '@/stores/context'
import { hasErrors, validateGroup } from '../utils/clientStandardRules'
import { claimAllMockVersions } from './setupStrategies.mock'
import type { ClientStandardApi, ClientStandardGroup, RuleOption } from './clientStandardGroups'

const MOCK_LATENCY_MS = 250
const delay = () => new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))
const clone = <T>(value: T): T => structuredClone(value)

const TEXT_OPERATORS: RuleOption['operators'] = ['eq', 'neq', 'contains', 'doesnotcontain', 'startswith', 'endswith', 'isempty', 'isnotempty']
const NUMBER_OPERATORS: RuleOption['operators'] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'isnull', 'isnotnull']
const LEVELS: RuleOption['levels'] = ['saleLine', 'buyer', 'parent']

export const MOCK_RULE_OPTIONS: RuleOption[] = [
  { field: 'BUYER', label: 'Buyer', type: 'list', operators: [], values: [
    { key: '101', value: 'Pagero Inc' }, { key: '102', value: 'Store-Pagero Inc' }, { key: '103', value: 'Acme Corp' }, { key: '104', value: 'Globex' },
  ] },
  { field: 'PARENT', label: 'Parent', type: 'list', operators: [], values: [{ key: '201', value: 'Pagero Group' }, { key: '202', value: 'Acme Holdings' }] },
  { field: 'INDUSTRY', label: 'Industry', type: 'list', operators: [], values: [
    { key: 'ventilation', value: 'Ventilation, Heating & AC' }, { key: 'computers', value: 'Computer and Peripheral' }, { key: 'electrical', value: 'Other Electrical' },
  ] },
  { field: 'COUNTRY', label: 'Country', type: 'list', operators: [], values: [{ key: 'US', value: 'United States' }, { key: 'DE', value: 'Germany' }, { key: 'ES', value: 'Spain' }] },
  { field: 'REGION', label: 'Region', type: 'list', operators: [], values: [{ key: 'NA', value: 'North America' }, { key: 'EU', value: 'Europe' }] },
  { field: 'SME', label: 'SME', type: 'bool', levels: ['buyer', 'parent'], operators: ['eq'], values: [{ key: 'true', value: 'Yes' }, { key: 'false', value: 'No' }] },
  { field: 'SALES_TEAM', label: 'Sales Team', type: 'text', operators: TEXT_OPERATORS },
  { field: 'SALES_VOLUME', label: 'Sales Volume', type: 'number', levels: LEVELS, operators: NUMBER_OPERATORS, isMoney: true, supportsTop: true },
  { field: 'ACTUAL_PAYMENT_TERMS', label: 'Avg. Days Paid', type: 'number', levels: LEVELS, operators: NUMBER_OPERATORS },
  { field: 'CONTRACTUAL_WITHOUT_CASH_DISCOUNT', label: 'Contractual Terms without Cash Discount', type: 'number', levels: LEVELS, operators: NUMBER_OPERATORS },
]

const SEED: ClientStandardGroup[] = [
  { id: 'a1f0c3d2-0000-4000-8000-000000000001', name: 'Strategic', paymentTerms: 45, behavior: 'lowLimit', rules: [{ field: 'BUYER', multi: ['101', '103'] }] },
  { id: 'a1f0c3d2-0000-4000-8000-000000000002', name: 'Small buyers', paymentTerms: 30, behavior: 'highLimit', rules: [
    { field: 'SALES_VOLUME', level: 'buyer', filterOne: { operator: 'lt', value: '100000' } },
  ] },
]

const byCompany = new Map<string, ClientStandardGroup[]>()
let nextId = 100
const newId = () => `a1f0c3d2-0000-4000-8000-${String(nextId++).padStart(12, '0')}`

const tabTitle = () => {
  const name = useContextStore().companyName?.trim()
  return name ? `${name} Standard` : 'Client Standard'
}

export const mockClientStandardApi: ClientStandardApi = {
  async fetchGroups(companyUuid) {
    await delay()
    if (!byCompany.has(companyUuid)) byCompany.set(companyUuid, clone(SEED))
    return { tabTitle: tabTitle(), groups: clone(byCompany.get(companyUuid)!), isRecalculating: false }
  },

  async saveGroups(companyUuid, groups) {
    await delay()
    const errors: { field: string; message: string }[] = []
    groups.forEach((group, i) => {
      const groupErrors = validateGroup(group)
      if (groupErrors.name) errors.push({ field: `groups[${i}].name`, message: groupErrors.name })
      if (groupErrors.paymentTerms) errors.push({ field: `groups[${i}].paymentTerms`, message: groupErrors.paymentTerms })
    })
    if (groups.some((group) => hasErrors(validateGroup(group)))) {
      throw new HttpError(400, `/api/companies/${companyUuid}/client-standard-groups`, JSON.stringify({ errors }))
    }
    const before = byCompany.get(companyUuid) ?? []
    const next = groups.map((group) => ({ ...clone(group), id: group.id ?? newId(), name: group.name.trim() }))
    if (JSON.stringify(before) === JSON.stringify(next)) return {}
    byCompany.set(companyUuid, next)
    claimAllMockVersions()
    return { tabTitle: tabTitle(), groups: clone(next), recalculationQueued: true }
  },

  async fetchRuleOptions() {
    await delay()
    return clone(MOCK_RULE_OPTIONS)
  },
}

export function resetClientStandardMock(): void {
  byCompany.clear()
}
