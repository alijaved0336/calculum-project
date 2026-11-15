<template>
  <AppShellLayout>
    <template #navigation>
      <AppNavigation />
    </template>
    <template #header>
      <AppHeader />
    </template>
    <RouterView />
  </AppShellLayout>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { AppShellLayout } from "@/layouts/app-shell";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavigation } from "@/components/layout/app-navigation";

defineOptions({ name: "LayoutView" });
</script>
