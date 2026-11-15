from __future__ import annotations

import re

# Answers cite moments inline as ``[MM:SS]`` or ``[MM:SS–MM:SS]`` (en/em-dash or hyphen, optional
# hours). This mirrors the frontend ``SEG_RE`` so backend reconciliation and the client agree.
_SEG_RE = re.compile(
    r"\[(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*[–—-]\s*(\d{1,2}:\d{2}(?::\d{2})?))?\]"
)

# Ranges within this gap are treated as one continuous range (parity with the frontend
# ``MERGE_GAP = 2`` seconds).
_MERGE_GAP_MS = 2000

# Answers cite document pages inline as e.g. "p. 2", "p. 2-3", "pp. 2, 4" — sometimes prefixed
# with the document's title ("According to <title>, p. 2-3"), sometimes bare ("[p. 2-3]") when
# the model omits the title. Reconciliation must recognize the bare form too, or a document the
# answer clearly cites just silently disappears from the response. The leading \b keeps the
# match anchored to a standalone "p"/"pp" — without it, ordinary prose ending in a p-word
# ("Restart the app. 2 minutes later") reads as a page-2 citation and attaches a wrong source.
_PAGE_CITE_RE = re.compile(r"\bpp?\.\s*([\d][\d,\s–—-]*)", re.IGNORECASE)


def _clock_to_ms(clock: str) -> int:
    parts = [int(p) for p in clock.split(":")]
    if len(parts) == 3:
        h, m, s = parts
    else:
        h, m, s = 0, parts[0], parts[1]
    return (h * 3600 + m * 60 + s) * 1000


def parse_cited_ranges(text: str) -> list[tuple[int, int]]:
    """Extract every cited ``[MM:SS(–MM:SS)]`` moment from an answer as ``(start_ms, end_ms)``.

    A bare ``[MM:SS]`` yields a zero-length range ``(t, t)``. Returned in text order, NOT merged
    (callers assign each to a video first, then merge per video)."""
    ranges: list[tuple[int, int]] = []
    for m in _SEG_RE.finditer(text or ""):
        start = _clock_to_ms(m.group(1))
        end = _clock_to_ms(m.group(2)) if m.group(2) else start
        ranges.append((start, max(start, end)))
    return ranges


# LLM sampling occasionally drifts off the prompted ``[MM:SS–MM:SS]`` shape into a
# parenthesised look-alike: ``(20:26–21:05)``. Same content, wrong wrapper — but ``_SEG_RE``
# (and the frontend's matching regex) only ever look inside ``[...]``, so a paren-wrapped cite
# is invisible to reconciliation: it can't attach a clip, and if it's the ONLY cite in a
# section, the video that answer clearly means to reference never gets attached at all.
_PAREN_SEG_RE = re.compile(
    r"\((\d{1,2}:\d{2}(?::\d{2})?)(?:\s*[–—-]\s*(\d{1,2}:\d{2}(?::\d{2})?))?\)"
)


def normalize_paren_timestamps(text: str) -> str:
    """Rewrite a bare parenthesised timestamp ``(MM:SS–MM:SS)`` into the real ``[MM:SS–MM:SS]``
    citation shape, so a sampling drift in wrapper choice doesn't silently drop the cite from
    reconciliation (or from the client's own bracket-only parser). Ordinary parenthetical prose
    survives untouched — the pattern only matches parens whose ENTIRE contents are a timestamp.
    """
    if not text:
        return text or ""
    return _PAREN_SEG_RE.sub(lambda m: f"[{m.group(0)[1:-1]}]", text)


def parse_cited_pages(text: str) -> set[int]:
    """Extract every page number cited in an answer as ``p.``/``pp.`` (e.g. "p. 2", "p. 2-3",
    "pp. 2, 4-5"), title or no title. Ranges are expanded (2-4 → {2,3,4}); a malformed/empty
    match contributes nothing rather than raising."""
    pages: set[int] = set()
    for m in _PAGE_CITE_RE.finditer(text or ""):
        for part in m.group(1).split(","):
            nums = [int(n) for n in re.findall(r"\d+", part)]
            if len(nums) == 1:
                pages.add(nums[0])
            elif len(nums) >= 2:
                pages.update(range(min(nums), max(nums) + 1))
    return pages


