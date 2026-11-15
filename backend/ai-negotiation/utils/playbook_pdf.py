from __future__ import annotations

import base64
import re
from functools import lru_cache
from html import escape

from api.schemas.negotiation import SavePlaybookRequest

try:
    from weasyprint import HTML
except (ModuleNotFoundError, OSError):  # pragma: no cover - depends on runtime install
    HTML = None

try:
    import httpx
except ModuleNotFoundError:  # pragma: no cover
    httpx = None


class PlaybookPdfUnavailableError(RuntimeError):
    """Raised when the PDF renderer cannot start in the current environment."""


_SECTION_ACCENTS = ("#3D78F0", "#20B37A", "#F18B2B", "#5A54F9", "#18A39A", "#E5484D")
_SECTION_TINTS = ("#edf4ff", "#eafaf2", "#fff3e8", "#f0efff", "#e8faf8", "#fff0f0")

_MD_RE = re.compile(r"\*\*(.+?)\*\*|\*\*([^*\n]+?:)|\*(.+?)\*")
_COLON_LABEL_RE = re.compile(r"^(\s*)([^:\n]{2,90}?)(\s*:)(\s*)")
# Allow ASCII hyphens in labels ("Client-Supplier"); only em/en dash or " - " ends the label.
_DASH_LABEL_RE = re.compile(r"^(\s*)([^:—–]{2,60}?)(\s*(?:[—–]|\s-\s))(\s*)")
_DAY_COUNT_RE = re.compile(
    r"\b\d+\b(?=\s+to\s+\d+\s+days?\b)|\b\d+\s*-\s*\d+\s+days?\b|"
    r"\b\d+\s*-\s*day\b|\b\d+\s+days?\b",
    re.I,
)
_PERCENT_RE = re.compile(r"\d+(?:\.\d+)?%")
_NET_TERM_RE = re.compile(r"\bNet\s+\d+\b")
_QUARTILE_PHRASE_RE = re.compile(
    r"\b(?:top-quartile|top quartile|3rd-quartile|3rd quartile)\b",
    re.I,
)
_FULL_BOLD_NOTE_RE = re.compile(
    r"^(Supporting arguments\s*[—–-]\s*cite these to justify the ask|"
    r"Not used\s*[—–-]\s*and why)$",
    re.I,
)
_BRACKETED_RE = re.compile(r"\[([^\]]+)\]")
_HOW_TO_PITCH_LABEL_RE = re.compile(r"^(How to pitch)(:)(\s*)(.*)$", re.I)
_INTERNAL_ONLY_IN_BOLD_RE = re.compile(
    r"^(.*?)(\s*[—–-]\s*internal only\b.*)$", re.I
)
# Any ISO country flag emoji is two regional-indicator letters (🇮🇹 → IT).
_FLAG_EMOJI_RE = re.compile(r"[\U0001F1E6-\U0001F1FF]{2}")


def _section_accent(index: int) -> str:
    return _SECTION_ACCENTS[(index - 1) % len(_SECTION_ACCENTS)]


def _section_tint(index: int) -> str:
    return _SECTION_TINTS[(index - 1) % len(_SECTION_TINTS)]


def _flag_emoji_to_iso(emoji: str) -> str:
    return "".join(chr(ord(ch) - 0x1F1E6 + ord("A")) for ch in emoji)


@lru_cache(maxsize=256)
def _flag_data_uri(iso: str) -> str | None:
    """Embed SVG so the PDF does not depend on emoji fonts (WeasyPrint can't draw them)."""
    if httpx is None:
        return None
    try:
        response = httpx.get(
            f"https://flagcdn.com/{iso.lower()}.svg",
            timeout=3.0,
            follow_redirects=True,
        )
        response.raise_for_status()
    except Exception:
        return None
    return "data:image/svg+xml;base64," + base64.b64encode(response.content).decode(
        "ascii"
    )


def _flag_img_html(iso: str) -> str:
    uri = _flag_data_uri(iso)
    if uri:
        return (
            f'<img class="playbook-flag" src="{uri}" alt="{escape(iso.upper())}" />'
        )
    # ponytail: offline / CDN miss — ISO chip instead of a blank tofu box
    return f'<span class="playbook-flag-code">{escape(iso.upper())}</span>'


def _with_flag_images(text: str) -> str:
    """Replace every country-flag emoji with an SVG (or ISO fallback). Covers all ISO flags."""

    def repl(match: re.Match[str]) -> str:
        return _flag_img_html(_flag_emoji_to_iso(match.group(0)))

    return _FLAG_EMOJI_RE.sub(repl, escape(text))


