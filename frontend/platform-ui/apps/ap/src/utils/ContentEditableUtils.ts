/**
 * Utilities for contenteditable elements: caret position, selection ranges, and cursor placement.
 * Shared by ActivityPanel and ActivityNoteBubble for mention handling.
 */

import { AVATAR_COLORS_BY_LETTER, AVATAR_COLOR_DEFAULT } from '@/utils/ColorsGroups';

/** Get character offset from start of element to current selection (for contenteditable) */
export function getCaretCharacterOffsetWithin(el: Node): number {
  const sel = globalThis.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  if (!el.contains(sel.anchorNode)) return 0;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.setEnd(sel.anchorNode!, sel.anchorOffset);
  return range.toString().length;
}

/** Find node and offset for a given character position by walking text nodes */
export function getNodeAndOffsetAtOffset(root: Node, targetOffset: number): { node: Node; offset: number } | null {
  let current = 0;
  const walk = (node: Node): { node: Node; offset: number } | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent ?? '').length;
      if (targetOffset <= current + len) return { node, offset: targetOffset - current };
      current += len;
      return null;
    }
    for (const child of node.childNodes) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  };
  return walk(root);
}

/** Create a Range that spans the given character offsets within the element */
export function createRangeBetweenOffsets(el: HTMLElement, startOffset: number, endOffset: number): Range | null {
  const start = getNodeAndOffsetAtOffset(el, startOffset);
  const end = getNodeAndOffsetAtOffset(el, endOffset);
  if (!start || !end) return null;
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range;
}

