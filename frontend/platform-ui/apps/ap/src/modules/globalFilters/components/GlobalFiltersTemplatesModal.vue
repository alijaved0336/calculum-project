<template>
  <CalculumModal
    :size="'sm'"
    :show-close="true"
    :title="$t('global.saveFilter')"
    @close="$emit('close')"
  >
    <template #modalContent>
      <p>{{ $t("globalFilters.modalSaveTemplate") }}</p>

      <!-- If a template is selected -->
      <div
        v-if="
          globalFiltersTemplatesActive &&
          !StringUtils.isEmpty(globalFiltersTemplatesActive['@id'])
        "
        class="row mb-2"
      >
        <!-- Update -->
        <div class="col-6">
          <KRadioButton
            :name="'update'"
            :value="'update'"
            :checked="globalFiltersTemplatesSaveOptionSelected === 'update'"
            :label="`Update filter ${globalFiltersTemplatesActive.title}`"
            @change="$emit('save-option-change', $event)"
          />
        </div>

        <!-- Save as new -->
        <div class="col-6">
          <KRadioButton
            :name="'new'"
            :value="'new'"
            :checked="globalFiltersTemplatesSaveOptionSelected === 'new'"
            :label="'Save as new'"
            @change="$emit('save-option-change', $event)"
          />
        </div>
      </div>

      <!-- Template name -->
      <!-- Update -->
      <div
        v-if="
          globalFiltersTemplatesActive &&
          !StringUtils.isEmpty(globalFiltersTemplatesActive['@id']) &&
          globalFiltersTemplatesSaveOptionSelected === 'update'
        "
        class="form-group"
      >
        <label for="filtersTemplatesUpdateTemplateName">
          <input
            id="filtersTemplatesUpdateTemplateName"
            class="form-control"
            :value="globalFiltersTemplatesActive.title"
            name="input-property-b"
            type="text"
            disabled
          />
          <span>{{ $t("global.filterName") }}</span>
        </label>
      </div>

      <!-- Save as new -->
      <div
        v-else
        class="form-group"
      >
        <label for="filtersTemplatesNewTemplateName">
          <input
            id="filtersTemplatesNewTemplateName"
            :value="newTemplateName"
            class="form-control"
            name="input-property-b"
            type="text"
            @input="
              $emit(
                'update:newTemplateName',
                ($event.target as HTMLInputElement).value,
              )
            "
            @keyup.enter="$emit('save')"
          />
          <span>{{ $t("global.filterName") }}</span>
        </label>
      </div>
    </template>

    <template #modalButtons>
      <button
        class="btn outline-secondary-btn font-md"
        style="z-index: 1; width: fit-content"
        @click="$emit('close')"
      >
        <span>{{ $t("global.cancel") }}</span>
      </button>
      <button
        class="btn btn-primary font-md"
        style="z-index: 1; width: fit-content"
        @click="$emit('save')"
      >
        <span>{{ $t("global.save") }}</span>
      </button>
    </template>
  </CalculumModal>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { RadioButton as KRadioButton } from "@progress/kendo-vue-inputs";

import CalculumModal from "@/modules/components/CalculumModal.vue";
import { StringUtils } from "@/utils";
import type { GlobalFiltersTemplate } from "@/types";

/**
 * "Save applied filters as template" modal - update the active template or save as a new one.
 * Extracted verbatim from MainLayoutFilters.vue's second `<CalculumModal>` block. The parent
 * still controls visibility via `v-if` on this component itself (matching the original
 * `v-if="globalFiltersTemplatesIsModalSaveShowing"` on the modal), so there's no `show` prop.
 */
export default defineComponent({
  name: "GlobalFiltersTemplatesModal",
  components: { CalculumModal, KRadioButton },
  props: {
    globalFiltersTemplatesActive: {
      type: Object as PropType<GlobalFiltersTemplate | null>,
      required: true,
    },
    globalFiltersTemplatesSaveOptionSelected: {
      type: String as PropType<"update" | "new">,
      required: true,
    },
    newTemplateName: { type: String, required: true },
  },
  emits: ["update:newTemplateName", "close", "save-option-change", "save"],
  setup() {
    return { StringUtils };
  },
});
</script>
