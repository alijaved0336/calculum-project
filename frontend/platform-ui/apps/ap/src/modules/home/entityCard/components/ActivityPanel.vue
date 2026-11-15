<template>
<div class="activity-panel-container" :class="{ 'collapsed': isCollapsed }">
  <div class="activity-header">
    <div class="header-left" v-if="standalone"><span class="activity-title">Activity</span></div>
    <div class="header-actions">
      <div class="filter-wrapper" v-if="activityFilters.length > 1">
        <button class="header-btn" @click="toggleFilterMenu" :class="{ 'active': isFilterMenuOpen || hasActiveFilters }" title="Filter activities">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
        </button>
        <div class="filter-dropdown" v-if="isFilterMenuOpen" @click.stop>
          <div class="filter-header"><span class="filter-title">Activities</span>
            <button class="unselect-btn" @click.stop="toggleAllFilters">{{ areAllFiltersActive ? 'Unselect All' : 'Select All' }}</button>
          </div>
          <div class="filter-list">
            <div class="filter-item cursor-pointer" v-for="filter in activityFilters" :key="filter.id" @click.stop="toggleFilter(filter.id)">
              <div class="filter-icon">
                <component :is="filter.icon"></component>
              </div><span class="filter-label">{{ filter.label }}</span>
              <div class="filter-check cursor-pointer" :class="{ 'checked': filter.active }">
                <svg v-if="filter.active" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div><span class="total-items text-sm text-gray-500" v-if="totalItems > 0">{{  filteredActivities.length ?? 0 }} of {{ totalItems ?? 0 }} activities</span>
      <button class="header-btn" @click="$emit('refresh')" title="Refresh">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 2v6h-6"></path>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
          <path d="M3 22v-6h6"></path>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
        </svg>
      </button>
    </div>
  </div>
  <div class="activity-list" v-show="!isCollapsed" ref="activityListRef" @scroll="onActivityListScroll">
    <div class="activity-empty" v-if="filteredActivities.length === 0">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
      </div><span class="empty-text">No recent activity</span>
    </div>
    <template v-for="(activity, index) in filteredActivities" :key="activity['@id'] ?? activity.uuid ?? index">
      <ActivityNoteBubble v-if="activity.sourceType === 'note'" :activity="asNoteActivity(activity)" :mentionableUsers="mentionableUsers" @update-note="$emit('refresh')" @remove-note="$emit('refresh')"></ActivityNoteBubble>
      <ActivityLogBubble v-else :activity="asLogActivity(activity)" :entityLevel="entityLevel"></ActivityLogBubble>
    </template>
    <div class="load-more-sentinel" ref="loadMoreSentinelRef" v-if="hasMore && filteredActivities.length > 0"></div>
    <div class="load-more-loading" v-if="loadingMore"><span class="spinner-border spinner-border-sm"></span></div>
  </div>
  <div class="activity-input-area">
    <div class="input-wrapper">
      <div class="input-avatar">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <div class="comment-input-wrapper" relative="relative">
        <div class="comment-input" ref="commentInputRef" contenteditable="true" :data-placeholder="inputPlaceholder" :class="{ 'is-empty': !commentPlainText.trim() }" role="textbox" aria-multiline="true" @input="onCommentInput" @keydown="onCommentKeydown" @mousedown="onCommentMousedown" @paste="onCommentPaste" @focus="inputFocused = true" @blur="onCommentBlur"></div>
        <div class="mention-dropdown" v-if="showMentionDropdown" ref="mentionDropdownRef" @mousedown.prevent>
          <div class="mention-dropdown-item" v-for="(user, idx) in filteredMentionableUsers" :key="user.uuid" :class="{ 'selected': idx === selectedMentionIndex }" @mousedown.prevent="selectMention(user)"><span class="mention-name">{{ user.firstName }} {{ user.lastName }}</span><span class="mention-email" v-if="user.email">{{ user.email }}</span></div>
          <div class="mention-dropdown-empty" v-if="filteredMentionableUsers.length === 0"><span>No users found</span></div>
        </div>
      </div>
    </div>
  </div>
  <div class="input-actions">
    <button class="action-btn" title="Mencionar" @click="openMentionPicker">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"></path>
      </svg>
    </button>
    <button class="send-btn" :disabled="!commentPlainText.trim()" @click="submitComment" title="Send">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    </button>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType, onMounted, onUnmounted, onBeforeUnmount, watch, h, nextTick } from 'vue';
