<template>
  <SupplierSearchBar
    :model-value="searchTerm"
    @update:model-value="emit('update:searchTerm', $event)"
  />

  <SupplierSkeletonGrid v-if="loadingInitial" />

  <SuppliersEmptyState
    v-else-if="suppliers.length === 0"
    :has-search="!!searchTerm.trim()"
  />

  <template v-else>
    <div class="grid">
      <SupplierCard
        v-for="supplier in suppliers"
        :key="supplier.supplierId"
        :supplier="supplier"
        @open-chat="emit('open-chat', $event)"
      />
    </div>

    <div ref="loadMoreSentinel" class="load-more-sentinel" aria-hidden="true"></div>
    <LoadMoreSpinner v-if="loadingMore" />
  </template>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SupplierListItem } from '@/api/session.api'
import LoadMoreSpinner from '@/components/suppliers/LoadMoreSpinner.vue'
import SupplierCard from '@/components/suppliers/SupplierCard.vue'
import SupplierSearchBar from '@/components/suppliers/SupplierSearchBar.vue'
import SupplierSkeletonGrid from '@/components/suppliers/SupplierSkeletonGrid.vue'
import SuppliersEmptyState from '@/components/suppliers/SuppliersEmptyState.vue'

defineProps<{
  suppliers: SupplierListItem[]
  searchTerm: string
  loadingInitial: boolean
  loadingMore: boolean
}>()

const emit = defineEmits<{
  'update:searchTerm': [value: string]
  'open-chat': [supplier: SupplierListItem]
  'load-more': []
}>()

const loadMoreSentinel = ref<HTMLElement | null>(null)
let supplierObserver: IntersectionObserver | null = null

function observeLoadMoreSentinel() {
  supplierObserver?.disconnect()
  if (!loadMoreSentinel.value) return

  supplierObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        emit('load-more')
      }
    },
    { rootMargin: '300px 0px' },
  )
  supplierObserver.observe(loadMoreSentinel.value)
}

watch(loadMoreSentinel, () => {
  observeLoadMoreSentinel()
})

onMounted(() => {
  observeLoadMoreSentinel()
})

onBeforeUnmount(() => {
  supplierObserver?.disconnect()
})
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 960px;
  margin: 0 auto;
}

.grid:empty {
  display: none;
}

.load-more-sentinel {
  height: 1px;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
