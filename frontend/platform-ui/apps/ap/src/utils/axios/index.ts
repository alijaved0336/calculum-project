import axios, { AxiosError } from "axios";
import uuidRandom from "uuid-random";
import { authWarningState } from "@/utils/authWarningState";

// Create axios instance with default config
const axiosInstance = axios.create({
  withCredentials: true // Ensure credentials are sent with every request
});

// Create a cancel token source
let cancelTokenSource = axios.CancelToken.source();

// Helper function to check if we should show error toasts
const shouldShowErrorToasts = () => {
  return !authWarningState.hasShown401Warning && !authWarningState.isRedirecting;
};

// Request interceptor
axiosInstance.interceptors.request.use(
  async function (config) {
    // Skip requests if we're in the middle of auth redirection
    if (authWarningState.hasShown401Warning || authWarningState.isRedirecting) {
      return Promise.reject(new Error('Authentication in progress'));
    }

    // improve security with idempotency. Skip if a retry (e.g. the 401
    // revalidate-and-retry path) already carries the original key — regenerating it
    // here would let the backend's de-duplication miss a write that already landed.
    if ((config.method === "post" || config.method === "patch") && !config.headers["idk"]) {
      const idempotencyKey = uuidRandom();
      config.headers["idk"] = idempotencyKey;
    }

    // Ensure credentials are sent with every request
    config.withCredentials = true;

    config.cancelToken = cancelTokenSource.token;
    return config;
  },
  function (error) {
    if (import.meta.env.DEV) {
      console.error("Request interceptor error:", error);
    }
    return Promise.reject(error);
  }
);

async function handleUnauthorizedResponse(error: AxiosError, url: string) {
  if (url.includes('/login') || url.includes('/session/info') || url.includes('/session/envent-token')) {
    return Promise.reject(error);
  }
  if (error.config && !(error.config as any)._revalidatedSession) {
    (error.config as any)._revalidatedSession = true;
    const stillValid = await authWarningState.isSessionStillValid();
    if (stillValid) {
      delete error.config.cancelToken;
      return axiosInstance(error.config);
    }
  }

  cancelTokenSource.cancel('Session expired');
  cancelTokenSource = axios.CancelToken.source();

  try {
    // Handle auth error and wait for redirection
    await authWarningState.handleAuthError();
  } catch (redirectError) {
    if (import.meta.env.DEV) console.error('Error during auth redirection:', redirectError);
  }
  return Promise.reject(new Error('Authentication in progress'));
}

// Response interceptor
axiosInstance.interceptors.response.use(
  function (response) {
    return response;
  },
  async function (error) {
    // Skip error handling if we're already handling auth
    if (authWarningState.hasShown401Warning || authWarningState.isRedirecting) {
      return Promise.reject(new Error('Authentication in progress'));
    }

    // Safely extract error details
    const errorDetails = {
      url: error?.config?.url,
      message: error?.message || 'Unknown error',
      status: error?.response?.status,
      data: error?.response?.data
    };

    if (import.meta.env.DEV) {
      console.warn("Response interceptor error:", errorDetails);
    }

    // Handle 401 errors
    if (errorDetails.status === 401) {
      return handleUnauthorizedResponse(error, errorDetails.url || '');
    }

    // Handle other errors
    if (error?.code === 'ECONNABORTED') {
      console.error('Request timeout');
      if (shouldShowErrorToasts()) {
        return Promise.reject(new Error('Request timeout. Please try again.'));
      }
      return Promise.reject(new Error('Authentication in progress'));
    }

    // For other errors, only reject with error if we should show toasts
    if (shouldShowErrorToasts()) {
      return Promise.reject(error);
    }
    return Promise.reject(new Error('Authentication in progress'));
  }
);

// Export the shouldShowErrorToasts helper for use in other files
export { shouldShowErrorToasts };

export default axiosInstance;