# Titles shorter than this are too generic ("Guide", "Policy") to strip unless they sit
# next to a page cite or inside a ``[Document "…"]`` bracket — a naive replace would wipe
# ordinary prose.
_MIN_TITLE_LEN = 8

# Optional / required page-cite tail attached to a title ("p. 2", "[p. 2-3]", "pp. 2, 4").
_PAGE_TAIL = r'\[?pp?\.\s*[\d][\d,\s–—-]*\]?'
_PAGE_TAIL_OPT = rf'(?:\s*[,:]?\s*{_PAGE_TAIL})?'
_PAGE_TAIL_REQ = rf'\s*[,:]?\s*{_PAGE_TAIL}'

# Bracketed ``[p. 2]`` or bare ``p. 2`` / ``pp. 2-3`` — used to strip uniquely-private pages.
_WRAPPED_PAGE_RE = re.compile(
    r'\[pp?\.\s*([\d][\d,\s–—-]*)\]|\bpp?\.\s*([\d][\d,\s–—-]*)',
    re.IGNORECASE,
)

# ``[23:50–24:05, Document "Title"]`` / ``[Document "Title"]`` — one pair of brackets, no nesting.
_BRACKET_RE = re.compile(r'\[([^\[\]]*)\]')
_DOC_LABEL_RE = re.compile(r'(?i)\bdocuments?\b')
_QUOTES_CLS = r'[\'"“”‘’«»]'
_QUOTES_RE = re.compile(_QUOTES_CLS + r'+')

_ATTRIB_PREFIX = r'(?:according to|per)\s+(?:the\s+)?'
# Optional "guide/document" noun the model tacks on after a title
# ("According to the <Title> guide").
_DOC_NOUN = r'(?:\s+(?:guide|document|policy|manual|runbook))?'
# After the title (and any ``<>`` wrappers) are gone: "According to the guide,"
_LEFTOVER_ATTRIB_RE = re.compile(
    r'(?i)\b(?:according to|per)\s+(?:the\s+)?'
    r'(?:guide|document|policy|manual|runbook)\s*,?'
)
_EMPTY_ANGLE_RE = re.compile(r'<\s*>')
# ``[<Title>; 10:41]`` → ``[; 10:41]`` after the title is gone.
_BRACKET_LEAD_PUNCT_RE = re.compile(r'\[\s*[;,]+\s*')
_ATTRIB_TAIL_RE = re.compile(
    r'(?i)(?:\baccording(?:\s+to)?|\bper)\s+(?:the\s+)?$'
)
_PAGE_HOLD_RE = re.compile(r'(?i)(?:,\s*)?\[?pp?\.\s*[\d\s,–—-]*$')
_DOC_LABEL_HOLD_RE = re.compile(r'(?i)\bdocuments?\s*["“‘\'«»]*$')


def _pages_from_body(body: str) -> set[int]:
    """Expand a page-cite body (``2-3``, ``2, 4``) the same way ``parse_cited_pages`` does."""
    pages: set[int] = set()
    for part in body.split(","):
        nums = [int(n) for n in re.findall(r"\d+", part)]
        if len(nums) == 1:
            pages.add(nums[0])
        elif len(nums) >= 2:
            pages.update(range(min(nums), max(nums) + 1))
    return pages


def _title_pattern(title: str) -> str:
    """Case-insensitive title match that won't clip a longer word on either side."""
    return r'(?<!\w)' + re.escape(title.strip()) + r'(?!\w)'


def _is_only_numeric_cite(inner: str) -> bool:
    """True when a bracket body is only footnote indices (``5`` or ``5, 6``), not a timestamp."""
    stripped = inner.strip()
    return bool(stripped) and bool(re.fullmatch(r'\d{1,3}(?:\s*,\s*\d{1,3})*', stripped))


# Bare ``[5]`` — the model copies the RAG chunk index from ``### [5] document …``. Timestamps
# always contain a colon (``[08:30]``) so they never match.
_FOOTNOTE_RE = re.compile(r'\[(\d{1,3})\]')