import ActivityNoteBubble from './ActivityNoteBubble.vue';
import ActivityLogBubble from './ActivityLogBubble.vue';
import type { ActivitySource } from './ActivityNoteBubble.vue';
import type { LogActivity } from './ActivityLogBubble.vue';
import { useI18n } from "vue-i18n";
import StringUtils from '@/utils/StringUtils';
import {
  getCaretCharacterOffsetWithin,
  createRangeBetweenOffsets,
  setCaretToOffset,
  setCaretAfterNode,
  placeCaretAfter
} from '@/utils/ContentEditableUtils';

/** Union so the panel only branches by sourceType and passes through to the right child */
type ActivityItem = ActivitySource | LogActivity;

function asLogActivity(a: ActivityItem): LogActivity {
  return a as LogActivity;
}

interface ActivityFilter {
  id: string;
  label: string;
  types: string[];
  active: boolean;
  icon: any;
}

interface MentionableUsers {
  email: string;
  firstName: string;
  id: number;
  lastName: string;
  uuid: string;
}


// Icon components for filters
const IconPerson = { render: () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }), h('circle', { cx: '12', cy: '7', r: '4' })]) };
const IconComment = { render: () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })]) };
const IconStatus = { render: () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), h('polyline', { points: '22 4 12 14.01 9 11.01' })]) };
const IconChange = { render: () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }), h('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })]) };
const IconCreated = { render: () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('circle', { cx: '12', cy: '12', r: '10' }), h('line', { x1: '12', y1: '8', x2: '12', y2: '16' }), h('line', { x1: '8', y1: '12', x2: '16', y2: '12' })]) };
const IconAssigned = { render: () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }), h('circle', { cx: '8.5', cy: '7', r: '4' }), h('line', { x1: '20', y1: '8', x2: '20', y2: '14' }), h('line', { x1: '23', y1: '11', x2: '17', y2: '11' })]) };

