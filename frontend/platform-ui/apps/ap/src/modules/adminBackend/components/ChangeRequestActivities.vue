<template>
<div class="activities-section">
  <div class="activities-header">
    <h3 class="activities-title">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
      </svg>{{ $t('adminBackend.dataChange.activities.title') || 'Activities' }}<span class="activities-count" v-if="activities.length > 0">({{ activities.length }})</span>
    </h3>
  </div>
  <button class="activities-collapse-btn" v-if="!collapsed" @click="$emit('toggle-collapse')" :title="$t('adminBackend.dataChange.activities.collapse') || 'Collapse Activities'">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 6L6 18M6 6l12 12"></path>
    </svg>
  </button>
  <div class="activities-list" v-if="activities.length > 0">
    <ul class="activities-bullet-list">
      <li class="activity-item" v-for="activity in activities" :key="activity.id">
        <div class="activity-text"><span class="activity-type">{{ getActivityTypeLabel(activity.activityType) }}</span>
          <template v-if="activity.createdBy || activity.created"><span class="activity-separator">&nbsp;•&nbsp;</span><span class="activity-user" v-if="activity.createdBy" :title="activity.createdBy.email || ''">{{ getFullName(activity.createdBy) }}</span>
            <template v-if="activity.createdBy && activity.created"><span class="activity-separator">&nbsp;•&nbsp;</span></template><span class="activity-date" v-if="activity.created">{{ formatActivityDate(activity.created) }}</span>
          </template>
        </div>
        <div class="activity-message" v-if="activity.message">{{ activity.message }}</div>
        <div class="activity-metadata" v-if="activity.metadata && activity.activityType === 'status_changed'"><span class="status-change">{{ activity.metadata.old_status }} → {{ activity.metadata.new_status }}</span></div>
      </li>
    </ul>
  </div>
  <div class="activities-empty" v-else>
    <div class="empty-text">{{ $t('adminBackend.dataChange.activities.empty') || 'No activities yet' }}</div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { ChangeRequestActivity } from '@/composables/useChangeRequests'

export default defineComponent({
  name: 'ChangeRequestActivities',
  props: {
    activities: {
      type: Array as PropType<ChangeRequestActivity[]>,
      required: true,
      default: () => []
    },
    collapsed: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle-collapse'],
  methods: {
    getActivityTypeLabel(activityType: string): string {
      const labels: Record<string, string> = {
        'created': this.$t('adminBackend.dataChange.activities.created') || 'Request created',
        'status_changed': this.$t('adminBackend.dataChange.activities.statusChanged') || 'Status changed',
        'comment': this.$t('adminBackend.dataChange.activities.comment') || 'Comment',
        'information_requested': this.$t('adminBackend.dataChange.activities.informationRequested') || 'Information Requested'
      }
      return labels[activityType] || activityType
    },
    
    formatActivityDate(dateString: string): string {
      if (!dateString) return ''
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
      if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    getFullName(user: { firstName: string; lastName: string } | null | undefined): string {
      if (!user) return ''
      return `${user.firstName} ${user.lastName}`.trim()
    }
  }
})
</script>

<style lang="scss" scoped>
.activities-section {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  flex: 1;
  min-height: 0;
  position: relative;
  
  .activities-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #eaecf0;
    flex-shrink: 0;
    
    .activities-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 16px;
      font-weight: 600;
      color: #1d2939;
      margin: 0;
      flex: 1;
      
      .icon {
        width: 20px;
        height: 20px;
        color: #667085;
      }
      
      .activities-count {
        font-weight: 500;
        color: #667085;
      }
    }
  }
  
  .activities-collapse-btn {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    color: #667085;
    cursor: pointer;
    transition: opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    flex-shrink: 0;
    z-index: 10;
    will-change: transform;
    transform: translateZ(0);
    
    svg {
      width: 16px;
      height: 16px;
    }
    
    &:hover {
      background: #f9fafb;
      color: #3b82f6;
      border-color: #3b82f6;
    }
    
    &:active {
      transform: translateZ(0) scale(0.95);
    }
  }
  
  .activities-list {
    max-height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 0.5rem;
    flex-shrink: 0;
    
    // Custom scrollbar
    &::-webkit-scrollbar {
      width: 4px;
    }
    
    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 2px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 2px;
      
      &:hover {
        background: #a8a8a8;
      }
    }
    
    .activities-bullet-list {
      list-style: none;
      padding: 0;
      margin: 0;
      
      .activity-item {
        margin-bottom: 0.75rem;
        padding-left: 0;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .activity-text {
          color: #1d2939;
          line-height: 1.5;
          
          .activity-type {
            font-weight: 500;
          }
          
          .activity-separator {
            color: #9ca3af;
          }
          
          .activity-user {
            color: #667085;
          }
          
          .activity-date {
            color: #667085;
          }
        }
        
        .activity-message {
          color: #475467;
          line-height: 1.5;
          margin-top: 0.25rem;
          padding-left: 1rem;
          white-space: pre-wrap;
          word-break: break-word;
        }
        
        .activity-metadata {
          color: #667085;
          margin-top: 0.25rem;
          padding-left: 1rem;
          
          .status-change {
            .status-old {
              text-transform: capitalize;
            }
            
            .status-new {
              text-transform: capitalize;
            }
          }
        }
      }
    }
  }
  
  .activities-empty {
    text-align: center;
    padding: 1.5rem 1rem;
    color: #9ca3af;
    
    .empty-text {
      color: #9ca3af;
    }
  }
}
</style>
