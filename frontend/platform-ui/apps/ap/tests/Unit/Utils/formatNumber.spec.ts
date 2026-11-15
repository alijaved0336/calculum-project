import { describe, it, expect } from 'vitest'
import { formatNumber } from '@/modules/components/grid/calculum-grid/utils/formatNumber'

describe('formatNumber', () => {
  it.each([
    { name: 'formats zero', value: 0, expected: new Intl.NumberFormat().format(0) },
    { name: 'formats small int', value: 7, expected: new Intl.NumberFormat().format(7) },
    {
      name: 'formats thousands',
      value: 1234,
      expected: new Intl.NumberFormat().format(1234),
    },
    {
      name: 'formats large int',
      value: 1000000,
      expected: new Intl.NumberFormat().format(1000000),
    },
  ])('$name', ({ value, expected }) => {
    expect(formatNumber(value)).toBe(expected)
  })
})
