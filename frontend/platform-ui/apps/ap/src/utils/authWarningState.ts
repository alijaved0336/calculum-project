import axios from "axios";
import { authLogin } from "@/utils/CookieSessionsFns";
import { getBaseApi } from "@/utils/getBaseApi";

// Flag to track if the 401 warning has been shown
let hasShown401Warning = false;
let isRedirecting = false;
let redirectPromise: Promise<void> | null = null;
let sessionRevalidationPromise: Promise<boolean> | null = null;

export const authWarningState = {
  // Get current state
  get hasShown401Warning() {
    return hasShown401Warning;
  },

  get isRedirecting() {
    return isRedirecting;
  },
  isSessionStillValid(): Promise<boolean> {
    sessionRevalidationPromise ??= axios
      .get(`${getBaseApi()}/api/session/info`, { withCredentials: true })
      .then(() => true)
      .catch((error) => {
        // Only an actual 401/403 means the session is invalid. Any other failure (network
        // error, 5xx, CORS) is transient — treat it as still-valid so we don't force a full
        // logout/redirect over what may just be a blip.
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        return status !== 401 && status !== 403;
      })
      .finally(() => {
        sessionRevalidationPromise = null;
      });
    return sessionRevalidationPromise;
  },

  async handleUnauthorized(): Promise<void> {
    if (hasShown401Warning || isRedirecting) return;
    const stillValid = await this.isSessionStillValid();
    if (stillValid) return;
    await this.handleAuthError();
  },

  // Mark warning as shown and handle redirection
  async handleAuthError() {
    if (hasShown401Warning) {
      if (import.meta.env.DEV) console.log('Auth warning already shown, skipping...');
      return;
    }

    hasShown401Warning = true;
    isRedirecting = true;

    // Create a new redirect promise if none exists
    redirectPromise ??= new Promise<void>((resolve) => {
      (async () => {
        try {
          // Show warning toast
          const { useToast } = await import('vue-toastification');
          const toast = useToast();
          toast.warning("Your session has expired. Let's try to log in again to continue.");

          if (import.meta.env.DEV) console.info("Unauthorized - Redirecting to login");
          await authLogin();
        } catch (error) {
          if (import.meta.env.DEV) console.error('Error during auth redirection:', error);
        } finally {
          resolve();
        }
      })();
    });

    // Wait for the redirect to complete
    await redirectPromise;
  },

  // Reset warning state (call this after successful authentication)
  resetWarningState() {
    hasShown401Warning = false;
    isRedirecting = false;
    redirectPromise = null;
  }
}; 