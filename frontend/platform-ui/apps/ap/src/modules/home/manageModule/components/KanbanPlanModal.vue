<template>
<CalculumModal v-if="show" :size="'md'" :title="$t('home.manageModule.dragAndDrop.planModalTitle', { name: entityName })" :show-close="true" @close="$emit('cancel')">
  <template #modalContent>
    <div v-if="!creatingNewPhase" class="dropdown-container">
      <SearchableDropdown v-model="selectedPhaseId" :items="phaseOptions" :placeholder="$t('home.manageModule.dragAndDrop.selectPhasePlaceholder')" :show-clear-option="false" />
      <button class="btn-text mt-3" type="button" @click="creatingNewPhase = true"><span>+ {{ $t('home.manageModule.dragAndDrop.createNewPhase') }}</span></button>
    </div>
    <div v-else>
      <div class="form-group mb-2">
        <label>{{ $t('home.manageModule.dragAndDrop.selectPlan') }}</label>
        <SearchableDropdown v-model="newPhase.planId" :items="planOptions" :placeholder="$t('home.manageModule.dragAndDrop.selectPlanPlaceholder')" :show-clear-option="false" />
      </div>
      <div class="form-group mb-2">
        <label>{{ $t('home.manageModule.dragAndDrop.phaseName') }}</label>
        <input v-model="newPhase.name" class="form-control" type="text" />
      </div>
      <div class="row">
        <div class="col-6 form-group mb-2">
          <label>{{ $t('home.manageModule.dragAndDrop.startDate') }}</label>
          <input v-model="newPhase.startDate" class="form-control" type="date" />
        </div>
        <div class="col-6 form-group mb-2">
          <label>{{ $t('home.manageModule.dragAndDrop.endDate') }}</label>
          <input v-model="newPhase.endDate" class="form-control" type="date" />
        </div>
      </div>
      <div class="form-group mb-2">
        <label>{{ $t('home.plan.programToPlan1.period') }}</label>
        <input v-model="newPhase.period" class="form-control" type="number" min="1" />
      </div>
      <button class="btn-text" type="button" @click="creatingNewPhase = false"><span>{{ $t('home.manageModule.dragAndDrop.useExistingPhase') }}</span></button>
    </div>
  </template>
  <template #modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="$emit('cancel')"><span>{{ $t('global.cancel') }}</span></button>
    <button v-if="!creatingNewPhase" class="btn btn-primary font-md" :disabled="!selectedPhaseId" @click="$emit('confirm', { planPhaseId: selectedPhaseId })"><span>{{ $t('global.confirm') }}</span></button>
    <button v-else class="btn btn-primary font-md" :disabled="!canCreatePhase || creatingPhase" @click="createPhaseAndConfirm"><span>{{ $t('global.confirm') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref, watch } from "vue";
import CalculumModal from "@/modules/components/CalculumModal.vue";
import { SearchableDropdown } from "@ada/design-system";
import { usePlanStore } from "@/stores/plan";
import { StringUtils } from "@/utils";

export default defineComponent({
  name: "KanbanPlanModal",
  components: { CalculumModal, SearchableDropdown },
  props: {
    show: { type: Boolean, required: true },
    entityName: { type: String, required: true },
    spendFileVersionUuid: { type: String, required: false, default: null }
  },
  emits: ["confirm", "cancel"],
  setup(props, { emit }) {
    const planStore = usePlanStore();

    const plans = ref<any[]>([]);
    const loadingPhases = ref(false);
    const selectedPhaseId = ref("");
    const creatingNewPhase = ref(false);
    const creatingPhase = ref(false);
    const newPhase = reactive({ planId: "", name: "", startDate: "", endDate: "", period: 30 });

    const phaseOptions = computed(() =>
      plans.value.flatMap((plan) =>
        (plan.planPhases ?? []).map((phase: any) => ({
          value: StringUtils.removeIRI(phase["@id"]),
          label: `${plan.title} - ${phase.name ?? `Phase: ${phase.number}`}`
        }))
      )
    );

    const planOptions = computed(() =>
      plans.value.map((plan) => ({ value: StringUtils.removeIRI(plan["@id"]), label: plan.title }))
    );

    const canCreatePhase = computed(
      () => !!newPhase.planId && !!newPhase.name && !!newPhase.startDate && !!newPhase.endDate && !!newPhase.period
    );

    function fetchPlans() {
      loadingPhases.value = true;
      planStore.getAllPlans({
        spendFileVersion: props.spendFileVersionUuid,
        callbackSuccess: (data: any[]) => {
          plans.value = data;
          loadingPhases.value = false;
        },
        callbackError: () => {
          loadingPhases.value = false;
        }
      });
    }

    function createPhaseAndConfirm() {
      if (!canCreatePhase.value) return;
      creatingPhase.value = true;
      planStore.postPlanPhase({
        planId: newPhase.planId,
        startDate: newPhase.startDate,
        endDate: newPhase.endDate,
        name: newPhase.name,
        period: String(newPhase.period),
        callbackSuccess: (created: any) => {
          creatingPhase.value = false;
          const createdPhaseId = StringUtils.removeIRI(created["@id"] ?? created.id);
          emit("confirm", { planPhaseId: createdPhaseId });
        },
        callbackError: () => {
          creatingPhase.value = false;
        }
      });
    }

    watch(
      () => props.show,
      (isShown) => {
        if (isShown) {
          selectedPhaseId.value = "";
          creatingNewPhase.value = false;
          creatingPhase.value = false;
          Object.assign(newPhase, { planId: "", name: "", startDate: "", endDate: "", period: 30 });
          fetchPlans();
        }
      }
    );

    return {
      loadingPhases,
      selectedPhaseId,
      creatingNewPhase,
      creatingPhase,
      newPhase,
      phaseOptions,
      planOptions,
      canCreatePhase,
      createPhaseAndConfirm
    };
  }
});
</script>
<style scoped>

.dropdown-container {
  height: 250px;
}

</style>
