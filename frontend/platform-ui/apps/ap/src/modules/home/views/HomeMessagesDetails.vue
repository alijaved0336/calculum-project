<template>
<CalculumLayout :containerClass="'wizard-programs'">
  <template v-slot:slotContent>
    <div class="email-manager-container">
      <!-- Header with bulk actions-->
      <div class="email-header">
        <div class="header-left">
          <h4 class="mb-0">{{ $t('home.homeMessagesDetails.title') }}</h4>
          <div class="message-count">{{ dataNotificationMessages.length }} / {{ totalMessagesCount }} {{ $t('home.homeMessagesDetails.messages') }}</div>
          <div class="selected-count" v-if="selectedMessages.length > 0">{{ selectedMessages.length }} {{ $t('home.homeMessagesDetails.selected') }}</div>
        </div>
        <div class="header-right">
          <div class="header-controls">
            <div class="box-badges select-all-badge" @click="dataNotificationMessages.length > 0 ? toggleSelectAll() : null" :class="{ 'active': allSelected, 'disabled': dataNotificationMessages.length === 0 }"><i class="fa-solid fa-check-square mr-2 mt-2"></i>{{ selectedMessages.length > 0 ? $t('home.homeMessagesDetails.selectNone') : $t('home.homeMessagesDetails.selectAll') }}</div>
            <div class="box-badges filter-badge" @click="dataNotificationMessages.length > 0 ? toggleFilter() : null" :class="{ 'active': showOnlyUnread, 'disabled': dataNotificationMessages.length === 0 }"><i class="fa-solid fa-filter mr-2 mt-2"></i>{{ showOnlyUnread ? $t('home.homeMessagesDetails.showAll') : $t('home.homeMessagesDetails.showUnread') }}</div>
            <div class="bulk-actions" v-if="selectedMessages.length > 0">
              <button class="circular-btn mark-selected-btn" @click="markSelectedAsRead" :disabled="isMarkingSelectedAsRead" :title="$t('home.homeMessagesDetails.markSelectedAsRead')"><i class="fa-solid fa-check-square"></i></button>
              <button class="circular-btn delete-selected-btn" @click="deleteSelectedMessages" :disabled="isDeletingSelected" :title="$t('home.homeMessagesDetails.deleteSelected')"><i class="fa-solid fa-trash-can-o"></i></button>
            </div>
          </div>
          <button class="circular-btn mark-all-read-btn" @click="markAllAsRead" :disabled="isMarkingAllAsRead || dataNotificationMessages.length === 0" :title="$t('home.homeMessagesDetails.markAllAsRead')"><i class="fa-solid fa-envelope text-base"></i></button>
          <button class="circular-btn delete-all-btn" @click="deleteAllMessages" :disabled="isDeletingAll || dataNotificationMessages.length === 0" :title="$t('home.homeMessagesDetails.deleteAll')"><i class="fa-solid fa-trash-can text-sm"></i></button>
        </div>
      </div>
      <div class="email-content">
        <div class="message-list-container">
          <!-- Loading initial state-->
          <div class="loading-container" v-if="isLoadingInitialMessages">
            <div class="spinner-border" role="status" aria-hidden="true" style="color: #6c757d;"></div>
            <div class="text-muted mt-2">{{ $t('home.components.navbar.messages.loadingNotifications') }}</div>
          </div>
          <!-- Empty state-->
          <div class="empty-state" v-else-if="!isLoadingInitialMessages && dataNotificationMessages.length === 0">
            <div class="empty-icon"><i class="fa-solid fa-inbox"></i></div>
            <div class="empty-title">{{ $t('home.homeMessagesDetails.noMessage') }}</div>
            <div class="empty-subtitle">{{ $t('home.homeMessagesDetails.noMessagesSubtitle') }}</div>
          </div>
          <!-- Messages list-->
          <div class="message-list" v-else @scroll="onMessagesScroll">
            <div class="message-item" v-for="notification in dataNotificationMessages" :key="notification['@id']" :class="getMessageClasses(notification)" @click="selectMessage(notification, $event)">
              <div class="message-icon">
                <IconNotesBookTextAlternate class="notes-icon" v-if="notification.originType && notification.originType === 'note'"></IconNotesBookTextAlternate><img class="icon-img" :src="fontIcons.documentIcon" v-if="notification.originType && notification.originType === 'file'"/><img class="icon-img" :src="fontIcons.analyze" v-if="notification.originType && notification.originType === 'analyze'"/><img class="icon-img" :src="fontIcons.plan" v-if="notification.originType && notification.originType === 'plan'"/><img class="icon-img" :src="fontIcons.release" v-if="notification.originType && notification.originType === 'NEW_RELEASE_ADA_PLATFORM'"/><img class="icon-img" :src="fontIcons.documentIcon" v-if="notification.originType && notification.originType === 'change_request'"/>
              </div>
              <div class="message-content">
                <div class="message-header">
                  <div class="message-title" :title="notification.originType && notification.originType === 'note' ? getPreviewText(notification) : notification.title">{{ notification.originType && notification.originType === 'note' ? getPreviewText(notification) : notification.title }}</div>
                  <div class="message-time">{{ formatRelativeTime(notification.created) }}</div>
                </div>
                <div class="message-body">
                  <div class="message-preview bubble-inline" :class="{ 'bubble-inline--html': getContentHasHighlightSpans(notification) && !getContentIsArray(notification) }" :title="getPreviewText(notification)"><span v-if="getContentHasHighlightSpans(notification) && !getContentIsArray(notification)">{{ getPreviewText(notification, 50) }}</span>
                    <template v-else>
                      <template v-for="(seg, i) in getContentSegmentsPreview(notification, 50)" :key="i"><span v-if="seg.type === 'text'">{{ seg.value }}</span><span class="mention-chip" v-else>{{ seg.value }}</span></template>
                    </template>
                  </div>
                  <div class="message-actions">
                    <button class="action-btn read-btn" v-if="!notification.read" @click.stop="markAsRead(notification)" :title="$t('home.homeMessagesDetails.markAsRead')" :disabled="isMarkingAsRead"><i class="fa-solid fa-envelope text-base"></i></button>
                    <button class="action-btn unread-btn" v-if="notification.read" @click.stop="markAsUnread(notification)" :title="$t('home.homeMessagesDetails.markAsUnread')" :disabled="isMarkingAsRead"><i class="fa-solid fa-envelope text-base"></i></button>
                    <button class="action-btn delete-btn" @click.stop="deleteMessage(notification)" :title="$t('home.homeMessagesDetails.delete')" :disabled="isDeletingMessage"><i class="fa-solid fa-trash-can text-sm"></i></button>
                  </div>
                </div>
                <div class="message-meta">
                  <div class="message-author" v-if="notification.originType && notification.originType === 'note'"><i class="fa-solid fa-user mr-2"></i>{{ notification.createdBy && notification.createdBy.firstName && notification.createdBy.lastName ? notification.createdBy.firstName + " " + notification.createdBy.lastName : 'Ada' }}</div>
                </div>
              </div>
            </div>
            <!-- Loading more state-->
            <div class="loading-more" v-if="isLoadingMoreMessages">
              <div class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="color: #6c757d;"></div>
              <div class="text-muted small mt-2">{{ $t('home.components.navbar.messages.loadingMoreNotifications') }}</div>
            </div>
          </div>
        </div>
        <div class="message-detail-container" v-if="selectedMessage">
          <div class="detail-header">
            <div class="detail-title">{{ selectedMessage.originType && selectedMessage.originType === 'note' ? selectedMessage.humanDate : selectedMessage.title }}</div>
            <div class="detail-time">{{ formatRelativeTime(selectedMessage.created) }}</div>
          </div>
          <div class="detail-icon">
            <IconNotesBookTextAlternate class="notes-icon" v-if="selectedMessage.originType && selectedMessage.originType === 'note'"></IconNotesBookTextAlternate><img class="icon-img" :src="fontIcons.documentIcon" v-if="selectedMessage.originType && selectedMessage.originType === 'file'"/><img class="icon-img" :src="fontIcons.analyze" v-if="selectedMessage.originType && selectedMessage.originType === 'analyze'"/><img class="icon-img" :src="fontIcons.plan" v-if="selectedMessage.originType && selectedMessage.originType === 'plan'"/><img class="icon-img" :src="fontIcons.release" v-if="selectedMessage.originType && selectedMessage.originType === 'NEW_RELEASE_ADA_PLATFORM'"/><img class="icon-img" :src="fontIcons.documentIcon" v-if="selectedMessage.originType && selectedMessage.originType === 'change_request'"/>
          </div>
          <div class="detail-content">
            <div class="detail-meta" v-if="selectedMessage.originType && selectedMessage.originType === 'note'">
              <div class="detail-author"><i class="fa-solid fa-user mr-2"></i>{{ selectedMessage.createdBy && selectedMessage.createdBy.firstName && selectedMessage.createdBy.lastName ? selectedMessage.createdBy.firstName + " " + selectedMessage.createdBy.lastName : 'Ada' }}</div>
              <div class="detail-date" v-if="selectedMessage.originType === 'note'"><i class="fa-regular fa-calendar-days mr-2"></i>{{ selectedMessage.humanDate }}</div>
              <div class="detail-date" v-else><i class="fa-regular fa-calendar-days mr-2"></i>{{ formatRelativeTime(selectedMessage.created) }}</div>
            </div>
            <div class="detail-message bubble-inline" :class="{ 'bubble-inline--html': getContentHasHighlightSpans(selectedMessage) && !getContentIsArray(selectedMessage) }"><span v-if="getContentHasHighlightSpans(selectedMessage) && !getContentIsArray(selectedMessage)" v-html="getSanitizedContentHtml(selectedMessage)"></span>
              <template v-else>
                <template v-for="(seg, i) in getContentSegments(selectedMessage)" :key="i"><span v-if="seg.type === 'text'">{{ seg.value }}</span><span class="mention-chip" v-else>{{ seg.value }}</span></template>
              </template>
            </div>
          </div>
        </div>
        <div class="no-selection" v-else>
          <div class="no-selection-content"><i class="fa-solid fa-envelope text-base"></i>
            <h5>{{ $t('home.homeMessagesDetails.selectMessage') }}</h5>
            <p>{{ $t('home.homeMessagesDetails.selectMessageSubtitle') }}</p>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang='ts'>