/** Set selection/caret to the given character offset */
export function setCaretToOffset(el: HTMLElement, offset: number): void {
  const pos = getNodeAndOffsetAtOffset(el, offset);
  if (!pos) return;
  const sel = globalThis.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.setStart(pos.node, pos.offset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Place caret immediately after the given node. Inserts a space + zero-width space so there is a visible gap after the mention and the cursor has a stable position. */
export function setCaretAfterNode(node: Node): void {
  const sel = globalThis.getSelection();
  if (!sel) return;
  const parent = node.parentNode;
  if (!parent) return;
  const anchor = document.createTextNode(' \u200B');
  if (node.nextSibling) {
    node.nextSibling.before(anchor);
  } else {
    parent.appendChild(anchor);
  }
  const range = document.createRange();
  range.setStart(anchor, 2);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * Place caret immediately after the given node (no extra nodes inserted).
 * Use when user clicks inside a mention span to move the cursor out of it.
 */
export function placeCaretAfter(node: Node): void {
  const sel = globalThis.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

const HIGHLIGHT_MENTION_CLASS = 'highlight-mention';

/**
 * Normalizes mention HTML so that:
 * - No <span class="highlight-mention"> is nested inside another; inner spans are moved to siblings.
 * - Serialized output has all spans properly closed (via DOM parse/serialize).
 * Use before sending contenteditable innerHTML to the backend.
 */
export function normalizeHighlightMentionHtml(html: string): string {
  if (typeof html !== 'string' || !html.trim()) return html;
  const div = document.createElement('div');
  div.innerHTML = html.trim();

  function flattenMentionSpans(container: HTMLElement): void {
    let changed = true;
    while (changed) {
      changed = false;
      const mentionSpans = container.querySelectorAll<HTMLElement>(`.${HIGHLIGHT_MENTION_CLASS}`);
      mentionSpans.forEach((span) => {
        const innerMentions = span.querySelectorAll<HTMLElement>(`:scope > .${HIGHLIGHT_MENTION_CLASS}`);
        if (innerMentions.length === 0) return;
        changed = true;
        const parent = span.parentNode;
        if (!parent) return;
        const before: ChildNode[] = [];
        const toMove: HTMLElement[] = [];
        let foundInner = false;
        span.childNodes.forEach((child) => {
          if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).classList.contains(HIGHLIGHT_MENTION_CLASS)) {
            foundInner = true;
            toMove.push(child as HTMLElement);
          } else if (!foundInner) {
            before.push(child);
          }
        });
        const fragment = document.createDocumentFragment();
        before.forEach((n) => fragment.appendChild(n.cloneNode(true)));
        span.textContent = '';
        span.appendChild(fragment);
        let next: ChildNode | null = span.nextSibling;
        toMove.forEach((el) => {
          if (next) next.before(el);
          else parent.appendChild(el);
        });
      });
    }
  }

  flattenMentionSpans(div);
  return div.innerHTML;
}

/**
 * Returns mention user IDs in document order from normalized mention HTML.
 * Use after normalizeHighlightMentionHtml to get the correct order for the API.
 */
export function getMentionUserIdsFromHtml(html: string): string[] {
  if (typeof html !== 'string' || !html.trim()) return [];
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  const spans = div.querySelectorAll<HTMLElement>(`.${HIGHLIGHT_MENTION_CLASS}[data-user-id]`);
  return Array.from(spans).map((el) => el.dataset.userId ?? '').filter(Boolean);
}

// --- Comment segments (array of mention/text) for API payload ---

export type CommentSegmentMention = { type: 'mention'; uuid: string; text: string };
export type CommentSegmentText = { type: 'text'; text: string };
export type CommentSegment = CommentSegmentMention | CommentSegmentText;

export interface MentionableUserForSegments {
  uuid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

/** Strips any <span> tags from a string (for plain-text payload). */
export function stripSpans(s: string): string {
  return s.replaceAll(/<\/?span[^>]{0,200}>/gi, '');
}

function pushTextSegment(segments: CommentSegment[], text: string): void {
  if (text.trim().length > 0) segments.push({ type: 'text', text });
}

function getMentionDisplayName(uuid: string, mentionableUsers: MentionableUserForSegments[]): string {
  const user = mentionableUsers.find((u) => u.uuid === uuid);
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || '';
}

function buildMentionPattern(displayName: string): RegExp {
  const escaped = displayName.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('@' + escaped + String.raw`(?=\s|$)`);
}

/** Finds the next occurrence of `uuid`'s mention in `remaining`, pushes the preceding text and the mention segment, and returns the leftover text. */
function consumeMention(
  remaining: string,
  uuid: string,
  mentionableUsers: MentionableUserForSegments[],
  segments: CommentSegment[]
): string {
  const displayName = getMentionDisplayName(uuid, mentionableUsers);
  if (!displayName) return remaining;
  const match = buildMentionPattern(displayName).exec(remaining);
  if (!match) return remaining;
  const idx = remaining.indexOf(match[0]);
  if (idx > 0) pushTextSegment(segments, stripSpans(remaining.slice(0, idx)));
  segments.push({ type: 'mention', uuid, text: match[0] });
  return remaining.slice(idx + match[0].length);
}

/**
 * Builds comment as an array of segments: { type: 'mention', uuid, text } for mentions,
 * { type: 'text', text } for plain text. Order of mentionUserIds matches order of mentions in comment.
 * Drops segments whose text is only whitespace.
 */
export function buildCommentSegments(
  comment: string,
  mentionUserIds: string[],
  mentionableUsers: MentionableUserForSegments[]
): CommentSegment[] {
  const segments: CommentSegment[] = [];
  const ids = mentionUserIds ?? [];
  const cleanComment = stripSpans(comment);
  if (ids.length === 0) {
    pushTextSegment(segments, cleanComment);
    return segments;
  }
  let remaining = cleanComment;
  for (const uuid of ids) {
    remaining = consumeMention(remaining, uuid, mentionableUsers, segments);
  }
  pushTextSegment(segments, stripSpans(remaining));
  return segments.filter((seg) => seg.type !== 'text' || seg.text.trim().length > 0);
}

// --- Content to HTML/plain for contenteditable (e.g. when opening edit mode) ---

/** Segment as stored by API; may use .text or .value */
export type RawContentSegment =
  | { type: 'mention'; uuid?: string; text?: string; value?: string }
  | { type: 'text'; text?: string; value?: string };

function getSegmentText(seg: RawContentSegment): string {
  const t = 'text' in seg ? seg.text : ('value' in seg ? seg.value : undefined);
  return typeof t === 'string' ? t : '';
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/**
 * Converts note content (string or array of segments) to plain text and HTML suitable for a contenteditable.
 * Handles segments with either .text or .value. Use when opening edit mode so the user sees the current content.
 */
export function contentToEditState(
  content: string | RawContentSegment[] | null | undefined
): { plain: string; html: string } {
  if (content == null) return { plain: '', html: '' };
  if (Array.isArray(content)) {
    const plain = content.map(getSegmentText).join('');
    const html = content
      .map((seg) => {
        const text = getSegmentText(seg);
        if (seg.type === 'mention' && seg.uuid) {
          return `<span class="highlight-mention" data-user-id="${escapeHtml(seg.uuid)}" contenteditable="false">${escapeHtml(text)}</span>`;
        }
        return escapeHtml(text);
      })
      .join('');
    return { plain, html };
  }
  const str = typeof content === 'string' ? content : '';
  const plain = str.replaceAll(/<[^>]{0,500}>/g, '').replaceAll(/\u200B/g, '');
  const hasMentionSpans = str.includes('highlight-mention');
  let html = hasMentionSpans ? str : escapeHtml(str);
  if (hasMentionSpans && html.includes('class="highlight-mention"')) {
    const mentionSpanRegex = /<span\s+class="highlight-mention"([^>]{0,200})>/gi;
    html = html.replace(mentionSpanRegex, (_, attrs) => {
      const hasContentEditableFalse = /contenteditable\s*=\s*["']false["']/i.test(attrs);
      return hasContentEditableFalse
        ? `<span class="highlight-mention"${attrs}>`
        : `<span class="highlight-mention"${attrs} contenteditable="false">`;
    });
  }
  return { plain, html };
}

// --- Avatar color (shared by activity/mention UI) ---

/**
 * Returns a consistent avatar background color based on the first letter of the given name (e.g. last name).
 * Falls back to the first letter of the email when name is empty.
 * Uses A–Z index into AVATAR_COLORS_BY_LETTER; returns AVATAR_COLOR_DEFAULT for empty or non-A–Z.
 */
export function getAvatarColor(lastName: string | null | undefined, email?: string | null): string {
  let s = (lastName != null ? String(lastName).trim() : '');
  if (s.length === 0 && email) {
    s = String(email).trim().split('@')[0] || '';
  }
  if (s.length === 0) return AVATAR_COLOR_DEFAULT;
  const char = s.charAt(0).toUpperCase();
  const code = char.codePointAt(0);
  if (code != null && code >= 65 && code <= 90) {
    return AVATAR_COLORS_BY_LETTER[code - 65];
  }
  return AVATAR_COLOR_DEFAULT;
}

/**
 * Returns up to two uppercase initials from a full name (e.g. "Joel Izaguirre" → "JI").
 * Falls back to the first two characters of the email (before @) when name is empty.
 * Returns "?" only when both name and email are empty.
 */
export function getInitials(name: string | null | undefined, email?: string | null): string {
  const s = name != null ? String(name).trim() : '';
  if (s) {
    const parts = s.split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return s.substring(0, 2).toUpperCase();
  }
  const e = email != null ? String(email).trim() : '';
  if (e) {
    const local = e.split('@')[0];
    return (local || '').substring(0, 2).toUpperCase();
  }
  return '?';
}

// --- Display content: notification/note preview and detail (shared by HomeNavbar, HomeMessagesDetails, NotesScrollCards) ---

export type NormalizedSegment = { type: 'text' | 'mention'; value: string; uuid?: string };

/** Raw content from API: string or array of segments with type, text/content/value, uuid */
export type RawDisplayContent =
  | string
  | Array<{ type?: string; text?: string; content?: string; value?: string; uuid?: string }>;

export function isDisplayContentArray(
  c: unknown
): c is Array<{ type?: string; text?: string; content?: string; value?: string; uuid?: string }> {
  return Array.isArray(c);
}

/** Strip HTML tags and return plain text (for preview/tooltip) */
export function getTextFromHtml(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText || '';
  return text.trim();
}

/** Parse plain string with @mentions into normalized segments (regex-based) */
export function parseContentWithMentions(content: string): NormalizedSegment[] {
  const segments: NormalizedSegment[] = [];
  const re = /@([^\s@]+(?:\s+[^\s@]+)*)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, m.index) });
    }
    segments.push({ type: 'mention', value: '@' + m[1].trim() });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: 'text', value: content }];
}

