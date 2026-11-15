import client from './services/ingestion.client'

export interface UploadDocumentOptions {
  file: File
  isAlreadyUploaded: boolean
  strategyTermExtension: boolean
  strategyTermExtensionScf: boolean
  description?: string | null
}

export interface UploadAcceptedResponse {
  job_id: string
  file_id: string
  status: string
  status_url: string
  events_url: string
}

export interface UploadedDocInfo {
  fileId: string
  filename: string
  eventsUrl: string
}

export interface DeleteChunksResponse {
  deleted: boolean
  file_uuid: string
  status: string
}

export interface IngestionLog {
  uuid: string
  status: string
  started_at: string
  completed_at: string | null
  logs: Record<string, unknown>
}

export interface IngestionLogsResponse {
  items: IngestionLog[]
  total: number
}

export const ingestionApi = {
  uploadDocument: ({
    file,
    isAlreadyUploaded,
    strategyTermExtension,
    strategyTermExtensionScf,
    description,
  }: UploadDocumentOptions) => {
    const form = new FormData()
    form.append('file', file)
    form.append('is_already_uploaded', String(isAlreadyUploaded))
    form.append('strategy_term_extension', String(strategyTermExtension))
    form.append('strategy_term_extension_scf', String(strategyTermExtensionScf))
    if (description?.trim()) form.append('description', description.trim())

    return client.post<UploadAcceptedResponse>('/ingest/upload', form)
  },

  deleteDocument: (fileUuid: string) =>
    client.delete<DeleteChunksResponse>(`/ingest/documents/${fileUuid}`),

  getLogs: (limit = 25, offset = 0) =>
    client.get<IngestionLogsResponse>('/ingestion-logs', { params: { limit, offset } }),
}