export default defineComponent({
  name: 'ActivityPanel',
  components: { ActivityNoteBubble, ActivityLogBubble },

  props: {
    activities: {
      type: Array as PropType<ActivityItem[]>,
      default: () => []
    },
    entityName: {
      type: String,
      default: ''
    },
    standalone: {
      type: Boolean,
      default: true
    },
    entityLevel: {
      type: String as PropType<'supplier' | 'parent' | 'potential-supplier' | 'potential-parent'>,
      default: 'supplier'
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
    }
  },

  emits: ['refresh', 'load-more', 'submit-comment'],

  setup(props, { emit }) {
    const newComment = ref('');
    const commentInputRef = ref<HTMLDivElement | null>(null);
    /** Plain text synced from contenteditable for dropdown logic and submit; also used for send button disabled state */
    const commentPlainText = ref('');
    const mentionDropdownRef = ref<HTMLElement | null>(null);
    const inputFocused = ref(false);
    const activityListRef = ref<HTMLElement | null>(null);
    const loadMoreSentinelRef = ref<HTMLElement | null>(null);
    const isFilterMenuOpen = ref(false);
    const isCollapsed = ref(false);
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    // Mention dropdown state
    const showMentionDropdown = ref(false);
    const mentionQuery = ref('');
    const mentionStartIndex = ref(0);
    const selectedMentionIndex = ref(0);
    /** Insertions in order: used to resolve duplicate display names by selection order */
    const mentionInsertions = ref<{ uuid: string; displayName: string }[]>([]);
    let blurTimeoutId: ReturnType<typeof setTimeout> | null = null;

    // Activity filters with checkboxes (read-only log types from backend: status_change, target_change, agreed_term_change, plan_phase_change)
    const activityFilters = ref<ActivityFilter[]>([
      // { id: 'mention', label: 'Mentions', types: ['mention'], active: true, icon: IconAssigned },
      { id: 'note', label: 'Notes', types: ['note'], active: true, icon: IconComment },
      { id: 'status', label: 'Status Changes', types: ['status_change'], active: true, icon: IconStatus },
      { id: 'target', label: 'Target Changes', types: ['target_change'], active: true, icon: IconChange },
      { id: 'agreed', label: 'Agreed Terms', types: ['agreed_term_change'], active: true, icon: IconChange },
      { id: 'planPhase', label: 'Plan / Phase', types: ['plan_phase_change'], active: true, icon: IconCreated },
      { id: 'manageTeam', label: 'Team Changes', types: ['manageTeam', 'manage_team'], active: true, icon: IconPerson },
      { id: 'commodity', label: 'Commodity Changes', types: ['commodity'], active: true, icon: IconChange },
      { id: 'customColumn', label: 'Custom Column Changes', types: ['columnNumber', 'custom_column'], active: true, icon: IconChange },
    ]);


    const allActivities = computed(() => {
      return props.activities.length > 0 ? props.activities : [];
    });

    // Get active filter types
    const activeFilterTypes = computed(() => {
      return activityFilters.value
        .filter(f => f.active)
        .flatMap(f => f.types);
    });

    // Check if all filters are active
    const areAllFiltersActive = computed(() => {
      return activityFilters.value.every(f => f.active);
    });

    // Check if any filter is not active (for header button styling)
    const hasActiveFilters = computed(() => {
      return !areAllFiltersActive.value;
    });

    const filteredActivities = computed(() => {
      if (areAllFiltersActive.value) {
        return allActivities.value;
      }
      return allActivities.value.filter((a: ActivityItem) => a.sourceType != null && activeFilterTypes.value.includes(a.sourceType));
    });

    const unreadCountComputed = computed(() => {
      return props.unreadCount;
    });

    const inputPlaceholder = computed(() => {
      return translate.t('global.mentionableUsers');
    });

    // Filter mentionable users by query (firstName, lastName, email)
    const filteredMentionableUsers = computed(() => {
      const q = mentionQuery.value.trim().toLowerCase();
      if (!q) return props.mentionableUsers.slice(0, 10);
      return props.mentionableUsers.filter((u: MentionableUsers) => {
        const first = (u.firstName ?? '').toLowerCase();
        const last = (u.lastName ?? '').toLowerCase();
        const email = (u.email ?? '').toLowerCase();
        return first.includes(q) || last.includes(q) || email.includes(q) ||
          `${first} ${last}`.trim().includes(q) || `${last} ${first}`.trim().includes(q);
      }).slice(0, 10);
    });

    // Toggle filter menu
    function toggleFilterMenu() {
      isFilterMenuOpen.value = !isFilterMenuOpen.value;
    }

    // Toggle individual filter
    function toggleFilter(filterId: string) {
      const filter = activityFilters.value.find(f => f.id === filterId);
      if (filter) {
        filter.active = !filter.active;
      }
    }

    // Toggle all filters
    function toggleAllFilters() {
      const newValue = !areAllFiltersActive.value;
      activityFilters.value.forEach(f => f.active = newValue);
    }

    // Toggle collapse state
    function toggleCollapse() {
      isCollapsed.value = !isCollapsed.value;
      // Close filter menu when collapsing
      if (isCollapsed.value) {
        isFilterMenuOpen.value = false;
      }
    }

    // Close menu when clicking outside
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-wrapper')) {
        isFilterMenuOpen.value = false;
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
      nextTick(() => setTimeout(setupLoadMoreObserver, 0));
    });

    onBeforeUnmount(() => {
      cleanupLoadMoreObserver();
    });

    watch(
      () => [loadMoreSentinelRef.value, activityListRef.value, props.hasMore, props.loadingMore] as const,
      () => {
        cleanupLoadMoreObserver();
        if (props.hasMore && loadMoreSentinelRef.value && activityListRef.value) {
          nextTick(() => setupLoadMoreObserver());
        }
      },
      { flush: 'post' }
    );

    watch(
      () => props.activities.length,
      () => {
        if (props.hasMore && loadMoreSentinelRef.value && activityListRef.value) {
          nextTick(() => setupLoadMoreObserver());
        }
      },
      { flush: 'post' }
    );

    let loadMoreObserver: IntersectionObserver | null = null;

    function cleanupLoadMoreObserver() {
      if (loadMoreObserver) {
        if (loadMoreSentinelRef.value) {
          try { loadMoreObserver.unobserve(loadMoreSentinelRef.value); } catch (_) {}
        }
        loadMoreObserver.disconnect();
        loadMoreObserver = null;
      }
    }

    function setupLoadMoreObserver() {
      const sentinel = loadMoreSentinelRef.value;
      const root = activityListRef.value;
      if (!sentinel || !root || !props.hasMore) return;
      cleanupLoadMoreObserver();
      loadMoreObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry?.isIntersecting) return;
          if (!props.hasMore || props.loadingMore) return;
          emit('load-more');
        },
        {
          root,
          rootMargin: '80px 0px',
          threshold: 0
        }
      );
      loadMoreObserver.observe(sentinel);
    }

    const LOAD_MORE_THRESHOLD_PX = 120;

    function onActivityListScroll() {
      if (!props.hasMore || props.loadingMore) return;
      const el = activityListRef.value;
      if (!el) return;
      const { scrollTop, clientHeight, scrollHeight } = el;
      if (scrollTop + clientHeight >= scrollHeight - LOAD_MORE_THRESHOLD_PX) {
        emit('load-more');
      }
    }

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
      cleanupLoadMoreObserver();
    });

    function asNoteActivity(a: ActivityItem): ActivitySource {
      return a as ActivitySource;
    }
    function getDisplayName(user: MentionableUsers): string {
      return StringUtils.getDisplayNameFromUser(user);
    }

    /** Derives mentionUserIds from comment text using insertion order so duplicate names map to the correct user */
    function getMentionUserIdsFromText(commentText: string): string[] {
      const ids: string[] = [];
      let remaining = commentText;
      for (const { uuid, displayName } of mentionInsertions.value) {
        if (!displayName) continue;
        const escaped = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp('@' + escaped + String.raw`(?=\s|$)`);
        if (pattern.test(remaining)) {
          ids.push(uuid);
          remaining = remaining.replaceAll(pattern, '');
        }
      }
      return ids;
    }

    /** Builds comment with mentions wrapped in <span class="highlight-mention">@user</span> for display in activity feed (used when submitting from plain text fallback) */
    function buildCommentWithHighlightMentions(plainText: string): string {
      let result = plainText;
      for (const { displayName } of mentionInsertions.value) {
        if (!displayName) continue;
        const escaped = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp('@' + escaped + String.raw`(?=\s|$)`);
        const safeName = StringUtils.escapeHtml(displayName);
        result = result.replaceAll(pattern, `<span class="highlight-mention" contenteditable="false">@${safeName}</span>`);
      }
      return result;
    }

    function onCommentMousedown(event: MouseEvent) {
      const el = commentInputRef.value;
      if (!el) return;
      const target = event.target as HTMLElement;
      const mentionSpan = target?.closest?.('.highlight-mention');
      if (mentionSpan && el.contains(mentionSpan)) {
        event.preventDefault();
        placeCaretAfter(mentionSpan);
      }
    }

    function onCommentInput(event: Event) {
      const el = event.target as HTMLDivElement;
      const text = el.textContent ?? '';
      newComment.value = text;
      commentPlainText.value = text;

      const caretOffset = getCaretCharacterOffsetWithin(el);
      const textBeforeCursor = text.slice(0, caretOffset);
      const lastAt = textBeforeCursor.lastIndexOf('@');
      if (lastAt === -1) {
        showMentionDropdown.value = false;
        return;
      }
      const afterAt = textBeforeCursor.slice(lastAt + 1);
      if (/\s/.test(afterAt)) {
        showMentionDropdown.value = false;
        return;
      }
      mentionQuery.value = afterAt;
      mentionStartIndex.value = lastAt;
      selectedMentionIndex.value = 0;
      showMentionDropdown.value = true;
    }

    function onCommentBlur() {
      blurTimeoutId = setTimeout(() => {
        inputFocused.value = false;
        showMentionDropdown.value = false;
        blurTimeoutId = null;
      }, 200);
    }

    function scrollSelectedMentionIntoView() {
      const dropdown = mentionDropdownRef.value;
      if (!dropdown) return;
      const items = dropdown.querySelectorAll<HTMLElement>('.mention-dropdown-item');
      const idx = selectedMentionIndex.value;
      if (idx >= 0 && idx < items.length) {
        items[idx].scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    }

    function onCommentKeydown(event: KeyboardEvent) {
      if (showMentionDropdown.value) {
        if (event.key === 'ArrowDown' && filteredMentionableUsers.value.length > 0) {
          event.preventDefault();
          selectedMentionIndex.value = Math.min(selectedMentionIndex.value + 1, filteredMentionableUsers.value.length - 1);
          nextTick(() => scrollSelectedMentionIntoView());
          return;
        }
        if (event.key === 'ArrowUp' && filteredMentionableUsers.value.length > 0) {
          event.preventDefault();
          selectedMentionIndex.value = Math.max(selectedMentionIndex.value - 1, 0);
          nextTick(() => scrollSelectedMentionIntoView());
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          const user = filteredMentionableUsers.value[selectedMentionIndex.value];
          if (user) selectMention(user);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          showMentionDropdown.value = false;
          return;
        }
      }
      const el = event.target as HTMLDivElement;
      if (event.key === 'Backspace' && !showMentionDropdown.value) {
        const sel = globalThis.getSelection();
        const isOnlyAnchor = (n: Node) => n.nodeType === Node.TEXT_NODE && ((n as Text).data === '\u200B' || (n as Text).data === ' \u200B');
        const startsWithAnchor = (s: string) => /^[\s\u200B]+/.test(s);
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (range.collapsed) {
            let mentionSpan: HTMLElement | null = null;
            let removeAnchorAfter = false;

            if (range.startOffset > 0 && range.startContainer.nodeType === Node.TEXT_NODE) {
              const parent = (range.startContainer as Text).parentElement;
              if (parent?.classList.contains('highlight-mention')) {
                mentionSpan = parent;
                removeAnchorAfter = true;
              }
            } else if (range.startContainer.nodeType === Node.TEXT_NODE) {
              const textNode = range.startContainer as Text;
              let atEndOfAnchor = false;
              if (textNode.data === '\u200B') atEndOfAnchor = range.startOffset === 1;
              else if (textNode.data === ' \u200B') atEndOfAnchor = range.startOffset === 2;
              if (atEndOfAnchor && textNode.previousSibling?.nodeType === Node.ELEMENT_NODE) {
                const spanCandidate = textNode.previousSibling as HTMLElement;
                if (spanCandidate.classList.contains('highlight-mention')) {
                  mentionSpan = spanCandidate;
                  removeAnchorAfter = true;
                }
              }
            }
            if (!mentionSpan && range.startOffset === 0 && range.startContainer.nodeType === Node.TEXT_NODE) {
              const textNode = range.startContainer as Text;
              const prev = textNode.previousSibling;
              if (prev && prev.nodeType === Node.TEXT_NODE && isOnlyAnchor(prev)) {
                const spanCandidate = prev.previousSibling;
                if (spanCandidate?.nodeType === Node.ELEMENT_NODE && (spanCandidate as HTMLElement).classList.contains('highlight-mention')) {
                  mentionSpan = spanCandidate as HTMLElement;
                  removeAnchorAfter = true;
                }
              } else if (prev?.nodeType === Node.ELEMENT_NODE && (prev as HTMLElement).classList.contains('highlight-mention')) {
                mentionSpan = prev as HTMLElement;
                removeAnchorAfter = true;
              }
            }

            if (mentionSpan && el.contains(mentionSpan)) {
              event.preventDefault();
              const parent = mentionSpan.parentNode;
              const next = mentionSpan.nextSibling;
              mentionSpan.remove();
              if (removeAnchorAfter && next?.nodeType === Node.TEXT_NODE) {
                const nextText = next as Text;
                if (isOnlyAnchor(next)) {
                  const afterNext = next.nextSibling;
                  next.remove();
                  commentPlainText.value = el.textContent ?? '';
                  newComment.value = commentPlainText.value;
                  nextTick(() => {
                    if (parent && afterNext && parent.contains(afterNext)) {
                      const r = document.createRange();
                      r.setStart(afterNext, 0);
                      r.collapse(true);
                      sel.removeAllRanges();
                      sel.addRange(r);
                    } else {
                      setCaretToOffset(el, el.textContent?.length ?? 0);
                    }
                  });
                } else if (startsWithAnchor(nextText.data)) {
                  nextText.data = nextText.data.replaceAll(/^[\s\u200B]+/g, '');
                  commentPlainText.value = el.textContent ?? '';
                  newComment.value = commentPlainText.value;
                  nextTick(() => {
                    const r = document.createRange();
                    r.setStart(nextText, 0);
                    r.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(r);
                  });
                } else {
                  commentPlainText.value = el.textContent ?? '';
                  newComment.value = commentPlainText.value;
                  nextTick(() => {
                    const r = document.createRange();
                    r.setStartBefore(next);
                    r.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(r);
                  });
                }
              } else {
                commentPlainText.value = el.textContent ?? '';
                newComment.value = commentPlainText.value;
                nextTick(() => {
                  if (parent && next && parent.contains(next)) {
                    const r = document.createRange();
                    r.setStartBefore(next);
                    r.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(r);
                  } else {
                    setCaretToOffset(el, el.textContent?.length ?? 0);
                  }
                });
              }
              return;
            }
            const text = el.textContent ?? '';
            const caretOffset = getCaretCharacterOffsetWithin(el);
            const cursorInTextAfterMention = range.startContainer.nodeType === Node.TEXT_NODE && (() => {
              const prev = range.startContainer.previousSibling;
              if (!prev) return false;
              if (prev.nodeType === Node.ELEMENT_NODE && (prev as HTMLElement).classList?.contains('highlight-mention')) return true;
              if (prev.nodeType === Node.TEXT_NODE && ((prev as Text).data === '\u200B' || (prev as Text).data === ' \u200B')) return true;
              return false;
            })();
            if (caretOffset > 0 && !cursorInTextAfterMention) {
              const textBefore = text.slice(0, caretOffset);
              const mentionMatch = textBefore.match(/(@(?:[^\s@]+(?:\s+[^\s@]+)*))$/);
              if (mentionMatch) {
                event.preventDefault();
                const mention = mentionMatch[1];
                const rangeToDelete = createRangeBetweenOffsets(el, caretOffset - mention.length, caretOffset);
                if (rangeToDelete) {
                  rangeToDelete.deleteContents();
                  commentPlainText.value = el.textContent ?? '';
                  newComment.value = commentPlainText.value;
                  nextTick(() => setCaretToOffset(el, caretOffset - mention.length));
                }
                return;
              }
            }
          } else {
            const rangeStart = range.startContainer;
            const rangeEnd = range.endContainer;
            const startInMention = rangeStart.nodeType === Node.ELEMENT_NODE
              ? (rangeStart as HTMLElement).classList?.contains('highlight-mention')
              : (rangeStart as Text).parentElement?.classList?.contains('highlight-mention');
            const endInMention = rangeEnd.nodeType === Node.ELEMENT_NODE
              ? (rangeEnd as HTMLElement).classList?.contains('highlight-mention')
              : (rangeEnd as Text).parentElement?.classList?.contains('highlight-mention');
            if (startInMention || endInMention) {
              event.preventDefault();
              range.deleteContents();
              commentPlainText.value = el.textContent ?? '';
              newComment.value = commentPlainText.value;
            }
          }
        }
      }
      if (event.key === 'Enter' && !showMentionDropdown.value) {
        event.preventDefault();
        submitComment();
      }
    }

    function onCommentPaste(event: ClipboardEvent) {
      event.preventDefault();
      const text = event.clipboardData?.getData('text/plain') ?? '';
      document.execCommand('insertText', false, text);
    }

    function selectMention(user: MentionableUsers) {
      const el = commentInputRef.value;
      if (!el) return;
      const displayName = getDisplayName(user);
      const caretOffset = getCaretCharacterOffsetWithin(el);
      const range = createRangeBetweenOffsets(el, mentionStartIndex.value, caretOffset);
      if (!range) return;
      range.deleteContents();
      const span = document.createElement('span');
      span.className = 'highlight-mention';
      span.dataset.userId = user.uuid;
      span.contentEditable = 'false';
      span.textContent = `@${displayName} `;
      range.insertNode(span);
      mentionInsertions.value = [...mentionInsertions.value, { uuid: user.uuid, displayName }];
      showMentionDropdown.value = false;
      commentPlainText.value = el.textContent ?? '';
      newComment.value = commentPlainText.value;
      el.focus();
      setTimeout(() => {
        if (el.contains(span)) setCaretAfterNode(span);
        el.focus();
      }, 0);
    }

    function openMentionPicker() {
      if (blurTimeoutId) {
        clearTimeout(blurTimeoutId);
        blurTimeoutId = null;
      }
      const el = commentInputRef.value;
      if (!el) return;
      const caretOffset = getCaretCharacterOffsetWithin(el);
      document.execCommand('insertText', false, '@');
      mentionStartIndex.value = caretOffset;
      mentionQuery.value = '';
      selectedMentionIndex.value = 0;
      showMentionDropdown.value = true;
      inputFocused.value = true;
      commentPlainText.value = el.textContent ?? '';
      newComment.value = commentPlainText.value;
      nextTick(() => el.focus());
    }

    function submitComment() {
      if (blurTimeoutId) {
        clearTimeout(blurTimeoutId);
        blurTimeoutId = null;
      }
      const el = commentInputRef.value;
      if (!el) return;
      const rawHtml = el.innerHTML.trim();
      const text = el.textContent?.trim() ?? '';
      if (text) {
        const mentionSpans = el.querySelectorAll<HTMLElement>('.highlight-mention[data-user-id]');
        const mentionUserIds = Array.from(mentionSpans).map((span) => span.dataset.userId ?? '').filter(Boolean);
        const comment = rawHtml.replaceAll(/\u200B/g, ''); // remove zero-width space used after mention spans
        emit('submit-comment', { comment, mentionUserIds });
        el.innerHTML = '';
        commentPlainText.value = '';
        newComment.value = '';
        mentionInsertions.value = [];
      }
    }

    return {
      newComment,
      commentPlainText,
      commentInputRef,
      mentionDropdownRef,
      inputFocused,
      activityListRef,
      filteredActivities,
      unreadCountComputed,
      inputPlaceholder,
      asNoteActivity,
      asLogActivity,
      submitComment,
      isFilterMenuOpen,
      activityFilters,
      areAllFiltersActive,
      hasActiveFilters,
      toggleFilterMenu,
      toggleFilter,
      toggleAllFilters,
      isCollapsed,
      toggleCollapse,
      showMentionDropdown,
      filteredMentionableUsers,
      selectedMentionIndex,
      onCommentInput,
      onCommentKeydown,
      onCommentMousedown,
      onCommentPaste,
      onCommentBlur,
      selectMention,
      openMentionPicker,
      onActivityListScroll,
      loadMoreSentinelRef
    };
  }
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/_colors";

