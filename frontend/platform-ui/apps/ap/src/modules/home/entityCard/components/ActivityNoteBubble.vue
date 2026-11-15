<template>
<CalculumLoading v-if="someActionNote" :modal="true"></CalculumLoading>
<CalculumModal v-if="showDeleteConfirm" :size="'lg'" :showClose="true" :title="$t('home.entityCard.noteComponent.confirmDeleteTitle')" @close="showDeleteConfirm = false">
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="showDeleteConfirm = false" style="z-index: 1; width: fit-content"><span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" @click="confirmDeleteNote" style="z-index: 1; width: fit-content"><span>{{ $t('button.delete') }}</span></button>
  </template>
</CalculumModal>
<div class="activity-bubble" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
  <div class="bubble-header">
    <div class="activity-avatar" :style="{ backgroundColor: getAvatarColor(displayLastName, displayEmail) }"><span>{{ getInitials(displayName, displayEmail) }}</span></div>
    <div class="bubble-meta"><span class="bubble-user">{{ displayName }}</span><span class="bubble-action mb-2">{{ actionLabel }} a note</span></div><span class="bubble-time">{{ displayDate }}</span>
    <div class="bubble-actions" v-if="activity.action !== 'deleted' && canShowActions">
      <button class="bubble-action-btn" type="button" title="Edit" :disabled="!canShowActions" @click.stop="canShowActions && startEdit()">
        <svg class="bubble-action-btn-icon-svg" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.64539 17.0608L15.3955 10.3106L12.1894 7.10445L5.4392 13.8546C5.34627 13.9477 5.28025 14.0641 5.24816 14.1916L4.5 18L8.30763 17.2518C8.43547 17.2199 8.55242 17.1538 8.64539 17.0608ZM17.5747 8.13154C17.847 7.85911 18 7.48967 18 7.10445C18 6.71924 17.847 6.34979 17.5747 6.07737L16.4226 4.92534C16.1502 4.653 15.7808 4.5 15.3955 4.5C15.0103 4.5 14.6409 4.653 14.3685 4.92534L13.2164 6.07737L16.4226 9.28356L17.5747 8.13154Z" fill="currentColor"></path>
        </svg>
      </button>
      <button class="bubble-action-btn" type="button" title="Delete" :disabled="!canShowActions" @click.stop="onDeleteClick"><img class="bubble-action-btn-icon" :src="iconDeleteUrl" alt="Delete"/></button>
    </div>
  </div>
  <div class="bubble-body">
    <div class="bubble-edit" v-if="patchMode">
      <div class="bubble-edit-input-wrapper" relative="relative">
        <div class="bubble-edit-input" ref="editInputRef" contenteditable="true" :data-placeholder="$t('global.mentionableUsers')" :class="{ 'is-empty': !editPlainText.trim() }" role="textbox" aria-multiline="true" @input="onEditInput" @keydown="onEditKeydown" @mousedown="onEditMousedown" @paste="onEditPaste" @blur="onEditBlur"></div>
        <div class="mention-dropdown" v-if="showMentionDropdown" ref="editMentionDropdownRef" :class="{ 'mention-dropdown--above': editMentionDropdownAbove, 'mention-dropdown--below': !editMentionDropdownAbove }" @mousedown.prevent>
          <div class="mention-dropdown-item" v-for="(user, idx) in filteredMentionableUsers" :key="user.uuid" :class="{ 'selected': idx === selectedMentionIndex }" @mousedown.prevent="selectEditMention(user)"><span class="mention-name">{{ user.firstName }} {{ user.lastName }}</span><span class="mention-email" v-if="user.email">{{ user.email }}</span></div>
          <div class="mention-dropdown-empty" v-if="filteredMentionableUsers.length === 0"><span>No users found</span></div>
        </div>
      </div>
      <div class="bubble-edit-actions">
        <button class="bubble-footer-btn mention-btn" type="button" title="Mencionar" @click="openEditMentionPicker" :disabled="someActionNote">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"></path>
          </svg>
        </button>
        <button class="bubble-footer-btn" @click="cancelEdit" :disabled="someActionNote">{{ $t('global.cancel') }}</button>
        <button class="bubble-footer-btn primary" @click="saveEdit" :disabled="!editPlainText.trim() || !editHasChanges || someActionNote">{{ $t('global.update') }}</button>
      </div>
    </div>
    <div class="bubble-content" v-else-if="activity.action === 'created' && activity.metadata && activity.metadata.content">
      <div class="bubble-inline" :class="{ 'bubble-inline--html': contentHasHighlightSpans && !contentIsArray }"><span v-if="contentHasHighlightSpans && !contentIsArray" v-html="sanitizedContentHtml"></span>
        <template v-else>
          <template v-for="(seg, i) in contentSegments" :key="i"><span class="highlight-mention" v-if="seg.type === 'mention'" :data-user-id="seg.uuid">{{ seg.value }}</span><span v-else-if="seg.type === 'text'">{{ seg.value }}</span><span class="mention-chip" v-else>{{ seg.value }}</span></template>
        </template>
      </div>
    </div>
    <div class="bubble-content" v-else-if="activity.action === 'updated' && displayContent">
      <div class="bubble-inline" :class="{ 'bubble-inline--html': contentHasHighlightSpans && !contentIsArray }"><span v-if="contentHasHighlightSpans && !contentIsArray" v-html="sanitizedContentHtml"></span>
        <template v-else>
          <template v-for="(seg, i) in contentSegments" :key="i"><span class="highlight-mention" v-if="seg.type === 'mention'" :data-user-id="seg.uuid">{{ seg.value }}</span><span v-else-if="seg.type === 'text'">{{ seg.value }}</span><span class="mention-chip" v-else>{{ seg.value }}</span></template>
        </template>
      </div>
    </div>
    <div class="bubble-content bubble-content-deleted" v-else-if="activity.action === 'deleted' && activity.metadata">
      <div class="bubble-inline deleted-preview" v-if="activity.metadata.content" :class="{ 'bubble-inline--html': contentHasHighlightSpans && !contentIsArray }"><span v-if="contentHasHighlightSpans && !contentIsArray" v-html="sanitizedContentHtml"></span>
        <template v-else>
          <template v-for="(seg, i) in contentSegments" :key="i"><span class="highlight-mention" v-if="seg.type === 'mention'" :data-user-id="seg.uuid">{{ seg.value }}</span><span v-else-if="seg.type === 'text'">{{ seg.value }}</span><span class="mention-chip" v-else>{{ seg.value }}</span></template>
        </template>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref, watch, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import { useEntityCardStore } from '@/stores/entityCard';
