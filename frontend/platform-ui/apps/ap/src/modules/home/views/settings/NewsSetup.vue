<template>
<CalculumLoading v-if="isLoading" :modal="true"></CalculumLoading>
<div class="row" v-if="!isLoading">
  <div class="col">
    <div class="card" style="min-height: auto; height: auto">
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-12 mb-4"><span class="text-gray-600 text-base font-semibold">{{ $t('home.homeCompanySettings.news.title') }}</span></div>
          <div class="alert alert-danger" v-if="loadError"><span>{{ loadError }}</span>
            <button class="btn btn-link ml-2" @click="loadConfiguration">{{ $t('home.homeCompanySettings.news.retry') }}</button>
          </div>
          <div class="news-setup-form col-12" v-else>
            <div class="config-section">
              <div class="section-header mb-3">
                <h5 class="text-base font-semibold text-gray-600">{{ $t('home.homeCompanySettings.news.searchSettings.title') }}</h5>
                <p class="text-sm text-gray-500 mt-1">{{ $t('home.homeCompanySettings.news.searchSettings.description') }}</p>
              </div>
              <div class="form-group mb-1">
                <label for="newsSearchYearsBack">
                  <select class="form-control years-back-select" id="newsSearchYearsBack" v-model="config.newsSearchYearsBack" @change="updateCharacterCount" :disabled="spendFileInrecalculation">
                    <option v-for="year in yearsBackOptions" :key="year" :value="year">{{ year }} {{ year === 1 ? $t('home.homeCompanySettings.news.searchSettings.year') : $t('home.homeCompanySettings.news.searchSettings.years') }}</option>
                  </select><span>{{ $t('home.homeCompanySettings.news.searchSettings.yearsBack') }}</span>
                </label><small class="text-muted">{{ $t('home.homeCompanySettings.news.searchSettings.yearsBackHelp') }}</small>
              </div>
            </div>
            <div class="divider my-4"></div>
            <div class="config-section mb-5">
              <div class="section-header mb-3">
                <h5 class="text-base font-semibold text-gray-600">{{ $t('home.homeCompanySettings.news.generalNews.title') }}</h5>
                <p class="text-sm text-gray-500 mt-1">{{ $t('home.homeCompanySettings.news.generalNews.description') }}</p>
              </div>
              <div class="form-group mb-4">
                <label for="generalNewsKeywords">
                  <input class="form-control" id="generalNewsKeywords" type="text" v-model="config.generalNews.keywords" :placeholder="$t('home.homeCompanySettings.news.keyWordsPlaceholder')" @input="updateCharacterCount"/><span>{{ $t('home.homeCompanySettings.news.keyWords') }}</span>
                </label><small class="text-muted">{{ $t('home.homeCompanySettings.news.keyWordsHelp') }}</small>
              </div>
              <div class="div mb-4">
                <label class="form-label text-sm font-medium text-gray-600">{{ $t('home.homeCompanySettings.news.andAnyOfTheFollowing') }}</label>
                <div class="checkbox-grid">
                  <div class="d-flex align-items-center gap-2" v-for="term in defaultTerms" :key="'general-' + term + '-' + keyCheckboxRender">
                    <KendoCheckbox class="admin-checkbox" :key="keyCheckboxRender" :default-checked="config.generalNews.selectedTerms.includes(term)" @change="(e) => toggleGeneralNewsTerm(e, term)" :disabled="spendFileInrecalculation"></KendoCheckbox><span class="cursor-pointer text-sm font-normal text-gray-900" :class="{'no-hover': spendFileInrecalculation}" @click="!spendFileInrecalculation && toggleGeneralNewsTerm({ value: !config.generalNews.selectedTerms.includes(term) }, term)">{{ term }}</span>
                  </div>
                </div>
              </div>
              <div class="form-group mb-3">
                <label for="generalNewsAdditionalTerms">
                  <input class="form-control" id="generalNewsAdditionalTerms" type="text" v-model="config.generalNews.additionalTerms" :placeholder="$t('home.homeCompanySettings.news.addTermsPlaceholder')" @input="updateCharacterCount"/><span>{{ $t('home.homeCompanySettings.news.addTerms') }}</span>
                </label>
              </div>
              <div class="character-counter" :class="{ 'text-danger': generalNewsCharCount > maxQueryLength }"><span>{{ generalNewsCharCount }} / {{ maxQueryLength }} {{ $t('home.homeCompanySettings.news.characters') }}</span>
                <div class="alert alert-warning mt-2 py-2 px-3" v-if="generalNewsCharCount > maxQueryLength"><small>{{ $t('home.homeCompanySettings.news.characterLimitWarning') }}</small></div>
              </div>
              <div class="query-preview mt-4">
                <label class="form-label text-sm font-medium text-gray-600">{{ $t('home.homeCompanySettings.news.queryPreview') }}</label>
                <div class="query-preview-box"><code class="query-text">{{ generalNewsQuery || '-' }}</code></div>
              </div>
            </div>
            <div class="divider my-4"></div>
            <div class="config-section">
              <div class="section-header mb-3">
                <h5 class="text-base font-semibold text-gray-600">{{ $t('home.homeCompanySettings.news.supplierNews.title') }}</h5>
                <p class="text-sm text-gray-500 mt-1">{{ $t('home.homeCompanySettings.news.supplierNews.description') }}</p>
              </div>
              <div class="div mb-4">
                <label class="form-label text-sm font-medium">{{ $t('home.homeCompanySettings.news.keyWords') }}</label>
                <div class="checkbox-grid checkbox-grid-2">
                  <div class="d-flex align-items-center gap-2" v-for="entity in defaultEntities" :key="'entity-' + entity + '-' + keyCheckboxRender">
                    <KendoCheckbox class="admin-checkbox" :key="keyCheckboxRender" :default-checked="config.supplierNews.selectedEntities.includes(entity)" @change="(e) => toggleSupplierNewsEntity(e, entity)" :disabled="spendFileInrecalculation || entity === 'Supplier Name' || entity === 'Parent Name'"></KendoCheckbox><span class="text-sm font-normal" :class="(spendFileInrecalculation || entity === 'Supplier Name' || entity === 'Parent Name') ? 'no-hover text-gray-600' : 'cursor-pointer text-gray-900'" @click="!spendFileInrecalculation && entity !== 'Supplier Name' && toggleSupplierNewsEntity({ value: !config.supplierNews.selectedEntities.includes(entity) }, entity)">{{ entity }}<span class="text-xs text-gray-400 ml-1" v-if="entity === 'Supplier Name' || entity === 'Parent Name'"></span></span>
                  </div>
                </div>
              </div>
              <div class="div mb-4">
                <label class="form-label text-sm font-medium text-gray-600">{{ $t('home.homeCompanySettings.news.andAnyOfTheFollowing') }}</label>
                <div class="checkbox-grid">
                  <div class="d-flex align-items-center gap-2" v-for="term in defaultTerms" :key="'supplier-' + term + '-' + keyCheckboxRender">
                    <KendoCheckbox class="admin-checkbox" :key="keyCheckboxRender" :default-checked="config.supplierNews.selectedTerms.includes(term)" @change="(e) => toggleSupplierNewsTerm(e, term)" :disabled="spendFileInrecalculation"></KendoCheckbox><span class="cursor-pointer text-sm font-normal text-gray-900" :class="{'no-hover': spendFileInrecalculation}" @click="!spendFileInrecalculation && toggleSupplierNewsTerm({ value: !config.supplierNews.selectedTerms.includes(term) }, term)">{{ term }}</span>
                  </div>
                </div>
              </div>
              <div class="form-group mb-3">
                <label for="supplierNewsAdditionalTerms">
                  <input class="form-control" id="supplierNewsAdditionalTerms" type="text" v-model="config.supplierNews.additionalTerms" :placeholder="$t('home.homeCompanySettings.news.addTermsPlaceholder')" @input="updateCharacterCount"/><span>{{ $t('home.homeCompanySettings.news.addTerms') }}</span>
                </label>
              </div>
              <div class="character-counter" :class="{ 'text-danger': supplierNewsCharCount > maxQueryLength }"><span>{{ supplierNewsCharCount }} / {{ maxQueryLength }} {{ $t('home.homeCompanySettings.news.characters') }}</span>
                <small class="d-block text-muted">{{ $t('home.homeCompanySettings.news.entityNameReserveHint', { reserved: entityNameAllowance }) }}</small>
                <div class="alert alert-warning mt-2 py-2 px-3" v-if="supplierNewsCharCount > maxQueryLength"><small>{{ $t('home.homeCompanySettings.news.characterLimitWarning') }}</small></div>
              </div>
              <div class="query-preview mt-4">
                <label class="form-label text-sm font-medium text-gray-600">{{ $t('home.homeCompanySettings.news.queryPreview') }}</label>
                <div class="query-preview-box"><code class="query-text">{{ supplierNewsQuery || '-' }}</code></div>
              </div>
            </div>
          </div>
        </div>
        <div class="row"> </div>
        <div class="col-12 d-flex justify-content-end gap-2">
          <button class="btn outline-secondary-btn font-md" :disabled="!hasChanges || isSaving || spendFileInrecalculation" @click="resetConfiguration"><span>{{ $t('button.reset') }}</span></button>
          <button class="btn btn-primary" :disabled="!canSave || isSaving" @click="saveConfiguration"><span class="spinner-border spinner-border-sm mr-2" v-if="isSaving"></span><span>{{ $t('home.homeCompanySettings.news.save') }}</span></button>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed, onMounted, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import { useHomeStore } from '@/stores/home';
