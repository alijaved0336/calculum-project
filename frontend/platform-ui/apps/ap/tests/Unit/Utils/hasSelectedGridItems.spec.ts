import { describe, it, expect } from 'vitest'
import { hasSelectedGridItems } from '@/modules/components/grid/calculum-grid/utils/hasSelectedGridItems'

describe('hasSelectedGridItems', () => {
  it.each([
    {
      name: 'true when one item selected',
      gridData: [{ selected: false }, { selected: true }],
      expected: true,
    },
    {
      name: 'true when all selected',
      gridData: [{ selected: true }, { selected: true }],
      expected: true,
    },
    {
      name: 'false when none selected',
      gridData: [{ selected: false }, { selected: false }],
      expected: false,
    },
    {
      name: 'false when selected is missing',
      gridData: [{ id: 1 }, { id: 2 }],
      expected: false,
    },
    {
      name: 'false for empty array',
      gridData: [],
      expected: false,
    },
    {
      name: 'false for null',
      gridData: null,
      expected: false,
    },
    {
      name: 'false for undefined',
      gridData: undefined,
      expected: false,
    },
    {
      name: 'false when selected is truthy but not true',
      gridData: [{ selected: 1 as unknown as boolean }],
      expected: false,
    },
  ])('$name', ({ gridData, expected }) => {
    expect(hasSelectedGridItems(gridData as never)).toBe(expected)
  })
})