import { useNegotiationStatusStore } from '@/stores/negotiationStatus';
import { useUser } from '@/composables';
import { NumberUtils } from '@/utils';
import StringUtils from '@/utils/StringUtils';
import {
  getCaretCharacterOffsetWithin,
  createRangeBetweenOffsets,
  setCaretToOffset,
  setCaretAfterNode,
  normalizeHighlightMentionHtml,
  getMentionUserIdsFromHtml,
  buildCommentSegments,
  contentToEditState,
  placeCaretAfter,
  getAvatarColor,
  getInitials,
  contentToNormalizedSegments,
  contentHasHighlightSpans as contentHasHighlightSpansCheck,
  sanitizeMentionContent
} from '@/utils/ContentEditableUtils';
import { formatActivityRelativeDate } from '@/utils/FormatData';
import CalculumModal from '@/modules/components/CalculumModal.vue';
import { CalculumLoading } from '@ada/design-system'
import iconDeleteUrl from './icons/IconDelete.svg';
import { UserActionsInLogs } from '@/modules/home/types';

interface ChangesinNotes {
  content :{
    from: string | ContentSegment[];
    to: string | ContentSegment[];
  }  
}

/** Segment from API when content is stored as array */
type ContentSegment =
  | { type: 'mention'; uuid: string; text: string }
  | { type: 'text'; text: string };

interface ActivityMetadata {
  occurredAt: string;
  summary: string;
  objectUuid: string;
  content: string | ContentSegment[];
  actionBy: UserActionsInLogs;
  changes?: ChangesinNotes;
}


export interface ActivitySource {
  uuid?: string;
  '@id'?: string;
  created: string;
  sourceType: 'note' | 'mention';
  action: 'created' | 'updated' | 'deleted';
  metadata: ActivityMetadata;
}

interface MentionableUser {
  email?: string;
  firstName: string;
  id: number;
  lastName: string;
  uuid: string;
}


const ACTION_LABELS: Record<ActivitySource['action'], string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted'
};

