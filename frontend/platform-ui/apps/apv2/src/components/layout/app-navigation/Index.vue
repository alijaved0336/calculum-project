<template>
  <SideBar
    class="app-navigation"
    :items="NAV_ITEMS"
    :active-key="activeKey"
    @navigate="onNavigate"
  >
    <template #footer>
      <SideBarLogo />
    </template>
  </SideBar>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { SideBar, SideBarLogo } from "@ada/design-system";
import {
  DEFAULT_NAV_KEY,
  NAV_ITEMS,
  NAV_KEY_BY_ROUTE,
  NAV_ROUTE_BY_KEY,
} from "./nav";

defineOptions({ name: "AppNavigation" });

const route = useRoute();
const router = useRouter();

const activeKey = computed(() => {
  if (typeof route.name !== "string") {
    return DEFAULT_NAV_KEY;
  }
  return NAV_KEY_BY_ROUTE[route.name] ?? DEFAULT_NAV_KEY;
});

function onNavigate(key: string) {
  const name = NAV_ROUTE_BY_KEY[key];
  if (!name || route.name === name) {
    return;
  }
  void router.push({ name });
}
</script>

<style lang="scss" scoped>
.app-navigation {
  height: 100%;
}
</style>