def _parse_md(text: str) -> list[tuple[str, bool, bool]]:
    parts: list[tuple[str, bool, bool]] = []
    cursor = 0
    for match in _MD_RE.finditer(text):
        if match.start() > cursor:
            parts.append((text[cursor : match.start()], False, False))
        if match.group(1) is not None:
            parts.append((match.group(1), True, False))
        elif match.group(2) is not None:
            parts.append((match.group(2), True, False))
        else:
            parts.append((match.group(3), False, True))
        cursor = match.end()
    if cursor < len(text):
        parts.append((text[cursor:], False, False))
    return parts or [(text, False, False)]


def _bold_label_prefixes(
    parts: list[tuple[str, bool, bool]],
) -> list[tuple[str, bool, bool]]:
    out: list[tuple[str, bool, bool]] = []
    for text, bold, italic in parts:
        if bold or italic:
            out.append((text, bold, italic))
            continue
        label = _COLON_LABEL_RE.match(text) or _DASH_LABEL_RE.match(text)
        if not label:
            out.append((text, False, False))
            continue
        prefix = f"{label.group(2)}{label.group(3)}"
        rest = text[len(label.group(0)) - len(label.group(4)) :]
        if label.group(1):
            out.append((label.group(1), False, False))
        out.append((prefix, True, False))
        if rest:
            out.append((rest, False, False))
    return out


def _bold_day_counts(
    parts: list[tuple[str, bool, bool]],
) -> list[tuple[str, bool, bool]]:
    split: list[tuple[str, bool, bool]] = []
    for text, bold, italic in parts:
        if bold or italic:
            split.append((text, bold, italic))
            continue
        cursor = 0
        for match in _DAY_COUNT_RE.finditer(text):
            if match.start() > cursor:
                split.append((text[cursor : match.start()], False, False))
            split.append((match.group(0), True, False))
            cursor = match.end()
        if cursor < len(text):
            split.append((text[cursor:], False, False))
        elif cursor == 0:
            split.append((text, False, False))
    return split


def _glue_bold_day_counts(
    parts: list[tuple[str, bool, bool]],
) -> list[tuple[str, bool, bool]]:
    glued: list[tuple[str, bool, bool]] = []
    index = 0
    while index < len(parts):
        text, bold, italic = parts[index]
        nxt = parts[index + 1] if index + 1 < len(parts) else None
        if (
            bold
            and text.isdigit()
            and nxt
            and not nxt[1]
            and not nxt[2]
            and re.match(r"^\s+days?\b", nxt[0], re.I)
        ):
            rest = re.match(r"^(\s+days?\b)(.*)$", nxt[0], re.I)
            assert rest is not None
            glued.append((text + rest.group(1), True, False))
            if rest.group(2):
                glued.append((rest.group(2), False, False))
            index += 2
            continue
        glued.append((text, bold, italic))
        index += 1
    return glued


def _format_percent_token(token: str) -> str:
    try:
        return f"{float(token[:-1]):.2f}%"
    except ValueError:
        return token


def _format_and_bold_percents(
    parts: list[tuple[str, bool, bool]],
) -> list[tuple[str, bool, bool]]:
    out: list[tuple[str, bool, bool]] = []
    for text, bold, italic in parts:
        if italic:
            out.append((text, bold, italic))
            continue
        if bold:
            out.append(
                (
                    _PERCENT_RE.sub(
                        lambda match: _format_percent_token(match.group(0)), text
                    ),
                    True,
                    False,
                )
            )
            continue
        cursor = 0
        matched = False
        for match in _PERCENT_RE.finditer(text):
            matched = True
            if match.start() > cursor:
                out.append((text[cursor : match.start()], False, False))
            out.append((_format_percent_token(match.group(0)), True, False))
            cursor = match.end()
        if cursor < len(text):
            out.append((text[cursor:], False, False))
        elif not matched:
            out.append((text, False, False))
    return out


def _bold_phrase_matches(
    parts: list[tuple[str, bool, bool]],
    pattern: re.Pattern[str],
) -> list[tuple[str, bool, bool]]:
    out: list[tuple[str, bool, bool]] = []
    for text, bold, italic in parts:
        if bold or italic:
            out.append((text, bold, italic))
            continue
        cursor = 0
        matched = False
        for match in pattern.finditer(text):
            matched = True
            if match.start() > cursor:
                out.append((text[cursor : match.start()], False, False))
            out.append((match.group(0), True, False))
            cursor = match.end()
        if cursor < len(text):
            out.append((text[cursor:], False, False))
        elif not matched:
            out.append((text, False, False))
    return out


def _wrap_part(text: str, bold: bool, italic: bool) -> str:
    html = escape(text)
    if italic:
        return f"<em>{html}</em>"
    if bold:
        return f"<strong>{html}</strong>"
    return html


