// Utility function to get base API URL directly from environment

export const getBaseApi = (): string => {
  return import.meta.env.VITE_BASE_URL;
};

 