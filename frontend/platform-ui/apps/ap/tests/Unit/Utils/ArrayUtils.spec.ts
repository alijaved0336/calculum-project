/**
 * Unit tests for ArrayUtils
 */

import { describe, it, expect } from 'vitest'
import ArrayUtils from '@/utils/ArrayUtils'

describe('ArrayUtils', () => {
  describe('isEmpty', () => {
    it('should return true for empty array', () => {
      expect(ArrayUtils.isEmpty([])).toBe(true)
    })

    it('should return false for non-empty array', () => {
      expect(ArrayUtils.isEmpty([1, 2, 3])).toBe(false)
    })

    it('should return true for null', () => {
      expect(ArrayUtils.isEmpty(null)).toBe(true)
    })

    it('should return true for undefined', () => {
      expect(ArrayUtils.isEmpty(undefined)).toBe(true)
    })

    it('should return false for array with one element', () => {
      expect(ArrayUtils.isEmpty([1])).toBe(false)
    })
  })

  describe('hasOneValueAndIsEmpty', () => {
    it('should return true when array has one value that is "-(empty)-"', () => {
      expect(ArrayUtils.hasOneValueAndIsEmpty([{ value: '-(empty)-' }])).toBe(true)
    })

    it('should return false when array has multiple items', () => {
      expect(ArrayUtils.hasOneValueAndIsEmpty([{ value: 'test' }, { value: 'test2' }])).toBe(false)
    })

    it('should return false when single item value is not "-(empty)-"', () => {
      expect(ArrayUtils.hasOneValueAndIsEmpty([{ value: 'test' }])).toBe(false)
    })
  })

  describe('hasEmptyValues', () => {
    it('should return true for single item with "-(empty)-" value', () => {
      expect(ArrayUtils.hasEmptyValues([{ value: '-(empty)-' }])).toBe(true)
    })

    it('should return false for multiple items', () => {
      expect(ArrayUtils.hasEmptyValues([{ value: 'test' }, { value: 'test2' }])).toBe(false)
    })

    it('should return false for single item with non-empty value', () => {
      expect(ArrayUtils.hasEmptyValues([{ value: 'test' }])).toBe(false)
    })
  })

  describe('hasOnlyOneItem', () => {
    it('should return true for array with one item', () => {
      expect(ArrayUtils.hasOnlyOneItem([1])).toBe(true)
    })

    it('should return false for empty array', () => {
      expect(ArrayUtils.hasOnlyOneItem([])).toBe(false)
    })

    it('should return false for array with multiple items', () => {
      expect(ArrayUtils.hasOnlyOneItem([1, 2, 3])).toBe(false)
    })
  })

  describe('filterNodesByIsPilot', () => {
    it('should filter nodes where isPilot is true', () => {
      const nodes = [
        { isPilot: true, name: 'Node1' },
        { isPilot: false, name: 'Node2' },
        { isPilot: true, name: 'Node3' }
      ]
      const result = ArrayUtils.filterNodesByIsPilot(nodes)
      expect(result).toEqual([
        { isPilot: true, name: 'Node1' },
        { isPilot: true, name: 'Node3' }
      ])
    })

    it('should return empty array when no nodes have isPilot true', () => {
      const nodes = [
        { isPilot: false, name: 'Node1' },
        { isPilot: false, name: 'Node2' }
      ]
      const result = ArrayUtils.filterNodesByIsPilot(nodes)
      expect(result).toEqual([])
    })
  })

  describe('sortNodesByIsPilotAndName', () => {
    it('should sort nodes by isPilot then by name', () => {
      const nodes = [
        { isPilot: true, entityName: 'Zebra' },
        { isPilot: false, entityName: 'Apple' },
        { isPilot: false, entityName: 'Banana' },
        { isPilot: true, entityName: 'Alpha' }
      ]
      const result = ArrayUtils.sortNodesByIsPilotAndName(nodes)
      expect(result).toEqual([
        { isPilot: false, entityName: 'Apple' },
        { isPilot: false, entityName: 'Banana' },
        { isPilot: true, entityName: 'Alpha' },
        { isPilot: true, entityName: 'Zebra' }
      ])
    })
  })

  describe('range', () => {
    it('should generate range from min to max', () => {
      expect(ArrayUtils.range(1, 5)).toEqual([1, 2, 3, 4, 5])
    })

    it('should handle same min and max', () => {
      // When min and max are equal, the method handles this edge case
      const result = ArrayUtils.range(5, 5)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return empty array when max < itemsCount', () => {
      expect(ArrayUtils.range(1, 5, { itemsCount: 10 })).toEqual([])
    })

    it('should return empty array for negative values', () => {
      expect(ArrayUtils.range(-1, 5)).toEqual([])
      expect(ArrayUtils.range(1, -5)).toEqual([])
    })

    it('should use custom step', () => {
      const result = ArrayUtils.range(1, 5, { step: 2 })
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('sortAscBy', () => {
    it('should sort array by specified property', () => {
      const items = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 }
      ]
      const result = ArrayUtils.sortAscBy(items, ['name'])
      expect(result[0].name).toBe('Alice')
      expect(result[1].name).toBe('Bob')
      expect(result[2].name).toBe('Charlie')
    })

    it('should return empty array for empty input', () => {
      expect(ArrayUtils.sortAscBy([], ['name'])).toEqual([])
    })
  })

  describe('createKeyPairs', () => {
    it('should create key-value pairs from array of objects', () => {
      const items = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]
      const result = ArrayUtils.createKeyPairs(items, 'id', 'name')
      expect(result).toEqual([
        { key: 1, value: 'John' },
        { key: 2, value: 'Jane' }
      ])
    })

    it('should handle empty array', () => {
      expect(ArrayUtils.createKeyPairs([], 'id', 'name')).toEqual([])
    })
  })

  describe('cleanCustomColumns', () => {
    it('should update column titles based on custom headers', () => {
      const columns = [
        { field: 'customDataPoint1', title: 'Custom Data Point 1' },
        { field: 'customDataPoint2', title: 'Custom Data Point 2' },
        { field: 'regularColumn', title: 'Regular Column' }
      ]
      const customHeaders = ['Revenue', 'Costs']

      const result = ArrayUtils.cleanCustomColumns(columns, customHeaders)

      expect(result[0].title).toBe('Revenue')
      expect(result[1].title).toBe('Costs')
      expect(result).toHaveLength(3) // Should not filter out the columns
    })

    it('should filter out columns with "custom" in title after updating', () => {
      const columns = [
        { field: 'customDataPoint1', title: 'Custom Header' },
        { field: 'customDataPoint2', title: 'Another Custom' },
        { field: 'regularColumn', title: 'Regular Column' }
      ]
      const customHeaders = ['Revenue']

      const result = ArrayUtils.cleanCustomColumns(columns, customHeaders)

      // Should filter out columns containing 'custom' in title
      expect(result.every(col => !col.title.toLowerCase().includes('custom'))).toBe(true)
    })

    it('should handle empty custom headers array', () => {
      const columns = [
        { field: 'customDataPoint1', title: 'Custom Data Point 1' },
        { field: 'regularColumn', title: 'Regular Column' }
      ]

      const result = ArrayUtils.cleanCustomColumns(columns, [])

      expect(result).toEqual([
        { field: 'regularColumn', title: 'Regular Column' }
      ])
    })

    it('should not update columns that do not match customDataPoint pattern', () => {
      const columns = [
        { field: 'customDataPoint1', title: 'Custom' },
        { field: 'otherColumn', title: 'Other' },
        { field: 'customColumn', title: 'Custom Column' }
      ]
      const customHeaders = ['Revenue']

      const result = ArrayUtils.cleanCustomColumns(columns, customHeaders)

      expect(result[0].title).toBe('Revenue')
      expect(result[1].field).toBe('otherColumn')
      // Bug#18966: `customColumn` is not a customDataPointN slot, so it is left alone even though
      // its title reads "Custom Column". Only real slots are subject to the drop rule.
      expect(result.map(col => col.field)).toEqual([
        'customDataPoint1',
        'otherColumn',
        'customColumn'
      ])
    })

    it('should handle more custom headers than columns', () => {
      const columns = [
        { field: 'customDataPoint1', title: 'Custom' }
      ]
      const customHeaders = ['Header1', 'Header2', 'Header3']

      const result = ArrayUtils.cleanCustomColumns(columns, customHeaders)

      expect(result[0].title).toBe('Header1')
    })

    it('should handle fewer custom headers than custom columns', () => {
      const columns = [
        { field: 'customDataPoint1', title: 'Custom' },
        { field: 'customDataPoint2', title: 'Custom' },
        { field: 'customDataPoint3', title: 'Custom' }
      ]
      const customHeaders = ['Header1']

      const result = ArrayUtils.cleanCustomColumns(columns, customHeaders)

      expect(result).toHaveLength(1)
    })

    it('should filter columns with "Custom" (uppercase) in title', () => {
      const columns = [
        { field: 'customDataPoint1', title: 'Custom Header' },
        { field: 'regularColumn', title: 'Regular Column' }
      ]
      const customHeaders: string[] = []

      const result = ArrayUtils.cleanCustomColumns(columns, customHeaders)

      expect(result.every(col => !col.title.toLowerCase().includes('custom'))).toBe(true)
    })

    it('should handle columns without customDataPoint fields', () => {
      const columns = [
        { field: 'regular1', title: 'Regular 1' },
        { field: 'regular2', title: 'Regular 2' }
      ]
      const customHeaders = ['Header1', 'Header2']

      const result = ArrayUtils.cleanCustomColumns(columns, customHeaders)

      expect(result).toEqual(columns)
    })

    it('should update multiple custom columns with different headers', () => {
      const columns = [
        { field: 'customDataPoint1', title: 'Custom Data Point 1' },
        { field: 'customDataPoint2', title: 'Custom Data Point 2' },
        { field: 'customDataPoint3', title: 'Custom Data Point 3' },
        { field: 'regularColumn', title: 'Regular Column' }
      ]
      const customHeaders = ['Revenue', 'Costs', 'Profit']

      const result = ArrayUtils.cleanCustomColumns(columns, customHeaders)

      // After processing, all 4 columns should remain because titles were updated to non-custom values
      expect(result).toHaveLength(4)
      expect(result[0].title).toBe('Revenue')
      expect(result[1].title).toBe('Costs')
      expect(result[2].title).toBe('Profit')
      expect(result[3].field).toBe('regularColumn')
    })

    // Bug#18966 — the four cases agreed with QA. `customHeaders` always carries a title for every
    // slot (the backend resolves an untitled slot to "Custom Column N"); `customHasData` says
    // whether the slot has any spend data.
    describe('Bug#18966 title x data rules', () => {
      const columnsFor = (slots: number[]) =>
        slots.map(slot => ({
          field: `customDataPoint${slot}`,
          title: `Custom Data Point ${slot}`,
          filter: slot >= 21 ? 'numeric' : 'text'
        }))

      // slot 4 titled+data, 5 untitled+data, 6 titled+no data, 7 untitled+no data
      const headers = [
        'Custom Column 1', 'Custom Column 2', 'Custom Column 3',
        'Colour', 'Custom Column 5', 'Places', 'Custom Column 7'
      ]
      const hasData = [false, false, false, true, true, false, false]

      it('shows a titled column that has data, with its title', () => {
        const result = ArrayUtils.cleanCustomColumns(columnsFor([4]), headers, hasData)

        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Colour')
      })

      it('shows an untitled column that has data, as "Custom Column N"', () => {
        const result = ArrayUtils.cleanCustomColumns(columnsFor([5]), headers, hasData)

        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Custom Column 5')
      })

      it('shows a titled column with no data, keeping its title', () => {
        const result = ArrayUtils.cleanCustomColumns(columnsFor([6]), headers, hasData)

        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Places')
      })

      it('drops an untitled column with no data', () => {
        expect(ArrayUtils.cleanCustomColumns(columnsFor([7]), headers, hasData)).toEqual([])
      })

      it('drops an empty untitled numeric column too', () => {
        // The numeric filter used to be an unconditional escape hatch, so empty untitled 21-26
        // columns were always offered.
        const numericHeaders = Array.from({ length: 26 }, (_, i) => `Custom Column ${i + 1}`)
        const numericHasData = Array.from({ length: 26 }, () => false)

        expect(
          ArrayUtils.cleanCustomColumns(columnsFor([21]), numericHeaders, numericHasData)
        ).toEqual([])
      })

      it('keeps the numeric slots that carry data and titles them from the spend file', () => {
        const numericHeaders = Array.from({ length: 26 }, (_, i) => `Custom Column ${i + 1}`)
        numericHeaders[20] = 'Cats'
        numericHeaders[21] = 'Dogs'
        const numericHasData = Array.from({ length: 26 }, (_, i) => i >= 20)

        const result = ArrayUtils.cleanCustomColumns(
          columnsFor([21, 22, 23]), numericHeaders, numericHasData
        )

        expect(result.map(col => col.title)).toEqual(['Cats', 'Dogs', 'Custom Column 23'])
      })

      it('titles slot 21 from slot 21, not from the first entry of the array', () => {
        // The regression the QA reported: titles were read positionally off a pre-filtered array,
        // so removing entries shifted every later slot.
        const numericHeaders = Array.from({ length: 26 }, (_, i) => `Custom Column ${i + 1}`)
        numericHeaders[0] = 'Colour'
        numericHeaders[20] = 'Cats'
        const numericHasData = Array.from({ length: 26 }, (_, i) => i === 0 || i === 20)

        const result = ArrayUtils.cleanCustomColumns(
          columnsFor([1, 21]), numericHeaders, numericHasData
        )

        expect(result.map(col => col.title)).toEqual(['Colour', 'Cats'])
      })
    })

    describe('customDataPointSlot', () => {
      it('reads the slot number off a custom data point field', () => {
        expect(ArrayUtils.customDataPointSlot('customDataPoint7')).toBe(7)
        expect(ArrayUtils.customDataPointSlot('customDataPoint26')).toBe(26)
      })

      it('returns null for anything else', () => {
        expect(ArrayUtils.customDataPointSlot('customColumn')).toBeNull()
        expect(ArrayUtils.customDataPointSlot('customDataPointFoo')).toBeNull()
        expect(ArrayUtils.customDataPointSlot('volume')).toBeNull()
      })
    })
  })
})