const HIGHLIGHT_MENTION_SPAN_REGEX = /<span\s+class="highlight-mention"[^>]*>[^<]*<\/span>/g;

/** Escape HTML but preserve <span class="highlight-mention">...</span> for safe v-html display */
export function sanitizeMentionContent(content: string): string {
  const parts = content.split(HIGHLIGHT_MENTION_SPAN_REGEX);
  const spans = content.match(HIGHLIGHT_MENTION_SPAN_REGEX) ?? [];
  let out = '';
  parts.forEach((part, i) => {
    out += escapeHtml(part);
    if (spans[i]) out += spans[i];
  });
  return out;
}

/** Whether content is a string containing highlight-mention spans */
export function contentHasHighlightSpans(content: string): boolean {
  return typeof content === 'string' && content.includes('highlight-mention');
}

function getRawSegmentText(seg: { text?: string; content?: string; value?: string } | string): string {
  if (typeof seg === 'string') return seg;
  return (seg?.text ?? seg?.content ?? seg?.value ?? '').toString();
}

/** Convert raw content (string or array from API) to normalized segments for display */
export function contentToNormalizedSegments(content: RawDisplayContent): NormalizedSegment[] {
  if (isDisplayContentArray(content)) {
    return content.map((seg) => {
      const text = getRawSegmentText(seg);
      const isMention = seg && typeof seg === 'object' && seg.type === 'mention';
      return isMention
        ? { type: 'mention' as const, value: text, uuid: (seg as { uuid?: string }).uuid }
        : { type: 'text' as const, value: text };
    });
  }
  if (typeof content !== 'string') return [];
  // Strip any wrapping HTML (e.g. backend excerpt <div class="excerpt pt-1">…</div>)
  // before mention parsing so tags are never rendered literally as text.
  return parseContentWithMentions(getTextFromHtml(content));
}

