<template>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<div class="row">
  <div class="col-12 d-flex flex-column radio-container">
    <div class="d-flex disabled-button">
      <label class="rounded-checkbox">
        <input class="styled-checkbox" v-model="showSupplierStrategyVisibility" @change="showSupplierStrategyVisibility = 'ONLY_LARGEST'" type="radio" value="ONLY_LARGEST" :disabled="disabledButtonSpendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio': showSupplierStrategyVisibility !== 'ONLY_LARGEST', 'no-hover': disabledButtonSpendFileInrecalculation}">&nbsp;    </span>
      </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" id="ONLY_LARGEST" :class="{'no-hover': disabledButtonSpendFileInrecalculation}" @click="spendFileInrecalculation ? null : showSupplierStrategyVisibility = 'ONLY_LARGEST'">{{ $t('global.showOnlyLargestStrategy') }}</span>
    </div>
    <div class="d-flex disabled-button">
      <label class="rounded-checkbox">
        <input class="styled-checkbox" v-model="showSupplierStrategyVisibility" @change="showSupplierStrategyVisibility = 'APPLICABLE'" type="radio" value="APPLICABLE" :disabled="disabledButtonSpendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio': showSupplierStrategyVisibility !== 'APPLICABLE', 'no-hover': disabledButtonSpendFileInrecalculation}">&nbsp;    </span>
      </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" id="ONLY_APPLICABLE" :class="{'no-hover': disabledButtonSpendFileInrecalculation}" @click="disabledButtonSpendFileInrecalculation ? null : showSupplierStrategyVisibility = 'APPLICABLE'">{{ $t('global.showOnlyApplicableStrategies') }}</span>
    </div>
    <div class="d-flex disabled-button">
      <label class="rounded-checkbox">
        <input class="styled-checkbox" v-model="showSupplierStrategyVisibility" @change="showSupplierStrategyVisibility = 'ALL'" type="radio" value="ALL" :disabled="disabledButtonSpendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio': showSupplierStrategyVisibility !== 'ALL', 'no-hover': disabledButtonSpendFileInrecalculation}">&nbsp;    </span>
      </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" id="ALL" :class="{'no-hover': disabledButtonSpendFileInrecalculation}" @click="disabledButtonSpendFileInrecalculation ? null : showSupplierStrategyVisibility = 'ALL'">{{ $t('global.showAllEnabledStrategies') }}            </span>
    </div>
  </div>
</div>
<div class="row mt-2 w-100 mb-3">
  <div class="col-12 d-flex container-buttons">
    <button class="btn btn-primary font-md" id="save-opportunity-config" @click="saveValues" :disabled="disabledButton || disabledButtonSpendFileInrecalculation" style="z-index: 1; width: fit-content"><span>{{ $t('global.save') }}</span></button>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, onMounted, computed } from 'vue'
import { useI18n } from "vue-i18n";
import { useSpendFilesStore } from '@/stores/spendFiles'
import { useSpendFile, useCompany } from "@/composables";
import { CalculumLoading } from '@ada/design-system'
import { useToast } from "vue-toastification";

import {
    typeOfSupplierStrategyVisibility
  } from "@/types";

export default defineComponent({

    name: 'SupplierStrategyVisibility',
    components: { CalculumLoading },
    props: {
        spendFileInrecalculation: { type: Boolean, default: false }
    },
    setup(props: any) {
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
        const spendFilesStore = useSpendFilesStore();
        const toast = useToast();

        const { spendFileVersionActiveIri, updateStrategiesVisibility } = useSpendFile();
        const { companyActiveId } = useCompany();

        interface DataInterface {
            showSupplierStrategyVisibility: typeOfSupplierStrategyVisibility,
            loading: boolean,
            initialShowSupplierStrategyVisibility: typeOfSupplierStrategyVisibility            
        }

        const data = reactive<DataInterface>({
            showSupplierStrategyVisibility: 'ALL',
            loading: true,
            initialShowSupplierStrategyVisibility: 'ALL'
        })

        onMounted(() => {
            getValues()
        })

        function getValues() {
            data.loading = true
            const props = {
                fileVersionID: spendFileVersionActiveIri.value,
                callbackSuccess: (callbackSuccessData: any) => {
                    data.loading = false                    
                    data.showSupplierStrategyVisibility = callbackSuccessData.strategiesVisibility ?? 'ALL'
                    data.initialShowSupplierStrategyVisibility = callbackSuccessData.strategiesVisibility ?? 'ALL'
                },
                callbackError: () => {
                    data.loading = false                    
                    toast.error(translate.t('global.errorLoadingSettings'));
                },
            };
            spendFilesStore.getSpendFileVersion(props);
        
        }

        function saveValues() {
            data.loading = true
            const props = {
                file: null,
                companyUUID: companyActiveId.value,
                spendFileVersion: spendFileVersionActiveIri.value,
                strategiesVisibility: data.showSupplierStrategyVisibility,
                callbackSuccess: () => {
                    data.loading = false                    
                    updateStrategiesVisibility(data.showSupplierStrategyVisibility)
                    data.initialShowSupplierStrategyVisibility = data.showSupplierStrategyVisibility
                    toast.success(translate.t('global.successfullySaved'));
                },
                callbackError: () => {
                    data.loading = false
                    toast.error(translate.t('global.errorSavingData'));
                },
            };
            spendFilesStore.postSpendFile(props);
        }

        const disabledButton = computed(() => {
            return data.showSupplierStrategyVisibility === data.initialShowSupplierStrategyVisibility
        })


        const disabledButtonSpendFileInrecalculation = computed(() => {
            return props.spendFileInrecalculation
        })

        return {
            ...toRefs(data),
            saveValues,
            disabledButton,
            disabledButtonSpendFileInrecalculation
        }
    }
})
</script>

<style>

.radio-container {
    align-items: flex-start;
    gap: 4px;
}

</style>