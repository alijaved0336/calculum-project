<template>
  <div class="new-potential-supplier-request" :class="isModal ? 'new-potential-supplier-request-modal' : ''">
    <div class="nps-header text-center">
      <div class="nps-header__icon mx-auto mb-3">
        <i class="fa-solid fa-briefcase"></i>
      </div>
      <h5 class="nps-header__title">{{ $t('home.potentialSupplierRequest.form.title') }}</h5>
      <p class="nps-header__subtitle">
        {{ $t('home.potentialSupplierRequest.form.subtitle') }}
      </p>
    </div>

    <div class="nps-card">
      <div class="nps-card__header">
        <span class="nps-card__header-title">
          {{ $t('home.potentialSupplierRequest.form.supplierDetails') }}          
        </span>        
      </div>

      <div class="nps-form-grid">
        <div class="nps-field">
          <label class="nps-field__label" for="nps-supplier-name">
            {{ $t('home.potentialSupplierRequest.form.supplierName') }} <span class="nps-field__required">*</span>
          </label>
          <input
            id="nps-supplier-name"
            v-model="form.name"
            type="text"
            class="form-control"
            :class="{ 'nps-input--invalid': errors.name }"
            :placeholder="$t('home.potentialSupplierRequest.form.supplierNamePlaceholder')"
          />
        </div>

        <div class="nps-field">
          <span class="nps-field__label">
            {{ $t('home.potentialSupplierRequest.form.supplierCountry') }} <span class="nps-field__required">*</span>
          </span>
          <SearchableDropdown
            :model-value="form.country ?? undefined"
            :items="countriesList"
            value-key="key"
            label-key="value"
            :placeholder="$t('home.potentialSupplierRequest.form.supplierCountryPlaceholder')"
            :class="{ 'nps-input--invalid': errors.country }"
            @update:model-value="(v) => (form.country = v)"
          />
        </div>

        <div class="nps-field">
          <label class="nps-field__label" for="nps-estimated-annual-spend">
            {{ $t('home.potentialSupplierRequest.form.estimatedAnnualSpend') }} <span class="nps-field__required">*</span>
          </label>
          <div class="nps-input-prefix-wrapper">
            <span class="nps-input-prefix">$</span>
            <input
              id="nps-estimated-annual-spend"
              :value="spendDisplayValue"
              type="text"
              class="form-control nps-input--has-prefix"
              :class="{ 'nps-input--invalid': errors.estimatedAnnualSpendVolume }"
              placeholder="0"
              @focus="handleSpendFocus"
              @input="handleSpendInput"
              @blur="handleSpendBlur"
            />
          </div>
        </div>

        <div class="nps-field">
          <div class="nps-field__label-row">
            <span class="nps-field__label">{{ $t('home.potentialSupplierRequest.form.currency') }}</span>
            <span class="nps-field__hint">{{ $t('home.potentialSupplierRequest.form.currencyHint') }}</span>
          </div>
          <SearchableDropdown
            :model-value="form.currency ?? undefined"
            :items="currenciesList"
            value-key="key"
            label-key="value"
            :placeholder="$t('home.potentialSupplierRequest.form.currencyPlaceholder')"
            @update:model-value="(v) => (form.currency = v)"
          />
        </div>

        <div class="nps-field">
          <div class="nps-field__label-row">
            <label class="nps-field__label" for="nps-payment-terms">
              {{ $t('home.potentialSupplierRequest.form.paymentTerms') }} <span class="nps-field__required">*</span>
            </label>
            <span class="nps-field__hint">{{ $t('home.potentialSupplierRequest.form.paymentTermsHint') }}</span>
          </div>
          <input
            id="nps-payment-terms"
            v-model.number="form.estimateAvgPaymentTerms"
            type="number"
            class="form-control"
            :class="{ 'nps-input--invalid': errors.estimateAvgPaymentTerms }"
            :placeholder="$t('home.potentialSupplierRequest.form.paymentTermsPlaceholder')"
            min="0"
          />
        </div>

        <div class="nps-field">
          <span class="nps-field__label">
            {{ $t('home.potentialSupplierRequest.form.buyerEntity') }} <span class="nps-field__required">*</span>
          </span>
          <SearchableDropdown
            :model-value="form.buyer ?? undefined"
            :items="buyersList"
            value-key="key"
            label-key="value"
            :placeholder="$t('home.potentialSupplierRequest.form.buyerEntityPlaceholder')"
            :class="{ 'nps-input--invalid': errors.buyer }"
            @update:model-value="(v) => (form.buyer = v)"
          />
        </div>

        <div class="nps-field nps-field--full-width">
          <div class="nps-field__label-row">
            <span class="nps-field__label">{{ $t('home.potentialSupplierRequest.form.commodity') }}</span>
            <span class="nps-field__hint">{{ $t('home.potentialSupplierRequest.form.commodityHint') }}</span>
          </div>
          <input
            id="nps-commodity"
            v-model="form.commodity"
            type="text"
            class="form-control"
            :placeholder="$t('home.potentialSupplierRequest.form.commodityPlaceholder')"
          />
        </div>
      </div>

      <hr class="nps-divider" />

      <div class="nps-card__footer">
        <button
          class="btn outline-secondary-btn font-md"
          type="button"
          @click="$emit('cancel')"
        >
          {{ $t('home.potentialSupplierRequest.form.cancel') }}
        </button>
        <button
          class="btn btn-primary font-md"
          type="button"
          :disabled="isSubmitting || isFormIncomplete"
          @click="handleSubmit"
        >
          <span v-if="!isSubmitting">{{ $t('home.potentialSupplierRequest.form.submit') }}</span>
          <span
            v-else
            class="spinner-border spinner-border-sm"
            aria-hidden="true"
          ></span>
        </button>
      </div>
    </div>

    <div class="nps-info-box">
      <i class="fa-solid fa-circle-info nps-info-box__icon"></i>
      <span class="nps-info-box__text">
        {{ $t('home.potentialSupplierRequest.form.infoText') }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed, PropType } from "vue";