/** Plain text from raw content, truncated to maxLen (for tooltip/preview) */
export function getPreviewTextFromContent(content: RawDisplayContent, maxLen: number = 100): string {
  let plain = '';
  if (isDisplayContentArray(content)) {
    plain = content.map((seg) => getRawSegmentText(seg)).join('').trim();
  } else {
    plain = typeof content === 'string' ? getTextFromHtml(content) : '';
  }
  if (plain.length <= maxLen) return plain || '-';
  return plain.slice(0, maxLen) + '...';
}

/** Truncate segments to total length <= maxLen; last segment may get "..." */
export function segmentsTruncateToLength(
  segments: NormalizedSegment[],
  maxLen: number
): NormalizedSegment[] {
  if (maxLen <= 0 || !segments.length) return segments;
  let total = 0;
  const result: NormalizedSegment[] = [];
  for (const seg of segments) {
    const len = seg.value.length;
    if (total + len <= maxLen) {
      result.push({ ...seg });
      total += len;
    } else {
      const remaining = maxLen - total;
      if (remaining > 0) {
        result.push({ ...seg, value: seg.value.slice(0, remaining) + '...' });
      }
      break;
    }
  }
  return result;
}

/** Get display content from notification-like object (commentContent ?? comment_content ?? message) */
export function getDisplayContentFromNotification(notification: any): RawDisplayContent {
  const raw = notification?.commentContent ?? notification?.comment_content ?? notification?.message ?? '';
  return raw;
}
