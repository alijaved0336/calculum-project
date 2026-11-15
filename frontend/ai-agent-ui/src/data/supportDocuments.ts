// Support documents — display types + per-type icon colors.
// Data comes from the Support backend (:8002 GET /documents); no mocks here.
export type DocStatus = 'indexed' | 'processing' | 'failed'
export type DocType = 'PDF' | 'DOC' | 'DOCX' | 'TXT' | 'MD'

export interface SupportDoc {
  id: string // document_id
  name: string // file name incl. extension
  type: string // extension, uppercased (DocType, or fallback)
  title?: string // optional admin-provided title
  isPublic?: boolean // public docs are cited to all users; private ones only to admins
  chunks: number
  author: string
  date: string
  status: DocStatus
  /** Live sub-stage label while processing (SSE-driven): "Processing" | "Indexing". */
  stage?: string
}

/** Per-type icon palette for the file-shaped badge (banner fill). */
export const DOC_ICON_COLORS: Record<string, string> = {
  PDF: '#c0392b',
  DOC: '#1a56b8',
  DOCX: '#1a56b8',
  TXT: '#5b6470',
  MD: '#6b3fc9',
}
