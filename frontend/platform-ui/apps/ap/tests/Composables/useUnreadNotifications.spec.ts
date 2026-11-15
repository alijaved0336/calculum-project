/**
 * Tests for useUnreadNotifications composable
 *
 * Covers:
 * - dataNotificationMessages sorting and the count computeds
 * - the 3 store<->local unread-count sync watchers
 * - getUnreadNotifications pagination (first page vs append) and
 *   loadMoreNotifications' loading/no-more guards
 * - onNotificationsScroll's near-bottom trigger + throttle
 * - onClickNotificationMarkAsRead / onClickNotificationDelete sharing the
 *   removeNotificationLocally fade-out-then-splice tail (and its
 *   element-not-found fallback)
 * - onClickNotificationsDropdown / onClickRefreshNotifications
 *
 * Extracted verbatim from HomeNavbar.vue (Sprint 116 US-2 refactor).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { reactive, nextTick } from 'vue'

vi.mock('@/composables', () => ({
  useUser: () => ({ userId: { value: 'user-1' }, userIri: { value: '/api/users/1' } }),
}))
// `@/utils` (the barrel) has a documented circular-import chain
// (docs/context/documentation-standards.md) that only bites in an isolated
// module graph like this one, not in the running app — mock just the one
// export this composable needs rather than pulling in the real barrel.
vi.mock('@/utils', () => ({
  removeIRI: (iri: string | null | undefined) => (iri ? iri.split('/').pop() ?? '' : ''),
}))
// vi.mock factories are hoisted above every import (including third-party
// ones), so they can't close over `reactive` from the `vue` import above —
// the mock instead reads a slot that's filled in once real imports finish
// resolving, below.
vi.mock('@/stores/notifications', () => ({
  useNotificationsStore: () => (globalThis as any).__mockNotificationsStore,
}))

import useUnreadNotifications from '@/modules/home/composables/useUnreadNotifications'
import type { HomeNavBar } from '@/modules/home/types'

// A real `reactive()` (not a plain object) so the composable's `watch()`
// calls on notificationsStore.* genuinely react to mutations, the same way
// the real Pinia store's refs do.
const notificationsStore = reactive({
  getTotalUnreadCount: 0,
  getUnreadMessagesCount: 0,
  getMessageReadNotification: null as any,
  getMessages: [] as any[],
  getNotificationAmount: vi.fn(),
  getNotificationsMessagesPendingToRead: vi.fn(),
  getNotificationsMessages: vi.fn(),
  fetchUnreadNotifications: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  postNotificationsMarkAsRead: vi.fn(),
  deleteSingleNotification: vi.fn(),
  postNotificationsMessagesLastAccess: vi.fn(),
  setTotalUnreadCount: vi.fn(),
  setUnreadMessagesCount: vi.fn(),
})
;(globalThis as any).__mockNotificationsStore = notificationsStore

const MESSAGE = 'MESSAGE' // NotificationType.MESSAGE

function makeData(overrides: Partial<HomeNavBar> = {}): HomeNavBar {
  return reactive({
    loading: false,
    isLoadingMessages: false,
    unreadNotifications: [],
    totalUnreadNotificationsCount: 0,
    currentPage: 1,
    hasMoreNotifications: true,
    isLoadingMoreNotifications: false,
    isLoadingInitialNotifications: false,
    isLoadingNotificationMarkAsRead: false,
    isDeletingMessage: false,
    isMarkingAllAsRead: false,
    notificationClickedId: '',
    notificationAmountNotes: [],
    notificationAmountOther: [],
    ...overrides,
  }) as HomeNavBar
}

describe('useUnreadNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notificationsStore.getTotalUnreadCount = 0
    notificationsStore.getUnreadMessagesCount = 0
    notificationsStore.getMessageReadNotification = null
    notificationsStore.getMessages = []
  })

  // `data.totalUnreadNotificationsCount` is immediately overwritten by the
  // total-unread sync watcher ({ immediate: true }) at construction time —
  // so tests that need a specific starting count set the store's count
  // *before* calling build(), not via makeData().
  function build(data = makeData()) {
    return { data, api: useUnreadNotifications(data, () => '/api/spend_file_versions/1') }
  }

  describe('dataNotificationMessages', () => {
    it('sorts notifications by created date, most recent first', () => {
      notificationsStore.getMessages = [
        { id: 1, created: '2026-01-01T00:00:00Z' },
        { id: 2, created: '2026-03-01T00:00:00Z' },
        { id: 3, created: '2026-02-01T00:00:00Z' },
      ]
      const { api } = build()
      expect(api.dataNotificationMessages.value.map((m: any) => m.id)).toEqual([2, 3, 1])
    })

    it('returns an empty array when the store has no messages', () => {
      const { api } = build()
      expect(api.dataNotificationMessages.value).toEqual([])
    })
  })

  describe('existMessagesPendingToRead / totalUnreadNotifications', () => {
    it('mirror data.totalUnreadNotificationsCount', () => {
      notificationsStore.getTotalUnreadCount = 3
      const { data, api } = build()
      expect(api.existMessagesPendingToRead.value).toBe(true)
      expect(api.totalUnreadNotifications.value).toBe(3)
      data.totalUnreadNotificationsCount = 0
      expect(api.existMessagesPendingToRead.value).toBe(false)
    })
  })

  describe('unread-count sync watchers', () => {
    it('mirrors the store total-unread count into data', async () => {
      const { data } = build()
      notificationsStore.getTotalUnreadCount = 7
      await nextTick()
      expect(data.totalUnreadNotificationsCount).toBe(7)
    })

    it('pushes the local list length back to the store when it disagrees', async () => {
      build(makeData({ unreadNotifications: [{ '@id': 'a' }, { '@id': 'b' }] }))
      notificationsStore.getUnreadMessagesCount = 0
      await nextTick()
      expect(notificationsStore.setUnreadMessagesCount).toHaveBeenCalledWith(2)
    })

    it('removes a message reported read elsewhere and decrements both counts', async () => {
      notificationsStore.getTotalUnreadCount = 2
      const { data } = build(
        makeData({ unreadNotifications: [{ '@id': '/m/1' }, { '@id': '/m/2' }] }),
      )
      notificationsStore.getMessageReadNotification = { messageId: '/m/1' }
      await nextTick()
      expect(data.unreadNotifications).toEqual([{ '@id': '/m/2' }])
      expect(data.totalUnreadNotificationsCount).toBe(1)
      expect(notificationsStore.setTotalUnreadCount).toHaveBeenCalledWith(1)
    })
  })

  describe('getUnreadNotifications', () => {
    it('replaces the list and sets the total count on page 1', () => {
      const { data, api } = build()
      api.getUnreadNotifications(1, false)
      const { callbackSuccess } = notificationsStore.fetchUnreadNotifications.mock.calls[0][0]
      callbackSuccess({ 'hydra:member': [{ '@id': 'a' }], 'hydra:totalItems': 1 })

      expect(data.unreadNotifications).toEqual([{ '@id': 'a' }])
      expect(data.totalUnreadNotificationsCount).toBe(1)
      expect(data.isLoadingInitialNotifications).toBe(false)
    })

    it('appends instead of replacing when append=true', () => {
      const { data, api } = build(makeData({ unreadNotifications: [{ '@id': 'a' }] }))
      api.getUnreadNotifications(2, true)
      const { callbackSuccess } = notificationsStore.fetchUnreadNotifications.mock.calls[0][0]
      callbackSuccess({ 'hydra:member': [{ '@id': 'b' }], 'hydra:totalItems': 2 })

      expect(data.unreadNotifications).toEqual([{ '@id': 'a' }, { '@id': 'b' }])
    })
  })

  describe('loadMoreNotifications', () => {
    it('does nothing while already loading more', () => {
      const { api } = build(makeData({ isLoadingMoreNotifications: true }))
      api.loadMoreNotifications()
      expect(notificationsStore.fetchUnreadNotifications).not.toHaveBeenCalled()
    })

    it('does nothing when there are no more notifications', () => {
      const { api } = build(makeData({ hasMoreNotifications: false }))
      api.loadMoreNotifications()
      expect(notificationsStore.fetchUnreadNotifications).not.toHaveBeenCalled()
    })

    it('fetches the next page otherwise', () => {
      const { api } = build(makeData({ currentPage: 2 }))
      api.loadMoreNotifications()
      expect(notificationsStore.fetchUnreadNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3 }),
      )
    })
  })

  describe('onNotificationsScroll', () => {
    function scrollEvent(scrollTop: number, scrollHeight: number, clientHeight: number) {
      return { target: { scrollTop, scrollHeight, clientHeight } }
    }

    it('loads more when near the bottom and more are available', () => {
      const { api } = build(makeData({ currentPage: 1 }))
      api.onNotificationsScroll(scrollEvent(750, 1000, 200) as any)
      expect(notificationsStore.fetchUnreadNotifications).toHaveBeenCalled()
    })

    it('does not load more when far from the bottom', () => {
      const { api } = build()
      api.onNotificationsScroll(scrollEvent(0, 1000, 200) as any)
      expect(notificationsStore.fetchUnreadNotifications).not.toHaveBeenCalled()
    })

    it('throttles rapid scroll events to a single load', () => {
      const { api } = build(makeData({ currentPage: 1 }))
      api.onNotificationsScroll(scrollEvent(750, 1000, 200) as any)
      api.onNotificationsScroll(scrollEvent(760, 1000, 200) as any)
      expect(notificationsStore.fetchUnreadNotifications).toHaveBeenCalledTimes(1)
    })
  })

  describe('mark-as-read / delete (shared removeNotificationLocally)', () => {
    it('onClickNotificationMarkAsRead decrements the counter and fades the row out', () => {
      vi.useFakeTimers()
      document.body.innerHTML = `<div data-notification-id="/m/1"></div>`
      notificationsStore.getTotalUnreadCount = 1
      const { data, api } = build(makeData({ unreadNotifications: [{ '@id': '/m/1' }] }))

      api.onClickNotificationMarkAsRead({ '@id': '/m/1' }, MESSAGE)
      const { callbackSuccess } = notificationsStore.postNotificationsMarkAsRead.mock.calls[0][0]
      callbackSuccess()

      expect(data.totalUnreadNotificationsCount).toBe(0)
      expect(
        document.querySelector('[data-notification-id]')?.classList.contains('notification-fade-out'),
      ).toBe(true)
      expect(data.unreadNotifications).toHaveLength(1) // not spliced yet

      vi.advanceTimersByTime(500)
      expect(data.unreadNotifications).toHaveLength(0)
      vi.useRealTimers()
      document.body.innerHTML = ''
    })

    it('onClickNotificationDelete removes immediately when the DOM element is not found', async () => {
      notificationsStore.getTotalUnreadCount = 1
      notificationsStore.deleteSingleNotification.mockResolvedValue({})
      const { data, api } = build(makeData({ unreadNotifications: [{ '@id': '/m/1' }] }))

      await api.onClickNotificationDelete({ '@id': '/m/1' })
      await notificationsStore.deleteSingleNotification.mock.results[0].value

      expect(data.unreadNotifications).toEqual([])
      expect(data.totalUnreadNotificationsCount).toBe(0)
    })

    it('is a no-op when called with a falsy item', () => {
      const { api } = build()
      api.onClickNotificationMarkAsRead(null as any, MESSAGE)
      api.onClickNotificationDelete(null as any)
      expect(notificationsStore.postNotificationsMarkAsRead).not.toHaveBeenCalled()
      expect(notificationsStore.deleteSingleNotification).not.toHaveBeenCalled()
    })
  })

  describe('onClickNotificationsDropdown / onClickRefreshNotifications', () => {
    it('onClickNotificationsDropdown reloads only when the count is 0', () => {
      const { api } = build()
      api.onClickNotificationsDropdown()
      expect(notificationsStore.fetchUnreadNotifications).toHaveBeenCalled()
    })

    it('onClickNotificationsDropdown does nothing when there already is an unread count', () => {
      notificationsStore.getTotalUnreadCount = 2
      const { api } = build()
      api.onClickNotificationsDropdown()
      expect(notificationsStore.fetchUnreadNotifications).not.toHaveBeenCalled()
    })

    it('onClickRefreshNotifications always reloads from page 1', () => {
      const { data, api } = build(makeData({ currentPage: 4 }))
      api.onClickRefreshNotifications()
      expect(data.currentPage).toBe(1)
      expect(notificationsStore.fetchUnreadNotifications).toHaveBeenCalled()
    })
  })
})
