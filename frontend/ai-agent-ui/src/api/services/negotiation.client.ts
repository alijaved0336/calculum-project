import { createClient } from '../client'

// In dev, baseURL is empty — the Vite proxy routes /session/*, /suppliers/*, /threads/*,
// /health, and UUID-prefix paths to NEGOTIATION_BACKEND_URL.
// In staging/prod, VITE_NEGOTIATION_API_URL must be set to the negotiation service base URL.
const base = import.meta.env.DEV ? '' : (import.meta.env.VITE_NEGOTIATION_API_URL || '')

export default createClient(base)
