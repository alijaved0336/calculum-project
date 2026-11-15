// Tiny, dependency-free Markdown → HTML for chat answers.
//
// Deliberately small: the assistant emits headings, bold/italic, inline code, links,
// fenced code, blockquotes, and bullet/numbered lists — this covers those. HTML in the
// source is ESCAPED first, then our own safe tags are emitted, so the result is safe to
// v-html without a separate sanitizer (we never pass raw user/model HTML through).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Escape quotes too: link URLs are placed in a double-quoted href, so an unescaped
    // quote in the (model-generated) text could break out of the attribute → XSS.
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// NUL sentinel used to stash already-emitted HTML (code spans, links) out of the way of
// the emphasis passes. Built via fromCharCode so no control char is ever typed literally.
const SENT = String.fromCharCode(0);
const RESTORE = new RegExp(SENT + "(\\d+)" + SENT, "g");

/** Inline spans: `code`, **bold**, *italic* / _italic_, [text](url). Input is already escaped. */
function inline(text: string): string {
  // Emit code spans and links FIRST, then stash the emitted HTML behind a NUL-delimited
  // placeholder so the later bold/italic passes can't reach inside a <code> body or an
  // href value and corrupt it (e.g. a `foo_bar_baz` code span or a snake_case URL). NUL
  // cannot appear in the already-HTML-escaped source, so the placeholder is unambiguous —
  // a space delimiter would false-match real numbers like "step 3 done". Restored last.
  const tokens: string[] = [];
  const stash = (html: string): string => SENT + (tokens.push(html) - 1) + SENT;

  let s = text;
  s = s.replace(/`([^`]+)`/g, (_m, c) => stash(`<code>${c}</code>`));
  // links [text](http…) — only http(s), rendered with rel=noopener
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, t, url) =>
    stash(`<a href="${url}" target="_blank" rel="noopener noreferrer">${t}</a>`));
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // _italic_ only at word boundaries, so snake_case prose (my_long_name) is left alone
  s = s.replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>");
  s = s.replace(RESTORE, (_m, i) => tokens[Number(i)]);
  return s;
}

/** Render a Markdown string to safe HTML. */
export function renderMarkdown(src: string): string {
  const text = escapeHtml((src ?? "").replace(/\r\n/g, "\n"));
  const lines = text.split("\n");
  const html: string[] = [];
  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(" ")).trim()}</p>`);
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      flushPara();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // skip closing fence
      html.push(`<pre><code>${buf.join("\n")}</code></pre>`);
      continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      const level = Math.min(6, h[1].length);
      html.push(`<h${level}>${inline(h[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      flushPara();
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      html.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // unordered list
    if (/^\s*[-*•]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*[-*•]\s+/, "").trim())}</li>`);
        i++;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*\d+[.)]\s+/, "").trim())}</li>`);
        i++;
      }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // blank line → paragraph break
    if (/^\s*$/.test(line)) {
      flushPara();
      i++;
      continue;
    }

    // paragraph text
    para.push(line.trim());
    i++;
  }
  flushPara();
  return html.join("");
}
