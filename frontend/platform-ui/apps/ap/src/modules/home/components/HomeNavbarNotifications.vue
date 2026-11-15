<template>
<div v-if="!disableElementPilotIsExpired" class="menu__item dropdown mr-3">
  <button id="user-messages-alerts" class="icons-topbar btn btn-simple btn-simple--icon link link--icon dropdown-toggle navbar-tooltip" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" :class="[existMessagesPendingToRead ? 'has-message' : 'has-message-white']" :disabled="disabled" @click="$emit('notifications-dropdown-click')"><span v-if="totalUnreadNotifications === 0" class="navbar-tooltiptext" style="margin-right: 50px; margin-top: 45px">{{ $t('home.components.navbar.messages.tooltip') }}</span><span v-if="totalUnreadNotifications > 0" class="navbar-tooltiptext" style="margin-right: 50px; margin-top: 45px">{{ totalUnreadNotifications }} {{ $t('home.components.navbar.messages.title') }}</span>
    <div class="notification-icon-container">
      <NotificationIcon id="notification-icon" class="navBarIcon"></NotificationIcon>
      <div v-if="totalUnreadNotifications > 0" class="notification-badge"></div>
    </div>
  </button>
  <div class="dropdown-header-menu__messages dropdown-menu" aria-labelledby="user-messages-alerts" style="width: 420px !important; min-width: 420px !important; max-width: 420px !important; position: absolute !important;">
    <!-- Header with gradient background-->
    <div class="notification-header px-4 py-3">
      <div class="d-flex align-items-center justify-content-between w-100">
        <div class="d-flex align-items-center">
          <div class="notification-info">
            <div v-if="totalUnreadNotifications === 0" class="h6 mb-0 text-dark">{{ $t('home.components.navbar.messages.noTitle') }}</div>
            <div v-if="totalUnreadNotifications > 0" class="text-muted small">{{ totalUnreadNotifications }} {{ $t('home.components.navbar.messages.unreadNotifications') }}</div>
          </div>
        </div>
        <div class="d-flex align-items-center">
          <div v-if="totalUnreadNotifications > 0" class="d-flex align-items-center">
            <div v-if="isMarkingAllAsRead" class="d-flex align-items-center">
              <output class="spinner-border spinner-border-sm" aria-hidden="true" style="color: #6c757d;"></output>
            </div>
            <button v-else class="mark-all-read-btn" :title="$t('home.homeMessagesDetails.markAllAsRead')" :disabled="isMarkingAllAsRead" @click.stop="$emit('mark-all-as-read')"><i class="fa-solid fa-envelope text-base"></i></button>
          </div>
          <button class="refresh-btn" :disabled="isLoadingInitialNotifications" :title="$t('home.components.navbar.messages.refreshNotifications')" @click.stop="$emit('refresh')"><i class="fa-solid fa-arrows-rotate text-base"></i></button>
        </div>
      </div>
    </div>
    <!-- Notifications container-->
    <div class="notifications-container" style="max-height: 450px; overflow-y: auto;" @scroll="$emit('notifications-scroll', $event)">
      <!-- Loading initial state-->
      <div v-if="isLoadingInitialNotifications" class="text-center py-4">
        <output class="spinner-border" aria-hidden="true" style="color: #6c757d;"></output>
        <div class="text-muted mt-2">{{ $t('home.components.navbar.messages.loadingNotifications') }}</div>
      </div>
      <!-- Empty state-->
      <div v-else-if="!isLoadingInitialNotifications && unreadNotifications.length === 0" class="text-center py-5">
        <div class="empty-state"><i class="fa-solid fa-inbox text-muted" style="font-size: 3rem; opacity: 0.5;"></i>
          <div class="text-muted mt-3">{{ $t('home.components.navbar.messages.noUnreadNotifications') }}</div>
          <div class="text-muted small">{{ $t('home.components.navbar.messages.allNotificationsRead') }}</div>
        </div>
      </div>
      <!-- Notifications list-->
      <div v-else>
        <div v-for="notification in unreadNotifications" :key="notification['@id']" class="notification-item notification-item" :data-notification-id="notification['@id']" :class="{ 'notification-loading': notificationClickedId === notification['@id'] }">
          <div class="notification-content p-3">
            <div class="d-flex align-items-start">
              <!-- Content-->
              <div class="notification-content flex-grow-1" style="min-width: 0;">
                <div class="notification-title mb-1 d-flex align-items-center" :title="notification.originType === 'note' ? getNotificationPreviewText(notification) : notification.title"><i v-if="notification.originType === 'note'" class="fa-regular fa-note-sticky text-muted text-base mr-2" title="Note"></i><span>{{ notification.originType === 'note' ? notification.humanDate : notification.title }}</span></div>
                <div class="notification-message mb-2 bubble-inline" :class="{ 'bubble-inline--html': getNotificationContentHasHighlightSpans(notification) && !getNotificationContentIsArray(notification) }"><span v-if="getNotificationContentHasHighlightSpans(notification) && !getNotificationContentIsArray(notification)">{{ getNotificationPreviewText(notification, 50) }}</span>
                  <template v-else>
                    <template v-for="(seg, i) in getNotificationContentSegmentsPreview(notification, 50)" :key="i"><span v-if="seg.type === 'text'">{{ seg.value }}</span><span v-else class="mention-chip">{{ seg.value }}</span></template>
                  </template>
                </div>
                <div class="notification-meta d-flex justify-content-between align-items-center w-100">
                  <div class="notification-info">
                    <div class="notification-author me-3"><span v-if="notification.originType === 'note'">{{ notification.createdBy && notification.createdBy.firstName && notification.createdBy.lastName ? notification.createdBy.firstName + " " + notification.createdBy.lastName : '' }}</span></div>
                    <div class="notification-time"><span v-if="notification.originType === 'note'"></span><span v-else>{{ formatRelativeTime(notification.created) }}</span></div>
                  </div>
                  <div class="notification-actions">
                    <button class="action-btn read-btn" :title="$t('home.homeMessagesDetails.markAsRead')" :disabled="isMarkingAsRead" @click.stop="$emit('mark-as-read', notification)"><i class="fa-solid fa-envelope text-base"></i></button>
                    <button class="action-btn delete-btn" :title="$t('home.homeMessagesDetails.delete')" :disabled="isDeletingMessage" @click.stop="$emit('delete', notification)"><i class="fa-solid fa-trash-can text-sm"></i></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Loading more state-->
        <div v-if="isLoadingMoreNotifications" class="text-center py-3">
          <output class="spinner-border spinner-border-sm" aria-hidden="true" style="color: #6c757d;"></output>
          <div class="text-muted small mt-2">{{ $t('home.components.navbar.messages.loadingMoreNotifications') }}</div>
        </div>
      </div>
    </div>
    <!-- Footer-->
    <div class="notification-footer px-4 pt-3">
      <div class="d-flex justify-content-center">
        <button class="px-2 border bg-white rounded view-all-btn" @click="Routing.home.openHomeAllMessages()"><span>{{ $t('home.components.navbar.messages.viewAllMessages') }}</span></button>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import * as Routing from "@/services/router/Routing";