# Prompt labels from ``rag_service._format``: ``### [5] document Title — p. 1``.
# Title runs until an em-dash page hint or end of line. Videos use ``### [N] video`` and are ignored.
_DOC_HEADER_RE = re.compile(
    r'(?m)^###\s*\[(\d{1,3})\]\s+document\s+(.+?)(?:\s+[—–-]\s+p\.|\s*$)',
    re.IGNORECASE,
)


def hidden_rag_indices(context_text: str | None, hidden_docs: list[dict] | None) -> set[int]:
    """Return prompt chunk numbers that labeled a hidden (private) document.

    Parses ``### [N] document <title>`` lines from the turn's ``context_text``. Matching is by
    case-insensitive title against ``hidden_docs``. Empty context or no hidden docs → empty set.
    """
    if not context_text or not hidden_docs:
        return set()
    titles = {
        (d.get("title") or "").strip().lower()
        for d in hidden_docs
        if (d.get("title") or "").strip()
    }
    if not titles:
        return set()
    out: set[int] = set()
    for m in _DOC_HEADER_RE.finditer(context_text):
        title = (m.group(2) or "").strip().lower()
        if title in titles:
            out.add(int(m.group(1)))
    return out


def _strip_footnotes(text: str, indices: set[int] | None) -> str:
    """Drop bare ``[N]`` footnotes. ``None`` = all numeric footnotes; a set = only those Ns."""
    if indices is None:
        return _FOOTNOTE_RE.sub("", text)

    def repl(m: re.Match) -> str:
        return "" if int(m.group(1)) in indices else m.group(0)

    return _FOOTNOTE_RE.sub(repl, text)


def strip_stray_footnotes(text: str) -> str:
    """Drop every bare numeric footnote ``[N]`` — the model copying the RAG chunk index straight
    out of the prompt header (``### [5] document Title`` / ``### [2] video Title``) instead of a
    real citation. A viewer (admin or not) has no way to resolve a bare number back to a source
    card, so it is always clutter — dropped unconditionally, independent of whether the numbered
    doc/video happens to be hidden. Timestamps (``[08:30]``) are untouched (always contain a
    colon, so they never match)."""
    if not text:
        return text or ""
    out = _strip_footnotes(text, None)
    out = re.sub(r'[ \t]{2,}', " ", out)
    out = re.sub(r' +([,.;:])', r'\1', out)
    return out


# The model sometimes invents an ad-hoc tagged-citation syntax instead of the prompted
# ``[MM:SS–MM:SS]`` / inline-title convention — e.g. ``<vid: Setup — [16:06–16:46]>`` for a
# video moment, or ``<doc: Concepts and Definitions>`` for a document, falling back to a bare
# placeholder dash (``<doc: — >``) when it has nothing to cite. None of this is a shape any
# other cleanup pass or the redaction pass recognizes (both only look inside ``[...]``), so it
# would otherwise reach the viewer verbatim — and worse, a ``<doc: Title>`` could leak a
# private document's title outside the ``[Document "…"]`` form redaction actually strips.
_TAGGED_CITE_RE = re.compile(r'<\s*(doc|vid)\s*:\s*([^<>]*)>', re.IGNORECASE)


def strip_tagged_citation_wrappers(text: str) -> str:
    """Collapse ``<vid: …>`` / ``<doc: …>`` tags the model sometimes invents instead of the
    prompted citation shapes.

    ``<vid: Title — [MM:SS–MM:SS]>`` keeps its embedded timestamp (unwrapped to plain
    ``[MM:SS–MM:SS]`` so downstream parsing/reconciliation and the frontend both recognize it)
    and drops the title wrapper — the video's name is already shown on its source card, not
    needed inline. A ``<doc: …>`` tag is dropped entirely regardless of content: never a shape
    the private-document redaction pass can vet, so keeping any title would risk a leak.
    """
    if not text:
        return text or ""

    def repl(m: re.Match) -> str:
        tag, inner = m.group(1).lower(), m.group(2)
        if tag == "doc":
            return ""
        seg = _SEG_RE.search(inner)
        return seg.group(0) if seg else ""

    out = _TAGGED_CITE_RE.sub(repl, text)
    out = re.sub(r'[ \t]{2,}', " ", out)
    out = re.sub(r' +([,.;:])', r'\1', out)
    return out


