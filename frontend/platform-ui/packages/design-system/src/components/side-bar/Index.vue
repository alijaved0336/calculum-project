<script setup lang="ts">
import { computed } from "vue";
import SideBarLink from "./link/Index.vue";
import type { SideBarItem } from "./types";

defineOptions({
  name: "SideBar",
});

const props = defineProps<{
  items: SideBarItem[][];
  activeKey?: string;
}>();

const emit = defineEmits<{
  navigate: [key: string];
}>();

const itemGroups = computed(() =>
  props.items.filter((group) => group.length > 0),
);
</script>

<template>
  <nav class="sidebar">
    <div class="sidebar__content">
      <div class="sidebar__scroll-box">
        <div class="sidebar__top">
          <div
            v-if="itemGroups.length > 0"
            class="sidebar__nav"
          >
            <template
              v-for="(group, groupIndex) in itemGroups"
              :key="groupIndex"
            >
              <div
                v-if="groupIndex > 0"
                class="sidebar__top-divider"
              />
              <SideBarLink
                v-for="item in group"
                :key="item.key"
                :icon="item.icon"
                :title="item.title"
                :is-active="item.key === activeKey"
                @click="emit('navigate', item.key)"
              />
            </template>
          </div>
          <div
            v-if="itemGroups.length > 0 && $slots['secondary-list']"
            class="sidebar__top-divider"
          />
          <div
            v-if="$slots['secondary-list']"
            class="sidebar__secondary-list"
          >
            <slot name="secondary-list" />
          </div>
        </div>

        <div
          v-if="$slots.footer"
          class="sidebar__footer"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.sidebar {
  position: relative;
  height: 100%;
  max-width: 3.5rem;
  padding: 0.5rem;
  background: var(--bg-navigation);
  gap: 0.5rem;
  overflow: hidden;
  border-radius: var(--border-radius-default);
  color: var(--color-text-navigation);

  &__content {
    height: 100%;
    width: 100%;
    overflow: auto;

    &::-webkit-scrollbar {
      width: 0;
    }
    scrollbar-width: none;
  }

  &__scroll-box {
    height: max-content;
    min-height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
  }

  &__top {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;

    &-divider {
      width: 1.25rem;
      height: 1px;
      background: var(--bg-navigation-active-item);
      margin-bottom: 0.75rem;
    }
  }

  &__nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex: 1;

    .sidebar__top-divider {
      margin-bottom: 0;
    }
  }

  &__secondary-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  &__footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-top: auto;
  }
}
</style>
