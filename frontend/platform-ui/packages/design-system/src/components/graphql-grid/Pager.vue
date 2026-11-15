<template>
  <nav
    class="graphql-grid-pager"
    aria-label="Pagination"
  >
    <div class="graphql-grid-pager__nav">
      <CustomButton
        class="graphql-grid-pager__prev"
        text="Previous"
        icon="chevron-right"
        :disabled="isFirstPage"
        @click="goTo(currentPage - 1)"
      />
      <div class="graphql-grid-pager__pages">
        <template
          v-for="(item, index) in pageItems"
          :key="`${item}-${index}`"
        >
          <span
            v-if="item === 'ellipsis'"
            class="graphql-grid-pager__ellipsis"
            aria-hidden="true"
          >…</span>
          <button
            v-else
            type="button"
            class="graphql-grid-pager__page"
            :class="{ 'graphql-grid-pager__page--active': item === currentPage }"
            :aria-current="item === currentPage ? 'page' : undefined"
            :aria-label="`Page ${item}`"
            @click="goTo(item)"
          >
            {{ item }}
          </button>
        </template>
      </div>
      <CustomButton
        class="graphql-grid-pager__next"
        text="Next"
        icon="chevron-right"
        :disabled="isLastPage"
        @click="goTo(currentPage + 1)"
      />
    </div>
    <div
      v-if="info"
      class="graphql-grid-pager__meta"
    >
      <div
        v-if="showPageSizes"
        class="graphql-grid-pager__size"
      >
        <DropdownPanel
          v-model:open="sizeOpen"
          align="end"
        >
          <template #trigger="{ toggle, open: isOpen }">
            <button
              type="button"
              class="graphql-grid-pager__size-trigger"
              :aria-expanded="isOpen"
              aria-haspopup="listbox"
              aria-label="Items per page"
              @click="toggle"
            >
              {{ take }}
              <InlineSvg
                class="graphql-grid-pager__size-chevron"
                :class="{ 'graphql-grid-pager__size-chevron--open': isOpen }"
                :src="chevronSrc"
                width="16"
                height="16"
                aria-hidden="true"
              />
            </button>
          </template>
          <ul
            class="ds-dropdown-surface__list"
            role="listbox"
            aria-label="Items per page"
          >
            <li
              v-for="size in pageSizeOptions"
              :key="size"
            >
              <DropdownMenuItem
                :label="String(size)"
                trailing="check"
                :selected="size === take"
                @click="changeTake(size)"
              />
            </li>
          </ul>
        </DropdownPanel>
        <BodyText
          class="graphql-grid-pager__size-label"
          variant="sm"
          as="span"
        >
          items per page
        </BodyText>
      </div>
      <BodyText
        class="graphql-grid-pager__info"
        variant="sm"
        as="p"
      >
        {{ rangeLabel }}
      </BodyText>
    </div>
  </nav>
</template>

<script lang="ts">
import { computed, defineComponent, ref, type PropType } from "vue";
import InlineSvg from "vue-inline-svg";
import { resolveSvgAsset } from "../../utils/svgAssets";
import { CustomButton } from "../primitives/custom-button";
import { DropdownPanel } from "../primitives/dropdown-panel";
import { DropdownMenuItem } from "../primitives/dropdown-menu-item";
import BodyText from "../primitives/typography/body-text/Index.vue";
import {
  buildPagerItems,
  pagerRangeLabel,
  type GraphqlGridPageSizeList,
} from "./pager";

