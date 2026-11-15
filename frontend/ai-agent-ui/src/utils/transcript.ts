// Transcript parsing + formatting utilities.

export interface Cue {
  /** start time in seconds */
  t: number;
  text: string;
}

/** "00:01:23.456" | "00:01:23,456" | "1:23" -> seconds */
export function timeToSec(str: string): number {
  const s = String(str).trim().replace(",", ".");
  const parts = s.split(":").map(parseFloat);
  let sec = 0;
  for (const n of parts) sec = sec * 60 + (isNaN(n) ? 0 : n);
  return sec;
}

export function numTime(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.includes(":")) return timeToSec(v);
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

/** Parse .vtt / .srt / .json transcript files into cues. */
export function parseTranscript(name: string, text: string): Cue[] {
  const ext = (name.split(".").pop() || "").toLowerCase();

  if (ext === "json") {
    const data = JSON.parse(text);
    const arr: any[] = Array.isArray(data)
      ? data
      : data.cues || data.segments || data.transcript || data.results || [];
    return arr
      .map((it) => ({
        t: numTime(it.start ?? it.t ?? it.time ?? it.begin ?? it.offset ?? 0),
        text: String(it.text ?? it.content ?? it.caption ?? it.value ?? "").trim(),
      }))
      .filter((c) => c.text);
  }

  // .vtt / .srt share the same cue block layout
  const norm = text.replace(/\r/g, "");
  const blocks = norm.split(/\n\n+/);
  const out: Cue[] = [];
  for (const b of blocks) {
    const lines = b.split("\n").filter((l) => l.trim() !== "");
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;
    const t = timeToSec(timeLine.split("-->")[0]);
    const txt = lines
      .filter(
        (l) =>
          l !== timeLine &&
          !/^\d+$/.test(l.trim()) &&
          !l.includes("-->") &&
          l.trim().toUpperCase() !== "WEBVTT"
      )
      .join(" ")
      .trim();
    if (txt) out.push({ t, text: txt });
  }
  return out;
}

/** seconds -> "m:ss" */
export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

/** seconds -> "HH:MM:SS.mmm" for WebVTT output */
export function vttTime(sec: number): string {
  sec = Math.max(0, sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  const p = (n: number, l: number) => String(n).padStart(l, "0");
  return `${p(h, 2)}:${p(m, 2)}:${p(s, 2)}.${p(ms, 3)}`;
}

/** Build a downloadable WebVTT string from cues. */
export function buildVtt(cues: Cue[]): string {
  let out = "WEBVTT\n\n";
  cues.forEach((c, i) => {
    const next = cues[i + 1] ? cues[i + 1].t : c.t + 4;
    out += `${i + 1}\n${vttTime(c.t)} --> ${vttTime(next)}\n${c.text}\n\n`;
  });
  return out;
}

export function fmtSize(b: number): string {
  if (!b) return "";
  if (b >= 1073741824) return (b / 1073741824).toFixed(1) + " GB";
  if (b >= 1048576) return (b / 1048576).toFixed(1) + " MB";
  return Math.max(1, Math.round(b / 1024)) + " KB";
}