.activity-panel-container {
  display: flex;
  flex-direction: column;
  height: calc(125vh);
  background-color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: height 0.3s ease, width 0.3s ease;

  @media screen and (max-width: 1600px) {
    height: calc(125vh - 5vh);
  }

  @media screen and (max-width: 1350px) {
    height: calc(125vh - 15vh);
  }

  &.collapsed {
    height: auto;

    .activity-header {
      border-bottom: none;
    }
  }
}

// Header
.activity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid $color-gray-200;
  background-color: #ffffff;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-title {
  font-size: 16px;
  font-weight: 600;
  color: $color-gray-900;
  letter-spacing: -0.01em;
}

.notification-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background-color: $color-primary-500;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
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

  &.active {
    background-color: $color-primary-50;
    color: $color-primary-600;
  }
}

// Notification wrapper
.notification-wrapper {
  position: relative;
  display: flex;
  align-items: center;

  .notification-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    font-size: 10px;
  }
}

// Filter dropdown
.filter-wrapper {
  position: relative;
}

.filter-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background-color: #ffffff;
  border: 1px solid $color-gray-200;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  overflow: hidden;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid $color-gray-100;
}

.filter-title {
  font-size: 13px;
  font-weight: 600;
  color: $color-gray-700;
}

.unselect-btn {
  font-size: 12px;
  font-weight: 500;
  color: $color-gray-500;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: $color-primary-600;
  }
}

