import { describe, expect, it } from 'vitest'
import {
  flattenFilterDescriptors,
  kendoFilterToGraphqlWhere,
  partitionFilterDescriptor,
} from '@ada/design-system/components/graphql-grid/kendoToGraphql'
import {
  isCustomDataPointField,
  toCustomAttributeFilters,
} from '@/utils/customAttributeColumns'

/**
 * Filtering a grid by one of the tenant's custom attributes.
 *
 * The defect this covers shipped and was visible: a filter on a custom column built a GraphQL `where`
 * naming `customDataPoint12`, the schema has no such field, and the request failed validation — so
 * the whole page came back empty rather than that one column misbehaving. Those attributes are
 * deliberately not fields of the filter input (a schema whose shape moved with what each tenant
 * declared could not be cost-analysed), and travel as the list field's own per-ordinal argument.
 * These tests pin the split and the translation that make that work.
 */
describe('custom attribute filters', () => {
  const filter = (
    ...filters: { field: string; operator: string; value?: unknown }[]
  ) => ({ logic: 'and' as const, filters })

  it('keeps schema fields in the where and takes custom attributes out of it', () => {
    const split = partitionFilterDescriptor(
      filter(
        { field: 'buyerName', operator: 'contains', value: 'Pagero' },
        { field: 'customDataPoint12', operator: 'eq', value: 'P12' },
      ),
      isCustomDataPointField,
    )

    // The where carries only what the input actually declares — this is the half that used to carry
    // both and fail.
    expect(kendoFilterToGraphqlWhere(split.first))
      .toEqual({ and: [{ buyerName: { contains: 'Pagero' } }] })

    expect(toCustomAttributeFilters(flattenFilterDescriptors(split.second)))
      .toEqual([{ ordinal: 12, op: 'eq', value: 'P12' }])
  })

  it('sends no where at all when every condition is a custom attribute', () => {
    const split = partitionFilterDescriptor(
      filter({ field: 'customDataPoint3', operator: 'contains', value: 'EMEA' }),
      isCustomDataPointField,
    )

    // Null rather than a vacuous `{ and: [] }`, so the fetcher sends the unfiltered document.
    expect(kendoFilterToGraphqlWhere(split.first)).toBeNull()
    expect(toCustomAttributeFilters(flattenFilterDescriptors(split.second)))
      .toEqual([{ ordinal: 3, op: 'contains', value: 'EMEA' }])
  })

  it('translates the operators whose spelling differs from the schema-field vocabulary', () => {
    // `neq` on a *OperationFilterInput is `ne` per ordinal, and Kendo's "is empty" over a text
    // column asks what the backend's isnull asks — a supplied blank is stored as the empty string
    // and its blank predicate covers both.
    const split = partitionFilterDescriptor(
      filter(
        { field: 'customDataPoint1', operator: 'neq', value: 'x' },
        { field: 'customDataPoint2', operator: 'isempty' },
        { field: 'customDataPoint4', operator: 'isnotnull' },
      ),
      isCustomDataPointField,
    )

    expect(toCustomAttributeFilters(flattenFilterDescriptors(split.second))).toEqual([
      { ordinal: 1, op: 'ne', value: 'x' },
      // A value-less operator sends none rather than an empty string, which would read as
      // "equals blank" to anyone reading the request.
      { ordinal: 2, op: 'isnull', value: null },
      { ordinal: 4, op: 'isnotnull', value: null },
    ])
  })

  it('refuses an operator the ordinal vocabulary has no equivalent for, rather than dropping it', () => {
    // The menu is narrowed so the UI cannot produce this (see graphqlColumns.ts). If one arrives
    // anyway, a silently dropped filter would show MORE rows than the user asked for, which is worse
    // than an error: the grid would look like it filtered.
    const split = partitionFilterDescriptor(
      filter({ field: 'customDataPoint5', operator: 'startswith', value: 'EM' }),
      isCustomDataPointField,
    )

    expect(() => toCustomAttributeFilters(flattenFilterDescriptors(split.second)))
      .toThrow(/startswith/)
  })

  it('refuses a non-primitive value rather than silently stringifying it to "[object Object]"', () => {
    const split = partitionFilterDescriptor(
      filter({ field: 'customDataPoint6', operator: 'eq', value: { unexpected: true } }),
      isCustomDataPointField,
    )

    expect(() => toCustomAttributeFilters(flattenFilterDescriptors(split.second)))
      .toThrow(/non-primitive/)
  })

  it('splits a nested group without leaving a vacuous one behind', () => {
    const split = partitionFilterDescriptor(
      {
        logic: 'and',
        filters: [
          { field: 'volume', operator: 'gte', value: 100 },
          {
            logic: 'and',
            filters: [{ field: 'customDataPoint7', operator: 'eq', value: 'A' }],
          },
        ],
      },
      isCustomDataPointField,
    )

    // The nested group held only a custom attribute, so the where side is left with just the scalar
    // condition and no empty group beside it.
    expect(kendoFilterToGraphqlWhere(split.first))
      .toEqual({ and: [{ volume: { gte: 100 } }] })
    expect(flattenFilterDescriptors(split.second)).toHaveLength(1)
  })

  it('leaves an absent filter absent on both sides', () => {
    const split = partitionFilterDescriptor(undefined, isCustomDataPointField)

    expect(split.first).toBeUndefined()
    expect(split.second).toBeUndefined()
    expect(toCustomAttributeFilters(flattenFilterDescriptors(split.second))).toEqual([])
  })
})
