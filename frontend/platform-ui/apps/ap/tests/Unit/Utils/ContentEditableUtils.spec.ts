/**
 * Unit tests for ContentEditableUtils
 * Code coverage for caret/selection, mention HTML, comment segments, and display content utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCaretCharacterOffsetWithin,
  getNodeAndOffsetAtOffset,
  createRangeBetweenOffsets,
  setCaretToOffset,
  setCaretAfterNode,
  placeCaretAfter,
  normalizeHighlightMentionHtml,
  getMentionUserIdsFromHtml,
  stripSpans,
  buildCommentSegments,
  contentToEditState,
  getAvatarColor,
  isDisplayContentArray,
  getTextFromHtml,
  parseContentWithMentions,
  sanitizeMentionContent,
  contentHasHighlightSpans,
  contentToNormalizedSegments,
  getPreviewTextFromContent,
  segmentsTruncateToLength,
  getDisplayContentFromNotification,
  type NormalizedSegment,
  type RawDisplayContent,
  type MentionableUserForSegments
} from '@/utils/ContentEditableUtils'

describe('ContentEditableUtils', () => {
  describe('getTextFromHtml', () => {
    it('returns empty string for empty input', () => {
      expect(getTextFromHtml('')).toBe('')
    })

    it('strips HTML tags and returns plain text', () => {
      expect(getTextFromHtml('<p>Hello</p>')).toBe('Hello')
      expect(getTextFromHtml('<span>World</span>')).toBe('World')
    })

    it('trims whitespace', () => {
      expect(getTextFromHtml('  <div> text </div>  ')).toBe('text')
    })

    it('handles nested HTML', () => {
      expect(getTextFromHtml('<div><span>Nested</span> content</div>')).toBe('Nested content')
    })

    it('handles highlight-mention spans', () => {
      expect(getTextFromHtml('<span class="highlight-mention">@user</span>')).toBe('@user')
    })
  })

  describe('stripSpans', () => {
    it('removes span tags', () => {
      expect(stripSpans('<span>x</span>')).toBe('x')
      expect(stripSpans('a<span class="x">b</span>c')).toBe('abc')
    })

    it('handles opening span with attributes', () => {
      expect(stripSpans('</span>')).toBe('')
      expect(stripSpans('<span class="highlight-mention" data-id="1">@u</span>')).toBe('@u')
    })
  })

  describe('isDisplayContentArray', () => {
    it('returns true for arrays', () => {
      expect(isDisplayContentArray([])).toBe(true)
      expect(isDisplayContentArray([{ type: 'text', text: 'hi' }])).toBe(true)
    })

    it('returns false for non-arrays', () => {
      expect(isDisplayContentArray('')).toBe(false)
      expect(isDisplayContentArray(null)).toBe(false)
      expect(isDisplayContentArray(undefined)).toBe(false)
      expect(isDisplayContentArray(123)).toBe(false)
    })
  })

  describe('parseContentWithMentions', () => {
    it('returns single text segment when no mentions', () => {
      expect(parseContentWithMentions('Hello world')).toEqual([{ type: 'text', value: 'Hello world' }])
    })

    it('splits text and mention segments', () => {
      const result = parseContentWithMentions('Hi @John Doe here')
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result[0]).toEqual({ type: 'text', value: 'Hi ' })
      expect(result[1].type).toBe('mention')
      expect((result[1] as any).value).toMatch(/^@John Doe(\s|$)/)
    })

    it('handles multiple mentions', () => {
      const result = parseContentWithMentions('@A\n@B')
      expect(result.length).toBeGreaterThanOrEqual(3)
      expect(result[0].type).toBe('mention')
      expect(result[0].value).toBe('@A')
    })

    it('handles only mention', () => {
      const result = parseContentWithMentions('@Only')
      expect(result).toEqual([{ type: 'mention', value: '@Only' }])
    })

    it('handles empty string', () => {
      expect(parseContentWithMentions('')).toEqual([{ type: 'text', value: '' }])
    })
  })

  describe('sanitizeMentionContent', () => {
    it('escapes HTML but preserves highlight-mention spans', () => {
      const input = 'Hello <span class="highlight-mention">@user</span> <script>alert(1)</script>'
      const out = sanitizeMentionContent(input)
      expect(out).toContain('highlight-mention')
      expect(out).toContain('@user')
      expect(out).not.toContain('<script>')
    })

    it('returns empty string for empty input', () => {
      expect(sanitizeMentionContent('')).toBe('')
    })

    it('preserves multiple mention spans', () => {
      const input = 'A <span class="highlight-mention">@x</span> B <span class="highlight-mention">@y</span> C'
      const out = sanitizeMentionContent(input)
      expect(out).toContain('@x')
      expect(out).toContain('@y')
    })
  })

  describe('contentHasHighlightSpans', () => {
    it('returns true when string contains highlight-mention', () => {
      expect(contentHasHighlightSpans('<span class="highlight-mention">@u</span>')).toBe(true)
    })

    it('returns false when string has no highlight-mention', () => {
      expect(contentHasHighlightSpans('plain text')).toBe(false)
      expect(contentHasHighlightSpans('<span>other</span>')).toBe(false)
    })
  })

  describe('contentToNormalizedSegments', () => {
    it('converts string to segments via parseContentWithMentions', () => {
      const result = contentToNormalizedSegments('Hi @John')
      expect(result.some(s => s.type === 'mention' && s.value === '@John')).toBe(true)
    })

    it('converts array with type and text to normalized segments', () => {
      const input: RawDisplayContent = [
        { type: 'text', text: 'Hello ' },
        { type: 'mention', text: '@Jane', uuid: 'uuid-1' }
      ]
      const result = contentToNormalizedSegments(input)
      expect(result).toEqual([
        { type: 'text', value: 'Hello ' },
        { type: 'mention', value: '@Jane', uuid: 'uuid-1' }
      ])
    })

    it('uses content or value when text missing', () => {
      const input: RawDisplayContent = [
        { type: 'text', content: 'Hey ' },
        { type: 'mention', value: '@Bob', uuid: 'u2' }
      ]
      const result = contentToNormalizedSegments(input)
      expect(result[0].value).toBe('Hey ')
      expect(result[1].value).toBe('@Bob')
    })

    it('returns empty array for non-string non-array', () => {
      expect(contentToNormalizedSegments(null as any)).toEqual([])
      expect(contentToNormalizedSegments(undefined as any)).toEqual([])
    })

    it('strips wrapping HTML from string content', () => {
      const result = contentToNormalizedSegments(
        '<div class="excerpt pt-1">Re-calculate process finished. </div>'
      )
      expect(result).toEqual([{ type: 'text', value: 'Re-calculate process finished.' }])
    })
  })

  describe('getPreviewTextFromContent', () => {
    it('returns plain text from string HTML', () => {
      expect(getPreviewTextFromContent('<p>Hello</p>')).toBe('Hello')
    })

    it('returns plain text from segment array', () => {
      const content: RawDisplayContent = [
        { type: 'text', text: 'Hi ' },
        { type: 'mention', text: '@User' }
      ]
      expect(getPreviewTextFromContent(content)).toBe('Hi @User')
    })

    it('truncates to maxLen with ellipsis', () => {
      expect(getPreviewTextFromContent('Hello world', 5)).toBe('Hello...')
      expect(getPreviewTextFromContent('Hi', 10)).toBe('Hi')
    })

    it('returns default maxLen 100', () => {
      const long = 'a'.repeat(150)
      expect(getPreviewTextFromContent(long).endsWith('...')).toBe(true)
    })

    it('returns "-" when content yields empty plain text', () => {
      expect(getPreviewTextFromContent('')).toBe('-')
      expect(getPreviewTextFromContent('<p></p>')).toBe('-')
    })
  })

  describe('segmentsTruncateToLength', () => {
    it('returns same segments when under maxLen', () => {
      const segs: NormalizedSegment[] = [
        { type: 'text', value: 'Hi ' },
        { type: 'mention', value: '@U' }
      ]
      expect(segmentsTruncateToLength(segs, 10)).toEqual(segs)
    })

    it('truncates last segment and adds ...', () => {
      const segs: NormalizedSegment[] = [
        { type: 'text', value: 'Hi ' },
        { type: 'mention', value: '@LongName' }
      ]
      const result = segmentsTruncateToLength(segs, 6)
      expect(result).toHaveLength(2)
      expect(result[0].value).toBe('Hi ')
      expect(result[1].value).toBe('@Lo...')
    })

    it('returns same when maxLen <= 0', () => {
      const segs: NormalizedSegment[] = [{ type: 'text', value: 'x' }]
      expect(segmentsTruncateToLength(segs, 0)).toEqual(segs)
    })

    it('returns empty array as-is', () => {
      expect(segmentsTruncateToLength([], 5)).toEqual([])
    })
  })

  describe('getDisplayContentFromNotification', () => {
    it('prefers commentContent', () => {
      expect(getDisplayContentFromNotification({ commentContent: 'a', message: 'b' })).toBe('a')
    })

    it('falls back to comment_content then message', () => {
      expect(getDisplayContentFromNotification({ comment_content: 'b', message: 'c' })).toBe('b')
      expect(getDisplayContentFromNotification({ message: 'c' })).toBe('c')
    })

    it('returns empty string when nothing present', () => {
      expect(getDisplayContentFromNotification({})).toBe('')
      expect(getDisplayContentFromNotification(null)).toBe('')
    })

    it('returns array when notification has commentContent as array', () => {
      const arr = [{ type: 'text', text: 'hi' }]
      expect(getDisplayContentFromNotification({ commentContent: arr })).toBe(arr)
    })
  })

  describe('buildCommentSegments', () => {
    const users: MentionableUserForSegments[] = [
      { uuid: 'u1', firstName: 'John', lastName: 'Doe' },
      { uuid: 'u2', firstName: 'Jane', lastName: 'Smith' }
    ]

    it('returns single text segment when no mentionUserIds', () => {
      const result = buildCommentSegments('Hello world', [], users)
      expect(result).toEqual([{ type: 'text', text: 'Hello world' }])
    })

    it('returns empty when only whitespace and no ids', () => {
      expect(buildCommentSegments('   ', [], users)).toEqual([])
    })

    it('builds text and mention segments in order', () => {
      const result = buildCommentSegments('Hi @John Doe and @Jane Smith', ['u1', 'u2'], users)
      expect(result.length).toBeGreaterThanOrEqual(2)
      const firstMention = result.find(s => s.type === 'mention' && s.uuid === 'u1')
      expect(firstMention).toBeDefined()
      expect((firstMention as any).text).toBe('@John Doe')
    })

    it('strips span tags from comment', () => {
      const result = buildCommentSegments('<span>Hi</span> @John Doe', ['u1'], users)
      expect(result.some(s => s.type === 'text' && s.text.includes('Hi'))).toBe(true)
    })
  })

  describe('contentToEditState', () => {
    it('returns empty for null/undefined', () => {
      expect(contentToEditState(null)).toEqual({ plain: '', html: '' })
      expect(contentToEditState(undefined)).toEqual({ plain: '', html: '' })
    })

    it('converts segment array to plain and html', () => {
      const content = [
        { type: 'text', text: 'Hello ' },
        { type: 'mention', uuid: 'u1', text: '@John Doe' }
      ]
      const { plain, html } = contentToEditState(content as any)
      expect(plain).toBe('Hello @John Doe')
      expect(html).toContain('highlight-mention')
      expect(html).toContain('data-user-id')
    })

    it('converts string with mention spans', () => {
      const str = 'Hi <span class="highlight-mention" data-user-id="u1">@User</span>'
      const { plain, html } = contentToEditState(str)
      expect(plain).not.toContain('<span')
      expect(html).toContain('highlight-mention')
    })

    it('uses value when text missing on segment', () => {
      const content = [{ type: 'text', value: 'Hey' }]
      const { plain } = contentToEditState(content as any)
      expect(plain).toBe('Hey')
    })
  })

  describe('getAvatarColor', () => {
    it('returns default for empty or null', () => {
      const defaultColor = getAvatarColor('')
      expect(defaultColor).toBeDefined()
      expect(getAvatarColor(null)).toBe(defaultColor)
      expect(getAvatarColor(undefined)).toBe(defaultColor)
    })

    it('returns same color for same first letter', () => {
      const a = getAvatarColor('Anderson')
      const b = getAvatarColor('Adams')
      expect(a).toBe(b)
    })

    it('returns color for A-Z first letter', () => {
      expect(getAvatarColor('Zebra')).toBeDefined()
      expect(getAvatarColor('Alpha')).toBeDefined()
    })
  })

  describe('normalizeHighlightMentionHtml', () => {
    it('returns input for empty or whitespace', () => {
      expect(normalizeHighlightMentionHtml('')).toBe('')
      expect(normalizeHighlightMentionHtml('  ')).toBe('  ')
    })

    it('returns trimmed HTML for simple content', () => {
      const html = '  <span class="highlight-mention">@u</span>  '
      expect(normalizeHighlightMentionHtml(html).trim()).toBe(html.trim())
    })

    it('flattens nested mention spans', () => {
      const nested = '<span class="highlight-mention"><span class="highlight-mention">@u</span></span>'
      const result = normalizeHighlightMentionHtml(nested)
      expect(result).toContain('highlight-mention')
    })
  })

  describe('getMentionUserIdsFromHtml', () => {
    it('returns empty array for empty input', () => {
      expect(getMentionUserIdsFromHtml('')).toEqual([])
      expect(getMentionUserIdsFromHtml('   ')).toEqual([])
    })

    it('extracts data-user-id from highlight-mention spans', () => {
      const html = '<span class="highlight-mention" data-user-id="user-1">@John</span>'
      expect(getMentionUserIdsFromHtml(html)).toEqual(['user-1'])
    })

    it('returns multiple ids in order', () => {
      const html =
        '<span class="highlight-mention" data-user-id="a">@A</span> ' +
        '<span class="highlight-mention" data-user-id="b">@B</span>'
      expect(getMentionUserIdsFromHtml(html)).toEqual(['a', 'b'])
    })
  })

  describe('getNodeAndOffsetAtOffset', () => {
    it('returns node and offset for text node', () => {
      const el = document.createElement('div')
      el.textContent = 'hello'
      const result = getNodeAndOffsetAtOffset(el, 2)
      expect(result).not.toBeNull()
      expect(result!.offset).toBe(2)
      expect(result!.node.textContent).toBe('hello')
    })

    it('returns null when offset beyond length', () => {
      const el = document.createElement('div')
      el.textContent = 'hi'
      expect(getNodeAndOffsetAtOffset(el, 10)).toBeNull()
    })

    it('finds offset in first of multiple text nodes', () => {
      const el = document.createElement('div')
      el.appendChild(document.createTextNode('ab'))
      el.appendChild(document.createTextNode('cd'))
      const result = getNodeAndOffsetAtOffset(el, 1)
      expect(result).not.toBeNull()
      expect(result!.offset).toBe(1)
    })
  })

  describe('createRangeBetweenOffsets', () => {
    it('returns range for valid offsets', () => {
      const el = document.createElement('div')
      el.textContent = 'hello world'
      const range = createRangeBetweenOffsets(el, 0, 5)
      expect(range).not.toBeNull()
      expect(range!.toString()).toBe('hello')
    })

    it('returns null when start or end not found', () => {
      const el = document.createElement('div')
      el.textContent = 'hi'
      expect(createRangeBetweenOffsets(el, 0, 50)).toBeNull()
    })
  })

  describe('getCaretCharacterOffsetWithin', () => {
    beforeEach(() => {
      const mockRange = {
        toString: () => '',
        selectNodeContents: vi.fn(),
        setEnd: vi.fn()
      }
      const mockSel = {
        anchorNode: null as Node | null,
        anchorOffset: 0,
        rangeCount: 1,
        getRangeAt: () => mockRange,
        removeAllRanges: vi.fn(),
        addRange: vi.fn()
      }
      vi.stubGlobal('getSelection', () => mockSel)
    })

    it('returns 0 when no selection', () => {
      vi.stubGlobal('getSelection', () => null)
      const el = document.createElement('div')
      el.textContent = 'hello'
      expect(getCaretCharacterOffsetWithin(el)).toBe(0)
    })

    it('returns 0 when rangeCount is 0', () => {
      vi.stubGlobal('getSelection', () => ({ rangeCount: 0 }))
      const el = document.createElement('div')
      expect(getCaretCharacterOffsetWithin(el)).toBe(0)
    })

    it('returns 0 when element does not contain anchor node', () => {
      const el = document.createElement('div')
      el.textContent = 'hi'
      const other = document.createElement('span')
      other.textContent = 'x'
      const mockSel = {
        anchorNode: other.firstChild,
        anchorOffset: 0,
        rangeCount: 1,
        getRangeAt: () => ({ selectNodeContents: vi.fn(), setEnd: vi.fn(), toString: () => '0' })
      }
      vi.stubGlobal('getSelection', () => mockSel)
      expect(getCaretCharacterOffsetWithin(el)).toBe(0)
    })
  })

  describe('setCaretToOffset', () => {
    it('does not throw when element has text', () => {
      const el = document.createElement('div')
      el.textContent = 'hello'
      const mockSel = { removeAllRanges: vi.fn(), addRange: vi.fn() }
      vi.stubGlobal('getSelection', () => mockSel)
      expect(() => setCaretToOffset(el, 2)).not.toThrow()
    })

    it('does nothing when getNodeAndOffsetAtOffset returns null', () => {
      const el = document.createElement('div')
      el.textContent = 'x'
      const mockSel = { removeAllRanges: vi.fn(), addRange: vi.fn() }
      vi.stubGlobal('getSelection', () => mockSel)
      setCaretToOffset(el, 100)
      expect(mockSel.addRange).not.toHaveBeenCalled()
    })
  })

  describe('placeCaretAfter', () => {
    it('does not throw when node has parent', () => {
      const parent = document.createElement('div')
      const child = document.createElement('span')
      child.textContent = 'x'
      parent.appendChild(child)
      const mockSel = { removeAllRanges: vi.fn(), addRange: vi.fn() }
      vi.stubGlobal('getSelection', () => mockSel)
      expect(() => placeCaretAfter(child)).not.toThrow()
    })

    it('does nothing when getSelection is null', () => {
      vi.stubGlobal('getSelection', () => null)
      const child = document.createElement('span')
      document.body.appendChild(child)
      expect(() => placeCaretAfter(child)).not.toThrow()
      document.body.removeChild(child)
    })
  })

  describe('setCaretAfterNode', () => {
    it('does nothing when getSelection is null', () => {
      vi.stubGlobal('getSelection', () => null)
      const span = document.createElement('span')
      document.body.appendChild(span)
      expect(() => setCaretAfterNode(span)).not.toThrow()
      document.body.removeChild(span)
    })

    it('does nothing when node has no parent', () => {
      const mockSel = { removeAllRanges: vi.fn(), addRange: vi.fn() }
      vi.stubGlobal('getSelection', () => mockSel)
      const span = document.createElement('span')
      const parent = document.createElement('div')
      parent.appendChild(span)
      parent.removeChild(span)
      expect(() => setCaretAfterNode(span)).not.toThrow()
    })
  })
})
