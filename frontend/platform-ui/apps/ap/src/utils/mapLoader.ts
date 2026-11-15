import { loadKendo } from './scriptLoader';

/**
 * Ensures Kendo Map is loaded before executing a callback
 * @returns Promise that resolves when Kendo Map is loaded
 */
export const ensureMapLoaded = async (): Promise<void> => {
  await loadKendo();
}; 