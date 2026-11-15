// Upload size limits, overridable per environment via VITE_* variables
// (defaults committed in apps/ap/.env, local overrides in .env.local).

const MB_IN_BYTES = 1024 * 1024

export function parseMbLimit (raw: unknown, fallbackMb: number): number {
  if (raw === '' || raw === null || raw === undefined) return fallbackMb
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : fallbackMb
}

export const MAX_SPEND_FILE_MB = parseMbLimit(import.meta.env.VITE_UPLOAD_MAX_SPEND_FILE_MB, 100)
export const MAX_SPEND_FILE_BYTES = MAX_SPEND_FILE_MB * MB_IN_BYTES

export const MAX_IMAGE_MB = parseMbLimit(import.meta.env.VITE_UPLOAD_MAX_IMAGE_MB, 5)
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * MB_IN_BYTES