import { computed, reactive, toRefs, onMounted, onUnmounted, watch } from 'vue'
import { fontIcons, images } from '@/resources/assets/assets'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '@/stores/notifications'
import { CalculumLayout } from '@ada/design-system'
import IconNotesBookTextAlternate from '@/resources/assets/images/icons/IconNotesBookTextAlternate.vue'

import ReleaseIcon from '@/resources/assets/images/icons/iconRelease.vue'
import { useSpendFile, useUser } from '@/composables';
import { formatRelativeTime } from '@/utils/TimeUtils';
import { NOTIFICATIONS_ITEMS_PER_PAGE } from '@/modules/home/constants';
import { removeIRI } from '@/utils'
import {
  getDisplayContentFromNotification,
  getTextFromHtml,
  getPreviewTextFromContent,
  isDisplayContentArray,
  contentToNormalizedSegments,
  contentHasHighlightSpans as contentHasHighlightSpansCheck,
  sanitizeMentionContent,
  segmentsTruncateToLength,
} from '@/utils/ContentEditableUtils'

export default {
  name: 'HomeMessagesDetails',
  components: {
    CalculumLayout, 
    IconNotesBookTextAlternate,
    ReleaseIcon, 
  },
  setup() {
    const notificationsStore = useNotificationsStore()

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    const { userIri, userId } = useUser();

    const { spendFileVersionActiveIri } = useSpendFile();

    interface HomeMessagesDetails {
      selectedMessage: any
      allMessages: any[]
      currentPage: number
      hasMoreMessages: boolean
      isLoadingMoreMessages: boolean
      isLoadingInitialMessages: boolean
      selectedMessages: any[]
      allSelected: boolean
      totalMessagesCount: number
      showOnlyUnread: boolean
      isDeletingMessage: boolean
      isMarkingAsRead: boolean
      isDeletingSelected: boolean
      isMarkingSelectedAsRead: boolean
      isMarkingAllAsRead: boolean
      isDeletingAll: boolean
      autoReadTimer: number | null
      autoReadTimerDuration: number
    }
    
    const homeMessagesDetails = reactive<HomeMessagesDetails>({
      selectedMessage: null,
      allMessages: [],
      currentPage: 1,
      hasMoreMessages: true,
      isLoadingMoreMessages: false,
      isLoadingInitialMessages: false,
      selectedMessages: [],
      allSelected: false,
      totalMessagesCount: 0,
      showOnlyUnread: false,
      isDeletingMessage: false,
      isMarkingAsRead: false,
      isDeletingSelected: false,
      isMarkingSelectedAsRead: false,
      isMarkingAllAsRead: false,
      isDeletingAll: false,
      autoReadTimer: null,
      autoReadTimerDuration: 2000 // 5 seconds in milliseconds
    })

    /**
     * All messages loaded with pagination, filtered by read status
     */
    const dataNotificationMessages = computed(() => {
      if (homeMessagesDetails.showOnlyUnread) {
        return homeMessagesDetails.allMessages.filter(message => !message.read);
      }
      return homeMessagesDetails.allMessages;
    })

    const unreadMessagesCount = computed(() => {
      return homeMessagesDetails.allMessages.filter(message => !message.read).length;
    })

    const selectedMessages = computed(() => {
      return homeMessagesDetails.selectedMessages;
    })

    const allSelected = computed(() => {
      return homeMessagesDetails.allSelected;
    })

    function clearSelected() {
      // Stop auto-read timer when clearing selection
      stopAutoReadTimer();
      homeMessagesDetails.allMessages.forEach(message => {
        message.selected = false
      });
      homeMessagesDetails.selectedMessages = [];
      homeMessagesDetails.allSelected = false;
    }

    function startAutoReadTimer(message: any) {
      // Clear any existing timer
      if (homeMessagesDetails.autoReadTimer) {
        clearTimeout(homeMessagesDetails.autoReadTimer);
        homeMessagesDetails.autoReadTimer = null;
      }

      // Only start timer if message is unread
      if (!message.read) {
        homeMessagesDetails.autoReadTimer = window.setTimeout(() => {
          // Double check message is still selected and unread before marking as read
          if (homeMessagesDetails.selectedMessage && 
              homeMessagesDetails.selectedMessage['@id'] === message['@id'] && 
              !message.read) {
            markAsRead(message);
          }
          homeMessagesDetails.autoReadTimer = null;
        }, homeMessagesDetails.autoReadTimerDuration);
      }
    }

    function stopAutoReadTimer() {
      if (homeMessagesDetails.autoReadTimer) {
        clearTimeout(homeMessagesDetails.autoReadTimer);
        homeMessagesDetails.autoReadTimer = null;
      }
    }

    function toggleFilter() {
      homeMessagesDetails.showOnlyUnread = !homeMessagesDetails.showOnlyUnread;
      // Clear selection when changing filter
      clearSelected();
      // Reload messages with new filter
      getAllMessages(1, false);
    }

    function selectMessage(message: any, event: any) {
      // Prevent selection when clicking on action buttons
      if (event.target.closest('.message-actions')) {
        return;
      }
      
      // Stop any existing auto-read timer when switching messages
      stopAutoReadTimer();
      
      // Toggle selection state
      message.selected = !message.selected;
      
      // Update selected messages array
      if (message.selected) {
        homeMessagesDetails.selectedMessages.push(message);
      } else {
        const index = homeMessagesDetails.selectedMessages.findIndex((m: any) => m['@id'] === message['@id']);
        if (index > -1) {
          homeMessagesDetails.selectedMessages.splice(index, 1);
        }
      }
      
      // Update all selected state
      homeMessagesDetails.allSelected = homeMessagesDetails.allMessages.length > 0 && 
        homeMessagesDetails.allMessages.every((m: any) => m.selected);
      
      // Set as selected message for detail view
      homeMessagesDetails.selectedMessage = message;
      
      // Start auto-read timer for the newly selected message
      startAutoReadTimer(message);
    }

    function toggleSelectAll() {
      // If some items are selected, deselect all
      if (homeMessagesDetails.selectedMessages.length > 0) {
        // Stop auto-read timer when deselecting all
        stopAutoReadTimer();
        homeMessagesDetails.allSelected = false;
        homeMessagesDetails.allMessages.forEach(message => {
          message.selected = false;
        });
        homeMessagesDetails.selectedMessages = [];
      } else {
        // If no items are selected, select all
        homeMessagesDetails.allSelected = true;
        homeMessagesDetails.allMessages.forEach(message => {
          message.selected = true;
        });
        homeMessagesDetails.selectedMessages = [...homeMessagesDetails.allMessages];
      }
    }

    async function deleteMessage(notification: any) {
      if (homeMessagesDetails.isDeletingMessage) return
      
      try {
        homeMessagesDetails.isDeletingMessage = true
        const response = await notificationsStore.deleteSingleNotification(notification['@id'].split('/').pop())
        if (response.success) {
          // Remove from local list
          const index = homeMessagesDetails.allMessages.findIndex(msg => msg['@id'] === notification['@id'])
          if (index > -1) {
            homeMessagesDetails.allMessages.splice(index, 1)
          }
          
          // Remove from selected if present
          const selectedIndex = homeMessagesDetails.selectedMessages.findIndex(msg => msg['@id'] === notification['@id'])
          if (selectedIndex > -1) {
            homeMessagesDetails.selectedMessages.splice(selectedIndex, 1)
          }
          
          // Clear selection if it was the selected message
          if (homeMessagesDetails.selectedMessage && homeMessagesDetails.selectedMessage['@id'] === notification['@id']) {
            homeMessagesDetails.selectedMessage = null
          }
          
          // If all displayed messages were deleted but total count is still > 0, reload page 1
          if (dataNotificationMessages.value.length === 0 && homeMessagesDetails.totalMessagesCount > 0) {
            await getAllMessages(1, false)
          }
        }
      } catch (error) {
        console.error('Error deleting message:', error)
      } finally {
        homeMessagesDetails.isDeletingMessage = false
      }
    }

    async function markAsRead(notification: any) {
      if (homeMessagesDetails.isMarkingAsRead) return
      
      try {
        homeMessagesDetails.isMarkingAsRead = true
        await notificationsStore.postNotificationsMarkAsRead({
          notificationId: notification['@id'].split('/').pop(),
          read: true,
          callbackSuccess: (response: any) => {
            notification.read = true
            // Notify navbar that this message was marked as read
            if (typeof notificationsStore.notifyMessageRead === 'function') {
              notificationsStore.notifyMessageRead(notification['@id']);
            }
          },
          callbackError: (error: any) => {
            console.error('Error marking as read:', error)
          }
        })
      } catch (error) {
        console.error('Error marking as read:', error)
      } finally {
        homeMessagesDetails.isMarkingAsRead = false
      }
    }

    async function markAsUnread(notification: any) {
      if (homeMessagesDetails.isMarkingAsRead) return
      
      try {
        homeMessagesDetails.isMarkingAsRead = true
        await notificationsStore.postNotificationsMarkAsRead({
          notificationId: notification['@id'].split('/').pop(),
          read: false,
          callbackSuccess: (response: any) => {
            notification.read = false
          },
          callbackError: (error: any) => {
            console.error('Error marking as unread:', error)
          }
        })
      } catch (error) {
        console.error('Error marking as unread:', error)
      } finally {
        homeMessagesDetails.isMarkingAsRead = false
      }
    }

    async function deleteSelectedMessages() {
      if (homeMessagesDetails.selectedMessages.length === 0 || homeMessagesDetails.isDeletingSelected) return
      
      try {
        homeMessagesDetails.isDeletingSelected = true
        const notificationUuids = homeMessagesDetails.selectedMessages.map(msg => msg['@id'].split('/').pop())
        const response = await notificationsStore.deleteMultipleNotifications(userId.value, notificationUuids)
        
        if (response.success) {
          // Remove deleted messages from local list
          const deletedIds = homeMessagesDetails.selectedMessages.map(msg => msg['@id'])
          homeMessagesDetails.allMessages = homeMessagesDetails.allMessages.filter(msg => !deletedIds.includes(msg['@id']))
          
          // Clear selection
          homeMessagesDetails.selectedMessages = []
          homeMessagesDetails.allSelected = false
          
          // Clear selected message if it was deleted
          if (homeMessagesDetails.selectedMessage && deletedIds.includes(homeMessagesDetails.selectedMessage['@id'])) {
            homeMessagesDetails.selectedMessage = null
          }
          
          // If all displayed messages were deleted but total count is still > 0, reload page 1
          if (dataNotificationMessages.value.length === 0 && homeMessagesDetails.totalMessagesCount > 0) {
            await getAllMessages(1, false)
          }
        }
      } catch (error) {
        console.error('Error deleting selected messages:', error)
      } finally {
        homeMessagesDetails.isDeletingSelected = false
      }
    }

    async function markSelectedAsRead() {
      if (homeMessagesDetails.selectedMessages.length === 0 || homeMessagesDetails.isMarkingSelectedAsRead) return
      
      try {
        homeMessagesDetails.isMarkingSelectedAsRead = true
        const notificationUuids = homeMessagesDetails.selectedMessages.map(msg => msg['@id'].split('/').pop())
        await notificationsStore.markMultipleNotificationsAsRead({
          userId: userId.value,
          notificationUuids,
          read: true,
          callbackSuccess: (response: any) => {
            // Mark all selected messages as read
            homeMessagesDetails.selectedMessages.forEach(msg => {
              msg.read = true
            })
            
            // Clear selection
            homeMessagesDetails.selectedMessages = []
            homeMessagesDetails.allSelected = false
          },
          callbackError: (error: any) => {
            console.error('Error marking selected as read:', error)
          }
        })
      } catch (error) {
        console.error('Error marking selected as read:', error)
      } finally {
        homeMessagesDetails.isMarkingSelectedAsRead = false
      }
    }

    async function markAllAsRead() {
      if (homeMessagesDetails.isMarkingAllAsRead) return
      
      try {
        homeMessagesDetails.isMarkingAllAsRead = true
        await notificationsStore.markAllNotificationsAsRead(userId.value)
          .then((response: any) => {
            if (response.success) {
              // Mark all messages as read
              homeMessagesDetails.allMessages.forEach(msg => {
                msg.read = true
              })
              
              // Clear selection
              homeMessagesDetails.selectedMessages = []
              homeMessagesDetails.allSelected = false
            }
          })
          .catch((error: any) => {
            console.error('Error marking all as read:', error)
          })
      } catch (error) {
        console.error('Error marking all as read:', error)
      } finally {
        homeMessagesDetails.isMarkingAllAsRead = false
      }
    }

    async function deleteAllMessages() {
      if (homeMessagesDetails.isDeletingAll) return
      
      try {
        homeMessagesDetails.isDeletingAll = true
        await notificationsStore.deleteAllNotifications(userId.value)
          .then((response: any) => {
            if (response.success) {
              // Clear all messages
              homeMessagesDetails.allMessages = []
              homeMessagesDetails.selectedMessages = []
              homeMessagesDetails.allSelected = false
              homeMessagesDetails.selectedMessage = null
              homeMessagesDetails.totalMessagesCount = 0
            }
          })
          .catch((error: any) => {
            console.error('Error deleting all messages:', error)
          })
      } catch (error) {
        console.error('Error deleting all messages:', error)
      } finally {
        homeMessagesDetails.isDeletingAll = false
      }
    }

    async function getAllMessages(page: number = 1, append: boolean = false) {
      try {
        if (!append) {
          homeMessagesDetails.isLoadingInitialMessages = true
        } else {
          homeMessagesDetails.isLoadingMoreMessages = true
        }

        const response = await notificationsStore.fetchAllMessages({
          userId: userId.value,
          page,
          itemsPerPage: NOTIFICATIONS_ITEMS_PER_PAGE,
          readFilter: homeMessagesDetails.showOnlyUnread ? false : undefined,
          spendFileVersionUuid: removeIRI(spendFileVersionActiveIri.value) // Add spend file version UUID
        })

        if (response.success) {
          const { 'hydra:member': messages, 'hydra:totalItems': totalItems } = response.data
          
          if (append) {
            homeMessagesDetails.allMessages.push(...messages)
          } else {
            homeMessagesDetails.allMessages = messages
          }
          
          homeMessagesDetails.totalMessagesCount = totalItems
          homeMessagesDetails.currentPage = page
          homeMessagesDetails.hasMoreMessages = messages.length === NOTIFICATIONS_ITEMS_PER_PAGE
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        homeMessagesDetails.isLoadingInitialMessages = false
        homeMessagesDetails.isLoadingMoreMessages = false
      }
    }

    function loadMoreMessages() {
      // Prevent multiple calls when already loading or no more messages
      if (homeMessagesDetails.isLoadingMoreMessages) {
        return;
      }
      
      if (!homeMessagesDetails.hasMoreMessages) {
        return;
      }
    
      getAllMessages(homeMessagesDetails.currentPage + 1, true);
    }

    // Throttle function to limit scroll event frequency
    let scrollThrottleTimer: number | null = null;
    
    function onMessagesScroll(event: any) {
      // Throttle scroll events to prevent excessive calls
      if (scrollThrottleTimer) {
        return;
      }
      
      scrollThrottleTimer = window.setTimeout(() => {
        scrollThrottleTimer = null;
      }, 50); // Throttle to 50ms for better responsiveness
      
      const target = event.target;
      const scrollTop = target.scrollTop;
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Load more messages when user is near the bottom
      // Only if there are more messages available and not currently loading
      if (distanceFromBottom < 200 && homeMessagesDetails.hasMoreMessages && !homeMessagesDetails.isLoadingMoreMessages) {
        loadMoreMessages();
      }
    }

    function getMessageClasses(notification: any) {
      return {
        selected: notification.selected,
        unread: !notification.read,
        read: notification.read,
        'detail-active': homeMessagesDetails.selectedMessage && homeMessagesDetails.selectedMessage['@id'] === notification['@id']
      };
    }

    function getDisplayContent(notification: any) {
      return getDisplayContentFromNotification(notification);
    }

    function getPreviewText(notification: any, maxLen: number = 100): string {
      return getPreviewTextFromContent(getDisplayContentFromNotification(notification), maxLen);
    }

    function getContentIsArray(notification: any): boolean {
      return isDisplayContentArray(getDisplayContentFromNotification(notification));
    }

    function getContentSegments(notification: any) {
      return contentToNormalizedSegments(getDisplayContentFromNotification(notification));
    }

    function getContentHasHighlightSpans(notification: any): boolean {
      const content = getDisplayContentFromNotification(notification);
      return typeof content === 'string' && contentHasHighlightSpansCheck(content);
    }

    function getSanitizedContentHtml(notification: any): string {
      const content = getDisplayContentFromNotification(notification);
      return typeof content === 'string' ? sanitizeMentionContent(content) : '';
    }

    function getContentSegmentsPreview(notification: any, maxLen: number = 50) {
      return segmentsTruncateToLength(
        contentToNormalizedSegments(getDisplayContentFromNotification(notification)),
        maxLen
      );
    }

    // Load all messages when component mounts
    onMounted(() => {
      getAllMessages(1, false);
    });

    // Cleanup timer when component unmounts
    onUnmounted(() => {
      stopAutoReadTimer();
    });

    // Watch unread messages count and sync with store
    watch(
      unreadMessagesCount,
      (newCount) => {
        if (typeof notificationsStore.setUnreadMessagesCount === 'function') {
          notificationsStore.setUnreadMessagesCount(newCount);
        }
      },
      { immediate: true }
    );

    return {
      ...toRefs(homeMessagesDetails),
      dataNotificationMessages,
      selectedMessages,
      allSelected,
      fontIcons,
      formatRelativeTime,
      getAllMessages,
      loadMoreMessages,
      onMessagesScroll,
      images,
      selectMessage,
      toggleSelectAll,
      toggleFilter,
      markAsRead,
      markAsUnread,
      markSelectedAsRead,
      deleteMessage,
      deleteSelectedMessages,
      getMessageClasses,
      getTextFromHtml,
      getDisplayContent,
      getPreviewText,
      getContentIsArray,
      getContentSegments,
      getContentSegmentsPreview,
      getContentHasHighlightSpans,
      getSanitizedContentHtml,
      markAllAsRead,
      deleteAllMessages,
    }
  }
}
</script>

<style lang='scss' scoped>
@import 'src/resources/assets/styles/variables/_colors.scss';

.email-manager-container {
  height: calc(100vh - 200px);
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.email-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    
    h4 {
      margin: 0;
      color: #2c3e50;
      font-weight: 600;
    }
    
    .message-count {
      color: #6c757d;
      font-size: 0.9rem;
      background: #fffbf0;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      border: 1px solid #adb5bd;
    }
    
    .selected-count {
      background-color: #ffdfe4;
      color: #ff2c4f;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-direction: row;
    flex-wrap: nowrap;
    
    .header-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-direction: row;
      flex-wrap: nowrap;
      
      .select-all {
        margin-right: 0;
        flex-shrink: 0;
        white-space: nowrap;
      }
      
      .select-all-badge {
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
        white-space: nowrap;
        
        &:hover:not(.disabled) {
          opacity: 0.8;
        }
        
        &.active {
          background-color: #28a745;
          border-color: #28a745;
          color: white;
        }
        
        &.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
      }
      
      .filter-badge {
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
        white-space: nowrap;
        
        &:hover:not(.disabled) {
          opacity: 0.8;
        }
        
        &.active {
          background-color: #ff2c4f;
          border-color: #ff2c4f;
          color: white;
        }
        
        &.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
      }
      
      .bulk-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }
    }
    
    .circular-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-left: 0.5rem;
      background-color: white;
      color: #6c757d;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      
      i.fa {
        font-size: 16px;
      }
      
      &:hover {
        transform: scale(1.1);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      &.mark-selected-btn {
        &:hover {
          box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
        }
      }
      
      &.delete-selected-btn {
        &:hover {
          box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
        }
      }
      
      &.mark-all-read-btn {
        &:hover {
          box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
        }
      }
      
      &.delete-all-btn {
        &:hover {
          box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
        }
      }
    }
  }
}

