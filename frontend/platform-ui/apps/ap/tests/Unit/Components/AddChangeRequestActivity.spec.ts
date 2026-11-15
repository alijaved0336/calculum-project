/**
 * Unit tests for AddChangeRequestActivity component
 * 
 * Tests the form for adding new activities to change requests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../../Helpers/mountWithProviders'
import AddChangeRequestActivity from '@/modules/adminBackend/components/AddChangeRequestActivity.vue'

describe('AddChangeRequestActivity', () => {
  let wrapper: VueWrapper

  const defaultProps = {
    changeRequestId: '1',
    loading: false
  }

  const createWrapper = (props = {}) => {
    return mountWithProviders(AddChangeRequestActivity, {
      props: {
        ...defaultProps,
        ...props
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component rendering', () => {
    it('should render the component', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      expect(wrapper.exists()).toBe(true)
    })

    it('should display message input field', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      const input = wrapper.find('input[type="text"]')
      expect(input.exists()).toBe(true)
      expect(input.attributes('maxlength')).toBe('1000')
    })

    it('should display activity type selector', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      const select = wrapper.find('select')
      expect(select.exists()).toBe(true)
    })

    it('should display send button', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      const button = wrapper.find('button.btn-send')
      expect(button.exists()).toBe(true)
    })

    it('should display information request note when information_requested is selected', async () => {
      // Arrange
      wrapper = createWrapper()

      // Act
      const select = wrapper.find('select')
      await select.setValue('information_requested')

      // Assert
      const note = wrapper.find('.form-note')
      expect(note.exists()).toBe(true)
      expect(note.text()).toContain('adminBackend.dataChange.activities.informationRequestedNote')
    })

    it('should not display information request note when comment is selected', async () => {
      // Arrange
      wrapper = createWrapper()

      // Act
      const select = wrapper.find('select')
      await select.setValue('comment')

      // Assert
      const note = wrapper.find('.form-note')
      expect(note.exists()).toBe(false)
    })
  })

  describe('Form validation', () => {
    it('should disable send button when message is empty', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      const button = wrapper.find('button.btn-send')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should enable send button when message is provided', async () => {
      // Arrange
      wrapper = createWrapper()
      const input = wrapper.find('input[type="text"]')

      // Act
      await input.setValue('Test message')

      // Assert
      const button = wrapper.find('button.btn-send')
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('should disable send button when loading', () => {
      // Arrange & Act
      wrapper = createWrapper({ loading: true })
      const input = wrapper.find('input[type="text"]')
      input.setValue('Test message')

      // Assert
      const button = wrapper.find('button.btn-send')
      expect(button.attributes('disabled')).toBeDefined()
    })
  })

  describe('Event emissions', () => {
    it('should emit submit event when send button is clicked', async () => {
      // Arrange
      wrapper = createWrapper()
      const input = wrapper.find('input[type="text"]')
      await input.setValue('Test message')

      // Act
      const button = wrapper.find('button.btn-send')
      await button.trigger('click')

      // Assert
      expect(wrapper.emitted('submit')).toBeTruthy()
      expect(wrapper.emitted('submit')?.[0]).toEqual([{
        message: 'Test message',
        activityType: 'comment'
      }])
    })

    it('should emit submit event with information_requested type when selected', async () => {
      // Arrange
      wrapper = createWrapper()
      const input = wrapper.find('input[type="text"]')
      const select = wrapper.find('select')
      await input.setValue('Please provide more information')
      await select.setValue('information_requested')

      // Act
      const button = wrapper.find('button.btn-send')
      await button.trigger('click')

      // Assert
      expect(wrapper.emitted('submit')).toBeTruthy()
      expect(wrapper.emitted('submit')?.[0]).toEqual([{
        message: 'Please provide more information',
        activityType: 'information_requested'
      }])
    })

    it('should clear input after submit', async () => {
      // Arrange
      wrapper = createWrapper()
      const input = wrapper.find('input[type="text"]')
      await input.setValue('Test message')

      // Act
      const button = wrapper.find('button.btn-send')
      await button.trigger('click')
      await wrapper.vm.$nextTick()

      // Assert
      expect((input.element as HTMLInputElement).value).toBe('')
    })

    it('should emit cancel event when Escape key is pressed', async () => {
      // Arrange
      wrapper = createWrapper()
      const input = wrapper.find('input[type="text"]')

      // Act
      await input.trigger('keydown.escape')

      // Assert
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('should emit submit event when Enter key is pressed', async () => {
      // Arrange
      wrapper = createWrapper()
      const input = wrapper.find('input[type="text"]')
      await input.setValue('Test message')

      // Act
      await input.trigger('keydown.enter')

      // Assert
      expect(wrapper.emitted('submit')).toBeTruthy()
    })
  })

  describe('Activity type options', () => {
    it('should have comment option', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      const select = wrapper.find('select')
      const options = select.findAll('option')
      expect(options.some(opt => opt.attributes('value') === 'comment')).toBe(true)
    })

    it('should have information_requested option', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      const select = wrapper.find('select')
      const options = select.findAll('option')
      expect(options.some(opt => opt.attributes('value') === 'information_requested')).toBe(true)
    })

    it('should default to comment type', () => {
      // Arrange & Act
      wrapper = createWrapper()

      // Assert
      const select = wrapper.find('select')
      expect((select.element as HTMLSelectElement).value).toBe('comment')
    })
  })

  describe('Props', () => {
    it('should accept changeRequestId prop', () => {
      // Arrange & Act
      wrapper = createWrapper({ changeRequestId: '123' })

      // Assert
      expect((wrapper.props() as any).changeRequestId).toBe('123')
    })

    it('should accept loading prop', () => {
      // Arrange & Act
      wrapper = createWrapper({ loading: true })

      // Assert
      expect((wrapper.props() as any).loading).toBe(true)
    })
  })
})

