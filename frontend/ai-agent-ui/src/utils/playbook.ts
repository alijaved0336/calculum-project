import type { PlaybookData, PlaybookSection } from '@/types/chat'

export type FormattedTextPart = {
  text: string
  bold: boolean
  italic?: boolean
}

const SECTION_HEADER_RE = /^\s*(\d+)\.\s+(.+?)\s*$/
const SECTION_INDEX_RE = /^\s*\*\*(\d+)\*\*\s*$/
const SECTION_TITLE_RE = /^\s*\*\*(.+?)\*\*\s*$/
const BULLET_RE = /^\s*(?:[-*•]|\d+\.)\s+(.+)$/
const THINK_BLOCK_RE = /<think>[\s\S]*?<\/think>/gi
const MARKDOWN_MARKER_ONLY_RE = /^[*_`~\s]+$/
const PLAYBOOK_TITLE_RE = /^negotiation\s+playbook\b/i

function cleanLine(line: string): string {
  return line.replace(/\r/g, '').trim()
}

function normalizeRaw(raw: string): string {
  const withoutClosedThink = raw.replace(THINK_BLOCK_RE, '').trim()
  const lines = withoutClosedThink.split('\n')
  const playbookLineIndex = lines.findIndex((line) =>
    PLAYBOOK_TITLE_RE.test(stripMd(cleanLine(line))),
  )
  if (playbookLineIndex >= 0) return lines.slice(playbookLineIndex).join('\n').trim()
  return withoutClosedThink
}

function stripMd(text: string): string {
  return text
    .replace(/^#+\s+/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim()
}

function isMarkdownMarkerOnly(line: string): boolean {
  return MARKDOWN_MARKER_ONLY_RE.test(line)
}

function sectionTitleOnly(rawTitle: string): string {
  let title = rawTitle.trim()
  for (const sep of [' — ', ' – ', ' - ']) {
    const cut = title.indexOf(sep)
    if (cut > 0) {
      title = title.slice(0, cut).trim()
      break
    }
  }
  return title
}

function parseSectionHeader(line: string): { index: number; title: string } | null {
  const plain = stripMd(line)
  const header = plain.match(SECTION_HEADER_RE)
  if (!header) return null
  const title = sectionTitleOnly(header[2])
  if (title.length > 80) return null
  return {
    index: Number(header[1]),
    title,
  }
}

function parseSection(index: number, title: string, body: string[]): PlaybookSection {
  const bullets: string[] = []

  for (const rawLine of body) {
    const line = cleanLine(rawLine)
    if (!line || isMarkdownMarkerOnly(line)) continue

    const bullet = line.match(BULLET_RE)
    bullets.push(bullet ? bullet[1].trim() : line)
  }

  return {
    index,
    title: stripMd(title),
    subtitle: '',
    summary: '',
    bullets,
  }
}

export function parsePlaybook(raw: string): PlaybookData | null {
  raw = normalizeRaw(raw)
  const lines = raw.split('\n').map(cleanLine)
  const meaningful = lines.filter(Boolean)
  if (meaningful.length < 2) return null
  if (!PLAYBOOK_TITLE_RE.test(stripMd(meaningful[0]))) return null

  const sections: PlaybookSection[] = []
  const footerLines: string[] = []
  let current: { index: number; title: string; body: string[] } | null = null

  function pushCurrentSection() {
    if (!current?.title) return
    sections.push(parseSection(current.index, current.title, current.body))
  }

  // Start at the first numbered section heading in `lines` (not meaningful-index),
  // so blank lines after the title don't skip section 1.
  const firstSectionIdx = lines.findIndex((line) => parseSectionHeader(line) != null)
  const bodyStart = firstSectionIdx >= 0 ? firstSectionIdx : 1

  for (const line of lines.slice(bodyStart)) {
    if (!line) {
      if (current) current.body.push('')
      continue
    }

    if (isMarkdownMarkerOnly(line)) continue

    const header = parseSectionHeader(line)
    if (header) {
      pushCurrentSection()
      current = {
        index: header.index,
        title: header.title,
        body: [],
      }
      continue
    }

    const sectionIndex = line.match(SECTION_INDEX_RE)
    if (sectionIndex) {
      pushCurrentSection()
      current = {
        index: Number(sectionIndex[1]),
        title: '',
        body: [],
      }
      continue
    }

    const sectionTitle = line.match(SECTION_TITLE_RE)
    if (sectionTitle && (!current || !current.title)) {
      current = {
        index: current?.index ?? sections.length + 1,
        title: sectionTitle[1],
        body: current?.body ?? [],
      }
      continue
    }

    if (/^drafted from\b/i.test(stripMd(line))) {
      footerLines.push(line)
      continue
    }

    if (current) current.body.push(line)
    else footerLines.push(line)
  }

  pushCurrentSection()

  if (sections.length === 0) return null

  // Line 2 may still carry a legacy supplier meta line for PDF naming only.
  const maybeMeta = stripMd(meaningful[1])
  const hasDocSubtitle = parseSectionHeader(meaningful[1]) == null
  const subtitleMatch = hasDocSubtitle
    ? maybeMeta.match(/^[^·]+·\s*"?(.*?)"?\s*\(([^)]+)\)\s*$/)
    : null

  return {
    title: 'Negotiation Playbook',
    subtitle: '',
    supplierName: subtitleMatch?.[1] ?? null,
    countryCode: subtitleMatch?.[2] ?? null,
    footer: footerLines.length ? footerLines.map(stripMd).join(' ') : null,
    sections: sections.sort((a, b) => a.index - b.index),
    raw,
  }
}

const COLON_LABEL_PREFIX_RE = /^(\s*)([^:\n]{2,90}?)(\s*:)(\s*)/
// Allow ASCII hyphens in labels ("Client-Supplier"); only em/en dash or " - " ends the label.
const DASH_LABEL_PREFIX_RE = /^(\s*)([^:—–]{2,60}?)(\s*(?:[—–]|\s-\s))(\s*)/
const BRACKETED_TEXT_RE = /\[([^\]]+)\]/g
const DAY_COUNT_RE =
  /\b\d+\b(?=\s*(?:→|->|⇒)\s*\d+\s*-?\s*days?\b)|\b\d+\b(?=\s+to\s+\d+\s*-?\s*days?\b)|\b\d+\s*-\s*\d+\s+days?\b|\b\d+\s*-\s*day\b|\b\d+\s+days?\b/gi
const DAY_RANGE_PREFIX_RE = /(\b\d+\s*-\s*)$/
const DAY_COUNT_START_RE = /^\d+\s+days?\b/i
const PERCENT_RE = /\d+(?:\.\d+)?%/g
const NET_TERM_RE = /\bNet\s+\d+\b/g
const SLASH_DAY_RANGE_RE = /\b\d+\s*\/\s*\d+\s+days?\b/gi
const QUARTILE_PHRASE_RE = /\b(?:top-quartile|top quartile|3rd-quartile|3rd quartile)\b/gi
const FULL_BOLD_NOTE_RE = /^(Supporting arguments\s*[—–-]\s*cite these to justify the ask|Not used\s*[—–-]\s*and why)$/i
const HOW_TO_PITCH_LABEL_RE = /^(How to pitch)(:)(\s*)(.*)$/i
const INTERNAL_ONLY_IN_BOLD_RE = /^(.*?)(\s*[—–-]\s*internal only\b.*)$/i
// Closed **bold** / *italic* first; then unclosed `**Label:` (model often drops the closer).
function markdownEmphasisRe(): RegExp {
  return /\*\*(.+?)\*\*|\*\*([^*\n]+?:)|\*(.+?)\*/g
}

function cleanDisplayText(text: string): string {
  return text.replace(BRACKETED_TEXT_RE, '$1')
}

function isMarked(part: FormattedTextPart): boolean {
  return part.bold || !!part.italic
}

function parseMarkdownEmphasis(text: string): FormattedTextPart[] {
  const parts: FormattedTextPart[] = []
  let cursor = 0
  for (const match of text.matchAll(markdownEmphasisRe())) {
    const index = match.index ?? 0
    if (index > cursor) {
      parts.push({ text: text.slice(cursor, index), bold: false })
    }
    if (match[1] != null) {
      parts.push({ text: match[1], bold: true })
    } else if (match[2] != null) {
      parts.push({ text: match[2], bold: true })
    } else {
      parts.push({ text: match[3], bold: false, italic: true })
    }
    cursor = index + match[0].length
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), bold: false })
  }
  return parts.length ? parts : [{ text, bold: false }]
}

/** Older drafts italicized "How to pitch:"; render that label bold like other colon labels. */
function promoteHowToPitchLabel(parts: FormattedTextPart[]): FormattedTextPart[] {
  return parts.flatMap(part => {
    if (!part.italic) return [part]
    const label = part.text.match(HOW_TO_PITCH_LABEL_RE)
    if (!label) return [part]
    return [
      { text: `${label[1]}${label[2]}`, bold: true },
      { text: `${label[3]}${label[4]}`, bold: false },
    ].filter(splitPart => splitPart.text.length > 0)
  })
}

/** Keep " — internal only…" plain when the model wrapped the whole parent bullet in bold. */
function unboldInternalOnlyTail(parts: FormattedTextPart[]): FormattedTextPart[] {
  return parts.flatMap(part => {
    if (!part.bold || part.italic) return [part]
    const split = part.text.match(INTERNAL_ONLY_IN_BOLD_RE)
    if (!split) return [part]
    return [
      { text: split[1], bold: true },
      { text: split[2], bold: false },
    ].filter(splitPart => splitPart.text.length > 0)
  })
}

function boldLabelPrefixes(parts: FormattedTextPart[]): FormattedTextPart[] {
  return parts.flatMap(part => {
    if (isMarked(part)) return [part]

    const label = part.text.match(COLON_LABEL_PREFIX_RE) ?? part.text.match(DASH_LABEL_PREFIX_RE)
    if (!label) return [part]

    const boldPrefix = `${label[2]}${label[3]}`
    return [
      { text: label[1], bold: false },
      { text: boldPrefix, bold: true },
      { text: part.text.slice(label[0].length - label[4].length), bold: false },
    ].filter(splitPart => splitPart.text.length > 0)
  })
}

function boldDayCounts(parts: FormattedTextPart[]): FormattedTextPart[] {
  const dayCountParts = parts.flatMap(part => {
    if (isMarked(part)) return [part]

    const splitParts: FormattedTextPart[] = []
    let cursor = 0

    for (const match of part.text.matchAll(DAY_COUNT_RE)) {
      const index = match.index ?? 0
      if (index > cursor) {
        splitParts.push({ text: part.text.slice(cursor, index), bold: false })
      }

      splitParts.push({ text: match[0], bold: true })
      cursor = index + match[0].length
    }

    if (cursor < part.text.length) {
      splitParts.push({ text: part.text.slice(cursor), bold: false })
    }

    return splitParts.length ? splitParts : [part]
  })

  for (let index = 0; index < dayCountParts.length - 1; index += 1) {
    const part = dayCountParts[index]
    const nextPart = dayCountParts[index + 1]
    if (part.bold || part.italic || !nextPart.bold || !DAY_COUNT_START_RE.test(nextPart.text)) continue

    const rangePrefix = part.text.match(DAY_RANGE_PREFIX_RE)
    if (!rangePrefix) continue

    const plainText = part.text.slice(0, part.text.length - rangePrefix[1].length)
    dayCountParts.splice(
      index,
      1,
      ...[
        { text: plainText, bold: false },
        { text: rangePrefix[1], bold: true },
      ].filter(splitPart => splitPart.text.length > 0),
    )
  }

  return dayCountParts
}

function glueBoldDayCounts(parts: FormattedTextPart[]): FormattedTextPart[] {
  const glued: FormattedTextPart[] = []
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]
    const next = parts[index + 1]
    if (
      part.bold &&
      /^\d+$/.test(part.text) &&
      next &&
      !isMarked(next) &&
      /^\s+days?\b/i.test(next.text)
    ) {
      const rest = next.text.match(/^(\s+days?\b)(.*)$/i)
      if (rest) {
        glued.push({ text: `${part.text}${rest[1]}`, bold: true })
        if (rest[2]) glued.push({ text: rest[2], bold: false })
        index += 1
        continue
      }
    }
    glued.push(part)
  }
  return glued
}

function formatPercentToken(token: string): string {
  const value = Number(token.slice(0, -1))
  if (Number.isNaN(value)) return token
  return `${value.toFixed(2)}%`
}

/** Percentages always render at 2 decimals and bold (including inside already-bold spans). */
function formatAndBoldPercents(parts: FormattedTextPart[]): FormattedTextPart[] {
  return parts.flatMap(part => {
    if (part.italic) return [part]

    const percentRe = new RegExp(PERCENT_RE.source, PERCENT_RE.flags)
    if (part.bold) {
      return [{ ...part, text: part.text.replace(percentRe, formatPercentToken) }]
    }

    const splitParts: FormattedTextPart[] = []
    let cursor = 0
    for (const match of part.text.matchAll(percentRe)) {
      const index = match.index ?? 0
      if (index > cursor) {
        splitParts.push({ text: part.text.slice(cursor, index), bold: false })
      }
      splitParts.push({ text: formatPercentToken(match[0]), bold: true })
      cursor = index + match[0].length
    }
    if (cursor < part.text.length) {
      splitParts.push({ text: part.text.slice(cursor), bold: false })
    }
    return splitParts.length ? splitParts : [part]
  })
}

function boldPhraseMatches(parts: FormattedTextPart[], pattern: RegExp): FormattedTextPart[] {
  return parts.flatMap(part => {
    if (isMarked(part)) return [part]

    const re = new RegExp(pattern.source, pattern.flags)
    const splitParts: FormattedTextPart[] = []
    let cursor = 0
    for (const match of part.text.matchAll(re)) {
      const index = match.index ?? 0
      if (index > cursor) {
        splitParts.push({ text: part.text.slice(cursor, index), bold: false })
      }
      splitParts.push({ text: match[0], bold: true })
      cursor = index + match[0].length
    }
    if (cursor < part.text.length) {
      splitParts.push({ text: part.text.slice(cursor), bold: false })
    }
    return splitParts.length ? splitParts : [part]
  })
}

function formatPlaybookLine(text: string): FormattedTextPart[] {
  if (text === '\n') return [{ text, bold: false }]

  const parts = unboldInternalOnlyTail(
    promoteHowToPitchLabel(
      parseMarkdownEmphasis(text).map(part => {
        if (isMarked(part) || !FULL_BOLD_NOTE_RE.test(part.text)) return part
        return { ...part, bold: true }
      }),
    ),
  )
  return boldPhraseMatches(
    boldPhraseMatches(
      formatAndBoldPercents(
        glueBoldDayCounts(
          boldDayCounts(boldPhraseMatches(boldLabelPrefixes(parts), SLASH_DAY_RANGE_RE)),
        ),
      ),
      NET_TERM_RE,
    ),
    QUARTILE_PHRASE_RE,
  )
}

const GROUP_HEADINGS = new Set(['opening line', 'argumentation', 'objections', 'concessions'])

export function isPlaybookGroupHeading(bullet: string): boolean {
  let plain = stripMd(bullet).trim()
  if (plain.endsWith(':')) plain = plain.slice(0, -1)
  return GROUP_HEADINGS.has(plain.toLowerCase())
}

/** Counter is a child of the supplier objection line above it. */
export function isPlaybookNestedBullet(bullet: string): boolean {
  return stripMd(bullet).trim().toLowerCase().startsWith('counter:')
}

export function formatPlaybookText(text: string): FormattedTextPart[] {
  const parts = cleanDisplayText(text).split(/(\n)/).flatMap(formatPlaybookLine)
  return parts.length ? parts : [{ text, bold: false }]
}
