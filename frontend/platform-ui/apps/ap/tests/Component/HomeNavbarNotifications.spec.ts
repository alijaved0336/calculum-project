import { describe, it, expect, vi } from 'vitest'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import HomeNavbarNotifications from '@/modules/home/components/HomeNavbarNotifications.vue'

const NOTIFICATION = {
  '@id': '/api/notifications/1',
  title: 'Something happened',
  created: '2026-01-01T00:00:00Z',
  originType: 'message',
}

function baseProps(overrides: Record<string, any> = {}) {
  return {
    disableElementPilotIsExpired: false,
    disabled: false,
    existMessagesPendingToRead: false,
    totalUnreadNotifications: 0,
    isMarkingAllAsRead: false,
    isLoadingInitialNotifications: false,
    isLoadingMoreNotifications: false,
    unreadNotifications: [],
    notificationClickedId: '',
    isMarkingAsRead: false,
    isDeletingMessage: false,
    getNotificationPreviewText: vi.fn((n: any) => n.title),
    getNotificationContentHasHighlightSpans: vi.fn(() => false),
    getNotificationContentIsArray: vi.fn(() => false),
    getNotificationContentSegmentsPreview: vi.fn(() => []),
    ...overrides,
  }
}

describe('HomeNavbarNotifications', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders nothing while the pilot account is expired', () => {
    const wrapper = mountWithProviders(HomeNavbarNotifications, {
      props: baseProps({ disableElementPilotIsExpired: true }),
    })
    expect(wrapper.find('.menu__item').exists()).toBe(false)
  })

  it('shows the unread badge only when there are unread notifications', async () => {
    const wrapper = mountWithProviders(HomeNavbarNotifications, { props: baseProps() })
    expect(wrapper.find('.notification-badge').exists()).toBe(false)

    await wrapper.setProps({ totalUnreadNotifications: 3 })
    expect(wrapper.find('.notification-badge').exists()).toBe(true)
  })

  it('shows the loading state while the initial fetch is in flight', () => {
    const wrapper = mountWithProviders(HomeNavbarNotifications, {
      props: baseProps({ isLoadingInitialNotifications: true }),
    })
    expect(wrapper.find('.empty-state').exists()).toBe(false)
    expect(wrapper.findAll('.spinner-border').length).toBeGreaterThan(0)
  })

  it('shows the empty state when there are no unread notifications', () => {
    const wrapper = mountWithProviders(HomeNavbarNotifications, { props: baseProps() })
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.notification-item').exists()).toBe(false)
  })

  it('renders one row per unread notification, tagged with its data-notification-id', () => {
    const wrapper = mountWithProviders(HomeNavbarNotifications, {
      props: baseProps({ unreadNotifications: [NOTIFICATION] }),
    })
    const row = wrapper.find('.notification-item')
    expect(row.exists()).toBe(true)
    expect(row.attributes('data-notification-id')).toBe(NOTIFICATION['@id'])
  })

  // ─── Emits ────────────────────────────────────────────────────────────────

  it('emits notifications-dropdown-click when the trigger button is clicked', async () => {
    const wrapper = mountWithProviders(HomeNavbarNotifications, { props: baseProps() })
    await wrapper.find('#user-messages-alerts').trigger('click')
    expect(wrapper.emitted('notifications-dropdown-click')).toHaveLength(1)
  })

  it('emits mark-all-as-read when the header button is clicked', async () => {
    const wrapper = mountWithProviders(HomeNavbarNotifications, {
      props: baseProps({ totalUnreadNotifications: 1 }),
    })
    await wrapper.find('.mark-all-read-btn').trigger('click')
    expect(wrapper.emitted('mark-all-as-read')).toHaveLength(1)
  })

  it('emits refresh when the refresh button is clicked', async () => {
    const wrapper = mountWithProviders(HomeNavbarNotifications, { props: baseProps() })
    await wrapper.find('.refresh-btn').trigger('click')
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('emits notifications-scroll with the native event on scroll', async () => {
    const wrapper = mountWithProviders(HomeNavbarNotifications, { props: baseProps() })
    await wrapper.find('.notifications-container').trigger('scroll')
    expect(wrapper.emitted('notifications-scroll')).toHaveLength(1)
  })

  it('emits mark-as-read with the notification when its read button is clicked', async () => {
    const wrapper = mountWithProviders(HomeNavbarNotifications, {
      props: baseProps({ unreadNotifications: [NOTIFICATION] }),
    })
    await wrapper.find('.action-btn.read-btn').trigger('click')
    const emitted = wrapper.emitted('mark-as-read')
    expect(emitted).toHaveLength(1)
    expect(emitted![0][0]).toEqual(NOTIFICATION)
  })

  it('emits delete with the notification when its delete button is clicked', async () => {
    const wrapper = mountWithProviders(HomeNavbarNotifications, {
      props: baseProps({ unreadNotifications: [NOTIFICATION] }),
    })
    await wrapper.find('.action-btn.delete-btn').trigger('click')
    const emitted = wrapper.emitted('delete')
    expect(emitted).toHaveLength(1)
    expect(emitted![0][0]).toEqual(NOTIFICATION)
  })
})