.email-content {
  display: flex;
  flex: 1;
    overflow: hidden;
}

.message-list-container {
  width: 40%;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.loading-container, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  
  .empty-icon {
    font-size: 4rem;
    color: #6c757d;
    opacity: 0.5;
    margin-bottom: 1rem;
  }
  
  .empty-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }
  
  .empty-subtitle {
    color: #6c757d;
    text-align: center;
  }
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  margin: 0;
  list-style: none;
  width: 100%;
  
  .loading-more {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 1rem;
    text-align: center !important;
    width: 100%;
    min-height: auto;
    margin: 0.5rem 0;
    
    .spinner-border {
      margin: 0 auto !important;
    }
    
    .text-muted {
      text-align: center !important;
      margin: 0 auto !important;
    }
  }
}

.message-item {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
    cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    background-color: #f8f9fa;
  }
  
  &.selected {
    background-color: #ffdfe4;
    border-left: 4px solid #ff2c4f;
    box-shadow: 0 2px 8px rgba(255, 44, 79, 0.15);
    
    .message-content {
      .message-title {
        color: #ff2c4f;
        font-weight: 600;
      }
    }
  }
  
  &.unread {
    background-color: #fffbf0;
    box-shadow: 0 2px 8px rgba(255, 193, 7, 0.15);
    
    .message-content {
      .message-title {
        font-weight: 600;
        color: #2c3e50;
      }
    }
  }
  
  &.read {
    background-color: #ffffff;
    
    .message-content {
      .message-title {
        color: #6c757d;
      }
      
      .message-preview {
        color: #6c757d;
      }
    }
  }

  &.detail-active {
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
    background-color: #f8f9fa;
    z-index: 1;
    position: relative;
  }
}

