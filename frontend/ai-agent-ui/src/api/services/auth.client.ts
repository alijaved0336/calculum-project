import { createClient } from '../client'

// In dev, baseURL is empty — the Vite proxy routes /auth/* to AUTH_BACKEND_URL.
// In staging/prod, VITE_AUTH_API_URL must be set to the auth service base URL.
const base = import.meta.env.DEV ? '' : (import.meta.env.VITE_AUTH_API_URL || '')

export default createClient(base)
