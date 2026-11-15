<template>
<CalculumModal v-if="show" :size="'sm'" :title="$t('home.manageModule.dragAndDrop.globalWarningTitle')" :show-close="true" @close="$emit('cancel')">
  <template #modalContent>
    <p>{{ $t('home.manageModule.dragAndDrop.globalWarningMessage', { count: spendLineCount }) }}</p>
    <div class="form-check">
      <input id="global-warning-dont-show-again" v-model="dontShowAgain" class="form-check-input" type="checkbox" />
      <label class="form-check-label" for="global-warning-dont-show-again">{{ $t('home.manageModule.dragAndDrop.dontShowAgain') }}</label>
    </div>
  </template>
  <template #modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="$emit('cancel')"><span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" @click="$emit('continue', { dontShowAgain })"><span>{{ $t('global.continue') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import CalculumModal from "@/modules/components/CalculumModal.vue";

export default defineComponent({
  name: "KanbanGlobalWarningDialog",
  components: { CalculumModal },
  props: {
    show: { type: Boolean, required: true },
    spendLineCount: { type: Number, required: true }
  },
  emits: ["continue", "cancel"],
  setup(props) {
    const dontShowAgain = ref(false);

    watch(
      () => props.show,
      (isShown) => {
        if (isShown) dontShowAgain.value = false;
      }
    );

    return { dontShowAgain };
  }
});
</script>