import type { DropdownOption } from "@/types";
import { SearchableDropdown } from '@ada/design-system';
import { useEntityCardStore } from '@/stores/entityCard';
import { useToast } from "vue-toastification";
import { useI18n } from 'vue-i18n'

type DropdownValue = string | number | null;

interface SupplierRequestForm {
  name: string;
  country: DropdownValue;
  estimatedAnnualSpendVolume: number | null;
  currency: DropdownValue;
  estimateAvgPaymentTerms: number | null;
  buyer: DropdownValue;
  commodity: string;
}

interface FormErrors {
  name: boolean;
  country: boolean;
  estimatedAnnualSpendVolume: boolean;
  estimateAvgPaymentTerms: boolean;
  buyer: boolean;
}

export default defineComponent({
  name: "NewPotentialSupplierRequest",
  components: { SearchableDropdown },
  props: {
    countriesList: {
      type: Array as PropType<DropdownOption[]>,
      default: () => [],
    },
    currenciesList: {
      type: Array as PropType<DropdownOption[]>,
      default: () => [],
    },
    buyersList: {
      type: Array as PropType<DropdownOption[]>,
      default: () => [],
    },
    isModal: {
      type: Boolean,
      default: false
    }
  },
  emits: ["reload", "cancel", "upload-many"],
  setup(_props, { emit }) {
    
    const isSubmitting = ref(false);

    function formatSpend(value: number | null): string {
      if (value === null || isNaN(value)) return '';
      return value.toLocaleString('en-US');
    }

    const spendDisplayValue = ref(formatSpend(1000000));
    const entityCard = useEntityCardStore();
    const toast = useToast()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    const form = reactive<SupplierRequestForm>({
      name: "",
      country: null,
      estimatedAnnualSpendVolume: 1000000,
      currency: null,
      estimateAvgPaymentTerms: 60,
      buyer: null,
      commodity: "",
    });

    const errors = reactive<FormErrors>({
      name: false,
      country: false,
      estimatedAnnualSpendVolume: false,
      estimateAvgPaymentTerms: false,
      buyer: false,
    });

    const isFormIncomplete = computed(() =>
      !form.name.trim() ||
      form.country === null || form.country === "" ||
      form.estimatedAnnualSpendVolume === null || form.estimatedAnnualSpendVolume < 0 ||
      form.estimateAvgPaymentTerms === null || form.estimateAvgPaymentTerms < 0 ||
      form.buyer === null || form.buyer === ""
    );

    function validateForm(): boolean {
      errors.name = !form.name.trim();
      errors.country = form.country === null || form.country === "";
      errors.estimatedAnnualSpendVolume =
        form.estimatedAnnualSpendVolume === null || form.estimatedAnnualSpendVolume < 0;
      errors.estimateAvgPaymentTerms =
        form.estimateAvgPaymentTerms === null || form.estimateAvgPaymentTerms < 0;
      errors.buyer = form.buyer === null || form.buyer === "";

      return !Object.values(errors).some(Boolean);
    }

    function handleSubmit() {
      if (!validateForm()) return;

      isSubmitting.value = true
      const params = {
          formData: form,
          callbackSuccess: (callbackSucessData: any) => {          
            toast.success(translate.t('global.potentialRequestSuccess'))  
            isSubmitting.value = false
            emit('reload')
          },
          callbackError: () => {
            toast.error(translate.t('global.potentialRequestError'))  
            isSubmitting.value = false
          }
      };
      entityCard.postNewPotentialSupplierRequest(params);
    }

    function handleSpendFocus() {
      spendDisplayValue.value = form.estimatedAnnualSpendVolume !== null
        ? String(form.estimatedAnnualSpendVolume)
        : '';
    }

    function handleSpendInput(event: Event) {
      const raw = (event.target as HTMLInputElement).value;
      spendDisplayValue.value = raw;
      const cleaned = raw.replace(/,/g, '').trim();
      const num = cleaned === '' ? null : parseFloat(cleaned);
      form.estimatedAnnualSpendVolume = num !== null && !isNaN(num) ? num : null;
    }

    function handleSpendBlur() {
      spendDisplayValue.value = formatSpend(form.estimatedAnnualSpendVolume);
    }

    return {
      form,
      errors,
      isFormIncomplete,
      isSubmitting,
      handleSubmit,
      spendDisplayValue,
      handleSpendFocus,
      handleSpendInput,
      handleSpendBlur,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";

.new-potential-supplier-request {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 100%;
  margin: 0 auto;
  min-height: 110vh;

  &-modal {
    min-height: 10vh !important;
  }
}

.nps-header {
  padding: 1rem 0 0.5rem;

  &__icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background-color: $color-primary-100;
    display: flex;
    align-items: center;
    justify-content: center;

    i {
      font-size: 1.5rem;
      color: $color-primary-600;
    }
  }

  &__title {
    font-weight: 600;
    color: $color-gray-900;
    margin-bottom: 0.5rem;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: $color-gray-500;
    max-width: 480px;
    margin: 0 auto;
  }
}

.nps-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid $color-gray-200;
  padding: 1.5rem;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }

  &__header-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: $color-gray-700;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
}

.nps-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 1.25rem;
}