export default defineComponent({
  name: 'ActivityNoteBubble',

  components: {
    CalculumModal,
    CalculumLoading
  },

  props: {
    activity: {
      type: Object as PropType<ActivitySource>,
      required: true
    },
    mentionableUsers: {
      type: Array as PropType<MentionableUser[]>,
      default: () => []
    }
  },

  emits: ['update-note', 'remove-note'],

  setup(props, { emit }) {
    const { t: translate } = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();
    const entityCardStore = useEntityCardStore();
    const negotiationStatusStore = useNegotiationStatusStore();
    const { user: currentUser } = useUser();

    const showOptions = ref(false);
    const showOptionsTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
    const showDeleteConfirm = ref(false);
    const patchMode = ref(false);
    const editContent = ref('');
    const initialContent = ref('');
    const someActionNote = ref(false);

    const editInputRef = ref<HTMLDivElement | null>(null);
    const editPlainText = ref('');
    const editCurrentHtml = ref('');
    const editInitialHtml = ref('');
    const showMentionDropdown = ref(false);
    const mentionQuery = ref('');
    const mentionStartIndex = ref(0);
    const selectedMentionIndex = ref(0);
    const editMentionDropdownRef = ref<HTMLElement | null>(null);
    let editBlurTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const editMentionDropdownAbove = ref(true);

    function updateEditMentionDropdownPlacement() {
      const el = editInputRef.value;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = globalThis.innerHeight - rect.bottom;
      editMentionDropdownAbove.value = spaceAbove >= spaceBelow;
    }

    watch(showMentionDropdown, (visible) => {
      if (visible) {
        nextTick(updateEditMentionDropdownPlacement);
      }
    });

    const displayName = computed(() => {
      const actionBy = props.activity.metadata.actionBy;
      if (actionBy?.fullName) return String(actionBy.fullName).trim();
      return '';
    });

    const displayEmail = computed(() => {
      const actionBy = props.activity.metadata.actionBy;
      return actionBy?.email ? String(actionBy.email).trim() : '';
    });

    /** Last name for avatar color: last word of fullName, or empty */
    const displayLastName = computed(() => {
      const full = displayName.value;
      if (!full) return '';
      const parts = full.trim().split(/\s+/).filter(Boolean);
      return parts.length > 0 ? parts[parts.length - 1] : '';
    });

    const displayDate = computed(() => formatActivityRelativeDate(props.activity.created));

    const actionLabel = computed(() => ACTION_LABELS[props.activity.action] ?? props.activity.action);

    const isCurrentUser = computed(() => {
      const actionBy = props.activity.metadata.actionBy;
      if (!actionBy?.email) return false;
      const currentEmail = currentUser.value?.email;
      return !!currentEmail && actionBy.email.toLowerCase() === currentEmail.toLowerCase();
    });

    const canShowActions = computed(() => props.activity.action !== 'deleted' && isCurrentUser.value);

    const filteredMentionableUsers = computed(() => {
      const q = mentionQuery.value.trim().toLowerCase();
      if (!q) return props.mentionableUsers.slice(0, 10);
      return props.mentionableUsers.filter((u: MentionableUser) => {
        const first = (u.firstName ?? '').toLowerCase();
        const last = (u.lastName ?? '').toLowerCase();
        const email = (u.email ?? '').toLowerCase();
        return first.includes(q) || last.includes(q) || email.includes(q) ||
          `${first} ${last}`.trim().includes(q) || `${last} ${first}`.trim().includes(q);
      }).slice(0, 10);
    });

    const editHasChanges = computed(() => {
      if (!editPlainText.value.trim()) return false;
      const current = (editCurrentHtml.value ?? '').replaceAll(/\u200B/g, '');
      const initial = (editInitialHtml.value ?? '').replaceAll(/\u200B/g, '');
      return current !== initial;
    });

    const bubbleClasses = computed(() => ({
      'note-created': props.activity.action === 'created',
      'note-updated': props.activity.action === 'updated',
      'note-deleted': props.activity.action === 'deleted'
    }));

    const displayContent = computed(() => {
      const metadata: any = props.activity.metadata;
      if (props.activity.action === 'updated' && metadata?.changes?.content?.to != null) {
        return metadata.changes.content.to;
      }
      return metadata?.content ?? '';
    });

    const contentSegments = computed(() => contentToNormalizedSegments(displayContent.value));

    const contentHasHighlightSpans = computed(() =>
      typeof displayContent.value === 'string' && contentHasHighlightSpansCheck(displayContent.value)
    );

    const contentIsArray = computed(() => Array.isArray(props.activity.metadata?.content));

    const sanitizedContentHtml = computed(() =>
      typeof displayContent.value === 'string' ? sanitizeMentionContent(displayContent.value) : ''
    );

    function getSegments(content: string | ContentSegment[]) {
      return contentToNormalizedSegments(content);
    }

    function getHasHighlightSpans(content: string | ContentSegment[]) {
      return typeof content === 'string' && contentHasHighlightSpansCheck(content);
    }

    function getSanitizedHtml(content: string | ContentSegment[]) {
      return typeof content === 'string' ? sanitizeMentionContent(content) : '';
    }

    function onEditMousedown(event: MouseEvent) {
      const el = editInputRef.value;
      if (!el) return;
      const target = event.target as HTMLElement;
      const mentionSpan = target?.closest?.('.highlight-mention');
      if (mentionSpan && el.contains(mentionSpan)) {
        event.preventDefault();
        placeCaretAfter(mentionSpan);
      }
    }

    function onEditInput(event: Event) {
      const el = event.target as HTMLDivElement;
      editPlainText.value = el.textContent ?? '';
      editCurrentHtml.value = el.innerHTML ?? '';
      const caretOffset = getCaretCharacterOffsetWithin(el);
      const text = editPlainText.value;
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

    function onEditBlur() {
      editBlurTimeoutId = setTimeout(() => {
        showMentionDropdown.value = false;
        editBlurTimeoutId = null;
      }, 200);
    }

    function scrollEditMentionIntoView() {
      const dropdown = editMentionDropdownRef.value;
      if (!dropdown) return;
      const items = dropdown.querySelectorAll<HTMLElement>('.mention-dropdown-item');
      const idx = selectedMentionIndex.value;
      if (idx >= 0 && idx < items.length) {
        items[idx].scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    }

    function onEditKeydown(event: KeyboardEvent) {
      const el = event.target as HTMLDivElement;
      if (showMentionDropdown.value) {
        if (event.key === 'ArrowDown' && filteredMentionableUsers.value.length > 0) {
          event.preventDefault();
          selectedMentionIndex.value = Math.min(selectedMentionIndex.value + 1, filteredMentionableUsers.value.length - 1);
          nextTick(() => scrollEditMentionIntoView());
          return;
        }
        if (event.key === 'ArrowUp' && filteredMentionableUsers.value.length > 0) {
          event.preventDefault();
          selectedMentionIndex.value = Math.max(selectedMentionIndex.value - 1, 0);
          nextTick(() => scrollEditMentionIntoView());
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          const user = filteredMentionableUsers.value[selectedMentionIndex.value];
          if (user) selectEditMention(user);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          showMentionDropdown.value = false;
          return;
        }
      }
      if (event.key === 'Backspace' && !showMentionDropdown.value) {
        const sel = globalThis.getSelection();
        const isOnlyAnchor = (n: Node) => n.nodeType === Node.TEXT_NODE && ((n as Text).data === '\u200B' || (n as Text).data === ' \u200B');
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
              const next = mentionSpan.nextSibling;
              mentionSpan.remove();
              if (removeAnchorAfter && next?.nodeType === Node.TEXT_NODE) {
                const nextText = next as Text;
                if (isOnlyAnchor(next)) {
                  next.remove();
                } else if (/^[\s\u200B]+/.test(nextText.data)) {
                  nextText.data = nextText.data.replaceAll(/^[\s\u200B]+/g, '');
                }
              }
              editPlainText.value = el.textContent ?? '';
              editCurrentHtml.value = el.innerHTML ?? '';
            }
          }
        }
      }
    }

    function onEditPaste(event: ClipboardEvent) {
      event.preventDefault();
      const text = event.clipboardData?.getData('text/plain') ?? '';
      document.execCommand('insertText', false, text);
    }

    function selectEditMention(user: MentionableUser) {
      const el = editInputRef.value;
      if (!el) return;
      const displayName = StringUtils.getDisplayNameFromUser(user);
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
      showMentionDropdown.value = false;
      editPlainText.value = el.textContent ?? '';
      editCurrentHtml.value = el.innerHTML ?? '';
      el.focus();
      setTimeout(() => {
        if (el.contains(span)) setCaretAfterNode(span);
        el.focus();
      }, 0);
    }

    function openEditMentionPicker() {
      if (editBlurTimeoutId) {
        clearTimeout(editBlurTimeoutId);
        editBlurTimeoutId = null;
      }
      const el = editInputRef.value;
      if (!el) return;
      const caretOffset = getCaretCharacterOffsetWithin(el);
      document.execCommand('insertText', false, '@');
      mentionStartIndex.value = caretOffset;
      mentionQuery.value = '';
      selectedMentionIndex.value = 0;
      showMentionDropdown.value = true;
      editPlainText.value = el.textContent ?? '';
      editCurrentHtml.value = el.innerHTML ?? '';
      nextTick(() => el.focus());
    }

    function onMouseEnter() {
      if (showOptionsTimeout.value) {
        clearTimeout(showOptionsTimeout.value);
        showOptionsTimeout.value = null;
      }
      if (props.activity.action !== 'deleted') showOptions.value = true;
    }

    function onMouseLeave() {
      showOptionsTimeout.value = setTimeout(() => {
        showOptions.value = false;
        showOptionsTimeout.value = null;
      }, 180);
    }

    function onDeleteClick() {
      if (canShowActions.value) showDeleteConfirm.value = true;
    }

    onBeforeUnmount(() => {
      if (showOptionsTimeout.value) {
        clearTimeout(showOptionsTimeout.value);
      }
      if (editBlurTimeoutId) {
        clearTimeout(editBlurTimeoutId);
      }
    });

    function startEdit() {
      const content =
        props.activity.action === 'created'
          ? props.activity.metadata?.content
          : props.activity.metadata?.changes?.content?.to ?? '';
      patchMode.value = true;
      showMentionDropdown.value = false;

      const { plain, html } = contentToEditState(content);
      initialContent.value = html;
      editContent.value = html;
      editInitialHtml.value = html;
      editPlainText.value = plain;
      editCurrentHtml.value = html;

      nextTick(() => {
        nextTick(() => {
          const el = editInputRef.value;
          if (el) {
            el.innerHTML = html || '';
            editPlainText.value = el.textContent ?? '';
            editCurrentHtml.value = el.innerHTML ?? '';
            el.focus();
            const len = (el.textContent ?? '').length;
            setCaretToOffset(el, len);
          }
        });
      });
    }

    function cancelEdit() {
      patchMode.value = false;
      editContent.value = '';
      editPlainText.value = '';
      editCurrentHtml.value = '';
      editInitialHtml.value = '';
      showMentionDropdown.value = false;
      if (editBlurTimeoutId) {
        clearTimeout(editBlurTimeoutId);
        editBlurTimeoutId = null;
      }
    }

    function getNoteId(): string {
      const meta = props.activity.metadata;
      if (meta.objectUuid) return String(meta.objectUuid);
      if (props.activity.uuid) return String(props.activity.uuid);
      return '';
    }

    function saveEdit() {
      const el = editInputRef.value;
      if (!el || !editPlainText.value.trim() || !editHasChanges.value) return;
      someActionNote.value = true;
      const noteId = getNoteId();
      const rawComment = (el.innerHTML ?? '').replaceAll(/\u200B/g, '').trim();
      const normalizedHtml = normalizeHighlightMentionHtml(rawComment);
      const mentionUserIds = getMentionUserIdsFromHtml(normalizedHtml);
      const commentSegments = buildCommentSegments(
        editPlainText.value,
        mentionUserIds,
        props.mentionableUsers ?? []
      );
      entityCardStore.patchSpendNote({
        noteId,
        comment: commentSegments,
        callbackSuccess: () => {
          someActionNote.value = false;
          toast.success(translate('home.entityCard.noteUpdated'));
          negotiationStatusStore.setRefresNotes(NumberUtils.getRandomInt());
          emit('update-note', props.activity);
          patchMode.value = false;
          cancelEdit();
        },
        callbackError: () => {
          someActionNote.value = false;
          toast.error(translate('home.entityCard.noteWasNotUpdated'));
        }
      });
    }

    function confirmDeleteNote() {
      showDeleteConfirm.value = false;
      someActionNote.value = true;
      const noteId = getNoteId();
      entityCardStore.deleteSpendNote({
        noteId,
        callbackSuccess: () => {
          someActionNote.value = false;
          toast.success(translate('home.entityCard.noteDeleted'));
          negotiationStatusStore.setRefresNotes(NumberUtils.getRandomInt());
          emit('remove-note', props.activity);
        },
        callbackError: () => {
          someActionNote.value = false;
          toast.error(translate('home.entityCard.noteWasNotDeleted'));
        }
      });
    }


    return {
      iconDeleteUrl,
      displayName,
      displayEmail,
      displayLastName,
      displayDate,
      actionLabel,
      showOptions,
      showDeleteConfirm,
      patchMode,
      editContent,
      initialContent,
      someActionNote,
      canShowActions,
      bubbleClasses,
      displayContent,
      contentSegments,
      contentHasHighlightSpans,
      contentIsArray,
      sanitizedContentHtml,
      getSegments,
      getHasHighlightSpans,
      getSanitizedHtml,
      editInputRef,
      editPlainText,
      editHasChanges,
      showMentionDropdown,
      editMentionDropdownAbove,
      editMentionDropdownRef,
      filteredMentionableUsers,
      selectedMentionIndex,
      onEditInput,
      onEditKeydown,
      onEditMousedown,
      onEditPaste,
      onEditBlur,
      selectEditMention,
      openEditMentionPicker,
      onMouseEnter,
      onMouseLeave,
      onDeleteClick,
      startEdit,
      cancelEdit,
      saveEdit,
      confirmDeleteNote,
      getAvatarColor,
      getInitials
    }
  }
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/_colors";

.bubble-actions {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 4px;
  border-radius: 8px;
  background: $color-gray-100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, background-color 0.15s ease;
}

.activity-bubble:hover .bubble-actions {
  opacity: 1;
  pointer-events: auto;
}

.bubble-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: $color-gray-500;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.9);
    color: $color-primary-600;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }

  &:last-child:hover:not(:disabled) {
    color: #dc2626;
  }
}

