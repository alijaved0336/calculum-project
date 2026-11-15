<script setup lang="ts">
import { computed, ref, watch } from "vue";
import BodyText from "../primitives/typography/body-text/Index.vue";
import CustomButton from "../primitives/custom-button/Index.vue";
import type { NewsCardProps } from "./types";

defineOptions({
  name: "NewsCard",
});

const props = withDefaults(defineProps<NewsCardProps>(), {
  description: "",
  url: "",
  image: null,
  source: "",
  date: "",
  readMoreLabel: "Read More",
  placeholderImage: "",
  isVertical: true,
});

const emit = defineEmits<{
  click: [event: MouseEvent, url: string];
}>();

const usePlaceholder = ref(false);
const hideBrokenImage = ref(false);

const showMedia = computed(
  () => Boolean(props.image) || Boolean(props.placeholderImage),
);

const imageSrc = computed(() => {
  if (usePlaceholder.value) {
    return props.placeholderImage;
  }
  return props.image || props.placeholderImage || "";
});

const resolvedImageAlt = computed(() => props.imageAlt ?? props.title);

watch(
  () => [props.image, props.placeholderImage] as const,
  () => {
    usePlaceholder.value = false;
    hideBrokenImage.value = false;
  },
);

function onImageError() {
  if (props.placeholderImage && imageSrc.value !== props.placeholderImage) {
    usePlaceholder.value = true;
    return;
  }
  hideBrokenImage.value = true;
}

function onRootClick(event: MouseEvent) {
  emit("click", event, props.url);
}

function onReadMoreClick(event: MouseEvent) {
  event.stopPropagation();
  emit("click", event, props.url);
}
</script>

<template>
  <article
    class="news-card"
    :class="{ 'news-card--horizontal': !isVertical }"
    @click="onRootClick"
  >
    <div
      v-if="showMedia"
      class="news-card__media"
    >
      <img
        v-if="!hideBrokenImage && imageSrc"
        class="news-card__image"
        :src="imageSrc"
        :alt="resolvedImageAlt"
        loading="lazy"
        @error="onImageError"
      />
    </div>

    <div class="news-card__body">
      <div
        v-if="source || date"
        class="news-card__meta"
      >
        <BodyText
          v-if="source"
          class="news-card__source"
          variant="xs"
          weight="semibold"
          as="span"
        >
          {{ source }}
        </BodyText>
        <BodyText
          v-if="date"
          class="news-card__date"
          variant="xs"
          weight="regular"
          as="span"
        >
          {{ date }}
        </BodyText>
      </div>

      <BodyText
        class="news-card__title"
        variant="xl"
        weight="bold"
        as="h3"
      >
        {{ title }}
      </BodyText>

      <BodyText
        v-if="description"
        class="news-card__description"
        variant="md"
        weight="regular"
        as="p"
      >
        {{ description }}
      </BodyText>

      <div class="news-card__footer">
        <CustomButton
          :text="readMoreLabel"
          variant="default"
          icon="chevron-right"
          icon-position="end"
          @click="onReadMoreClick"
        />
      </div>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.news-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color-default);
  border-radius: var(--border-radius-default);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--neutral-900) 10%, transparent);

  &__media {
    width: 100%;
    aspect-ratio: 1.5 / 1;
    overflow: hidden;
    background-color: var(--bg-surface-subtle-1);
    position: relative;
  }

  &__image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    inset: 0;
    transition: var(--transition-default);
  }

  &__body {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 0.75rem;
    padding: 1.25rem 1.5rem 1.5rem;
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  &__source {
    color: var(--accent);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__date {
    color: var(--color-text-3);
    flex-shrink: 0;
  }

  &__title {
    margin: 0;
    color: var(--color-text-1);
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  &__description {
    margin: 0;
    color: var(--color-text-2);
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  &__footer {
    margin-top: auto;
  }

  &:hover {
    .news-card__image {
      transform: scale(1.05);
    }

    :deep(.custom-button--default) {
      background: var(--bg-page);
    }
  }

  &--horizontal {
    flex-direction: row;
    align-items: stretch;

    .news-card__media {
      width: 40%;
      flex-shrink: 0;
      aspect-ratio: 16/9;
      align-self: stretch;
      min-height: 100%;
    }

    .news-card__body {
      flex: 1;
    }
  }
}
</style>