import type { NewsConfig } from '@/types';
import { CalculumLoading } from '@ada/design-system'
import KendoCheckbox from "@/modules/components/checkbox/KendoCheckbox.vue";

import {
  NEWS_CONFIG_DEFAULT_TERMS,
  NEWS_CONFIG_DEFAULT_ENTITIES,
  NEWS_CONFIG_MAX_QUERY_LENGTH,
  NEWS_CONFIG_ENTITY_NAME_ALLOWANCE,
  NEWS_CONFIG_MIN_YEARS_BACK,
  NEWS_CONFIG_MAX_YEARS_BACK,
  NEWS_CONFIG_DEFAULT_YEARS_BACK
} from '@/types';
// Imported directly rather than through the `@/utils` barrel, which reaches the view
// modules and creates the import cycle other specs have to mock around.
import {
  buildGeneralNewsQuery,
  buildSupplierTermsQuery,
  buildSupplierNewsPreview,
  entityPartLength,
} from '@/utils/NewsQueryUtils';
import { useSpendFile } from '@/composables';

export default defineComponent({
  name: 'NewsSetup',
  components: {
    CalculumLoading,
    KendoCheckbox
  },
  props: {
    showAlert: {
      type: Boolean,
      required: false,
      default: false
    },
    otherTab: {
      type: String,
      required: false,
      default: ''
    },
    sectionDefault: {
      type: String,
      required: false,
      default: ''
    },
    spendFileInrecalculation: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  emits: ['sendChanges', 'cancel-n-continue', 'discard-n-continue', 'save-n-continue'],
  setup(props, { emit }) {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();
    const homeStore = useHomeStore();
    const { updateNewsConfig, getNewsConfig } = useSpendFile();
    const sendChangesToParent = inject('sendChangesToParent', (status: boolean) => {});

    // State
    const isLoading = ref(true);
    const isSaving = ref(false);
    const loadError = ref<string | null>(null);
    const saveSuccess = ref(false);
    const hasChanges = ref(false);
    const keyCheckboxRender = ref(0);

    // Default values
    const defaultTerms = [...NEWS_CONFIG_DEFAULT_TERMS];
    const defaultEntities = [...NEWS_CONFIG_DEFAULT_ENTITIES];
    const maxQueryLength = NEWS_CONFIG_MAX_QUERY_LENGTH;
    const defaultYearsBack = NEWS_CONFIG_DEFAULT_YEARS_BACK;

    // Years back options (1-10)
    const yearsBackOptions = Array.from(
      { length: NEWS_CONFIG_MAX_YEARS_BACK - NEWS_CONFIG_MIN_YEARS_BACK + 1 },
      (_, i) => i + NEWS_CONFIG_MIN_YEARS_BACK
    );

    // Configuration data
    const config = reactive<NewsConfig>({
      generalNews: {
        keywords: '',
        selectedTerms: [...defaultTerms],
        additionalTerms: ''
      },
      supplierNews: {
        selectedEntities: [...defaultEntities],
        selectedTerms: [...defaultTerms],
        additionalTerms: ''
      },
      newsSearchYearsBack: defaultYearsBack
    });

    // Original config for change detection
    let originalConfig: string = '';

    // Character counts — these must measure the query GNews receives, not the raw
    // configuration text. The quoting, ` OR `, parentheses and ` AND ` add up: the six
    // default terms alone cost 98 characters against a raw 64, so a configuration that
    // read 200/200 here was really sending 271 and coming back as a 400.
    const entityNameAllowance = NEWS_CONFIG_ENTITY_NAME_ALLOWANCE;

    const generalNewsCharCount = computed(() => generalNewsQuery.value.length);

    // Setup cannot see the supplier and parent names the Entity Card query carries at
    // request time, so the terms are measured exactly and the names are budgeted.
    const supplierNewsCharCount = computed(() => {
      const termsLength = buildSupplierTermsQuery(config.supplierNews).length;
      const includesParent = config.supplierNews.selectedEntities.includes('Parent Name');

      return termsLength + entityPartLength(entityNameAllowance, includesParent);
    });

    // Validation
    const generalNewsValid = computed(() => {
      // Must have at least one term defined in General News section
      // Options: keywords, selectedTerms, or additionalTerms
      const hasKeywords = config.generalNews.keywords?.trim().length > 0;
      const hasSelectedTerms = config.generalNews.selectedTerms?.length > 0;
      const hasAdditionalTerms = config.generalNews.additionalTerms?.trim().length > 0;
      const hasAtLeastOneTerm = hasKeywords || hasSelectedTerms || hasAdditionalTerms;
      
      const withinLimit = generalNewsCharCount.value <= maxQueryLength;
      return hasAtLeastOneTerm && withinLimit;
    });

    const supplierNewsValid = computed(() => {
      // Must have at least one entity selected
      const hasSelectedEntities = config.supplierNews.selectedEntities?.length > 0;
      
      // Must have at least one term defined (selectedTerms or additionalTerms)
      // const hasSelectedTerms = config.supplierNews.selectedTerms?.length > 0;
      // const hasAdditionalTerms = config.supplierNews.additionalTerms?.trim().length > 0;
      // const hasAtLeastOneTerm = hasSelectedTerms
      
      // Both entities and terms are required for Supplier News
      const withinLimit = supplierNewsCharCount.value <= maxQueryLength;
      return hasSelectedEntities && withinLimit;
    });

    const canSave = computed(() => {
      return hasChanges.value && generalNewsValid.value && supplierNewsValid.value && !props.spendFileInrecalculation;
    });

    // Query previews — the same builders the counters measure, so what the admin
    // reads in the preview box is exactly what is counted and sent.
    const generalNewsQuery = computed(() => buildGeneralNewsQuery(config.generalNews));

    const supplierNewsQuery = computed(() => buildSupplierNewsPreview(config.supplierNews));

    // Methods
    function updateCharacterCount() {
      // Check for changes
      const currentConfig = JSON.stringify(config);
      hasChanges.value = currentConfig !== originalConfig;
      keyCheckboxRender.value++;
      sendChangesToParent(hasChanges.value);
    }

    function toggleGeneralNewsTerm(e: any, term: string) {
      const index = config.generalNews.selectedTerms.indexOf(term);
      if (e.value && index === -1) {
        config.generalNews.selectedTerms.push(term);
      } else if (!e.value && index > -1) {
        config.generalNews.selectedTerms.splice(index, 1);
      }
      updateCharacterCount();
    }

    function toggleSupplierNewsEntity(e: any, entity: string) {
      // Prevent unchecking "Supplier Name" as it's mandatory
      if (entity === 'Supplier Name' && !e.value) {
        return;
      }
      
      const index = config.supplierNews.selectedEntities.indexOf(entity);
      if (e.value && index === -1) {
        config.supplierNews.selectedEntities.push(entity);
      } else if (!e.value && index > -1) {
        config.supplierNews.selectedEntities.splice(index, 1);
      }
      updateCharacterCount();
    }

    function toggleSupplierNewsTerm(e: any, term: string) {
      const index = config.supplierNews.selectedTerms.indexOf(term);
      if (e.value && index === -1) {
        config.supplierNews.selectedTerms.push(term);
      } else if (!e.value && index > -1) {
        config.supplierNews.selectedTerms.splice(index, 1);
      }
      updateCharacterCount();
    }

    function populateConfigFromData(data: any) {
      // Populate General News
      if (data.generalNews) {
        config.generalNews.keywords = data.generalNews.keywords || '';
        config.generalNews.selectedTerms = data.generalNews.selectedTerms || [...defaultTerms];
        config.generalNews.additionalTerms = data.generalNews.additionalTerms || '';
      }

      // Populate Supplier News
      if (data.supplierNews) {
        config.supplierNews.selectedEntities = data.supplierNews.selectedEntities || [...defaultEntities];
        config.supplierNews.selectedTerms = data.supplierNews.selectedTerms || [...defaultTerms];
        config.supplierNews.additionalTerms = data.supplierNews.additionalTerms || '';

        // Ensure "Supplier Name" is always included (mandatory)
        if (!config.supplierNews.selectedEntities.includes('Supplier Name')) {
          config.supplierNews.selectedEntities.push('Supplier Name');
        }
      } else if (!config.supplierNews.selectedEntities.includes('Supplier Name')) {
        // If no supplierNews data, ensure "Supplier Name" is in default entities
        config.supplierNews.selectedEntities.push('Supplier Name');
      }

      // Populate news search years back
      config.newsSearchYearsBack = data.newsSearchYearsBack ?? defaultYearsBack;

      // Store original config for change detection
      originalConfig = JSON.stringify(config);
      hasChanges.value = false;
      keyCheckboxRender.value++; // Force re-render of checkboxes
    }

    async function loadConfiguration() {
      isLoading.value = true;
      loadError.value = null;

      // First, check if newsConfig exists in the store (from user profile)
      const storedConfig = getNewsConfig.value;
      if (storedConfig) {
        populateConfigFromData(storedConfig);
        isLoading.value = false;
        return;
      }

      // Fallback: fetch from API if not in store
      await homeStore.getNewsConfig({
        callbackSuccess: (response: any) => {
          if (response?.data) {
            populateConfigFromData(response.data);
          }
          isLoading.value = false;
        },
        callbackError: (response: any) => {
          loadError.value = t('home.homeCompanySettings.news.loadError');
          toast.error(t('home.homeCompanySettings.news.loadError'));
          console.error('Error loading news configuration:', response);
          isLoading.value = false;
        }
      });
    }

    async function saveConfiguration() {
      if (!canSave.value) return;

      isSaving.value = true;

      // Ensure "Supplier Name" is always included (mandatory)
      const selectedEntities = [...config.supplierNews.selectedEntities];
      if (!selectedEntities.includes('Supplier Name')) {
        selectedEntities.push('Supplier Name');
      }

      const configToSave = {
        generalNews: {
          keywords: config.generalNews.keywords,
          selectedTerms: config.generalNews.selectedTerms,
          additionalTerms: config.generalNews.additionalTerms
        },
        supplierNews: {
          selectedEntities: selectedEntities,
          selectedTerms: config.supplierNews.selectedTerms,
          additionalTerms: config.supplierNews.additionalTerms
        },
        newsSearchYearsBack: config.newsSearchYearsBack
      };

      await homeStore.saveNewsConfig({
        config: configToSave,
        callbackSuccess: (response: any) => {
          saveSuccess.value = true;
          originalConfig = JSON.stringify(config);
          updateNewsConfig(config);
          hasChanges.value = false;
          sendChangesToParent(false);
          isSaving.value = false;
          toast.success(t('home.homeCompanySettings.news.saveSuccess'));
        },
        callbackError: (response: any) => {
          saveSuccess.value = false;
          const errorMsg = response?.data?.error || t('home.homeCompanySettings.news.saveError');
          toast.error(errorMsg);
          console.error('Error saving news configuration:', response);
          isSaving.value = false;
        }
      });
    }

    /**
     * Reset configuration to original values
     */
    function resetConfiguration(): void {
      if (!originalConfig) {
        return;
      }

      try {
        const original = JSON.parse(originalConfig);
        
        // Restore General News
        if (original.generalNews) {
          config.generalNews.keywords = original.generalNews.keywords || '';
          config.generalNews.selectedTerms = original.generalNews.selectedTerms || [...defaultTerms];
          config.generalNews.additionalTerms = original.generalNews.additionalTerms || '';
        }

        // Restore Supplier News
        if (original.supplierNews) {
          config.supplierNews.selectedEntities = original.supplierNews.selectedEntities || [...defaultEntities];
          config.supplierNews.selectedTerms = original.supplierNews.selectedTerms || [...defaultTerms];
          config.supplierNews.additionalTerms = original.supplierNews.additionalTerms || '';

          // Ensure "Supplier Name" is always included (mandatory)
          if (!config.supplierNews.selectedEntities.includes('Supplier Name')) {
            config.supplierNews.selectedEntities.push('Supplier Name');
          }
        }

        // Restore news search years back
        config.newsSearchYearsBack = original.newsSearchYearsBack ?? defaultYearsBack;

        // Reset change detection
        hasChanges.value = false;
        sendChangesToParent(false);
        keyCheckboxRender.value++; // Force re-render of checkboxes        
      } catch (error) {
        console.error('Error resetting configuration:', error);        
      }
    }

    // Lifecycle
    onMounted(() => {
      loadConfiguration();
    });

    return {
      // State
      isLoading,
      isSaving,
      loadError,
      saveSuccess,
      hasChanges,
      config,
      keyCheckboxRender,
      
      // Constants
      defaultTerms,
      defaultEntities,
      maxQueryLength,
      entityNameAllowance,
      yearsBackOptions,
      
      // Computed
      generalNewsCharCount,
      supplierNewsCharCount,
      canSave,
      generalNewsQuery,
      supplierNewsQuery,
      
      // Methods
      updateCharacterCount,
      loadConfiguration,
      saveConfiguration,
      resetConfiguration,
      toggleGeneralNewsTerm,
      toggleSupplierNewsEntity,
      toggleSupplierNewsTerm
    };
  }
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors.scss";


.config-section {
  background-color: $color-white;
  padding: 20px;
  width: 100%;
}

.section-header {
  h5 {
    margin-bottom: 4px;
  }
}

.form-label {
  display: block;
  margin-bottom: 8px;
  color: $color-gray-700;
}

.form-group {
  label {
    display: block;

    span {
      display: inline-block;
      margin-left: 8px;
    }
  }
}

.form-control {
  width: 100%;
  border: 1px solid $color-gray-300;
  border-radius: 6px;

  &:focus {
    border-color: $color-primary-500;
    outline: none;
    box-shadow: 0 0 0 3px rgba($color-primary-500, 0.1);
  }

  &.years-back-select {
    max-width: 200px;
    cursor: pointer;
  }
}

.checkbox-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;  
}

.admin-checkbox {
  flex-shrink: 0;
}

// Deep styles for Kendo Checkbox
:deep(.k-checkbox) {
  width: 16px !important;
  height: 16px !important;
  border-radius: 4px !important;
}

:deep(.k-checkbox-wrap) {
  width: 16px !important;
  height: 16px !important;
}

.no-hover {
  pointer-events: none;
  opacity: 0.6;
}

.character-counter {
  font-size: 13px;
  color: $color-gray-500;
  text-align: right;
  
  &.text-danger {
    color: $color-primary-600;
    font-weight: 500;
  }
}

.divider {
  height: 1px;
  background-color: $color-gray-200;
}

.text-muted {
  font-size: 12px;
  color: $color-gray-400;
  margin-top: 4px;
  display: block;
}

.toast-container {
  z-index: 1050;
}

.toast {
  min-width: 280px;
  border-radius: 8px;
  
  &.bg-success {
    background-color: $color-green-600 !important;
  }
  
  &.bg-danger {
    background-color: $color-primary-600 !important;
  }
}

.alert-warning {
  background-color: $color-warning-50;
  border-color: $color-warning-200;
  color: $color-warning-800;
}

.query-preview {
  margin-top: 16px;
  
  .query-preview-box {
    background-color: $color-gray-50;
    border: 1px solid $color-gray-300;
    border-radius: 6px;
    padding: 12px 16px;
    margin-top: 8px;
    
    .query-text {
      color: $color-gray-800;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      word-break: break-all;
      white-space: pre-wrap;
      display: block;
      line-height: 1.5;
    }
  }
}
</style>