export default defineComponent({
  name: "GraphqlGridPager",
  components: {
    CustomButton,
    DropdownPanel,
    DropdownMenuItem,
    BodyText,
    InlineSvg,
  },
  props: {
    skip: { type: Number, default: 0 },
    take: { type: Number, default: 20 },
    total: { type: Number, default: 0 },
    buttonCount: { type: Number, default: 5 },
    info: { type: Boolean, default: false },
    pageSizes: {
      type: Array as PropType<GraphqlGridPageSizeList>,
      default: () => [],
    },
  },
  emits: ["pagechange", "takechange"],
  setup(props, { emit }) {
    const sizeOpen = ref(false);
    const chevronSrc = resolveSvgAsset("icon-arrow-down");
    const pageSize = computed(() => Math.max(1, props.take));
    const totalPages = computed(() =>
      Math.max(1, Math.ceil(props.total / pageSize.value)),
    );
    const currentPage = computed(() => {
      const page = Math.floor(props.skip / pageSize.value) + 1;
      return Math.min(Math.max(page, 1), totalPages.value);
    });
    const isFirstPage = computed(() => currentPage.value <= 1);
    const isLastPage = computed(() => currentPage.value >= totalPages.value);
    const pageItems = computed(() =>
      buildPagerItems(currentPage.value, totalPages.value, props.buttonCount),
    );
    const rangeLabel = computed(() =>
      pagerRangeLabel(props.skip, props.take, props.total),
    );
    const pageSizeOptions = computed(() => {
      const sizes = [...props.pageSizes];
      if (sizes.length === 0) {
        return [];
      }
      if (!sizes.includes(props.take)) {
        sizes.push(props.take);
        sizes.sort((left, right) => left - right);
      }
      return sizes;
    });
    const showPageSizes = computed(() => pageSizeOptions.value.length > 0);

    function goTo(page: number) {
      if (page < 1 || page > totalPages.value || page === currentPage.value) {
        return;
      }
      emit("pagechange", (page - 1) * pageSize.value);
    }

    function changeTake(nextTake: number) {
      sizeOpen.value = false;
      if (nextTake === props.take || nextTake < 1) {
        return;
      }
      emit("takechange", nextTake);
    }

    return {
      sizeOpen,
      chevronSrc,
      currentPage,
      isFirstPage,
      isLastPage,
      pageItems,
      rangeLabel,
      pageSizeOptions,
      showPageSizes,
      goTo,
      changeTake,
    };
  },
});
</script>

<style lang="scss" scoped>
.graphql-grid-pager {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  margin-top: 0.75rem;
  box-sizing: border-box;

  &__nav {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  &__pages {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  &__ellipsis,
  &__page {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    min-height: 2rem;
    padding: 0.25rem;
    font-family: var(--font-family-base);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.4;
    color: var(--color-text-3);
  }

  &__page {
    margin: 0;
    border: none;
    border-radius: var(--border-radius-3);
    background: transparent;
    cursor: pointer;
    transition: var(--transition-default);

    &:hover:not(&--active) {
      color: var(--color-text-1);
      background: var(--bg-surface-subtle-1);
    }

    // The inset ring keeps the active page visible on any host background: in light theme the
    // fill (bg-surface-subtle-2) is the same neutral-100 as bg-page, so a grid rendered straight
    // on the page - not inside a ContentBox/white surface - would otherwise lose the highlight.
    &--active {
      color: var(--color-text-1);
      background: var(--bg-surface-subtle-2);
      box-shadow: inset 0 0 0 1px var(--border-color-default-2);
    }

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
  }

  &__prev,
  &__next {
    color: var(--color-text-3);
    flex-shrink: 0;
  }

  &__prev :deep(.custom-button__icon) {
    transform: scaleX(-1);
  }

  &__next {
    flex-direction: row-reverse;
  }

  &__meta {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.75rem;
  }

  &__size {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__size-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 3.25rem;
    min-height: 2rem;
    margin: 0;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border-color-default-2);
    border-radius: var(--border-radius-2);
    background: var(--bg-surface);
    color: var(--color-text-1);
    font-family: var(--font-family-base);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.4;
    cursor: pointer;
    transition: var(--transition-default);

    &:hover,
    &:focus-visible {
      border-color: var(--border-color-default);
    }

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
  }

  &__size-chevron {
    width: 1rem;
    height: 1rem;
    color: var(--color-text-3);
    transition: transform 0.2s ease;

    &--open {
      transform: rotate(180deg);
    }
  }

  &__size-label,
  &__info {
    margin: 0;
    color: var(--color-text-3);
    white-space: nowrap;
  }
}
</style>