.message-checkbox {
  margin-right: 1rem;
  flex-shrink: 0;
}

.message-icon {
  margin-right: 1rem;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  
  .notes-icon {
    fill: #6c757d;
    scale: 1.2;
  }
  
  i.notes-icon {
    font-size: 1.25rem;
    color: #6c757d;
  }
  
  .icon-img {
    width: 24px;
    height: 24px;
  }
  
  .default-icon {
    color: #6c757d;
    font-size: 1.2rem;
  }
}

.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    
    .message-title {
      flex: 1;
      font-weight: 500;
      color: #2c3e50;
      margin: 0;
      line-height: 1.4;
    }
    
    .message-time {
      color: #6c757d;
      font-size: 0.85rem;
      white-space: nowrap;
    }
  }
  
  .message-body {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    
    .message-preview {
      flex: 1;
      color: #495057;
      font-size: 0.9rem;
      line-height: 1.5;
      margin: 0;
      min-width: 0;
      word-break: break-word;

      .mention-chip,
      :deep(.highlight-mention) {
        color: $color-violet-700;
        font-weight: 600;
        background-color: $color-violet-100;
        padding: 2px 6px;
        border-radius: 999px;
      }
    }
    
    .message-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-shrink: 0;
      
      .action-btn {
        background: none;
        border: none;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.85rem;
        
        &:hover {
          background-color: #e9ecef;
        }
        
        &.read-btn {
          color: #28a745;
          
          &:hover {
            background-color: #d4edda;
          }
        }
        
        &.unread-btn {
          color: #007bff;
          
          &:hover {
            background-color: #e3f2fd;
          }
        }
        
        &.delete-btn {
          color: #dc3545;
          
          &:hover {
            background-color: #f8d7da;
          }
          
          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }
  
  .message-meta {
    display: flex;
    align-items: center;
    font-size: 0.8rem;
    color: #6c757d;
    
    .message-author {
      color: #6c757d;
      font-size: 0.85rem;
    }
  }
}

.message-detail-container {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    
    .detail-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2c3e50;
      flex: 1;
      margin-right: 1rem;
    }
    
    .detail-time {
      font-size: 0.9rem;
      color: #6c757d;
      flex-shrink: 0;
    }
  }
  
  .detail-icon {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8f9fa;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    
    .notes-icon {
      fill: #6c757d;
      scale: 1.5;
    }
    
    .icon-img {
      width: 32px;
      height: 32px;
    }
    
    .default-icon {
      color: #6c757d;
      font-size: 1.8rem;
    }
  }
  
  .detail-content {
    .detail-meta {
      display: flex;
      gap: 2rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e9ecef;
      
      .detail-author, .detail-date {
        display: flex;
        align-items: center;
        color: #6c757d;
        font-size: 0.9rem;
      }
    }
    
    .detail-message {
      line-height: 1.6;
      color: #2c3e50;
      font-size: 1rem;
      word-break: break-word;

      .mention-chip,
      :deep(.highlight-mention) {
        color: $color-violet-700;
        font-weight: 600;
        background-color: $color-violet-100;
        padding: 2px 6px;
        border-radius: 999px;
      }
    }
}

  .detail-actions {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #e9ecef;
  }
}

