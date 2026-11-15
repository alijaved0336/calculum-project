/**
 * Parse the filename from a `Content-Disposition` header (RFC 5987 `filename*=` first, then plain
 * `filename`).
 *
 * Lifted out of `modules/home/api/index.ts`, where it served the tokenized grid-export download, so
 * the sale-file strategy-adjustments download (AB#19711) shares one implementation rather than
 * carrying a second copy of the same two regexes. A leaf module on purpose: importing it must not
 * drag in `modules/home/api`, which reaches the router and every view.
 *
 * The header is only readable cross-origin because the API exposes it — see `expose_headers` in the
 * back-end's `nelmio_cors.yaml`. A caller must therefore still handle `undefined`.
 */
export function parseContentDispositionFilename(header?: string | null): string | undefined {
  if (!header) return undefined;

  // Extended form: filename*=<charset>'<lang>'<pct-encoded>  — decode only the encoded name.
  // The charset class is lower-case only BY DESIGN: the `i` flag already makes it match `UTF-8`
  // as well as `utf-8`, so spelling `A-Za-z` would be the same set written twice (Sonar S5869).
  // Both spellings occur in practice — Symfony's makeDisposition emits `utf-8''`, .NET emits
  // `UTF-8''` — so the flag is load-bearing rather than defensive.
  const extended = /filename\*=[a-z0-9-]+'[^']*'([^;\s]+)/i.exec(header);
  if (extended?.[1]) {
    try {
      return decodeURIComponent(extended[1]);
    } catch {
      /* malformed encoding — fall back to the plain form */
    }
  }

  // Plain form: filename="name.csv" or filename=name.csv
  const plain = /filename="([^"]+)"|filename=([^;\s]+)/i.exec(header);
  return plain?.[1] ?? plain?.[2];
}

/** Case-insensitive read of `Content-Disposition` off an axios response's headers. */
export function readContentDispositionFilename(headers: any): string | undefined {
  const header = headers?.["content-disposition"] ?? headers?.["Content-Disposition"];

  return parseContentDispositionFilename(header as string | undefined);
}

/**
 * Extension for a saved file when the server named none, keyed off its `Content-Type`.
 *
 * Defaults to `.xlsx` rather than to nothing: a file with no extension is one the OS cannot
 * associate, so the administrator cannot reopen it to edit and re-upload — which for an adjustments
 * file is the whole point of downloading it.
 */
export function extensionForContentType(contentType?: string | null): string {
  const type = (contentType ?? "").toLowerCase();

  if (type.includes("csv") || type.startsWith("text/plain")) return ".csv";
  if (type.includes("spreadsheetml")) return ".xlsx";
  if (type.includes("ms-excel")) return ".xls";
  if (type.includes("json")) return ".json";

  return ".xlsx";
}