import { formatRelativeTime } from "@/utils/TimeUtils";
import NotificationIcon from "@/resources/assets/images/icons/iconNotification.vue";

/**
 * Notifications dropdown panel extracted from HomeNavbar.vue (US-2, Sprint
 * 116 refactor) — presentational: all notification state/logic still
 * lives in useUnreadNotifications, owned by HomeNavbar.vue, and reaches
 * this component as props; user actions go back out as emits to the same
 * handlers HomeNavbar.vue always called directly.
 */
export default defineComponent({
  name: "HomeNavbarNotifications",
  components: { NotificationIcon },
  props: {
    disableElementPilotIsExpired: { type: Boolean, required: true },
    disabled: { type: Boolean, default: false },
    existMessagesPendingToRead: { type: Boolean, required: true },
    totalUnreadNotifications: { type: Number, required: true },
    isMarkingAllAsRead: { type: Boolean, required: true },
    isLoadingInitialNotifications: { type: Boolean, required: true },
    isLoadingMoreNotifications: { type: Boolean, required: true },
    unreadNotifications: { type: Array as PropType<any[]>, required: true },
    notificationClickedId: { type: String, required: true },
    isMarkingAsRead: { type: Boolean, required: true },
    isDeletingMessage: { type: Boolean, required: true },
    getNotificationPreviewText: { type: Function as PropType<(n: any, maxLen?: number) => string>, required: true },
    getNotificationContentHasHighlightSpans: { type: Function as PropType<(n: any) => boolean>, required: true },
    getNotificationContentIsArray: { type: Function as PropType<(n: any) => boolean>, required: true },
    getNotificationContentSegmentsPreview: { type: Function as PropType<(n: any, maxLen?: number) => any[]>, required: true },
  },
  // Typed so each event's payload contract is checked, not just its name —
  // e.g. mark-as-read/delete forward the raw notification object, and Vue
  // would otherwise silently pass the DOM event as a second positional
  // argument if a caller ever binds these with parentheses.
  emits: {
    "notifications-dropdown-click": () => true,
    "mark-all-as-read": () => true,
    "refresh": () => true,
    "notifications-scroll": (event: Event) => true,
    "mark-as-read": (notification: any) => true,
    "delete": (notification: any) => true,
  },
  setup() {
    return { Routing, formatRelativeTime };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";

// Hover tooltip for the icon button. Scoped styles don't cross component
// boundaries, so this must be duplicated here (and in NavbarUserMenu.vue) —
// see docs/context/change-homenavbar-refactor.md.
.navbar-tooltip {
  display: flex;
  justify-content: center;
  align-items: center;
  color: $color-white !important;
}

.navbar-tooltip .navbar-tooltiptext {
  visibility: hidden;
  width: auto;
  height: auto;
  background-color: $color-black;
  color: $color-white !important;
  font-size: 0.8em;
  text-align: center;
  padding: 5px 10px;
  border-radius: 4px;
  margin-top: 0;
  position: absolute;
  z-index: 1;
}

.navbar-tooltip:hover .navbar-tooltiptext {
  visibility: visible;
  color: white !important;
}

// Estilos para el badge de notificaciones
.notification-icon-container {
  position: relative;
  display: inline-block;
}

.notification-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background-color: #dc3545;
  border-radius: 50%;
  width: 10px;
  height: 10px;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

// Estilos para el título de notificaciones con ellipsis
.notification-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  width: 100%;
  cursor: help;
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.95rem;
  line-height: 1.3;
  display: block;
}

// Estilos para el dropdown de notificaciones - Diseño elegante
.dropdown-header-menu__messages {
  position: absolute !important;
  z-index: 9999 !important;
  width: 420px !important;
  min-width: 420px !important;
  max-width: 420px !important;
  overflow: hidden !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
  border-radius: 16px !important;
  border: none !important;
  background: white !important;
  transform-origin: top right !important;
  backdrop-filter: blur(10px) !important;
}

// Header con fondo gris y línea separadora
.notification-header {
  background: #f8f9fa !important;
  border-radius: 16px 16px 0 0 !important;
  position: relative !important;
  border-bottom: 1px solid #e9ecef !important;

  .refresh-btn {
    width: 28px !important;
    height: 28px !important;
    border-radius: 50% !important;
    border: none !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    background-color: white !important;
    color: #6c757d !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;

    i.fa {
      font-size: 12px !important;
    }

    &:hover {
      background-color: #007bff !important;
      color: white !important;
      transform: scale(1.1) !important;
      box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3) !important;
    }

    &:disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
      transform: none !important;
    }

    &:disabled i.fa {
      animation: spin 1s linear infinite !important;
    }
  }

  .mark-all-read-btn {
    width: 28px !important;
    height: 28px !important;
    border-radius: 50% !important;
    border: none !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    background-color: white !important;
    color: #6c757d !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
    margin-right: 0.25rem !important;

    i.fa {
      font-size: 12px !important;
    }

    &:hover {
      background-color: #28a745 !important;
      color: white !important;
      transform: scale(1.1) !important;
      box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3) !important;
    }

    &:disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
      transform: none !important;
    }

    &:disabled i.fa {
      animation: spin 1s linear infinite !important;
    }
  }
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

