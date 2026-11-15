<template>
<div class="col-lg-12 col-xl-12 p-5">
  <div class="h3 title">{{ $t('adminBackend.uiGroupsAdmin.title') }}</div>
  <div class="d-flex align-item-center justify-content-end mb-3">
    <button class="new-group" @click="$emit('create-new')">+ {{ $t('adminBackend.uiGroupsAdmin.newGroup') }}</button>
  </div>
  <div class="d-flex flex-column align-items-center mt-2" v-if="listGroups.length === 0 && checkedGroups">
    <iconSearchNotFound class="no_search_icon mr-1"></iconSearchNotFound>
    <h3 class="no_search_title mt-2">{{ $t('adminBackend.uiGroupsAdmin.noGroupsWereFound') }}</h3>
    <p class="no_search_message">{{ $t('adminBackend.uiGroupsAdmin.noGroupsMessage') }}</p>
  </div>
  <CalculumLoading v-if="loading" block="block"></CalculumLoading>
  <div class="container_grid">
    <CalculumGrid v-if="listGroups.length > 0" :gridData="listGroups" :key="sumKeyForList" :gridColumns="columns" :selectable="false" :showFilter="false" :allowExportExcel="false" :hideColumnSelector="true" :showToolbar="false" :hideMenuColumns="true" @editUiGroup="$emit('edit', $event)" @editCompanies="$emit('edit-companies', $event)" @showModalForCompanies="$emit('edit-companies', $event)" @showNotyError="$emit('show-error')" @deleteSelectedTemplate="$emit('delete', $event)"></CalculumGrid>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { CalculumLoading } from '@ada/design-system'
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue';
import iconSearchNotFound from '@/resources/assets/images/icons/iconSearchNotFound.vue';
import type { UiGroup } from '@/modules/adminBackend/types';

export default defineComponent({
  name: 'UIGroupsListView',
  components: {
    CalculumLoading,
    CalculumGrid,
    iconSearchNotFound,
  },
  props: {
    listGroups: {
      type: Array as () => UiGroup[],
      default: () => [],
    },
    loading: { type: Boolean, default: false },
    checkedGroups: { type: Boolean, default: false },
    columns: { type: Array, required: true },
    sumKeyForList: { type: Number, default: 0 },
  },
  emits: ['create-new', 'edit', 'edit-companies', 'delete', 'show-error'],
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

.container_grid {
  width: 100%;

  :deep(.k-grid-header) {
    padding-right: 0 !important;
  }
}

.new-group {
  background: $color-primary-600;
  border-radius: 8px;
  padding: 8px 14px;
  color: $basewhite;
  font-weight: 500;
  border: 1px solid $color-primary-600;
  transition: box-shadow 0.4s ease-in;
  box-shadow: 0px 1px 2px #1018280d;

  &:hover {
    box-shadow: 0px 0px 0px 4px #ffdfe4;
  }
}

.no_search_icon {
  width: 63px;
  height: 63px;
  color: $color-gray-300;
}

.no_search_title {
  font-size: 2em;
  font-weight: 600;
}

.no_search_message {
  font-size: 18px;
}
</style>
