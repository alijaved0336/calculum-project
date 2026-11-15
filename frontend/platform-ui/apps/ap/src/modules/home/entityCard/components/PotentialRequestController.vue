<template>
<CalculumLoading v-if="someApiLoading" :modal="true"></CalculumLoading>
<CalculumModal v-if="openNewRequest" :size="'lg'" :showClose="true" :title="'New Request'" @close="openNewRequest = false">
  <template v-slot:modalContent>
    <NewPotentialSupplierRequest :countries-list="countriesList" :currencies-list="currenciesList" :buyers-list="buyersList" :isModal="true" @cancel="openNewRequest = false" @reload="refreshCounts"></NewPotentialSupplierRequest>
  </template>
</CalculumModal>
<div class="d-flex flex-column w-100 mt-4" v-if="!someApiLoading">
  <div class="alert alert-danger-custom fade show d-flex alert-width-50" v-if="!allowedCreatePotentials" role="alert"><img class="icon-svg" :src="fontIcons.alertIcon" alt=""/>
    <div class="d-flex flex-column gap-2"><span class="font-bold">{{ $t('global.noAllowToCreatesuppliersTitle') }}</span>
      <p><span class="font-semibold">{{ `${companyActiveName} ` }}</span><span>{{ `${$t('global.noAllowToCreatesuppliers')}` }}</span></p>
    </div>
  </div>
  <div class="d-flex flex-column w-100 gap-2">
    <PotentialRequestsCards v-if="existsSomeRequest" @new-request="openNewRequest = true" :totalRequests="totalRequests" :readyCount="readyCount" :inProcessCount="inProcessCount" :allowedCreatePotentials="allowedCreatePotentials"></PotentialRequestsCards>
    <PotentialRequestsList v-if="existsSomeRequest" :potentialRequests="potentialRequests"></PotentialRequestsList>
  </div>
  <NewPotentialSupplierRequest v-if="!existsSomeRequest && allowedCreatePotentials" :countries-list="countriesList" :currencies-list="currenciesList" :buyers-list="buyersList" @reload="refreshCounts"></NewPotentialSupplierRequest>
</div>
</template>

<script lang="ts">

import { defineComponent, ref, computed, onMounted } from 'vue';
import type { DropdownOption } from '@/types';
import PotentialRequestsCards from './PotentialRequestsCards.vue'
import PotentialRequestsList from './PotentialRequestsList.vue'
import NewPotentialSupplierRequest from './NewPotentialSupplierRequest.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { useSpendFile, useCompany } from '@/composables'
import { useEntityCardStore } from '@/stores/entityCard';
import { CalculumLoading } from '@ada/design-system'
import { useAppStore } from '@/stores/app'
import { getPotentialSupplierCount } from '@/modules/home/entityCard/api'
import { fontIcons } from '@/resources/assets/assets'

