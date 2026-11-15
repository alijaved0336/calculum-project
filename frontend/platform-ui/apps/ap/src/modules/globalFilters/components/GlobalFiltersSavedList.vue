<template>
  <!-- Loading -->
  <CalculumLoading
    v-if="globalFiltersTemplatesIsLoadingTemplates"
    :modal="true"
  />

  <!-- No templates -->
  <template v-if="globalFiltersTemplatesFiltersGrouped.length === 0">
    <div class="d-flex p-5">
      <span class="text-base font-semibold">
        {{ $t("global.globalFilters.noSavedFilters") }}
      </span>
    </div>
  </template>

  <!-- Templates List -->
  <div
    v-else
    class="px-2"
  >
    <!-- Header -->
    <div class="row mb-1 px-1 py-2 rounded-lg border bg-gray-100">
      <div class="col-4">
        {{ $t("global.globalFilters.template.filters") }}
      </div>
      <div class="col-8">
        {{ $t("global.globalFilters.template.details") }}
      </div>
    </div>

    <div
      v-for="{ id, title, filters } in globalFiltersTemplatesFiltersGrouped"
      :key="title"
      class="row px-1"
    >
      <div class="col-4">
        <span
          class="text-sm cursor-pointer font-semibold"
          @click="$emit('change-active', id)"
        >
          {{ title }}
        </span>
      </div>
      <div class="col-7">
        <template
          v-for="{ field, level, value } in filters"
          :key="field"
        >
          <!-- Field (e.g.: Commodity (supplier)) -->
          <span class="mr-2 text-sm font-semibold">
            {{ `${field} (${level}):` }}
          </span>

          <!-- Value (e.g.: Food)-->
          <span class="mr-2 text-sm">
            {{ `${value}.` }}
          </span>
        </template>
      </div>

      <!-- Options -->
      <div class="col-1">
        <!-- Delete template -->
        <span class="text-sm">
          <iconTrash
            class="cursor-pointer"
            @click="$emit('delete', id)"
          />
        </span>
      </div>
    </div>

    <!-- END Templates List -->
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { CalculumLoading } from "@ada/design-system";

import iconTrash from "@/resources/assets/images/icons/iconTrash.vue";
import type { FiltersGrouped } from "@/types";

interface TemplateFiltersGroup {
  id: string;
  title: string;
  filters: FiltersGrouped[];
}

/**
 * The saved-templates list shown in the global-filters dialog's "Saved Filters" category.
 * Extracted verbatim from MainLayoutFilters.vue's "Saved Templates" template block.
 */
export default defineComponent({
  name: "GlobalFiltersSavedList",
  components: { CalculumLoading, iconTrash },
  props: {
    globalFiltersTemplatesIsLoadingTemplates: { type: Boolean, required: true },
    globalFiltersTemplatesFiltersGrouped: {
      type: Array as PropType<TemplateFiltersGroup[]>,
      required: true,
    },
  },
  emits: ["change-active", "delete"],
});
</script>
