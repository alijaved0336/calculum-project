import { describe, it, expect } from 'vitest'
import { findGridDataItemIndex } from '@/modules/components/grid/calculum-grid-graphql/utils/findGridDataItemIndex'

describe('findGridDataItemIndex', () => {
  const a = { id: 1 }
  const b = { id: 2 }
  const c = { id: 3 }

  it.each([
    {
      name: 'returns index when item is present by reference',
      gridData: [a, b, c],
      dataItem: b,
      expected: 1,
    },
    {
      name: 'returns 0 for first item',
      gridData: [a, b],
      dataItem: a,
      expected: 0,
    },
    {
      name: 'returns -1 when item is missing',
      gridData: [a, b],
      dataItem: c,
      expected: -1,
    },
    {
      name: 'returns -1 for empty array',
      gridData: [],
      dataItem: a,
      expected: -1,
    },
    {
      name: 'returns -1 for null gridData',
      gridData: null,
      dataItem: a,
      expected: -1,
    },
    {
      name: 'returns -1 for undefined gridData',
      gridData: undefined,
      dataItem: a,
      expected: -1,
    },
    {
      name: 'does not match equal-looking different object',
      gridData: [a, b],
      dataItem: { id: 1 },
      expected: -1,
    },
  ])('$name', ({ gridData, dataItem, expected }) => {
    expect(findGridDataItemIndex(gridData as never, dataItem)).toBe(expected)
  })
})
