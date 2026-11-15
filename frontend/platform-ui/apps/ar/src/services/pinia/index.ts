import { createAppPinia } from '@ada/core'

// Checked rather than passed straight through: createAppPinia falls back to a hardcoded
// 'default-secret' when this is empty, which would encrypt persisted state under a key that
// lives in the source tree. Failing at startup makes a missing variable obvious instead.
const storageSecret = import.meta.env.VITE_APP_STORAGE_SECRET
if (!storageSecret) {
  throw new Error(
    'VITE_APP_STORAGE_SECRET is not set. Persisted state would be encrypted with a well-known ' +
      'default key. Set it in .env.local for development, and in the environment for a deploy.',
  )
}

const { pinia, secureStorage } = createAppPinia({
  storageSecret,
  encryptionNamespace: 'ar-pinia',
  debug: import.meta.env.VITE_DEBUG === 'true',
})

export { secureStorage }
export default pinia