def _strip_title_from_brackets(text: str, title: str) -> str:
    """Rewrite ``[…]`` cites that name ``title``: drop the document, keep any timestamps.

    ``[23:50–24:05, Document "Concepts and Definitions"]`` → ``[23:50–24:05]``.
    ``[Document "Concepts and Definitions"]`` → removed.
    Applies even for short titles — a ``[Document "…"]`` cite is never prose.
    """
    tpat = re.compile(_title_pattern(title), re.IGNORECASE)

    def repl(m: re.Match) -> str:
        inner = m.group(1)
        if not tpat.search(inner):
            return m.group(0)
        inner = tpat.sub("", inner)
        inner = _DOC_LABEL_RE.sub("", inner)
        inner = _QUOTES_RE.sub("", inner)
        inner = _EMPTY_ANGLE_RE.sub("", inner)
        inner = re.sub(r'\s*,\s*,', ",", inner)
        inner = re.sub(r'[ \t]{2,}', " ", inner)
        # ``[<Title>; 10:41–11:19]`` becomes ``[; 10:41–11:19]`` until leading punct is stripped.
        inner = inner.strip(" \t,;:")
        # Leftover ``[5]`` is the RAG context index (``### [5] document Title``), not a
        # timestamp — drop it rather than leaving a dangling footnote.
        if not inner or _is_only_numeric_cite(inner):
            return ""
        return f"[{inner}]"

    return _BRACKET_RE.sub(repl, text)


# A hidden title stripped out of "[of <title>]" / "[According to <title>]" leaves a bare
# attribution word behind with no citation data — always safe to drop. Timestamps always
# contain a colon, page cites always contain a digit, and "[Document ...]" cites always carry
# quotes/the word "Document", so none of those can ever collide with this narrow word list
# (which mirrors ``_ATTRIB_PREFIX`` above).
_DANGLING_ATTRIB_RE = re.compile(
    r'\[\s*(?:of|according to|per)(?:\s+the)?\s*\]', re.IGNORECASE
)

# The model sometimes can't back a claim with an exact moment and, instead of omitting the
# cite, emits a bare placeholder dash: ``[— ]``, ``[–]``, ``[-]``. Real timestamps always
# contain a digit and a colon (``[08:30]``), so a bracket holding nothing but dash/whitespace
# characters can never be a legitimate citation — it is pure clutter, same as ``[of]``.
_BARE_DASH_RE = re.compile(r'\[\s*[–—-]+\s*\]')


def strip_dangling_citation_artifacts(text: str) -> str:
    """Remove empty attribution-only brackets (``[of]``, ``[According to]``, ``[per the]``)
    and bare placeholder-dash brackets (``[— ]``, ``[-]``) left behind when the model has no
    real citation data (a stripped hidden title, or no exact moment to point to).

    Safe for every viewer (admin or not) and independent of hidden docs — these carry no
    timestamp/page/title information, so they are pure clutter, never a legitimate citation.
    """
    if not text:
        return text or ""
    out = _DANGLING_ATTRIB_RE.sub("", text)
    out = _BARE_DASH_RE.sub("", out)
    out = re.sub(r'[ \t]{2,}', " ", out)
    out = re.sub(r' +([,.;:])', r'\1', out)
    return out


def _cleanup_redacted(text: str) -> str:
    """Collapse leftover attribution prefixes, empty ``<>`` / brackets, and doubled punctuation."""
    # Title-stripping above can leave a bare "[of]"/"[According to]" behind; clean that up
    # before the other tidy-up passes run.
    out = strip_dangling_citation_artifacts(text)
    out = _EMPTY_ANGLE_RE.sub("", out)
    out = _LEFTOVER_ATTRIB_RE.sub("", out)
    out = _BRACKET_LEAD_PUNCT_RE.sub("[", out)
    out = re.sub(r'\[\s*\]', "", out)
    # Title sat just before a timestamp: ``Title; [10:41]`` → `` [10:41]``.
    out = re.sub(r'\s*;\s*(\[\d)', r' \1', out)
    out = re.sub(r',\s*,', ",", out)
    out = re.sub(r'[ \t]{2,}', " ", out)
    out = re.sub(r' +([,.;:])', r'\1', out)
    out = re.sub(r'\(\s*\)', "", out)
    return out.strip()