.filter-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px 0;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: $color-gray-300;
    border-radius: 2px;
  }
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: $color-gray-50;
  }
}

.filter-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: $color-gray-500;
}

.filter-label {
  flex: 1;
  font-size: 13px;
  color: $color-gray-700;
}

.filter-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1.5px solid $color-gray-300;
  border-radius: 4px;
  transition: all 0.15s ease;

  &.checked {
    background-color: $color-primary-500;
    border-color: $color-primary-500;
    color: #ffffff;
  }
}

// Activity List
// Activity List
.activity-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: $color-gray-300;
    border-radius: 3px;
  }
}

.load-more-sentinel {
  height: 20px;
  width: 100%;
  pointer-events: none;
  flex-shrink: 0;
}

.load-more-loading {
  padding: 12px 16px;
  font-size: 13px;
  color: $color-gray-500;
  text-align: center;
}

.activity-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: $color-gray-400;

  .empty-icon {
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 14px;
    color: $color-gray-500;
  }
}

// Activity bubbles (mention and others; notes use ActivityNoteBubble)

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: $color-gray-50;
  }

  &.unread {
    background-color: rgba($color-primary-50, 0.5);
    border-left: 3px solid $color-primary-500;
    padding-left: 17px;
  }

  &.note-updated .detail-card-updated {
    border-left-color: $color-primary-400;
  }

  &.note-deleted .detail-card {
    border-left-color: $color-gray-400;
  }

  // Simple activity format (non-comment)
  &.simple-activity {
    align-items: flex-start;
    gap: 10px;
    padding: 10px 20px;

    .activity-bullet {
      flex-shrink: 0;
      width: 6px;
      height: 6px;
      margin-top: 6px;
      background-color: $color-gray-400;
      border-radius: 50%;
    }

    .activity-inline-content {
      flex: 1;
      font-size: 13px;
      line-height: 1.5;
      color: $color-gray-600;

      .activity-user {
        font-weight: 600;
        color: $color-gray-900;
      }

      .activity-action {
        color: $color-gray-500;
      }

      .activity-target {
        color: $color-gray-700;
        font-weight: 500;
      }
    }

    .activity-time {
      flex-shrink: 0;
      font-size: 12px;
      color: $color-gray-400;
      white-space: nowrap;
    }
  }
}

