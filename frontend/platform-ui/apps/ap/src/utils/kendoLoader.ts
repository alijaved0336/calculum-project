import { loadKendo, loadCharts } from './scriptLoader';

/**
 * Ensures Kendo UI is loaded before executing a callback
 * @returns Promise that resolves when Kendo UI is loaded
 */
export const ensureKendoLoaded = async (): Promise<void> => {
  await loadKendo();
};

/**
 * Ensures Kendo Charts are loaded before executing a callback
 * @returns Promise that resolves when Kendo Charts are loaded
 */
export const ensureChartsLoaded = async (): Promise<void> => {
  await loadCharts();
}; 