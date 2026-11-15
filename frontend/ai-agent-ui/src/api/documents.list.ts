// Support Documents library — backed by the Support Agent backend (:8002),
// GET /documents?q=&page=&page_size= with real server-side search + pagination.
// (Document upload itself goes to the ingestion service; this only lists/deletes.)

import supportClient from '@/api/services/support.client'
import { docRowToDisplayStatus, docStageLabel } from '@/api/ingestion.service'
import type { DocumentRow } from '@/types/ingestion'
import type { SupportDoc } from '@/data/supportDocuments'

export interface DocumentListPage {
  items: SupportDoc[]
  total: number
  page: number
  pageSize: number
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Backend DocumentRow -> the display row. */
function toSupportDoc(row: DocumentRow): SupportDoc {
  const name = row.filename || row.title || `${row.document_id}`
  const ext = (name.split('.').pop() || '').toUpperCase()
  return {
    id: row.document_id,
    name,
    type: ext,
    title: row.title ?? undefined,
    isPublic: !!row.is_public,
    chunks: row.chunk_count ?? 0,
    author: '',
    date: fmtDate(row.updated_at ?? row.created_at),
    status: docRowToDisplayStatus(row.document_status),
    stage: docStageLabel(row.document_status),
  }
}

/** Server-side paginated + searchable list of support documents. */
export async function fetchDocuments(
  params: { q?: string; page?: number; pageSize?: number } = {},
): Promise<DocumentListPage> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 8
  const { data } = await supportClient.get('/documents', {
    params: { q: params.q || undefined, page, page_size: pageSize },
  })
  const rows: DocumentRow[] = data.items ?? []
  return {
    items: rows.map(toSupportDoc),
    total: data.total ?? rows.length,
    page: data.page ?? page,
    pageSize: data.page_size ?? pageSize,
  }
}

/** Remove a document from the library (DELETE /documents/{id} on the support backend). */
export async function deleteDocument(documentId: string): Promise<void> {
  await supportClient.delete(`/documents/${documentId}`)
}

/** Fetch a short-lived signed GCS URL for the original document file
 *  (GET /documents/{id}/download). Returns the URL for the caller to open — kept separate
 *  from `window.open` so the caller can open the tab synchronously (popup-blocker safe) and
 *  surface errors. Throws on a 403 (private/not permitted), network failure, or missing URL. */
export async function fetchDocumentUrl(documentId: string): Promise<string> {
  const { data } = await supportClient.get(`/documents/${documentId}/download`)
  if (!data?.download_url) throw new Error('No download URL returned')
  return data.download_url
}