.nps-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  &--full-width {
    grid-column: 1 / -1;
  }

  &__label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: $color-gray-700;
    margin-bottom: 0;
  }

  &__label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__required {
    color: $color-primary-600;
  }

  &__hint {
    font-size: 0.75rem;
    color: $color-gray-400;
  }
}

.nps-input-prefix-wrapper {
  position: relative;

  .nps-input-prefix {
    position: absolute;
    top: 50%;
    left: 0.75rem;
    transform: translateY(-50%);
    font-size: 0.875rem;
    color: $color-gray-500;
    pointer-events: none;
    border-right: 1px solid $color-gray-300;
    padding-right: 0.625rem;
    line-height: 1;
  }

  .nps-input--has-prefix {
    padding-left: 2.5rem;
  }
}

.nps-input--invalid {
  border-color: $color-primary-500 !important;
}

.nps-divider {
  border-color: $color-gray-200;
  margin: 1.25rem 0;
}

.nps-info-box {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  background: #fff;
  border: 1px solid $color-gray-200;
  border-radius: 8px;
  padding: 0.75rem 1rem;

  &__icon {
    margin-top: 1px;
    flex-shrink: 0;
    font-size: 0.875rem;
    color: $color-gray-400;
  }

  &__text {
    font-size: 0.8125rem;
    color: $color-gray-500;
    line-height: 1.5;
  }
}
</style>