export default defineComponent({
    name: 'PotentialRequestController',
    components: {
        PotentialRequestsCards,
        PotentialRequestsList,
        NewPotentialSupplierRequest,
        CalculumModal,
        CalculumLoading
    },
    props: {},
    setup( props: any ) {

        const openNewRequest = ref(false)
        const loadingCountries = ref(false)
        const loadingBuyers = ref(false)
        const loadingPotentialRequests = ref(false)
        const loadingCount = ref(false)
        const { companyActiveId, getPotentialSupplierRequestLimit, companyActiveName } = useCompany()  
        const potentialSupplierCount = ref<number | null>(null);  

        const someApiLoading = computed(() => {
            return loadingCountries.value || loadingBuyers.value || loadingPotentialRequests.value || loadingCount.value
        })

        const entityCard = useEntityCardStore();
        const appStore = useAppStore();
        const potentialRequests = ref([])

        const buyersList = ref<DropdownOption[]>([])
        const countriesList = ref<DropdownOption[]>([])
        
        const currenciesList = computed<DropdownOption[]>(() =>
            appStore.getCurrencieswithId.map((c: { '@id': string; code: string }) => ({ key: c['@id'], value: c.code }))
        )

        const {
            spendFileVersionActiveIri
        } = useSpendFile();

    onMounted(() => {
        getBuyersByspendFile()
        getCountries()
        getPotentialRequests()
        fetchPotentialSupplierCount()
    })

    function refreshCounts() {
        getPotentialRequests()
        fetchPotentialSupplierCount()
    }

    function getCountries() {
        loadingCountries.value = true
        const params = {
            callbackSuccess: (callbackSuccessData: any) => {          
                countriesList.value = callbackSuccessData.map((c: { '@id': string; localizedName: string; }) => ({ key: c['@id'], value: c.localizedName }))
                loadingCountries.value = false
            },
            callbackError: () => {
                loadingCountries.value = false
            }
        }
        appStore.fetchCountries(params.callbackSuccess, params.callbackError)
    }

    function getBuyersByspendFile() {
        loadingBuyers.value = true
        const params = {
            spendFileVersionUUID: spendFileVersionActiveIri.value,            
            callbackSuccess: (callbackSucessData: any) => {
                if (callbackSucessData && callbackSucessData.length > 0) {
                    buyersList.value = callbackSucessData.map((c: { '@id': string; name: string; }) => ({ key: c['@id'], value: c.name }))
                }          
                loadingBuyers.value = false
            },
            callbackError: () => {
                loadingBuyers.value = false
            }
        };
        entityCard.getBuyersByspendFile(params);
    }


      function getPotentialRequests() {
        openNewRequest.value = false
        loadingPotentialRequests.value = true
        const params = {            
            spendFileVersionUUID: spendFileVersionActiveIri.value,
            callbackSuccess: (callbackSucessData: any) => {
                potentialRequests.value = callbackSucessData                
                loadingPotentialRequests.value = false
            },
            callbackError: () => {
                loadingPotentialRequests.value = false
            }
        };
        entityCard.getPotentialRequests(params);
    }

    async function fetchPotentialSupplierCount() {
      if (!companyActiveId.value) return      
      loadingCount.value = true
      try {
        const result = await getPotentialSupplierCount(companyActiveId.value)
        if (result.success) {  
            loadingCount.value = false        
            potentialSupplierCount.value = result.data.data.count
        }
      } catch (e) {        
        loadingCount.value = false
        console.error('Error fetching potential supplier count', e)
      }
    }

    const existsSomeRequest = computed(() => {
        return potentialRequests.value && potentialRequests.value.length > 0
    })

    const totalRequests = computed(() => {
        return potentialRequests.value && potentialRequests.value.length > 0 ? potentialRequests.value.length : 0
    })

    const readyCount = computed(() => {
        if (totalRequests.value > 0) {
            return potentialRequests.value.filter((r: any) => r.status === 'solved').length
        }
        return 0
    })

    const inProcessCount = computed(() => {
        if (totalRequests.value > 0) {
            return potentialRequests.value.filter((r: any) => r.status === 'pending').length
        }
        return 0
    })

    const allowedCreatePotentials = computed(() => {

      if ((getPotentialSupplierRequestLimit.value === null || Number.isNaN(getPotentialSupplierRequestLimit.value)) && (potentialSupplierCount.value === null || Number.isNaN(potentialSupplierCount.value))) {
        return false
      }

      const getDiff = Number(getPotentialSupplierRequestLimit.value) - Number(potentialSupplierCount.value)
      return getDiff > 0
    })


        return{
            openNewRequest,
            existsSomeRequest,
            countriesList,
            currenciesList,
            buyersList,
            someApiLoading,
            potentialRequests,
            getPotentialRequests,
            totalRequests,
            readyCount,
            inProcessCount,
            allowedCreatePotentials,
            fontIcons,
            companyActiveName,
            refreshCounts,
            getPotentialSupplierRequestLimit,
            potentialSupplierCount
        }
    }

})
</script>