import { createAppPinia } from "@ada/core";

// Keys currently persisted by ap's stores (see src/stores/*.ts `key:` options)
const STORE_KEYS = ["ada-app", "ada-user", "ada-adminBackend", "ada-analyze", "ada-entityCard"];

const { pinia, secureStorage, debugStorage, clearStorage, testSecureStorage } = createAppPinia({
  storageSecret: import.meta.env.VITE_APP_STORAGE_SECRET || "your-secure-secret-key",
  encryptionNamespace: "calculum-pinia",
  debug: import.meta.env.DEV,
  // ada-home/ada-user used to fall back to plain-JSON storage on SecureLS quota overflow; drop any leftovers once.
  legacyPlainJsonKeys: ["ada-home", "ada-user"],
  cleanup: true,
  exposeOnGlobal: import.meta.env.DEV ? "__PINIA__" : undefined,
});

export { secureStorage };
export default pinia;

// Debug functions to inspect/clear stored Pinia stores (dev only)
export const debugPiniaStorage = () => debugStorage(STORE_KEYS);
export const clearPiniaStorage = () => clearStorage(STORE_KEYS);
export const testSecureLS = testSecureStorage;