def _promote_how_to_pitch_label(
    parts: list[tuple[str, bool, bool]],
) -> list[tuple[str, bool, bool]]:
    out: list[tuple[str, bool, bool]] = []
    for text, bold, italic in parts:
        if not italic:
            out.append((text, bold, italic))
            continue
        label = _HOW_TO_PITCH_LABEL_RE.match(text)
        if not label:
            out.append((text, bold, italic))
            continue
        out.append((f"{label.group(1)}{label.group(2)}", True, False))
        rest = f"{label.group(3)}{label.group(4)}"
        if rest:
            out.append((rest, False, False))
    return out


def _unbold_internal_only_tail(
    parts: list[tuple[str, bool, bool]],
) -> list[tuple[str, bool, bool]]:
    out: list[tuple[str, bool, bool]] = []
    for text, bold, italic in parts:
        if not bold or italic:
            out.append((text, bold, italic))
            continue
        split = _INTERNAL_ONLY_IN_BOLD_RE.match(text)
        if not split:
            out.append((text, bold, italic))
            continue
        if split.group(1):
            out.append((split.group(1), True, False))
        out.append((split.group(2), False, False))
    return out


def _format_line(text: str) -> str:
    parts = _parse_md(text)
    parts = [
        (part_text, True, italic)
        if not bold and not italic and _FULL_BOLD_NOTE_RE.match(part_text)
        else (part_text, bold, italic)
        for part_text, bold, italic in parts
    ]
    parts = _unbold_internal_only_tail(_promote_how_to_pitch_label(parts))
    parts = _glue_bold_day_counts(_bold_day_counts(_bold_label_prefixes(parts)))
    parts = _bold_phrase_matches(
        _bold_phrase_matches(_format_and_bold_percents(parts), _NET_TERM_RE),
        _QUARTILE_PHRASE_RE,
    )
    return "".join(_wrap_part(*part) for part in parts)


def _inline_html(text: str) -> str:
    """Same display rules as PlaybookModal.formatPlaybookText."""
    text = _BRACKETED_RE.sub(r"\1", text)
    return "<br>\n".join(_format_line(line) for line in text.split("\n"))


_GROUP_HEADING_NAMES = frozenset({"Opening Line", "Argumentation", "Objections", "Concessions"})


def _is_group_heading_bullet(bullet: str) -> bool:
    name = bullet.replace("**", "").strip()
    if name.endswith(":"):
        name = name[:-1]
    return name.strip() in _GROUP_HEADING_NAMES


def _is_nested_bullet(bullet: str) -> bool:
    return bullet.replace("**", "").strip().lower().startswith("counter:")


