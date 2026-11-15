<script setup lang="ts">
import InlineSvg from "vue-inline-svg";
import logoCalculumUrl from "@ada/design-system/assets/icons/logo-calculum.svg?url";

defineOptions({
  name: "SideBarLogo",
});
</script>

<template>
  <a
    class="sidebar-logo"
    href="https://www.calculum.ai/"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Go to Calculum website"
  >
    <InlineSvg
      :src="logoCalculumUrl"
      width="40"
      height="40"
    />
  </a>
</template>

<style lang="scss" scoped>
.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--color-text-navigation-2);
  transition: var(--transition-default);
  border-bottom: none !important;

  &:hover {
    color: var(--color-text-navigation-3);
  }
}
</style>
