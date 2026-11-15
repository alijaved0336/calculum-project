import { describe, expect, it } from 'vitest'
import {
  flattenGraphqlGridColumns,
  mergeCachedGraphqlGridColumns,
  type GraphqlGridColumn,
  type GraphqlGridColumnOrGroup,
} from '@ada/design-system/components/graphql-grid/types'
import {
  applyCustomAttributeDefinitions,
  customAttributeColumnGroup,
  customAttributeColumns,
  hideUnnamedCustomAttributes,
} from '@/utils/customAttributeColumns'
import type { CustomAttributeDefinition } from '@/api'

const definition = (ordinal: number, hasData = true): CustomAttributeDefinition => ({
  ordinal,
  title: `Region ${ordinal}`,
  dataType: 'text',
  aggregation: 'list',
  hasData,
})

const leaf = (columns: GraphqlGridColumnOrGroup[], field: string): GraphqlGridColumn =>
  flattenGraphqlGridColumns(columns).find((column) => column.field === field)!

const staticTitle = (field: string) => customAttributeColumns().find((column) => column.field === field)!.title

const visibleCustomFields = (columns: GraphqlGridColumnOrGroup[]) =>
  flattenGraphqlGridColumns(columns)
    .filter((column) => column.field.startsWith('customDataPoint') && !column.hidden)
    .map((column) => column.field)

/** #21145: a Custom Data Point the tenant never named stays hidden on every AR grid. */
describe('applyCustomAttributeDefinitions', () => {
  const schemaColumn: GraphqlGridColumn = { field: 'buyerName', title: 'Buyer', hidden: false }

  it('titles the named columns and hides every unnamed one', () => {
    const columns = applyCustomAttributeDefinitions(customAttributeColumns(), [definition(3), definition(7, false)])

    expect(leaf(columns, 'customDataPoint3')).toMatchObject({ title: 'Region 3', hidden: false })
    expect(leaf(columns, 'customDataPoint7')).toMatchObject({ title: 'Region 7', hidden: true })
    expect(visibleCustomFields(columns)).toEqual(['customDataPoint3'])
  })

  it('shows no custom column for a tenant that named none', () => {
    const shown = customAttributeColumns().map((column) => ({ ...column, hidden: false }))
    expect(visibleCustomFields(applyCustomAttributeDefinitions(shown, []))).toEqual([])
  })

  it("drops the previous version's title and visibility from a column the new version leaves unnamed", () => {
    const versionA = applyCustomAttributeDefinitions(customAttributeColumns(), [definition(3), definition(5)])
    const versionB = applyCustomAttributeDefinitions(versionA, [definition(5)])

    expect(leaf(versionB, 'customDataPoint3')).toMatchObject({ title: staticTitle('customDataPoint3'), hidden: true })
    expect(visibleCustomFields(versionB)).toEqual(['customDataPoint5'])
  })

  it('applies inside a column group and leaves the schema columns alone', () => {
    const columns = applyCustomAttributeDefinitions([schemaColumn, customAttributeColumnGroup('Custom Attributes')], [definition(1)])

    expect(columns[0]).toEqual(schemaColumn)
    expect(visibleCustomFields(columns)).toEqual(['customDataPoint1'])
  })
})

describe('hideUnnamedCustomAttributes', () => {
  it('keeps a saved preference from bringing an unnamed column back, named ones keep the saved choice', () => {
    const definitions = [definition(2, false)]
    const fresh = applyCustomAttributeDefinitions(customAttributeColumns(), definitions)
    const saved = customAttributeColumns().map((column) => ({ ...column, hidden: false }))

    const columns = hideUnnamedCustomAttributes(mergeCachedGraphqlGridColumns(fresh, saved), definitions)

    expect(visibleCustomFields(columns)).toEqual(['customDataPoint2'])
  })
})