def redact_private_document_refs(
    text: str,
    hidden_docs: list[dict] | None,
    visible_docs: list[dict] | None = None,
    context_text: str | None = None,
) -> str:
    """Strip inline citations of hidden (private) documents from viewer-facing answer text.

    Keeps the explanation; removes attribution. Covers:

    - Bracket cites the model actually emits: ``[Document "Title"]`` and mixed
      ``[MM:SS–MM:SS, Document "Title"]`` (timestamps are kept).
    - ``According to [the] <title>`` / ``Per [the] <title>`` / ``<title>, p. N``,
      including the prompt's ``<Title>`` wrapping so leftover ``<>`` is not left behind.
    - Page cites whose numbers belong only to hidden docs (overlapping public pages stay).
    - Remaining mentions of a distinctive (long) title, so the document is not referred to
      in any form.
    - Bare numeric footnotes ``[5]`` copied from the RAG header ``### [5] document …``
      (timestamps like ``[08:30]`` are kept). Every bare ``[N]`` is dropped unconditionally —
      a plain number is never resolvable by a viewer, hidden doc or not — see
      :func:`strip_stray_footnotes`.

    Short/generic titles (< 8 chars) are only stripped in citation shape (bracket / attrib /
    page cite), so prose like "Follow this Guide" survives. Empty/missing titles are skipped.
    """
    text = strip_dangling_citation_artifacts(text or "")
    if not text or not hidden_docs:
        return text

    visible = list(visible_docs or [])
    visible_pages: set[int] = set()
    for d in visible:
        visible_pages.update(d.get("page_numbers") or [])

    hidden_only_pages: set[int] = set()
    titles: list[tuple[str, bool]] = []  # (title, require_page)
    for d in hidden_docs:
        hidden_only_pages.update(d.get("page_numbers") or [])
        title = (d.get("title") or "").strip()
        if not title:
            continue
        titles.append((title, len(title) < _MIN_TITLE_LEN))
    hidden_only_pages -= visible_pages
    # Longest title first so a longer name isn't partially eaten by a shorter one.
    titles.sort(key=lambda t: len(t[0]), reverse=True)

    out = text
    for title, require_page in titles:
        tpat = _title_pattern(title)
        # Bracket cites first so mixed ``[timestamp, Document "Title"]`` keeps the timestamp.
        out = _strip_title_from_brackets(out, title)
        # Prompt example is ``According to <title>``; the model copies that as ``<Title>``.
        # Strip the wrappers with the title so we don't leave ``<>``.
        wrapped = re.compile(
            rf'(?:<\s*{tpat}\s*>|{_QUOTES_CLS}{tpat}{_QUOTES_CLS})',
            re.IGNORECASE,
        )
        out = wrapped.sub("", out)
        tail = _PAGE_TAIL_REQ if require_page else _PAGE_TAIL_OPT
        attrib = re.compile(
            rf'(?i){_ATTRIB_PREFIX}<?\s*{tpat}\s*>?{tail}{_DOC_NOUN}\s*,?'
        )
        out = attrib.sub("", out)
        # ``Document "Title"`` / ``document Title`` outside brackets.
        labeled = re.compile(rf'(?i)\bdocuments?\s*{_QUOTES_CLS}?{tpat}{_QUOTES_CLS}?')
        out = labeled.sub("", out)
        if require_page:
            glued = re.compile(rf'(?i){tpat}{_PAGE_TAIL_REQ}\s*,?')
            out = glued.sub("", out)
        else:
            glued = re.compile(rf'(?i){tpat}\s*[,:]?\s*{_PAGE_TAIL}\s*,?')
            out = glued.sub("", out)
            # Distinctive titles must not remain as a name-drop anywhere in the answer.
            out = re.sub(tpat, "", out, flags=re.IGNORECASE)

    if hidden_only_pages:
        spans: list[tuple[int, int]] = []
        for m in _WRAPPED_PAGE_RE.finditer(out):
            body = m.group(1) if m.group(1) is not None else m.group(2)
            pages = _pages_from_body(body or "")
            if pages and pages.isdisjoint(visible_pages) and pages <= hidden_only_pages:
                spans.append((m.start(), m.end()))
        for start, end in reversed(spans):
            out = out[:start] + out[end:]

    out = strip_stray_footnotes(out)

    return _cleanup_redacted(out)


