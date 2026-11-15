<script lang="ts">
/** Document-unique even when several Vue apps share the page (Storybook docs). */
let sliderInstanceSeq = 0;
</script>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import CustomButton from "../primitives/custom-button/Index.vue";
import {
  SUPPLIER_CARD_SLIDER_DEFAULT_SLIDES_PER_VIEW,
  SUPPLIER_CARD_SLIDER_DEFAULT_SPACE_BETWEEN,
  type SupplierCardSliderItemSlot,
  type SupplierCardSliderProps,
} from "./types";

defineOptions({
  name: "SupplierCardSlider",
});

const props = withDefaults(defineProps<SupplierCardSliderProps>(), {
  items: () => [],
  slidesPerView: SUPPLIER_CARD_SLIDER_DEFAULT_SLIDES_PER_VIEW,
  spaceBetween: SUPPLIER_CARD_SLIDER_DEFAULT_SPACE_BETWEEN,
});

defineSlots<{
  item(slotProps: SupplierCardSliderItemSlot): unknown;
}>();

const swiperModules = [Navigation, Pagination];

const instanceId = `n${++sliderInstanceSeq}`;
const rootModifierClass = `ds-supplier-card-slider--id-${instanceId}`;

const navigation = {
  prevEl: `.${rootModifierClass} .ds-supplier-card-slider__prev`,
  nextEl: `.${rootModifierClass} .ds-supplier-card-slider__next`,
  addIcons: false,
};

const pagination = {
  el: `.${rootModifierClass} .ds-supplier-card-slider__pagination`,
  clickable: true,
  hideOnClick: false,
};

const swiperRef = ref<SwiperClass>();
const isLocked = ref(true);
const isBeginning = ref(true);
const isEnd = ref(true);

const slidesPerGroup = computed(() =>
  Math.max(1, Math.floor(props.slidesPerView)),
);

const showChrome = computed(
  () => props.items.length > 0 && !isLocked.value,
);

function slideKey(item: unknown, index: number): string | number {
  return (item as { id?: string | number }).id ?? index;
}

function syncChrome() {
  const swiper = swiperRef.value;
  if (!swiper) {
    isLocked.value = true;
    isBeginning.value = true;
    isEnd.value = true;
    return;
  }

  isLocked.value = Boolean(swiper.isLocked);
  isBeginning.value = swiper.isBeginning;
  isEnd.value = swiper.isEnd;
  swiper.allowTouchMove = !swiper.isLocked;
}

function onSwiper(swiper: SwiperClass) {
  swiperRef.value = swiper;
  syncChrome();
}

function onSwiperDestroyed() {
  swiperRef.value = undefined;
  syncChrome();
}

watch(
  () => [props.items, props.slidesPerView, props.spaceBetween] as const,
  () => {
    if (!props.items.length) {
      return;
    }

    nextTick(() => {
      swiperRef.value?.update();
      syncChrome();
    });
  },
);
</script>

<template>
  <div
    class="ds-supplier-card-slider"
    :class="[
      rootModifierClass,
      { 'ds-supplier-card-slider--locked': !showChrome },
    ]"
    role="region"
    aria-label="Supplier cards"
  >
    <template v-if="items.length">
      <div class="ds-supplier-card-slider__row">
        <CustomButton
          class="ds-supplier-card-slider__prev"
          variant="plain"
          :show-label="false"
          icon="chevron-right"
          text="Previous"
          :disabled="isBeginning || isLocked"
        />

        <Swiper
          class="ds-supplier-card-slider__swiper"
          :modules="swiperModules"
          :slides-per-view="slidesPerView"
          :slides-per-group="slidesPerGroup"
          :space-between="spaceBetween"
          :loop="false"
          :watch-overflow="true"
          :observer="true"
          :observe-parents="true"
          :observe-slide-children="true"
          :resize-observer="true"
          :update-on-window-resize="true"
          :allow-touch-move="!isLocked"
          :navigation="navigation"
          :pagination="pagination"
          @swiper="onSwiper"
          @lock="syncChrome"
          @unlock="syncChrome"
          @resize="syncChrome"
          @update="syncChrome"
          @slides-updated="syncChrome"
          @observer-update="syncChrome"
          @slide-change="syncChrome"
          @destroy="onSwiperDestroyed"
        >
          <SwiperSlide
            v-for="(item, index) in items"
            :key="slideKey(item, index)"
            class="ds-supplier-card-slider__slide"
          >
            <div class="ds-supplier-card-slider__item">
              <slot
                name="item"
                :item="item"
                :index="index"
              />
            </div>
          </SwiperSlide>
        </Swiper>

        <CustomButton
          class="ds-supplier-card-slider__next"
          variant="plain"
          :show-label="false"
          icon="chevron-right"
          text="Next"
          :disabled="isEnd || isLocked"
        />
      </div>

      <div class="ds-supplier-card-slider__pagination" />
    </template>
  </div>
</template>

<style lang="scss" scoped>
.ds-supplier-card-slider {
  --swiper-theme-color: var(--neutral-600);
  --swiper-pagination-color: var(--neutral-600);
  --swiper-pagination-bullet-inactive-color: var(--neutral-300);
  --swiper-pagination-bullet-inactive-opacity: 1;

  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;

  &__row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-width: 0;
  }

  &__swiper {
    flex: 1 1 0;
    min-width: 0;
    width: 100%;
    overflow: hidden;

    :deep(.swiper-button-prev),
    :deep(.swiper-button-next) {
      display: none;
    }
  }

  &__slide {
    min-width: 0;
    height: auto;
    box-sizing: border-box;
  }

  &__item {
    min-width: 0;
    width: 100%;
  }

  &__prev,
  &__next {
    flex-shrink: 0;
    color: var(--neutral-400);
  }

  &__prev :deep(.custom-button__icon) {
    transform: rotate(180deg);
  }

  &__pagination {
    position: static;
    inset: auto;
    width: 100%;
    margin-top: 0.75rem;
    text-align: center;
  }

  :deep(.swiper-pagination-bullet) {
    background: var(--neutral-300);
    opacity: 1;
  }

  :deep(.swiper-pagination-bullet-active) {
    background: var(--neutral-600);
    opacity: 1;
  }

  &--locked {
    .ds-supplier-card-slider__prev,
    .ds-supplier-card-slider__next,
    .ds-supplier-card-slider__pagination {
      display: none;
    }
  }
}
</style>