// Status badges for status changes
.status-badge {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-left: 4px;
  vertical-align: middle;

  &.status-green {
    background-color: #22c55e;
  }

  &.status-blue {
    background-color: #3b82f6;
  }

  &.status-gray {
    background-color: #9ca3af;
  }

  &.status-teal {
    background-color: #14b8a6;
  }

  &.status-red {
    background-color: #ef4444;
  }

  &.status-yellow {
    background-color: #eab308;
  }
}

.activity-avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.activity-user {
  font-size: 13px;
  font-weight: 600;
  color: $color-gray-900;
}

.activity-time {
  font-size: 12px;
  color: $color-gray-400;
}

.activity-description {
  font-size: 13px;
  color: $color-gray-600;
  line-height: 1.4;
}

.activity-action {
  color: $color-gray-500;
}

.activity-target {
  color: $color-gray-700;
  font-weight: 500;
}

.activity-details {
  margin-top: 8px;
}

.detail-card {
  padding: 10px 12px;
  background-color: $color-gray-50;
  border-radius: 8px;
  border-left: 3px solid $color-gray-300;

  p {
    margin: 0;
    font-size: 13px;
    color: $color-gray-700;
    line-height: 1.5;
  }

  &.deleted-note p {
    color: $color-gray-500;
    font-style: italic;
  }
}

