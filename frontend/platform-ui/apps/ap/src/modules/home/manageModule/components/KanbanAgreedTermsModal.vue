<template>
<CalculumModal v-if="show" :size="'md'" :title="$t('home.manageModule.dragAndDrop.agreedTermsModalTitle', { name: entityName })" :show-close="true" @close="$emit('cancel')">
  <template #modalContent>
    <div class="mb-2">
      <label>{{ $t('home.manageModule.dragAndDrop.termsWithoutCashDiscount') }}</label>
      <input v-model="form.termsWithoutCashDiscount" class="form-control" type="number" />
    </div>
    <div class="mb-2">
      <label>{{ $t('home.manageModule.dragAndDrop.termsWithCashDiscount') }}</label>
      <input v-model="form.termsWithCashDiscount" class="form-control" type="number" />
    </div>
    <div class="mb-2">
      <label>{{ $t('home.manageModule.dragAndDrop.cashDiscount') }}</label>
      <input v-model="form.cashDiscount" class="form-control" type="number" />
    </div>
    <div v-if="scfEnabledFeature || vCardEnabledFeature" class="row mb-2">
      <div v-if="scfEnabledFeature" class="col-6 d-flex align-items-center">
        <span class="mr-3 text-md font-bold">{{ $t('global.scfAccepted') }}</span>
        <label class="switch ms-2">
          <input v-model="form.scfAccepted" type="checkbox" :checked="form.scfAccepted" />
          <span class="slider round"></span>
        </label>
      </div>
      <div v-if="vCardEnabledFeature" class="col-6 d-flex align-items-center">
        <IconBadgeManageRebate width="26" height="23"></IconBadgeManageRebate>
        <span class="ml-2 mr-3 text-md font-bold">{{ $t('global.vcardAccepted') }}</span>
        <label class="switch ms-2">
          <input v-model="form.vcardAccepted" type="checkbox" :checked="form.vcardAccepted" />
          <span class="slider round"></span>
        </label>
      </div>
    </div>
    <div class="row">
      <div class="col-4 mb-2">
        <label>{{ $t('home.manageModule.dragAndDrop.agreedDateOfChange') }}</label>
        <input v-model="form.agreedDateOfChange" class="form-control" type="date" />
      </div>
      <div class="col-4 mb-2">
        <label>{{ $t('home.manageModule.dragAndDrop.effectiveDate') }}</label>
        <input v-model="form.effectiveDate" class="form-control" type="date" />
      </div>
      <div class="col-4 mb-2">
        <label>{{ $t('home.manageModule.dragAndDrop.nextReviewDate') }}</label>
        <input v-model="form.nextReviewDate" class="form-control" type="date" />
      </div>
    </div>
  </template>
  <template #modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="$emit('cancel')"><span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" :disabled="!canConfirm" @click="onConfirm"><span>{{ $t('global.confirm') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, watch } from "vue";
import CalculumModal from "@/modules/components/CalculumModal.vue";
import IconBadgeManageRebate from "@/resources/assets/images/icons/IconBadgeManageRebate.vue";
import { useUser } from "@/composables";
import useCompany from "@/composables/useCompany";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default defineComponent({
  name: "KanbanAgreedTermsModal",
  components: { CalculumModal, IconBadgeManageRebate },
  props: {
    show: { type: Boolean, required: true },
    entityName: { type: String, required: true },
    // WI pending: the Kanban's GraphQL query does not request these yet (see
    // docs/context/change-kanban-agreed-terms-scf-vcard.md) — they arrive as
    // null today, which keeps the SCF suggestion below on its "false" default.
    onSCF: { type: Boolean, required: false, default: null },
    scfAccepted: { type: Boolean, required: false, default: null },
    // The entity's target payment term (same field CardsByStatus.vue already shows
    // on the card itself before it's agreed). Pragmatic proxy for ModalResults.vue's
    // fillSuggested() (vcardTerms > 0 ? vcardTerms : opportunityTerms) — matches its
    // opportunityTerms fallback, but not the VCard-specific override, which has no
    // equivalent field on the Kanban's GraphQL types today. See docs/context/change-kanban-agreed-terms-scf-vcard.md.
    modelPaymentTerms: { type: Number, required: false, default: null }
  },
  emits: ["confirm", "cancel"],
  setup(props, { emit }) {
    const { useFeatureVirtualCard, useFeature9BoxesFinancing } = useUser();
    const { usevCardGroupsEnabled } = useCompany();

    const scfEnabledFeature = computed(() => useFeature9BoxesFinancing.value);
    const vCardEnabledFeature = computed(() => useFeatureVirtualCard.value && usevCardGroupsEnabled.value);

    const form = reactive({
      termsWithoutCashDiscount: null as number | null,
      termsWithCashDiscount: null as number | null,
      cashDiscount: null as number | null,
      agreedDateOfChange: "",
      effectiveDate: "",
      nextReviewDate: "",
      scfAccepted: false,
      vcardAccepted: false
    });

    const canConfirm = computed(
      () =>
        !!form.agreedDateOfChange &&
        !!form.effectiveDate &&
        !!form.nextReviewDate
    );

    // Mirrors ModalResults.vue's fillSuggested() SCF matrix: only scfAccepted gets a
    // suggested default derived from the entity's current onSCF/scfAccepted state.
    // vcardAccepted has no equivalent suggestion in the regular modal either — it
    // always starts unchecked.
    function suggestedScfAccepted(): boolean {
      const bothTrue = props.onSCF === true && props.scfAccepted === true;
      const onScfFalseScfTrue = props.onSCF === false && props.scfAccepted === true;
      const onScfTrueScfNull = props.onSCF === true && props.scfAccepted === null;
      const onScfTrueScfFalse = props.onSCF === true && props.scfAccepted === false;
      const onScfFalseScfNull = props.onSCF === false && props.scfAccepted === null;
      switch (true) {
        case bothTrue:
        case onScfFalseScfTrue:
        case onScfTrueScfNull:
          return true;
        case onScfTrueScfFalse:
        case onScfFalseScfNull:
        default:
          return false;
      }
    }

    function resetForm() {
      const today = new Date();
      const nextReview = new Date(today);
      nextReview.setMonth(nextReview.getMonth() + 6);

      form.termsWithoutCashDiscount = props.modelPaymentTerms ?? null;
      form.termsWithCashDiscount = null;
      form.cashDiscount = null;
      form.agreedDateOfChange = toDateInputValue(today);
      form.effectiveDate = toDateInputValue(today);
      form.nextReviewDate = toDateInputValue(nextReview);
      // Moving a card into "agreed"/"agreedExtended" is always a brand-new agreement,
      // never an edit of existing terms — same assumption ModalResults.vue makes at its
      // reset points, where vcardAccepted always resets to false too.
      form.scfAccepted = suggestedScfAccepted();
      form.vcardAccepted = false;
    }

    watch(
      () => props.show,
      (isShown) => {
        if (isShown) resetForm();
      }
    );

    function onConfirm() {
      if (!canConfirm.value) return;
      emit("confirm", { ...form });
    }

    return { form, canConfirm, onConfirm, scfEnabledFeature, vCardEnabledFeature };
  }
});
</script>
