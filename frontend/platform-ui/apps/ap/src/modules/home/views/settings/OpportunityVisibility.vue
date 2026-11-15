<template>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<div class="row">
  <div class="col-12 d-flex flex-column radio-container">
    <div class="d-flex disabled-button">
      <label class="rounded-checkbox">
        <input class="styled-checkbox" v-model="showOpportunityExpectedOpportunity" @change="showOpportunityExpectedOpportunity = 'OPPORTUNITY_AND_EXPECTED'" type="radio" value="OPPORTUNITY_AND_EXPECTED" :disabled="disabledButtonSpendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio': showOpportunityExpectedOpportunity === 'ONLY_OPPORTUNITY', 'no-hover': disabledButtonSpendFileInrecalculation}">&nbsp;    </span>
      </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" id="OPPORTUNITY_AND_EXPECTED" :class="{'no-hover': disabledButtonSpendFileInrecalculation}" @click="disabledButtonSpendFileInrecalculation ? null : showOpportunityExpectedOpportunity = 'OPPORTUNITY_AND_EXPECTED'">{{ $t('global.showTotalOpportunityExpected') }}</span>
    </div>
    <div class="d-flex disabled-button">
      <label class="rounded-checkbox">
        <input class="styled-checkbox" v-model="showOpportunityExpectedOpportunity" @change="showOpportunityExpectedOpportunity = 'ONLY_OPPORTUNITY'" type="radio" value="ONLY_OPPORTUNITY" :disabled="disabledButtonSpendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio': showOpportunityExpectedOpportunity === 'OPPORTUNITY_AND_EXPECTED', 'no-hover': disabledButtonSpendFileInrecalculation}">&nbsp;    </span>
      </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" id="ONLY_OPPORTUNITY" :class="{'no-hover': disabledButtonSpendFileInrecalculation}" @click="disabledButtonSpendFileInrecalculation ? null : showOpportunityExpectedOpportunity = 'ONLY_OPPORTUNITY'">{{ $t('global.showOnlyTotalOpportunity') }}</span>
    </div>
  </div>
</div>
<div class="row mt-2 w-100 mb-3">
  <div class="col-12 d-flex container-buttons">
    <button class="btn btn-primary font-md" id="save-opportunity-config" @click="saveValues" :disabled="disabledButton || spendFileInrecalculation" style="z-index: 1; width: fit-content"><span>{{ $t('global.save') }}</span></button>
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
    typeOfOpportunityVisibility
  } from "@/types";

export default defineComponent({

    name: 'OpportunityVisibility',
    components: { CalculumLoading },
    props: {
        spendFileInrecalculation: { type: Boolean, default: false }
    },
    setup(props: any) {
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
        const spendFilesStore = useSpendFilesStore();
        const toast = useToast();

        const { spendFileVersionActiveIri, updateOpportunityVisibility, showOpportunityExpectedOpportunity } = useSpendFile();
        const { companyActiveId } = useCompany();

        interface DataInterface {
            showOpportunityExpectedOpportunity: typeOfOpportunityVisibility,
            loading: boolean,
            initialShowOpportunityExpectedOpportunity: typeOfOpportunityVisibility            
        }

        const data = reactive<DataInterface>({
            showOpportunityExpectedOpportunity: 'OPPORTUNITY_AND_EXPECTED',
            loading: true,
            initialShowOpportunityExpectedOpportunity: 'OPPORTUNITY_AND_EXPECTED'
        })

        onMounted(() => {
            getValues()
        })

        function getValues() {

            data.showOpportunityExpectedOpportunity = showOpportunityExpectedOpportunity.value ?? 'OPPORTUNITY_AND_EXPECTED'
            data.initialShowOpportunityExpectedOpportunity = showOpportunityExpectedOpportunity.value ?? 'OPPORTUNITY_AND_EXPECTED'
            data.loading = false

            // data.loading = true
            // const props = {
            //     fileVersionID: spendFileVersionActiveIri.value,
            //     callbackSuccess: (callbackSuccessData: any) => {
            //         data.loading = false                    
            //         data.showOpportunityExpectedOpportunity = callbackSuccessData.showOpportunityExpectedOpportunity ?? 'OPPORTUNITY_AND_EXPECTED'
            //         data.initialShowOpportunityExpectedOpportunity = callbackSuccessData.showOpportunityExpectedOpportunity ?? 'OPPORTUNITY_AND_EXPECTED'
            //     },
            //     callbackError: () => {
            //         data.loading = false                    
            //         toast.error(translate.t('global.errorLoadingSettings'));
            //     },
            // };
        
        }

        function saveValues() {
            data.loading = true
            const props = {
                file: null,
                companyUUID: companyActiveId.value,
                spendFileVersion: spendFileVersionActiveIri.value,
                showOpportunityExpectedOpportunity: data.showOpportunityExpectedOpportunity,
                callbackSuccess: () => {
                    data.loading = false
                    updateOpportunityVisibility(data.showOpportunityExpectedOpportunity)
                    data.initialShowOpportunityExpectedOpportunity = data.showOpportunityExpectedOpportunity
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
            return data.showOpportunityExpectedOpportunity === data.initialShowOpportunityExpectedOpportunity
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