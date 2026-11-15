/**
 * Unit tests for ActionsEditCloneDelete component
 * 
 * Tests the "Mark as Solved" button functionality and button states
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../../Helpers/mountWithProviders'
import ActionsEditCloneDelete from '@/modules/components/grid/columns/ActionsEditCloneDelete.vue'

describe('ActionsEditCloneDelete - Mark as Solved', () => {
  let wrapper: VueWrapper

  const createWrapper = (dataItem: any) => {
    return mountWithProviders(ActionsEditCloneDelete, {
      props: {
        dataItem
      },
      global: {
        stubs: {
          Tooltip: {
            template: '<div><slot /></div>',
            props: ['open-delay', 'anchor-element', 'position', 'content']
          },
          iconTrash: { template: '<svg></svg>' },
          iconPencil: { template: '<svg></svg>' },
          iconClone: { template: '<svg></svg>' },
          iconCheckCircle: { template: '<svg></svg>' }
        }
      }
    })
  }

  describe('Mark as Solved button state', () => {
    it('should disable Mark as Solved button when status is not pending', () => {
      // Arrange
      const dataItem = { id: 1, status: 'approved' }
      wrapper = createWrapper(dataItem)

      // Act
      const markAsSolvedButton = wrapper.find('.mark-solved-action').element.closest('div')

      // Assert
      expect(markAsSolvedButton?.classList.contains('disabled')).toBe(true)
      expect(markAsSolvedButton?.classList.contains('no-pointer')).toBe(true)
    })

    it('should enable Mark as Solved button when status is pending', () => {
      // Arrange
      const dataItem = { id: 1, status: 'pending' }
      wrapper = createWrapper(dataItem)

      // Act
      const markAsSolvedButton = wrapper.find('.mark-solved-action').element.closest('div')

      // Assert
      expect(markAsSolvedButton?.classList.contains('disabled')).toBe(false)
      expect(markAsSolvedButton?.classList.contains('custom_cursor_pointer')).toBe(true)
    })

    it('should disable Mark as Solved button when status is solved', () => {
      // Arrange
      const dataItem = { id: 1, status: 'solved' }
      wrapper = createWrapper(dataItem)

      // Act
      const markAsSolvedButton = wrapper.find('.mark-solved-action').element.closest('div')

      // Assert
      expect(markAsSolvedButton?.classList.contains('disabled')).toBe(true)
      expect(markAsSolvedButton?.classList.contains('no-pointer')).toBe(true)
    })

    it('should disable Mark as Solved button when status is rejected', () => {
      // Arrange
      const dataItem = { id: 1, status: 'rejected' }
      wrapper = createWrapper(dataItem)

      // Act
      const markAsSolvedButton = wrapper.find('.mark-solved-action').element.closest('div')

      // Assert
      expect(markAsSolvedButton?.classList.contains('disabled')).toBe(true)
    })

    it('should emit mark-as-solved event when button is clicked and status is pending', async () => {
      // Arrange
      const dataItem = { id: 1, status: 'pending' }
      wrapper = createWrapper(dataItem)

      // Act
      const markAsSolvedButton = wrapper.find('.mark-solved-action').element.closest('div')
      await markAsSolvedButton?.dispatchEvent(new Event('click'))
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.emitted('mark-as-solved')).toBeTruthy()
      expect(wrapper.emitted('mark-as-solved')?.[0]).toEqual([dataItem])
    })

    it('should not emit mark-as-solved event when button is clicked and status is not pending', async () => {
      // Arrange
      const dataItem = { id: 1, status: 'solved' }
      wrapper = createWrapper(dataItem)

      // Act
      const markAsSolvedButton = wrapper.find('.mark-solved-action').element.closest('div')
      await markAsSolvedButton?.dispatchEvent(new Event('click'))
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.emitted('mark-as-solved')).toBeFalsy()
    })
  })

  describe('Edit button state', () => {
    it('should disable Edit button when status is solved', () => {
      // Arrange
      const dataItem = { id: 1, status: 'solved' }
      wrapper = createWrapper(dataItem)

      // Act
      const editButton = wrapper.find('.edit-action').element.closest('div')

      // Assert
      expect(editButton?.classList.contains('disabled')).toBe(true)
      expect(editButton?.classList.contains('no-pointer')).toBe(true)
    })

    it('should disable Edit button when status is rejected', () => {
      // Arrange
      const dataItem = { id: 1, status: 'rejected' }
      wrapper = createWrapper(dataItem)

      // Act
      const editButton = wrapper.find('.edit-action').element.closest('div')

      // Assert
      expect(editButton?.classList.contains('disabled')).toBe(true)
    })

    it('should enable Edit button when status is pending', () => {
      // Arrange
      const dataItem = { id: 1, status: 'pending' }
      wrapper = createWrapper(dataItem)

      // Act
      const editButton = wrapper.find('.edit-action').element.closest('div')

      // Assert
      expect(editButton?.classList.contains('disabled')).toBe(false)
    })

    it('should disable Edit button when status is approved', () => {
      // Arrange
      const dataItem = { id: 1, status: 'approved' }
      wrapper = createWrapper(dataItem)

      // Act
      const editButton = wrapper.find('.edit-action').element.closest('div')

      // Assert
      // Edit button should only be enabled for pending status
      expect(editButton?.classList.contains('disabled')).toBe(true)
      expect(editButton?.classList.contains('no-pointer')).toBe(true)
    })
  })

  describe('Button order', () => {
    it('should render Mark as Solved button before Edit button', () => {
      // Arrange
      const dataItem = { id: 1, status: 'pending' }
      wrapper = createWrapper(dataItem)

      // Act
      const html = wrapper.html()
      const markAsSolvedIndex = html.indexOf('mark-solved-action')
      const editIndex = html.indexOf('edit-action')

      // Assert
      expect(markAsSolvedIndex).toBeGreaterThan(-1)
      expect(editIndex).toBeGreaterThan(-1)
      expect(markAsSolvedIndex).toBeLessThan(editIndex)
    })
  })

  describe('Tooltip text', () => {
    it('should show correct tooltip for solved status', () => {
      // Arrange
      const dataItem = { id: 1, status: 'solved' }
      wrapper = createWrapper(dataItem)

      // Act
      const tooltip = wrapper.find('[title]')

      // Assert
      // The tooltip should contain the translation key or message
      expect(tooltip.exists()).toBe(true)
    })

    it('should show correct tooltip for pending status', () => {
      // Arrange
      const dataItem = { id: 1, status: 'pending' }
      wrapper = createWrapper(dataItem)

      // Act
      const tooltip = wrapper.find('[title]')

      // Assert
      expect(tooltip.exists()).toBe(true)
    })
  })

  describe('Component rendering', () => {
    it('should render all action buttons', () => {
      // Arrange - Delete button only shows when cloned and pending
      const dataItem = { id: 1, status: 'pending', cloned: true }
      wrapper = createWrapper(dataItem)

      // Act
      const markAsSolved = wrapper.find('.mark-solved-action')
      const edit = wrapper.find('.edit-action')
      const clone = wrapper.find('.clone-action')
      const deleteBtn = wrapper.find('.delete-action')

      // Assert
      expect(markAsSolved.exists()).toBe(true)
      expect(edit.exists()).toBe(true)
      expect(clone.exists()).toBe(true)
      // Delete button exists but may be disabled
      expect(deleteBtn.exists()).toBe(true)
    })

    it('should handle undefined status gracefully', () => {
      // Arrange
      const dataItem = { id: 1 }
      wrapper = createWrapper(dataItem)

      // Act & Assert - Should not throw error
      expect(wrapper.exists()).toBe(true)
      const markAsSolvedButton = wrapper.find('.mark-solved-action')
      expect(markAsSolvedButton.exists()).toBe(true)
    })

    it('should handle null status gracefully', () => {
      // Arrange
      const dataItem = { id: 1, status: null }
      wrapper = createWrapper(dataItem)

      // Act & Assert - Should not throw error
      expect(wrapper.exists()).toBe(true)
    })
  })
})

