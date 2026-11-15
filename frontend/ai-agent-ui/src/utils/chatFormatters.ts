import type { SummaryBullet, ToneDescriptor, MessageVisualContext } from '@/types/chat'

export type { MessageVisualContext }

export const TONE_COLORS: Record<string, string> = {
  collaborative: '#16A394',
  assertive:     '#E5484D',
  methodical:    '#3D78F0',
  empathetic:    '#F59E0B',
  strategic:     '#8B5CF6',
}

export function visualContextFromSupplierData(data: unknown): MessageVisualContext | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, unknown>
  const supplier = (root.supplier ?? root) as Record<string, unknown>
  const country = typeof supplier.country === 'string' ? supplier.country : null
  return {
    supplierName: typeof supplier.name === 'string' ? supplier.name : null,
    country,
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function parseBullets(raw: string): SummaryBullet[] {
  return raw
    .split('\n')
    .filter((line) => /^\s*[*•]/.test(line))
    .map((line) => {
      const stripped = line.replace(/^\s*[*•]+\s*/, '').replace(/\*\*/g, '')
      const colonIdx = stripped.indexOf(':')
      if (colonIdx > 0) {
        return { label: stripped.slice(0, colonIdx).trim(), content: stripped.slice(colonIdx + 1).trim() }
      }
      return { label: '', content: stripped.trim() }
    })
    .filter((item) => item.content)
}

const RANGE_RE =
  /\b\d+(?:\.\d+)?\s*(?:to|\/|-)\s*\d+(?:\.\d+)?[\s-]?(?:days?|tagen?|%)\b/gi
const FIGURE_RE =
  /\$\d[\d,]*(?:\.\d+)?\s?(?:m|k|b|bn|mm|million|billion|thousand)?\b|\bn=\d+\b|\b\d+(?:\.\d+)?[KMB]\b|\bNet\s+\d+\b|\b\d+(?:\.\d+)?[\s-]?(?:days?|tagen?)\b|\b\d+(?:\.\d+)?%/gi
/** Bare day counts next to an arrow or "to N days" / "to N-day" destination. */
const BARE_DAY_RE =
  /\b\d+\b(?=\s*(?:→|->|⇒)\s*\d+\s*(?:-?\s*days?|tagen?)?\b)|\b\d+\b(?=\s+to\s+\d+\s*-?\s*(?:days?|tagen?)\b)|(?:today'?s|current(?:ly)?)\s+(\d+)\b(?!\s*-?\s*(?:days?|tagen?)\b)/gi
const FIG_OPEN = '\u0001FIG\u0001'
const FIG_CLOSE = '\u0001/FIG\u0001'

function wrapFigMatch(m: string): string {
  return `${FIG_OPEN}${m}${FIG_CLOSE}`
}

function markFigures(text: string): string {
  let marked = text.replace(RANGE_RE, (m) => wrapFigMatch(m))

  const afterRange = marked.split(new RegExp(`(${FIG_OPEN}.*?${FIG_CLOSE})`, 'g'))
  marked = afterRange
    .map((part) =>
      part.startsWith(FIG_OPEN)
        ? part
        : part.replace(BARE_DAY_RE, (m, g1?: string) => {
            if (g1 != null) {
              const idx = m.lastIndexOf(g1)
              return `${m.slice(0, idx)}${wrapFigMatch(g1)}`
            }
            return wrapFigMatch(m)
          }),
    )
    .join('')

  const parts = marked.split(new RegExp(`(${FIG_OPEN}.*?${FIG_CLOSE})`, 'g'))
  return parts
    .map((part) =>
      part.startsWith(FIG_OPEN)
        ? part
        : part.replace(FIGURE_RE, (m) => wrapFigMatch(m)),
    )
    .join('')
}

function wrapFigures(html: string): string {
  return html
    .replaceAll(FIG_OPEN, '<strong class="md-figure">')
    .replaceAll(FIG_CLOSE, '</strong>')
}

function applyInline(text: string): string {
  const withBold = text.replace(/\*{1,}([^*\n]+?)\*{1,}/g, (match, inner) => {
    const before = match.match(/^\*+/)![0].length
    const after = match.match(/\*+$/)![0].length
    return (before >= 2 || after >= 2) ? `<strong>${inner}</strong>` : inner
  })
  return withBold.replace(/\*+/g, '')
}

function stripMarkdownDecorators(text: string): string {
  return text
    .replace(/^\s{0,3}#{1,6}\s+/g, '')
    .replace(/^\s*(?:>|&gt;)\s?/g, '')
    .replace(/\*{1,}([^*\n]+?)\*{1,}/g, '$1')
    .replace(/\*+/g, '')
    .replace(/\{\{logo\}\}/g, '')
    .trim()
}

export function toPlainText(raw: string): string {
  return raw
    .split('\n')
    .map((line) => {
      const bullet = line.match(/^[ \t]*[*\-]\s+(.+)$/)
      if (bullet) return `• ${stripMarkdownDecorators(bullet[1])}`
      return stripMarkdownDecorators(line)
    })
    .join('\n')
    .trim()
}

function markHeadingPrefix(text: string): string {
  const numbered = text.match(/^(\d+\.\s+[^—\-:\n]{2,60}?)(\s*(?:—|-|:)\s*)/)
  if (numbered) {
    return `**${numbered[1]}**${numbered[2]}${text.slice(numbered[0].length)}`
  }

  // Pushback labels — with colon, or bare / bold label before a new sentence.
  const pushbackColon = text.match(
    /^(?:\*{1,2})?(Read|Say|If they hold)(?:\*{1,2})?:(\s*)([\s\S]*)$/i,
  )
  const pushbackBare = text.match(
    /^(?:\*{1,2})?(Read|Say|If they hold)(?:\*{1,2})?(\s+)(["“'A-Z][\s\S]*)$/,
  )
  const pushback = pushbackColon ?? pushbackBare
  if (pushback) {
    const label = pushback[1]
    const rest = pushbackColon ? (pushback[3] ?? '') : (pushback[3] ?? '')
    const canonical =
      label.toLowerCase() === 'if they hold'
        ? 'If they hold'
        : label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
    const body = rest.replace(/^\s+/, '')
    return body ? `**${canonical}**: ${body}` : `**${canonical}**:`
  }

  const label = text.match(/^([A-Z][A-Za-z]*(?:\s(?:&|and)?\s?[A-Za-z]+){0,3}):\s/)
  if (label) {
    return `**${label[1]}**: ${text.slice(label[0].length)}`
  }

  return text
}

/** Bold mid-line Current:/Target: field labels (scenario position lines). */
function markInlineFieldLabels(text: string): string {
  let out = ''
  let i = 0
  const labels = ['Current', 'Target', 'BATNA']
  while (i < text.length) {
    let hit: { at: number; label: string } | null = null
    for (const label of labels) {
      const at = text.indexOf(`${label}:`, i)
      if (at < 0) continue
      // Skip if already inside a ** span we are about to leave alone.
      if (hit == null || at < hit.at) hit = { at, label }
    }
    if (!hit) {
      out += text.slice(i)
      break
    }
    // Don't re-wrap if this label is already bolded (**Current**: or **Current:**).
    const before = text.slice(Math.max(0, hit.at - 2), hit.at)
    if (before === '**') {
      out += text.slice(i, hit.at + hit.label.length + 1)
      i = hit.at + hit.label.length + 1
      continue
    }
    out += text.slice(i, hit.at)
    out += `**${hit.label}**:`
    i = hit.at + hit.label.length + 1
  }
  return out
}

function isNumberedSectionTitle(title: string): boolean {
  const dot = title.indexOf('. ')
  if (dot < 1) return false
  for (let i = 0; i < dot; i++) {
    const c = title.charCodeAt(i)
    if (c < 48 || c > 57) return false
  }
  return true
}

/** Section heading + optional body glued on the same line by the model. */
function parseSectionTitle(line: string): { title: string; rest: string } | null {
  const t = line.trim()

  // ### Title (hash markers must not leak into the chat bubble)
  if (t.startsWith('#')) {
    let i = 0
    while (i < t.length && t[i] === '#') i++
    if (i >= 1 && i <= 6 && t[i] === ' ') {
      const title = stripMarkdownDecorators(t.slice(i + 1))
      if (title) return { title, rest: '' }
    }
  }

  // **Title** alone, or **N. Title**Body when the model skips the newline.
  if (t.startsWith('**')) {
    const end = t.indexOf('**', 2)
    if (end > 2) {
      const title = t.slice(2, end).trim()
      const rest = t.slice(end + 2).replace(/^\s+/, '')
      if (title && (!rest || isNumberedSectionTitle(title))) return { title, rest }
    }
  }

  // Bare numbered section heading alone on a line (opening strategy, etc.).
  if (isNumberedSectionTitle(t) && !/[.!?]$/.test(t) && t.length <= 64) {
    return { title: t, rest: '' }
  }
  return null
}

function isBlankMarkdownLine(line: string): boolean {
  return stripMarkdownDecorators(line) === ''
}

function formatInlineLine(line: string): string {
  return wrapFigures(
    applyInline(markHeadingPrefix(markInlineFieldLabels(markFigures(line)))),
  )
}

export function renderMarkdown(raw: string, _visual?: MessageVisualContext | null): string {
  const esc = escapeHtml(raw.replace(/\r\n/g, '\n'))

  const lines = esc.split('\n')
  const out: string[] = []
  let inList = false

  for (const line of lines) {
    const bullet = line.match(/^[ \t]*[*\-]\s+(.+)$/)
    if (bullet) {
      if (!inList) { out.push('<ul class="md-ul">'); inList = true }
      out.push(`<li>${formatInlineLine(bullet[1])}</li>`)
      continue
    }

    if (inList) { out.push('</ul>'); inList = false }

    const section = parseSectionTitle(line)
    if (section) {
      out.push(`<h3 class="md-section-title">${applyInline(section.title)}</h3>`)
      if (section.rest) out.push(`<p>${formatInlineLine(section.rest)}</p>`)
      continue
    }

    if (isBlankMarkdownLine(line)) {
      out.push('<div class="md-gap"></div>')
    } else {
      // Keep model **bold** (do not strip before applyInline) so Read/Say
      // labels and labelled figures the model already marked stay highlighted.
      out.push(`<p>${formatInlineLine(line)}</p>`)
    }
  }
  if (inList) out.push('</ul>')
  return out.join('')
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric'
  return d.toLocaleString('en-US', opts)
}

export function threadPreview(thread: import('@/api/session.api').PreviousThread): string {
  const content = thread.latest_summary?.content
  if (content) {
    const firstBullet = parseBullets(content)[0]
    return firstBullet ? firstBullet.content : content.slice(0, 100)
  }
  if (thread.message_count > 0) return `${thread.message_count} message${thread.message_count !== 1 ? 's' : ''} — summary pending`
  return 'No messages yet.'
}

export function threadTone(thread: import('@/api/session.api').PreviousThread): ToneDescriptor | null {
  if (thread.thread_tone) {
    const key = thread.thread_tone.toLowerCase()
    const color = TONE_COLORS[key] ?? '#6B7280'
    return { label: thread.thread_tone, color }
  }
  const content = thread.latest_summary?.content
  if (!content) return null
  const toneBullet = parseBullets(content).find((b) => b.label.toLowerCase() === 'tone')
  if (!toneBullet) return null
  const lowerContent = toneBullet.content.toLowerCase()
  const match = Object.keys(TONE_COLORS).find((k) => lowerContent.includes(k))
  if (!match) return null
  return { label: match.charAt(0).toUpperCase() + match.slice(1), color: TONE_COLORS[match] }
}

export function execCopy(text: string, onSuccess: () => void): void {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.cssText = 'position:fixed;top:-9999px;opacity:0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy'); onSuccess() } catch { /* silent */ }
  document.body.removeChild(ta)
}

export function copyToClipboard(text: string, onSuccess: () => void): void {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => execCopy(text, onSuccess))
  } else {
    execCopy(text, onSuccess)
  }
}