.no-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .no-selection-content {
    text-align: center;
    color: #6c757d;
    
    i {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }
    
    h5 {
      margin-bottom: 0.5rem;
      color: #2c3e50;
    }
    
    p {
      margin: 0;
      font-size: 0.9rem;
    }
  }
}

// Checkbox styles
.checkbox-container {
  display: block;
  position: relative;
  padding-left: 25px;
  cursor: pointer;
  font-size: 14px;
  user-select: none;
  
  input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }
  
  .checkmark {
    position: absolute;
    top: 0;
    left: 0;
    height: 18px;
    width: 18px;
    background-color: #fff;
    border: 2px solid #ddd;
    border-radius: 3px;
    transition: all 0.2s ease;
  }
  
  &:hover input ~ .checkmark {
    background-color: #f0f0f0;
  }
  
  input:checked ~ .checkmark {
    background-color: #2196f3;
    border-color: #2196f3;
  }
  
  .checkmark:after {
    content: "";
    position: absolute;
    display: none;
  }
  
  input:checked ~ .checkmark:after {
    display: block;
  }
  
  .checkmark:after {
    left: 5px;
    top: 2px;
    width: 4px;
    height: 8px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
}

// Responsive design
@media (max-width: 768px) {
  .email-content {
    flex-direction: column;
  }
  
  .message-list-container {
    width: 100%;
    height: 50%;
  }
  
  .message-detail-container {
    height: 50%;
  }
}

:deep(.highlight-mention) {
    color: #6927da;
    font-weight: 600;
    background-color: #ece9fe;
    padding: 2px 2px;
    border-radius: 999px;
}



</style>