def build_playbook_html(body: SavePlaybookRequest) -> str:
    cards = []
    for section in body.sections:
        accent = _section_accent(section.index)
        tint = _section_tint(section.index)
        bullets = "".join(
            (
                f'<li class="playbook-group-heading">{_inline_html(bullet)}</li>'
                if _is_group_heading_bullet(bullet)
                else (
                    f'<li class="playbook-nested">{_inline_html(bullet)}</li>'
                    if _is_nested_bullet(bullet)
                    else f"<li>{_inline_html(bullet)}</li>"
                )
            )
            for bullet in section.bullets
        )
        bullet_list = f'<ul class="playbook-card-list">{bullets}</ul>' if bullets else ""
        cards.append(
            f"""
            <td class="playbook-card" style="--section-accent: {accent}; --section-tint: {tint};">
              <table class="playbook-card-head" role="presentation">
                <tr>
                  <td class="playbook-card-title"><h3>{escape(section.title)}</h3></td>
                  <td class="playbook-card-index-wrap">
                    <div class="playbook-card-index"><span>{section.index}</span></div>
                  </td>
                </tr>
              </table>
              {bullet_list}
            </td>
            """
        )

    rows = []
    for index in range(0, len(cards), 2):
        left_card = cards[index]
        right_card = (
            cards[index + 1]
            if index + 1 < len(cards)
            else '<td class="playbook-card is-empty"></td>'
        )
        rows.append(
            f"""
            <tr class="playbook-grid-row">
              {left_card}
              <td class="playbook-grid-gap"></td>
              {right_card}
            </tr>
            """
        )

    footer = (
        f'<p class="playbook-footer-note">{escape(body.footer)}</p>'
        if body.footer
        else ""
    )

    return f"""
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>{escape(body.title)}</title>
        <style>
          @page {{
            size: Letter;
            margin: 10px;
          }}

          * {{
            box-sizing: border-box;
          }}

          html, body {{
            margin: 0;
            padding: 0;
          }}

          body {{
            background: #ffffff;
            color: #202838;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10.5px;
            line-height: 1.32;
          }}

          .playbook-page {{
            width: 100%;
          }}

          .playbook-head {{
            width: 100%;
            border-collapse: collapse;
            border-bottom: 1px solid #e8eef5;
            margin: 0 0 10px;
            padding: 0;
          }}

          .playbook-head td {{
            vertical-align: middle;
            padding: 0 0 8px;
          }}

          .playbook-icon-wrap {{
            width: 26px;
            padding-right: 10px !important;
          }}

          .playbook-icon {{
            width: 26px;
            height: 26px;
            line-height: 26px;
            text-align: center;
            border-radius: 7px;
            color: #6366f1;
            background: #eef2ff;
          }}

          .playbook-icon svg {{
            width: 13px;
            height: 13px;
            vertical-align: middle;
          }}

          h1 {{
            margin: 0;
            font-size: 16px;
            line-height: 1.15;
            color: #202838;
            font-weight: bold;
          }}

          .playbook-flag {{
            height: 10px;
            width: auto;
            vertical-align: -1px;
            display: inline;
          }}

          .playbook-flag-code {{
            display: inline-block;
            font-size: 8px;
            font-weight: bold;
            line-height: 1;
            padding: 1px 3px;
            border-radius: 2px;
            background: #eef2ff;
            color: #4338ca;
            vertical-align: 1px;
          }}

          .playbook-grid {{
            width: 100%;
            table-layout: fixed;
            border-collapse: separate;
            border-spacing: 0 8px;
          }}

          .playbook-grid-gap {{
            width: 8px;
            padding: 0;
            border: none;
            background: none;
          }}

          .playbook-card {{
            position: relative;
            vertical-align: top;
            padding: 8px 10px 6px;
            border-radius: 10px;
            background: #ffffff;
            border: 1px solid #dde6ef;
            overflow-wrap: break-word;
            word-wrap: break-word;
          }}

          .playbook-card.is-empty {{
            border: none;
            background: transparent;
            padding: 0;
          }}

          .playbook-card::before {{
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--section-accent);
          }}

          .playbook-card.is-empty::before {{
            content: none;
          }}

          .playbook-card-head {{
            width: 100%;
            border-collapse: collapse;
          }}

          .playbook-card-index {{
            position: absolute;
            top: 10px;
            right: 10px;
            width: 22px;
            height: 22px;
            border-radius: 11px;
            background: var(--section-tint);
            color: var(--section-accent);
          }}

          .playbook-card-index span {{
            display: block;
            width: 22px;
            height: 22px;
            line-height: 23px;
            text-align: center;
            font-size: 11px;
            font-weight: bold;
          }}

          .playbook-card-title {{
            vertical-align: middle;
            padding: 0 26px 0 0;
          }}

          .playbook-card h3 {{
            margin: 0;
            font-size: 12.5px;
            line-height: 1.2;
            color: #202838;
            font-weight: bold;
          }}

          .playbook-card-list {{
            margin: 5px 0 0;
            padding-left: 14px;
          }}

          .playbook-card-list li {{
            margin: 0 0 2px;
            font-size: 10.5px;
            line-height: 1.32;
            color: #202838;
          }}

          .playbook-card-list li::marker {{
            color: var(--section-accent);
          }}

          .playbook-card-list li.playbook-group-heading {{
            list-style: none;
            margin: 6px 0 2px -14px;
            font-weight: bold;
          }}

          .playbook-card-list li.playbook-nested {{
            margin-left: 14px;
          }}

          .playbook-footer-note {{
            margin: 4px 5px 0;
            padding-top: 8px;
            border-top: 1px solid #e8eef5;
            font-size: 11px;
            color: #6b7280;
            line-height: 1.35;
            font-style: italic;
          }}

          @media print {{
            body {{
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }}
          }}
        </style>
      </head>
      <body>
        <main class="playbook-page">
          <table class="playbook-head" role="presentation">
            <tr>
              <td class="playbook-icon-wrap">
                <div class="playbook-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" stroke-width="2"/>
                    <path d="M14 3v5h5" stroke="currentColor" stroke-width="2"/>
                    <path d="M9 13h6M9 17h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </div>
              </td>
              <td>
                <h1>{escape(body.title)}</h1>
              </td>
            </tr>
          </table>
          <table class="playbook-grid" role="presentation">
            <colgroup>
              <col />
              <col class="playbook-grid-gap" />
              <col />
            </colgroup>
            <tbody>
              {"".join(rows)}
            </tbody>
          </table>
          {footer}
        </main>
      </body>
    </html>
    """


async def build_playbook_pdf_bytes(body: SavePlaybookRequest) -> bytes:
    """Render a branded playbook PDF using WeasyPrint."""
    if HTML is None:
        raise PlaybookPdfUnavailableError(
            "WeasyPrint is not installed. Run `uv add weasyprint` in the "
            "backend environment."
        )

    try:
        document = HTML(string=build_playbook_html(body)).render()
        return document.write_pdf()
    except Exception as exc:  # pragma: no cover - environment-specific
        raise PlaybookPdfUnavailableError(
            "WeasyPrint could not render the playbook PDF. Verify that its "
            "native Pango and HarfBuzz libraries are installed."
        ) from exc