.bubble-action-btn-icon {
  display: block;
  width: 14px;
  height: 14px;
  object-fit: contain;
}

.bubble-action-btn-icon-svg {
  display: block;
  transform: translateY(-3px) translateX(-2px);
}


.bubble-edit {
  margin-top: 6px;
}

.bubble-edit-input-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.bubble-edit-input {
  position: relative;
  z-index: 0;
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  border: 1px solid $color-gray-200;
  border-radius: 8px;
  font-size: 13px;
  color: $color-gray-800;
  line-height: 1.5;
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;

  &:empty::before,
  &.is-empty::before {
    content: attr(data-placeholder);
    color: $color-gray-400;
  }

  &:focus {
    border-color: $color-primary-400;
    box-shadow: 0 0 0 2px rgba($color-primary-500, 0.15);
  }

  .highlight-mention {
    color: $color-violet-700;
    font-weight: 600;
    background-color: $color-violet-100;
    padding: 2px 6px;
    border-radius: 999px;
  }
}

.mention-dropdown {
  position: absolute;
  left: 0;
  width: 260px;
  max-height: 220px;
  overflow-y: auto;
  background-color: #ffffff;
  border: 1px solid $color-gray-200;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;

  &.mention-dropdown--above {
    bottom: calc(100% + 6px);
    top: auto;
  }

  &.mention-dropdown--below {
    top: calc(100% + 6px);
    bottom: auto;
  }

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

.bubble-edit-actions {
  display: flex;
  gap: 8px;
  align-items: center;

  .bubble-footer-btn.mention-btn {
    padding: 4px 8px;
  }

  .bubble-footer-btn.primary {
    color: #fff;
    background: $color-primary-500;

    &:hover:not(:disabled) {
      background: $color-primary-600;
    }

    &:disabled {
      background: $color-gray-300;
      color: $color-gray-500;
      cursor: not-allowed;
    }
  }
}

.bubble-content {
  p {
    margin: 0;
    font-size: 13px;
    color: $color-gray-800;
    line-height: 1.5;
    word-break: break-word;
  }

  .bubble-inline {
    font-size: 13px;
    color: $color-gray-800;
    line-height: 1.5;
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

  .bubble-inline.deleted-preview {
    opacity: 0.85;
  }
}

.bubble-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 6px 14px 10px;
  border-top: 1px solid $color-gray-100;
}

.bubble-footer-btn {
  font-size: 12px;
  font-weight: 500;
  color: $color-gray-500;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: color 0.15s ease, background-color 0.15s ease;

  &:hover {
    color: $color-primary-600;
    background-color: $color-primary-50;
  }
}
</style>
