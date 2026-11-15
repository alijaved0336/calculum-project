<template>
<CalculumModal v-if="show" :size="'sm'" :title="$t('home.manageModule.dragAndDrop.filterScopeTitle')" :show-close="true" @close="$emit('cancel')">
  <template #modalContent>
    <div class="form-check mb-2">
      <input id="filter-scope-all" v-model="scope" class="form-check-input" type="radio" value="all" />
      <label class="form-check-label" for="filter-scope-all">{{ $t('home.manageModule.dragAndDrop.moveAll') }}</label>
    </div>
    <div class="form-check mb-3">
      <input id="filter-scope-filtered" v-model="scope" class="form-check-input" type="radio" value="filtered" />
      <label class="form-check-label" for="filter-scope-filtered">{{ $t('home.manageModule.dragAndDrop.moveOnlyFiltered') }}</label>
    </div>
    <div class="form-check">
      <input id="filter-scope-save-preferences" v-model="savePreference" class="form-check-input" type="checkbox" />
      <label class="form-check-label" for="filter-scope-save-preferences">{{ $t('home.manageModule.dragAndDrop.savePreferences') }}</label>
    </div>
  </template>
  <template #modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="$emit('cancel')"><span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" @click="$emit('confirm', { scope, savePreference })"><span>{{ $t('global.confirm') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import CalculumModal from "@/modules/components/CalculumModal.vue";

export default defineComponent({
  name: "KanbanFilterScopeDialog",
  components: { CalculumModal },
  props: {
    show: { type: Boolean, required: true }
  },
  emits: ["confirm", "cancel"],
  setup(props) {
    const scope = ref<"all" | "filtered">("all");
    const savePreference = ref(false);

    watch(
      () => props.show,
      (isShown) => {
        if (isShown) {
          scope.value = "all";
          savePreference.value = false;
        }
      }
    );

    return { scope, savePreference };
  }
});
</script>