.detail-card-updated {
  border-left-color: $color-primary-400;
}

.deleted-content-preview {
  margin-top: 6px !important;
  font-size: 12px !important;
  color: $color-gray-500 !important;
  font-style: italic;
}

.detail-change {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background-color: $color-gray-50;
  border-radius: 8px;
}

.change-from,
.change-to {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.change-label {
  color: $color-gray-400;
  min-width: 24px;
}

.change-value {
  color: $color-gray-700;
  font-weight: 500;
}

.change-from .change-value {
  text-decoration: line-through;
  opacity: 0.7;
}

// Input Area
.activity-input-area {
  padding: 16px 20px;
  border-top: 1px solid $color-gray-200;
  background-color: #ffffff;
}

.input-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 14px;
  background-color: $color-gray-50;
  border: 1px solid $color-gray-200;
  border-radius: 10px;
  transition: all 0.15s ease;

  &:focus-within {
    background-color: #ffffff;
    border-color: $color-primary-300;
    box-shadow: 0 0 0 3px rgba($color-primary-500, 0.1);
  }
}

.input-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-gray-400;
  padding-top: 2px;
  flex-shrink: 0;
}

.comment-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.4;
  color: $color-gray-900;
  outline: none;
  width: 100%;
  min-height: 52px;
  max-height: 120px;
  resize: none;
  padding: 0;
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;

  &:empty::before,
  &.is-empty::before {
    content: attr(data-placeholder);
    color: $color-gray-400;
  }

  &::placeholder {
    color: $color-gray-400;
  }

  .highlight-mention {
    color: $color-violet-700;
    font-weight: 600;
    background-color: $color-violet-100;
    padding: 2px 2px;
    border-radius: 999px;
  }
}