def _cut_partial_title(text: str, titles: list[str]) -> str:
    """If ``text`` ends with a prefix of a hidden title, drop that prefix so it is never yielded."""
    low = text.lower()
    best = 0
    for title in titles:
        t = title.lower().strip()
        if len(t) < 3:
            continue
        for n in range(min(len(t), len(low)), 2, -1):
            pref = t[:n]
            if not low.endswith(pref):
                continue
            before = len(low) - n
            if before == 0 or not low[before - 1].isalnum():
                best = max(best, n)
            break
    return text[:-best] if best else text


def _trim_unsafe_tail(text: str, titles: list[str]) -> str:
    """Hold back open brackets, attribution prefixes, and partial hidden titles."""
    prev = None
    while text != prev:
        prev = text
        last_open_sq, last_close_sq = text.rfind("["), text.rfind("]")
        if last_open_sq > last_close_sq:
            text = text[:last_open_sq]
            continue
        last_open_ang, last_close_ang = text.rfind("<"), text.rfind(">")
        if last_open_ang > last_close_ang:
            text = text[:last_open_ang]
            continue
        cut = _cut_partial_title(text, titles)
        if cut != text:
            text = cut
            continue
        m = _ATTRIB_TAIL_RE.search(text)
        if m:
            text = text[: m.start()]
            continue
        m = _PAGE_HOLD_RE.search(text)
        if m:
            text = text[: m.start()]
            continue
        m = _DOC_LABEL_HOLD_RE.search(text)
        if m:
            text = text[: m.start()]
    return text


class ViewerRedactionBuffer:
    """Redact private-doc cites while streaming, holding only an unsafe tail.

    Live tokens stay snappy: prose is released as it arrives. A private title, an open
    ``[`` / ``<``, or ``according to`` is held until it is complete and can be stripped.
    ``flush()`` releases the redacted remainder. Persistence still uses the raw unredacted
    string the caller accumulated separately.
    """

    def __init__(
        self,
        hidden_docs: list[dict] | None,
        visible_docs: list[dict] | None = None,
        context_text: str | None = None,
    ) -> None:
        self._hidden = list(hidden_docs or [])
        self._visible = list(visible_docs or [])
        self._context_text = context_text
        self._titles = [
            (d.get("title") or "").strip()
            for d in self._hidden
            if (d.get("title") or "").strip()
        ]
        self._raw = ""
        self._emitted = ""

    def feed(self, piece: str) -> str:
        if not piece:
            return ""
        self._raw += piece
        return self._delta(final=False)

    def flush(self) -> str:
        return self._delta(final=True)

    def _delta(self, final: bool) -> str:
        source = self._raw if final else _trim_unsafe_tail(self._raw, self._titles)
        redacted = redact_private_document_refs(
            source, self._hidden, self._visible, context_text=self._context_text
        )
        if not redacted.startswith(self._emitted):
            return ""
        out = redacted[len(self._emitted) :]
        self._emitted = redacted
        return out


def merge_ranges(ranges: list[tuple[int, int]], gap_ms: int = _MERGE_GAP_MS) -> list[tuple[int, int]]:
    """Sort and merge overlapping / touching ranges (within ``gap_ms``) into continuous ones.

    Same behaviour as the frontend ``parseSegments`` merge step, so per-video ``cited_ranges``
    sent to the client are already collapsed and never double-count a moment."""
    if not ranges:
        return []
    ordered = sorted(ranges, key=lambda r: r[0])
    out: list[tuple[int, int]] = [ordered[0]]
    for start, end in ordered[1:]:
        last_start, last_end = out[-1]
        if start <= last_end + gap_ms:
            out[-1] = (last_start, max(last_end, end))
        else:
            out.append((start, end))
    return out