// Container de notificaciones
.notifications-container {
  max-height: 450px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  width: 100% !important;
  background: #f8f9fa;
}

// Estados vacíos y de carga
.empty-state {
  padding: 2rem;
}

// Items de notificación
.notification-item {
  background: white;
  margin: 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  border: 1px solid #f0f0f0;
  overflow: hidden;

  // Animation for fade-out effect
  &.notification-fade-out {
    opacity: 0;
    transform: translateX(-120%) scale(0.7) rotate(-5deg);
    max-height: 0;
    padding: 0;
    margin: 0;
    border: none;
    box-shadow: none;
    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  // Loading state when marking as read
  &.notification-loading {
    opacity: 0.7;
    pointer-events: none;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      margin: -10px 0 0 -10px;
      border: 2px solid #6c757d;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  // Entry animation for new notifications
  &:nth-child(1) {
    animation: slideInFromTop 0.5s ease-out;
  }

  &:nth-child(2) {
    animation: slideInFromTop 0.5s ease-out 0.1s both;
  }

  &:nth-child(3) {
    animation: slideInFromTop 0.5s ease-out 0.2s both;
  }

  &:nth-child(4) {
    animation: slideInFromTop 0.5s ease-out 0.3s both;
  }

  &:nth-child(5) {
    animation: slideInFromTop 0.5s ease-out 0.4s both;
  }
}

.notification-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  border-color: #e0e0e0;
}

.notification-content {
  position: relative;
}

.notification-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;

  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: #f8f9fa;
    color: #6c757d;

    &:hover {
      transform: scale(1.1);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    &.read-btn {
      &:hover {
        background-color: #28a745;
        color: white;
        box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
      }
    }

    &.delete-btn {
      &:hover {
        background-color: #dc3545;
        color: white;
        box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
      }
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes slideInFromTop {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.notification-message {
  color: #6c757d;
  font-size: 0.85rem;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;

  div {
    word-wrap: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
  }

  .mention-chip,
  :deep(.highlight-mention) {
    color: $color-violet-700;
    font-weight: 600;
    background-color: $color-violet-100;
    padding: 2px 6px;
    border-radius: 999px;
  }
}

.notification-meta {
  font-size: 0.75rem;
  color: #adb5bd;
}

.notification-author, .notification-time {
  display: flex;
  align-items: center;
}

// Footer
.notification-footer {
  background: white;
  border-top: 1px solid #e9ecef;
  border-radius: 0 0 16px 16px;
}

// Botón "View all" hover effect
.view-all-btn {
  transition: all 0.2s ease;
}

.view-all-btn:hover {
  background-color: #f8f9fa !important;
  border-color: #dc3545 !important;
  color: #dc3545 !important;
}

// Botón "Mark all as read" hover effect
.notification-header button:hover {
  background-color: #dc3545 !important;
  border-color: #dc3545 !important;
  color: white !important;
  transition: all 0.2s ease;
}

// Scrollbar personalizado
.notifications-container::-webkit-scrollbar {
  width: 6px;
}

.notifications-container::-webkit-scrollbar-track {
  background: transparent;
}

.notifications-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.notifications-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

// Responsive
@media (max-width: 480px) {
  .dropdown-header-menu__messages {
    width: 95vw !important;
    min-width: 95vw !important;
    max-width: 95vw !important;
    left: 2.5vw !important;
  }
}
</style>
