<script setup lang="ts">
/**
 * A single-marker Google Map (`vue3-google-map` under the hood) for one company/entity's location.
 *
 * Promoted from apps/ap/src/modules/home/entityCard/components/EntityCardLocationMap.vue, moved
 * to `<script setup>` (matching every other component promoted here, e.g. GeoChart/BubbleMap's own
 * docs). The one behavioral change: `apiKey` is now a caller-supplied prop instead of this
 * component reading `import.meta.env.VITE_GOOGLE_MAP_KEY` directly - design-system has no
 * environment of its own, and reading `import.meta.env` here would silently resolve to whichever
 * consuming app's env happens to be bundled, rather than the key that app actually owns.
 */
import { computed } from "vue";
import { GoogleMap, Marker } from "vue3-google-map";
import type { LocationMapProps } from "./types";

defineOptions({
  name: "LocationMap",
});

const props = defineProps<LocationMapProps>();

const center = computed(() => ({ lat: props.latitude, lng: props.longitude }));
</script>

<template>
  <GoogleMap
    :api-key="apiKey"
    style="width: 100%; height: 150px"
    :center="center"
    language="en"
    region="US"
    :disable-default-ui="true"
    :zoom="14"
  >
    <Marker :options="{ position: center }" />
  </GoogleMap>
</template>

<style lang="css" scoped>
#map a img {
  display: none;
}
</style>
