import { createClient } from '../client'

// In dev, baseURL is empty so the Vite proxy routes ingestion endpoints to
// INGESTION_BACKEND_URL. In staging/prod, set VITE_INGESTION_API_URL.
const base = import.meta.env.DEV ? '' : (import.meta.env.VITE_INGESTION_API_URL || '')

export default createClient(base)
