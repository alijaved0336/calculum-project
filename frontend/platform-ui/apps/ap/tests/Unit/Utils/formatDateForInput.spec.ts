import { describe, it, expect } from 'vitest'
import { formatDateForInput } from '@/modules/components/grid/calculum-grid/utils/formatDateForInput'

describe('formatDateForInput', () => {
  it.each([
    {
      name: 'pads single-digit month and day',
      date: new Date(2026, 0, 5),
      expected: '2026-01-05',
    },
    {
      name: 'keeps double-digit month and day',
      date: new Date(2026, 10, 15),
      expected: '2026-11-15',
    },
    {
      name: 'year boundary Dec 31',
      date: new Date(2025, 11, 31),
      expected: '2025-12-31',
    },
    {
      name: 'leap day',
      date: new Date(2024, 1, 29),
      expected: '2024-02-29',
    },
  ])('$name', ({ date, expected }) => {
    expect(formatDateForInput(date)).toBe(expected)
  })
})
