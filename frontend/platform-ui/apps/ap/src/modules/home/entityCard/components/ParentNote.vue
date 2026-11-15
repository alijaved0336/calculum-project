<template>
<div class="note-banner parent-level-note-banner d-flex align-items-center mb-2" v-if="companyType === 'parent' && !isParentNoteBannerDismissed && !loading"><span class="text-sm flex-1"><strong class="mr-1">{{ $t('home.entityCard.parentLevelNoteBannerNote') }}</strong>{{ $t('home.entityCard.parentLevelNoteBanner') }}
    <a class="parent-level-note-banner__link" @click.prevent="$emit('navigate-corporate-tree')">{{ $t('home.entityCard.parentLevelNoteBannerLink') }}</a></span>
  <button class="parent-level-note-banner__close" @click="dismissBanner" type="button">×</button>
</div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useEntityCardStore } from '@/stores/entityCard'

export default defineComponent({
  name: 'ParentNote',
  props: {
    companyType: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean,
      required: true
    }
  },
  emits: ['navigate-corporate-tree'],
  setup() {
    const entityCardStore = useEntityCardStore()

    const isParentNoteBannerDismissed = computed(() => entityCardStore.getIsParentNoteBannerDismissed)

    function dismissBanner() {
      entityCardStore.setIsParentNoteBannerDismissed(true)
    }

    return { isParentNoteBannerDismissed, dismissBanner }
  }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/_colors";

.parent-level-note-banner {
  &__link {
    color: $color-warning-700;
    cursor: pointer;
    text-decoration: underline;

    &:hover {
      color: $color-warning-900;
    }
  }

  &__close {
    background: none;
    border: none;
    cursor: pointer;
    color: $color-warning-600;
    font-size: 1.1rem;
    line-height: 1;
    padding: 0 0 0 8px;
    flex-shrink: 0;

    &:hover {
      color: $color-warning-900;
    }
  }
}
</style>
