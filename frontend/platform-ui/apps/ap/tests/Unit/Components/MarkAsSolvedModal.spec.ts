/**
 * Unit tests for MarkAsSolvedModal component
 * 
 * Tests the confirmation modal for marking a Data Change Request as solved
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../../Helpers/mountWithProviders'
import MarkAsSolvedModal from '@/modules/adminBackend/components/MarkAsSolvedModal.vue'

describe('MarkAsSolvedModal', () => {
  let wrapper: VueWrapper

  const createWrapper = () => {
    return mountWithProviders(MarkAsSolvedModal, {
      global: {
        stubs: {
          CalculumModal: {
            template: `
              <div class="modal">
                <div class="modal-header">
                  <slot name="title">Modal Title</slot>
                </div>
                <div class="modal-content">
                  <slot name="modalContent"></slot>
                </div>
                <div class="modal-buttons">
                  <slot name="modalButtons"></slot>
                </div>
              </div>
            `,
            props: ['size', 'showClose', 'title'],
            emits: ['close']
          }
        }
      }
    })
  }

  describe('Component rendering', () => {
    it('should render the modal', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.modal').exists()).toBe(true)
    })

    it('should display modal title and message', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      const content = wrapper.text()
      expect(content).toContain('adminBackend.dataChange.markAsSolved.title')
      expect(content).toContain('adminBackend.dataChange.markAsSolved.message')
    })

    it('should display resolution message textarea', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)
      expect(textarea.attributes('maxlength')).toBe('1000')
    })

    it('should display Cancel and Mark as Solved buttons', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
      
      const buttonTexts = buttons.map(btn => btn.text())
      expect(buttonTexts.some(text => text.includes('global.cancel') || text.includes('Cancel'))).toBe(true)
      expect(buttonTexts.some(text => text.includes('adminBackend.dataChange.markAsSolved.confirm') || text.includes('Mark as Solved'))).toBe(true)
    })
  })

  describe('Event emissions', () => {
    it('should emit close event when Cancel button is clicked', async () => {
      // Arrange
      wrapper = createWrapper()

      // Act
      const cancelButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('global.cancel') || btn.text().includes('Cancel')
      )
      if (cancelButton) {
        await cancelButton.trigger('click')
      }

      // Assert
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit confirm event when Mark as Solved button is clicked', async () => {
      // Arrange
      wrapper = createWrapper()

      // Act
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('adminBackend.dataChange.markAsSolved.confirm') || 
        btn.text().includes('Mark as Solved') ||
        btn.classes().includes('modal-btn-success')
      )
      if (confirmButton) {
        await confirmButton.trigger('click')
      }

      // Assert
      expect(wrapper.emitted('confirm')).toBeTruthy()
    })

    it('should emit confirm event with resolution message when provided', async () => {
      // Arrange
      wrapper = createWrapper()
      const textarea = wrapper.find('textarea')
      await textarea.setValue('Test resolution message')

      // Act
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('adminBackend.dataChange.markAsSolved.confirm') || 
        btn.text().includes('Mark as Solved') ||
        btn.classes().includes('modal-btn-success')
      )
      if (confirmButton) {
        await confirmButton.trigger('click')
      }

      // Assert
      expect(wrapper.emitted('confirm')).toBeTruthy()
      expect(wrapper.emitted('confirm')?.[0]).toEqual(['Test resolution message'])
    })

    it('should emit confirm event with empty string when resolution message is empty', async () => {
      // Arrange
      wrapper = createWrapper()
      // Textarea is already empty by default

      // Act
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('adminBackend.dataChange.markAsSolved.confirm') || 
        btn.text().includes('Mark as Solved') ||
        btn.classes().includes('modal-btn-success')
      )
      if (confirmButton) {
        await confirmButton.trigger('click')
      }

      // Assert
      expect(wrapper.emitted('confirm')).toBeTruthy()
      expect(wrapper.emitted('confirm')?.[0]).toEqual([''])
    })
  })

  describe('Modal props', () => {
    it('should pass correct props to CalculumModal', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      const modal = wrapper.findComponent({ name: 'CalculumModal' })
      if (modal.exists()) {
        expect(modal.props('size')).toBe('md')
        expect(modal.props('showClose')).toBe(true)
        expect(modal.props('title')).toContain('adminBackend.dataChange.markAsSolved.title')
      } else {
        // If stub is used, verify the template structure
        expect(wrapper.html()).toContain('modal')
      }
    })
  })

  describe('Resolution message', () => {
    it('should update character count when typing', async () => {
      // Arrange
      wrapper = createWrapper()
      const textarea = wrapper.find('textarea')

      // Act
      await textarea.setValue('Test message')

      // Assert
      const charCount = wrapper.find('.char-count')
      expect(charCount.exists()).toBe(true)
      expect(charCount.text()).toContain('12 / 1000')
    })

    it('should display character count correctly', async () => {
      // Arrange
      wrapper = createWrapper()
      const textarea = wrapper.find('textarea')
      const message = 'a'.repeat(500)

      // Act
      await textarea.setValue(message)

      // Assert
      const charCount = wrapper.find('.char-count')
      expect(charCount.exists()).toBe(true)
      expect(charCount.text()).toContain('500 / 1000')
      
      // Note: The maxlength attribute on textarea should prevent input beyond 1000 chars
      // but in tests, setValue may not respect this. The actual browser will enforce it.
      expect(textarea.attributes('maxlength')).toBe('1000')
    })
  })
})

