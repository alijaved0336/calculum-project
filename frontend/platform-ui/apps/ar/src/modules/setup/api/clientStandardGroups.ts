/**
 * AB#20760 (#20746): the company's Client Standard groups, Ada.Ar.Api
 * `api/companies/{companyUuid}/client-standard-groups` (#20759) and their rule catalog
 * (`…/rule-options`). PUT is a full replace: an item with `id` updates, one without inserts, a
 * stored id missing from the body is deleted, and priority is the array order.
 *
 * Money values (SALES_VOLUME) are always USD on the wire; the screen converts (see
 * `utils/clientStandardRules.ts`). The wire's own names and shapes are mapped in
 * `clientStandardGroups.wire.ts`; this file is the screen's model.
 */
import { get, putJson } from '@/api/http'
import {
  groupFromWire,
  groupToWire,
  ruleOptionFromWire,
  type WireGroup,
  type WireRuleOption,
} from './clientStandardGroups.wire'

export type ClientStandardBehavior = 'lowLimit' | 'highLimit' | 'exactNumber' | 'onlyReference'
/** `bool` (SME): one `eq` filter whose value is `"true"` or `"false"`. */
export type RuleFieldType = 'list' | 'number' | 'text' | 'bool'
export type RuleLevel = 'saleLine' | 'buyer' | 'parent'
export type RuleOperator =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'doesnotcontain' | 'startswith' | 'endswith'
  | 'isnull' | 'isnotnull' | 'isempty' | 'isnotempty'

export interface RuleFilter {
  operator: RuleOperator
  value?: string | number | null
}

export interface ClientStandardRule {
  field: string
  level?: RuleLevel
  /** List fields: the chosen values (keys). */
  multi?: string[]
  filterOne?: RuleFilter
  condition?: 'and' | 'or'
  filterTwo?: RuleFilter
  top?: { type: 'topN' | 'topP'; value: number; order?: 'ASC' | 'DESC' }
}

export interface ClientStandardGroup {
  /** The group's uuid; absent for a group not saved yet. */
  id?: string
  name: string
  paymentTerms: number
  behavior: ClientStandardBehavior
  rules: ClientStandardRule[]
}

export interface ClientStandardGroupsResponse {
  /** "{Company} Standard", or "Client Standard" when the company has no name. */
  tabTitle: string
  /** In priority order. */
  groups: ClientStandardGroup[]
  /** Company-wide: true while any sale file of the company is being calculated (locks the tab). */
  isRecalculating: boolean
}

export interface SaveClientStandardGroupsResult extends Partial<Omit<ClientStandardGroupsResponse, 'isRecalculating'>> {
  recalculationQueued?: boolean
}

export interface RuleOption {
  field: string
  label: string
  type: RuleFieldType
  levels?: RuleLevel[]
  operators: RuleOperator[]
  values?: { key: string; value: string }[]
  /** Money field: shown in the selected currency, stored in USD. */
  isMoney?: boolean
  /** Supports Top N / Top %. */
  supportsTop?: boolean
}

export interface ClientStandardApi {
  fetchGroups(companyUuid: string): Promise<ClientStandardGroupsResponse>
  saveGroups(companyUuid: string, groups: ClientStandardGroup[]): Promise<SaveClientStandardGroupsResult>
  fetchRuleOptions(companyUuid: string, saleFileVersionId: number | null): Promise<RuleOption[]>
}

const route = (companyUuid: string) => `/api/companies/${companyUuid}/client-standard-groups`

type WireGroupsResponse = Omit<ClientStandardGroupsResponse, 'groups'> & { groups: WireGroup[] }
type WireSaveResult = Omit<SaveClientStandardGroupsResult, 'groups'> & { groups?: WireGroup[] }

export const realClientStandardApi: ClientStandardApi = {
  async fetchGroups(companyUuid) {
    const response = await get<WireGroupsResponse>(route(companyUuid))
    return { ...response, groups: response.groups.map(groupFromWire) }
  },
  async saveGroups(companyUuid, groups) {
    const result = await putJson<WireSaveResult>(route(companyUuid), { groups: groups.map(groupToWire) })
    return { ...result, groups: result.groups?.map(groupFromWire) }
  },
  async fetchRuleOptions(companyUuid, saleFileVersionId) {
    const options = await get<WireRuleOption[]>(`${route(companyUuid)}/rule-options`, { saleFileVersionId: saleFileVersionId ?? undefined })
    return options.map(ruleOptionFromWire)
  },
}
