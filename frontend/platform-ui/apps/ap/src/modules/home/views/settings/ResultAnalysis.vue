<template>
<div class="row">
  <div class="col">
    <div class="card" style="min-height: auto; height: auto">
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-12 mb-5"><span class="text-gray-600 text-base font-semibold">{{ $t('home.homeCompanySettings.resultAnalysis.title') }}</span></div>
          <div class="col-12 my-4">
            <div class="d-flex justify-content-start align-items-center gap-2"><span class="text-lg font-bold">{{ $t('home.homeCompanySettings.resultAnalysis.referenceDate') }}</span>
              <input class="form-control form-control-sm" type="date" v-model="referenceDate" style="width: 10%;"/>
            </div>
          </div>
          <div class="col-12 d-flex justify-content-end gap-2">
            <button class="btn outline-secondary-btn font-md" :disabled="disabledResetButton" @click="resetConfiguration"><span>{{ $t('button.reset') }}</span></button>
            <button class="btn btn-primary" :disabled="disabledSaveButton" @click="saveConfiguration"><span class="spinner-border spinner-border-sm mr-2" v-if="isSaving"></span><span>{{ $t('global.save') }}</span></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, onMounted } from "vue";
import { useHomeStore } from "@/stores/home";
import { useToast } from "vue-toastification";
import { useI18n } from "vue-i18n";

export default defineComponent({
  name: "ResultAnalysis",
  props: {
    showAlert: {
      type: Boolean,
      required: false,
      default: false,
    },
    otherTab: {
      type: String,
      required: false,
      default: "",
    },
    sectionDefault: {
      type: String,
      required: false,
      default: "",
    },
    spendFileInrecalculation: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  emits: [
    "sendChanges",
    "cancel-n-continue",
    "discard-n-continue",
    "save-n-continue",
  ],
  setup(props, { emit }) {
    const homeStore = useHomeStore();
    const toast = useToast();
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const isSaving = ref(false);
    const referenceDate = ref("");
    const initialReferenceDate = ref("");

    const disabledResetButton = computed(() => {
      const condition1 = isSaving.value || props.spendFileInrecalculation;
      const condition2 = referenceDate.value !== initialReferenceDate.value;
      return condition1 || !condition2;
    });
    const disabledSaveButton = computed(() => {
      return (
        referenceDate.value === "" ||
        isSaving.value ||
        props.spendFileInrecalculation
      );
    });

    function loadReferenceDate(): void {
      homeStore.fetchResultAnalysisReferenceDate({
        callbackSuccess: (value: string) => {
          referenceDate.value = value;
          initialReferenceDate.value = value;
        }, callbackError: (response: any) => {
          toast.error(t('home.homeCompanySettings.resultAnalysis.loadError'));
          console.error('Error loading result analysis reference date:', response);
        }
      });
    }

    function resetConfiguration(): void {
      referenceDate.value = initialReferenceDate.value;
    }

    async function saveConfiguration(): Promise<void> {
      if (referenceDate.value === "" || isSaving.value) return;
      isSaving.value = true;
      const params = {
        referenceDate: referenceDate.value,
        callbackSuccess: () => {
          initialReferenceDate.value = referenceDate.value;
          isSaving.value = false;
        },
        callbackError: (response: any) => {
          toast.error(t('home.homeCompanySettings.resultAnalysis.saveError'));
          console.error('Error saving result analysis reference date:', response);
          isSaving.value = false;
        },
      };
      homeStore.updateResultAnalysisReferenceDate(params);
    }

    onMounted(() => {
      loadReferenceDate();
    });

    return {
      isSaving,
      resetConfiguration,
      saveConfiguration,
      referenceDate,
      disabledResetButton,
      disabledSaveButton,
    };
  },
});
</script>