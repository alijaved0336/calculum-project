import { createClient } from '../client'

// Base URL of the Support Agent backend (query side, :8002). Owns the video library
// (list / search / pagination / delete) and, later, the RAG chat.
const base = import.meta.env.VITE_SUPPORT_API_URL || ''

export default createClient(base)
