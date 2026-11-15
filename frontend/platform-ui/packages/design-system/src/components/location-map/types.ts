/** Mirrors Index.vue's inline `defineProps<{...}>()` shape (same duplication as bubble-map/types.ts,
 * geo-chart/types.ts). */
export type LocationMapProps = {
  /**
   * Google Maps JavaScript API key. Design-system carries no environment/key of its own - the app
   * embedding this component owns billing/quota for its own key (`VITE_GOOGLE_MAP_KEY` in AP) and
   * must supply it, rather than this component reading `import.meta.env` itself and silently
   * picking up whichever app happens to bundle it.
   */
  apiKey: string;
  latitude: number;
  longitude: number;
};
