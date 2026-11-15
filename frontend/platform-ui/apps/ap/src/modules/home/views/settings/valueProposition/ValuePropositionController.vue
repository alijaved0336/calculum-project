<template>
<CalculumLayout :containerClass="'wizard-programs'">
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row">
        <div class="col">
          <div class="card" style="min-height: auto; height: auto">
            <div class="card-body">
              <div class="row cursor-pointer" id="show-value-proposition-section">
                <div class="col-lg-3 col-xl-2 border-right">
                  <HomeMenuAccount :currentPage="'ValueProposition'"></HomeMenuAccount>
                </div>
                <div class="col-lg-9 col-xl-10 p-5"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ $t('home.homeCompanySettings.cardGroups.valueProposition') }}
                    <CalculumTooltipIcon :infoText="$t('home.homeCompanySettings.strategiesTxtTooltipDefault')" :advancedTooltipClass="true" :uniqueIdentifier="'popover-setup-paymenttermsstrategies'" :keyPopOver="'setupPaymenTermsStrategies'"></CalculumTooltipIcon></span>
                  <ValuePropositionForm class="mb-4" @refresh-vp-list="refreshKeys">                                   </ValuePropositionForm>
                  <ListValuePropositions :key="'vp-list-' + key"></ListValuePropositions>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">

import { defineComponent, toRefs, reactive } from 'vue'
import ValuePropositionForm from './ValuePropositionForm.vue'
import ListValuePropositions from './ListValuePropositions.vue'
import { CalculumLayout } from '@ada/design-system'
import HomeMenuAccount from "@/modules/home/components/HomeMenuAccount.vue";


export default defineComponent({
    name: 'ValuePropositionController',
    components: {
        ValuePropositionForm,
        ListValuePropositions,
        CalculumLayout,
        HomeMenuAccount
    },
    setup( props: any) {        
        interface DataInterface {
            showFormValueProposition: boolean,
            key: number
        }
        
        const data = reactive<DataInterface>({
            showFormValueProposition: false,
            key: new Date().getUTCMilliseconds()
        });


        function refreshKeys() {
            data.key++
        }

        return {
            ...toRefs(data),
            refreshKeys
        };
    }





})
</script>

<style>

</style>