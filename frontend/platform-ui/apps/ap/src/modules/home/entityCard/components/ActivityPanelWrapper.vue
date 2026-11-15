<template>
<div class="activity-panel-wrapper">
  <div class="wrapper-tabs">
    <button v-if="showIaBot" type="button" class="wrapper-tab" :class="{ active: selectedTab === 'activity' }" @click="selectedTab = 'activity'">Activity</button>
    <button v-if="showIaBot" type="button" class="wrapper-tab" :class="{ active: selectedTab === 'iaNegotiation' }" @click="selectedTab = 'iaNegotiation'">Assistant</button>
    <button type="button" class="wrapper-close-btn" title="Close" @click="$emit('close')">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
  <div class="wrapper-tab-content">
    <KeepAlive>
      <ActivityPanel
        v-if="selectedTab === 'activity'"
        :entityName="entityName"
        :entityLevel="entityLevel"
        :activities="activities"
        :mentionableUsers="mentionableUsers"
        :hasMore="hasMore"
        :loadingMore="loadingMore"
        :unreadCount="unreadCount"
        :totalItems="totalItems"
        @refresh="$emit('refresh')"
        @load-more="$emit('load-more')"
        @submit-comment="$emit('submit-comment', $event)"
      ></ActivityPanel>
      <IaNegotiation
        v-else
        :tenant-id="tenantId" :spendfile-version="spendfileVersion" :entity-id="entityId" :entity-name="entityName" :entity-level="entityLevel"
      />
    </KeepAlive>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watch } from 'vue';
import ActivityPanel from './ActivityPanel.vue';
import IaNegotiation from './IaNegotiation.vue';
import type { ActivitySource } from './ActivityNoteBubble.vue';
import type { LogActivity } from './ActivityLogBubble.vue';
type ActivityItem = ActivitySource | LogActivity;

interface MentionableUsers {
  email: string;
  firstName: string;
  id: number;
  lastName: string;
  uuid: string;
}

export default defineComponent({
  name: 'ActivityPanelWrapper',
  components: { ActivityPanel, IaNegotiation },
  props: {
    activities: {
      type: Array as PropType<ActivityItem[]>,
      default: () => []
    },
    entityId: {
      type: String as PropType<string | null>,
      default: null
    },
    entityName: {
      type: String as PropType<string | null>,
      default: null
    },
    entityLevel: {
      type: String as PropType<'supplier' | 'parent' | 'potential-supplier' | 'potential-parent' | null>,
      default: null
    },
    mentionableUsers: {
      type: Array as PropType<MentionableUsers[]>,
      default: () => []
    },
    hasMore: {
      type: Boolean,
      default: false
    },
    loadingMore: {
      type: Boolean,
      default: false
    },
    unreadCount: {
      type: Number,
      default: 0
    },
    totalItems: {
      type: Number,
      default: 0
    },
    activeTab: {
      type: String as PropType<'activity' | 'iaNegotiation'>,
      default: 'activity'
    },
    spendfileVersion: {
      type: String as PropType<string | null>,
      default: null
    },
    tenantId: {
      type: String as PropType<string | null>,
      default: null
    },
    showIaBot: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'refresh', 'load-more', 'submit-comment'],
  setup(props) {
    const selectedTab = ref<'activity' | 'iaNegotiation'>(props.activeTab);
    
    watch(() => props.activeTab, (value) => {
      selectedTab.value = value;
    });

    return { selectedTab };
  }
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/_colors";

.activity-panel-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.wrapper-tabs {
  display: flex;
  border-bottom: 1px solid $color-gray-200;
  background-color: #ffffff;
  justify-content: end;
}

.wrapper-tab {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background-color: transparent;
  font-size: 14px;
  font-weight: 600;
  color: $color-gray-500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;

  &:hover {
    color: $color-gray-700;
  }

  &.active {
    color: $color-primary-600;
    border-bottom-color: $color-primary-500;
  }
}

.wrapper-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 4px 4px 4px 0;
  border: none;
  background-color: transparent;
  border-radius: 6px;
  color: $color-gray-500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: $color-gray-100;
    color: $color-gray-700;
  }
}

.wrapper-tab-content {
  flex: 1;
  overflow: hidden;
}
</style>
