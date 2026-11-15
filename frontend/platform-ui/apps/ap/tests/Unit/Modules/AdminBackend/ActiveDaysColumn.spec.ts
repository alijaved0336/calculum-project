/**
 * Unit tests for Active Days Last 30 column in admin user grids
 *
 * These tests verify that the activeDaysLast30 column is correctly configured
 * in the admin user management grids that show it (User Panel / company users view).
 */

import { describe, it, expect } from 'vitest'
import { defaultCompaniesUsersGridColumnsUserPanel } from '@/modules/adminBackend/data/columns'

const gridColumns = defaultCompaniesUsersGridColumnsUserPanel

describe('Active Days Last 30 Column', () => {
  describe('column configuration', () => {
    it('should include activeDaysLast30 field in defaultCompaniesUsersGridColumnsUserPanel', () => {
      const activeDaysColumn = gridColumns.find(
        col => col.field === 'activeDaysLast30'
      )

      expect(activeDaysColumn).toBeDefined()
    })

    it('should have correct column properties', () => {
      const activeDaysColumn = gridColumns.find(
        col => col.field === 'activeDaysLast30'
      )

      expect(activeDaysColumn).toMatchObject({
        field: 'activeDaysLast30',
        width: 180,
        resizable: true,
        allowHide: true,
        hidden: false,
        filter: 'numeric',
        filterable: false,
        className: 'text-center'
      })
    })

    it('should have a title property', () => {
      const activeDaysColumn = gridColumns.find(
        col => col.field === 'activeDaysLast30'
      )

      expect(activeDaysColumn?.title).toBeDefined()
      expect(typeof activeDaysColumn?.title).toBe('string')
    })

    it('should be positioned after lastAccess column', () => {
      const lastAccessIndex = gridColumns.findIndex(
        col => col.field === 'lastActivity'
      )
      const activeDaysIndex = gridColumns.findIndex(
        col => col.field === 'activeDaysLast30'
      )

      expect(lastAccessIndex).toBeGreaterThanOrEqual(0)
      expect(activeDaysIndex).toBeGreaterThan(lastAccessIndex)
    })

    it('should be positioned before enabled status column', () => {
      const activeDaysIndex = gridColumns.findIndex(
        col => col.field === 'activeDaysLast30'
      )
      const enabledIndex = gridColumns.findIndex(
        col => col.field === 'enabled'
      )

      expect(activeDaysIndex).toBeGreaterThanOrEqual(0)
      expect(enabledIndex).toBeGreaterThan(activeDaysIndex)
    })
  })

  describe('column properties validation', () => {
    const activeDaysColumn = gridColumns.find(
      col => col.field === 'activeDaysLast30'
    )

    it('should use numeric filter type', () => {
      expect(activeDaysColumn?.filter).toBe('numeric')
    })

    it('should not be filterable', () => {
      expect(activeDaysColumn?.filterable).toBe(false)
    })

    it('should be resizable', () => {
      expect(activeDaysColumn?.resizable).toBe(true)
    })

    it('should allow hide', () => {
      expect(activeDaysColumn?.allowHide).toBe(true)
    })

    it('should not be hidden by default', () => {
      expect(activeDaysColumn?.hidden).toBe(false)
    })

    it('should have text-center className', () => {
      expect(activeDaysColumn?.className).toBe('text-center')
    })

  })

  describe('grid integrity', () => {
    it('should not break existing grid structure', () => {
      expect(Array.isArray(gridColumns)).toBe(true)
      expect(gridColumns.length).toBeGreaterThan(0)
    })

    it('should maintain all required user columns', () => {
      const requiredFields = ['userFullName', 'userEmail', 'lastActivity', 'enabled', 'roles']

      requiredFields.forEach(field => {
        const column = gridColumns.find(col => col.field === field)
        expect(column).toBeDefined()
      })
    })

    it('should have activeDaysLast30 as an additional column', () => {
      const activeDaysColumns = gridColumns.filter(
        col => col.field === 'activeDaysLast30'
      )

      expect(activeDaysColumns.length).toBe(1)
    })

    it('should have consistent column structure', () => {
      gridColumns.forEach(column => {
        expect(column).toHaveProperty('field')
        expect(column).toHaveProperty('title')
        expect(typeof column.field).toBe('string')
        expect(typeof column.title).toBe('string')
      })
    })
  })

  describe('numeric display properties', () => {
    const activeDaysColumn = gridColumns.find(
      col => col.field === 'activeDaysLast30'
    )

    it('should have properties suitable for displaying numbers', () => {
      expect(activeDaysColumn?.filter).toBe('numeric')
      expect(activeDaysColumn?.className).toContain('text-center')
    })

    it('should not have a custom cell renderer', () => {
      // If no custom cell is specified, it will render as plain text/number
      expect(activeDaysColumn).not.toHaveProperty('cell')
    })
  })
})