.comment-input-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.mention-dropdown {
  position: absolute;
  left: 0;
  bottom: calc(100% + 6px);
  width: 260px;
  max-height: 220px;
  overflow-y: auto;
  background-color: #ffffff;
  border: 1px solid $color-gray-200;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: $color-gray-300;
    border-radius: 2px;
  }
}

.mention-dropdown-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover,
  &.selected {
    background-color: $color-gray-100;
  }

  .mention-name {
    font-size: 13px;
    font-weight: 500;
    color: $color-gray-900;
  }
  .mention-email {
    font-size: 12px;
    color: $color-gray-500;
  }
}

.mention-dropdown-empty {
  padding: 12px;
  font-size: 13px;
  color: $color-gray-500;
  text-align: center;
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid $color-gray-100;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background-color: transparent;
  border-radius: 6px;
  color: $color-gray-400;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: $color-gray-100;
    color: $color-gray-600;
  }
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background-color: $color-primary-500;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background-color: $color-primary-600;
  }

  &:disabled {
    background-color: $color-gray-200;
    color: $color-gray-400;
    cursor: not-allowed;
  }
}

.minimize-icon {
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}


.minimize-icon i.fa {
  font-size: 1rem;
  color: #6c757d;
}


:deep(.highlight-mention) {
    color: $color-violet-700;
    font-weight: 600;
    background-color: $color-violet-100;
    padding: 2px 2px;
    border-radius: 999px;
  }

</style>

