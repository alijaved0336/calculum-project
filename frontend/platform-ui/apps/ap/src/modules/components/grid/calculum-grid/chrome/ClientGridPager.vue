<script setup lang="ts">
import { formatNumber } from "@/modules/components/grid/calculum-grid/utils/formatNumber";

/**
 * Custom Kendo `#pager` chrome for CalculumGrid.
 * Preserves current markup and the existing `changePage` hole (facade wires
 * `@change-page` to the same unbound handler).
 */
defineOptions({ name: "ClientGridPager" });

defineProps<{
  currentPage: number;
  pageSize: number;
  total: number;
}>();

const emit = defineEmits<{
  "change-page": [page: number];
}>();
</script>

<template>
  <div class="k-pager-info k-label">
    {{ currentPage }} -
    {{ Math.min(currentPage * pageSize, total) }} of
    {{ formatNumber(total) }} items
  </div>
  <div class="k-pager-numbers-wrap">
    <ul class="k-pager-numbers">
      <li
        v-for="n in Math.ceil(total / pageSize)"
        :key="n"
        :class="{ 'k-current-page': n === currentPage }"
      >
        <a
          href="#"
          @click.prevent="emit('change-page', n)"
          >{{ n }}</a
        >
      </li>
    </ul>
  </div>
</template>
