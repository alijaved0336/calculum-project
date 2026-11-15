import { describe, expect, it } from 'vitest'
import {
  groupFromWire,
  groupToWire,
  ruleFromWire,
  ruleOptionFromWire,
  ruleToWire,
  type WireRule,
} from '@/modules/setup/api/clientStandardGroups.wire'
import type { ClientStandardRule } from '@/modules/setup/api'

/** AB#20760: the screen's Client Standard model against Aldo's contract (#20759, comment on the task). */
describe('clientStandardGroups.wire', () => {
  it("sends the engine's operator names, an upper-case condition and every value as a string", () => {
    const rule: ClientStandardRule = {
      field: 'SALES_VOLUME',
      level: 'buyer',
      filterOne: { operator: 'gte', value: 1111111.11 },
      condition: 'or',
      filterTwo: { operator: 'isnull' },
    }
    expect(ruleToWire(rule)).toEqual({
      field: 'SALES_VOLUME',
      level: 'buyer',
      filterOne: { operator: 'isGreaterThanOrEqualTo', value: '1111111.11' },
      condition: 'OR',
      filterTwo: { operator: 'isNull', value: null },
    })
  })

  it('reads the wire back into the screen model, dropping its nulls', () => {
    const wire: WireRule = {
      field: 'SALES_TEAM',
      level: null,
      multi: null,
      filterOne: { operator: 'doesNotContain', value: 'East' },
      condition: 'AND',
      filterTwo: { operator: 'startsWith', value: 'N' },
      top: null,
    }
    expect(ruleFromWire(wire)).toEqual({
      field: 'SALES_TEAM',
      filterOne: { operator: 'doesnotcontain', value: 'East' },
      condition: 'and',
      filterTwo: { operator: 'startswith', value: 'N' },
    })
  })

  it('keeps list values, SME and Top rules as they are', () => {
    const rules: ClientStandardRule[] = [
      { field: 'BUYER', multi: ['101', '104'] },
      { field: 'SME', level: 'parent', filterOne: { operator: 'eq', value: 'true' } },
      { field: 'SALES_VOLUME', level: 'buyer', top: { type: 'topP', value: 20, order: 'DESC' } },
    ]
    expect(rules.map(ruleToWire)).toEqual([
      { field: 'BUYER', multi: ['101', '104'] },
      { field: 'SME', level: 'parent', filterOne: { operator: 'isEqualTo', value: 'true' } },
      { field: 'SALES_VOLUME', level: 'buyer', top: { type: 'topP', value: 20, order: 'DESC' } },
    ])
    expect(rules.map(ruleToWire).map(ruleFromWire)).toEqual(rules)
  })

  it('maps whole groups with their uuid, and reads null rules as none', () => {
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e'
    const group = { id, name: 'Strategic', paymentTerms: 45, behavior: 'lowLimit' as const, rules: [{ field: 'BUYER', multi: ['101'] }] }
    expect(groupFromWire(groupToWire(group))).toEqual(group)
    expect(groupFromWire({ ...group, rules: null }).rules).toEqual([])
  })

  it("offers a field's operators in the screen's names, and none for a list field (its `in` is the checklist)", () => {
    expect(ruleOptionFromWire({ field: 'BUYER', label: 'Buyer', type: 'list', operators: ['in'] }).operators).toEqual([])
    expect(ruleOptionFromWire({
      field: 'ACTUAL_PAYMENT_TERMS',
      label: 'Avg. Days Paid',
      type: 'number',
      operators: ['isEqualTo', 'isLessThan', 'isNotNull'],
    }).operators).toEqual(['eq', 'lt', 'isnotnull'])
  })
})
