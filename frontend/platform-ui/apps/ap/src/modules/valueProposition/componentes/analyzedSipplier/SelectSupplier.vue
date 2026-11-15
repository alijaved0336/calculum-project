<template>
<CalculumModal :size="'md'" :showClose="true" :title="'Select supplier:'" :capitalizeTitle="false" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row w-100">
      <div class="col-12">
        <label for="searchSupplier">
          <input class="form-control" id="searchSupplier" type="text" name="searchSupplier" v-model="searchTerm" placeholder="Search supplier"/>
        </label>
      </div>
      <div class="col-12 container-table">
        <div class="loading-modal" v-if="loadingData"><img :src="images.loadingGIF"/></div>
        <div class="table-wrapper" v-else ref="tableRef">
          <table class="table table-borderless table-hover">
            <thead>
              <tr>
                <th>{{ 'Supplier' }}</th>
                <th>{{ 'Country' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in suppliers" :key="index + 1" @click="sendAction(item)">
                <td>{{ item.supplier }}</td>
                <td>{{ item.country }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="row d-flex" v-if="supplierVar.loadingRemainingItems && !loadingData">
          <div class="col-12 d-flex justify-content-center align-items-center"></div><span class="spinner-border spinner-border-sm"></span>
        </div>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, computed, ref, reactive, watch, watchEffect, nextTick } from "vue";
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { CalculumLoading } from '@ada/design-system'
import { EntityCard, FiltersAPIParam } from '@/types';
import * as formatData from '@/utils/FormatData'
import useNegotiationStatus from '@/modules/negotiationStatus/composables/useNegotiationStatus';
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import { useAppStore } from '@/stores/app';
import { useUser } from "@/composables";
import { useEntityCardStore } from "@/stores/entityCard";
import { PropsSelectedSupplier, SupplierListType } from "../../types";
import { StringUtils } from "@/utils";
import { images } from '@/resources/assets/assets'

export default defineComponent({
    name: 'SelectSupplier',
    components: { CalculumModal, CalculumLoading },
    props: {
        show: { type: Boolean, default: false },
        sectionId: { type: String, default: '' },
        spendFileVersionActiveId: { type: String, default: '' },
    },
    emits: ['close', 'selected-supplier'],
    setup(props, { emit }) {
        const showOptions = computed(() => props.show)
        const searchTerm = ref<string|null>(null)
        const tableRef = ref<HTMLTableElement | null>(null)
        const loadingData = ref(false)
        const sendAction = (option: PropsSelectedSupplier) => {
            emit('selected-supplier', option)
        }
        const globalFiltersStore = useGlobalFiltersStore()
        const entityCardStore = useEntityCardStore()
        const appStore = useAppStore()
        const { userIri } = useUser()
        const { negotiationStatusGetStatusesTranslated } = useNegotiationStatus()
        let currencyRate: number = appStore.getCurrencyAmount;
        let setGlobalFilter = formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied)
        const pagination = ref({
            first: 20,
            after: 0,
            skip: 0
        });
        const spendFile = computed(() => props.spendFileVersionActiveId)
        const suppliers = ref<PropsSelectedSupplier[]>([])
        let filters: FiltersAPIParam = {
            globalFilter: setGlobalFilter,
            currencyRate,
            targetSpendFileVersionUuid: spendFile.value,
            targetEntityType: 'supplier',
            targetProgramUuid: entityCardStore.getSelectedProgram
        }
        const supplierVar = reactive<SupplierListType>({
            remainingItems: true,
            loadingRemainingItems: false,
            searchQuery: null,
            from: 0,
            suppliers: [],
            searchEntitySuppliers: [],
            notRecently: false,
            loadingCards: false,
        })
        function getAllEntityCards(loadingMore: boolean): void {
            // If there are not remaining items, do nothing
            if (!supplierVar.remainingItems) { return; }
            // Enable loading
            supplierVar.loadingRemainingItems = true
            if (supplierVar.from===0) {
                loadingData.value = true
            }
            const params = {
                search: supplierVar.searchQuery,
                from: supplierVar.from,
                userId: userIri.value,
                orderBy: 'name',
                orderDirection: 'ASC',
                spendFileVersionId: spendFile.value,
                filters,
                callbackSuccess: (callbackSuccessData: EntityCard.EntityCardAPIResponse[]) => {
                    supplierVar.remainingItems = callbackSuccessData.length >= 20
                    // Parsing
                    const callbackSuccessDataParsed = callbackSuccessData
                        // Get list of negotiation statuses
                        .map(i => {
                            return {
                                ...i,
                                // from "analyzed,planned" to "Analyzed, Planned"
                                negotiationStatusCodes: negotiationStatusGetStatusesTranslated(i.negotiationStatusCodes)
                            }
                        })

                    supplierVar.searchEntitySuppliers = []
                    if (loadingMore) {
                        supplierVar.suppliers = [...supplierVar.suppliers, ...callbackSuccessDataParsed]
                    }
                    else {
                        supplierVar.suppliers = callbackSuccessDataParsed
                    }
                    const onlySuppliers = supplierVar.suppliers.filter((supplier: any) => supplier.companyType === 'supplier')

                    suppliers.value = onlySuppliers.map((supplier: any) => {
                        return {
                            supplier: supplier.originalName,
                            country: supplier.countryName,
                            uuid: supplier.uuid
                        }
                    })
                    // Disable loading
                    supplierVar.loadingRemainingItems = false
                    loadingData.value = false
                    supplierVar.loadingCards = false
                },
                callbackError: (callbackErrorData: any) => {
                    if (import.meta.env.DEV) { console.error("** Error in getAllEntityCards:", callbackErrorData) }

                    // Disable loading
                    supplierVar.loadingRemainingItems = false
                    loadingData.value = false
                }
            }
            if (!StringUtils.isNullUndefinedOrEmpty(userIri.value) &&
                !StringUtils.isNullUndefinedOrEmpty(spendFile.value)) {
                entityCardStore.postElasticSearchSuppliers(params)
            }
        }
        getAllEntityCards(true)
        function getMoreSuppliers() {
            if (tableRef.value) {
                const div = tableRef.value;
                const isAtEnd =
                    div.scrollTop >= div.scrollHeight - div.clientHeight - 2;
                if (isAtEnd && supplierVar.remainingItems && !supplierVar.loadingCards) {
                    pagination.value.after = pagination.value.after + pagination.value.first;
                    supplierVar.from += supplierVar.suppliers.length
                    getAllEntityCards(true)
                }
            }
        }
        watchEffect(async () => {
            if (suppliers.value.length > 0) {
                await nextTick();
                if (tableRef.value) {
                    tableRef.value.addEventListener('scroll', getMoreSuppliers);
                }
            } else {
                if (tableRef.value) {
                    tableRef.value.removeEventListener('scroll', getMoreSuppliers);
                }
            }
        });
        watch(searchTerm, (newVal) => {
            supplierVar.from = 0;
            if (!newVal || newVal.trim() === '') {
                supplierVar.searchQuery = null;
                supplierVar.remainingItems = true;
                getAllEntityCards(true);
                return;
            }
            supplierVar.searchQuery = newVal;
            getAllEntityCards(false);
            
        });
        return {
            showOptions,
            sendAction,
            suppliers,
            searchTerm, images,
            tableRef, getAllEntityCards, loadingData,supplierVar
        }
    }
});
</script>
<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";

.component-selector-container {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.2);
    z-index: 98;
}


.component-selector {
    position: absolute;
    top: 0;
    left: auto;
    background-color: white;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 20%;
    z-index: 99;
    height: 100vh;
    box-shadow: 0px 0px 10px 0px rgba(34, 60, 80, 0.2);

    a {
        color: #000;
        font-size: 0.75rem !important;
        line-height: 1rem;
        font-weight: 400;
    }
}


.component-selector-title {
    padding: 12px 12px;
    border-bottom: 1px solid #d1d1d1;
}

.component-selector-options {
    padding: 0px 12px;
    gap: 8px;
}

.component-selector-options-child {
    padding: 0px 12px;
    // gap: 8px;
}

.color-hover:hover {
    color: $color-primary-600;
}

.table-wrapper {
    display: block;
    max-height: 250px;
    /* Adjust this value as needed */
    overflow-y: auto;
    width: 100%;

    thead {
        position: sticky;
        top: 0;
        background-color: white;
        z-index: 1;
    }

    /* Optional: Add some spacing between header and scrollable content */
    tbody tr:first-child td {
        padding-top: 8px;
    }
}

.container-table {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.loading-modal {
    transition: all ease 0.3s;
    width: 199px;
    height: 199px;

    img {
        width: 100%;
        height: 100%;
    }
}
</style>