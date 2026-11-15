<template>
<CalculumModal :size="modalSize" :title="'Spend Volume Forecast'" :showClose="true" @close="$emit('close',false)">
  <template v-slot:modalContent>
    <div class="row">
      <div class="col-2">
        <div class="form-group">
          <label>
            <input class="form-control" v-model.number="forecastVolume" type="number" min="-100" max="100000" step="1" placeholder="0"/><span>{{'Spend Volume Change (%)'}}</span>
          </label>
          <p class="text-danger small" v-if="forecastVolumeValidate">{{ forecastVolumeError }}</p>
        </div>
      </div>
      <div class="col-2">
        <button class="btn outline-secondary-btn font-md text-capitalize mt-4" @click="forecastVolume = null" style="z-index: 1; width: fit-content">{{ $t('global.clear') }}</button>
      </div>
      <div class="col-12 d-flex flex-column"><span class="font-medium">{{ '*Please note: Only the value changes in the rows that are selected will be saved.' }}</span>
        <ListForecast :selectedProgramId="programUuid" :entityUuid="companyId" :companyType="companyType" :isSelectable="true" :selectedTabIndex="selectedTabIndex" :showOptions="false" :isForeCast="true" :forecastVolume="forecastVolume" :hasFinancing="false" :hasHarmonization="false" :allSpendsTab="false" :inRecalculation="false" :patchGrid="false" @select-all-row="selectAllRow" @select-row="selectRow" @send-forecast="sendForecast"></ListForecast>
      </div>
      <div class="col-12" v-if="saveError">
        <p class="text-danger small mb-0">Spend Volume modification cannot be greater than <span class="text-danger fw-bold">100 000%</span> respecto to the original</p>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md text-capitalize" @click="$emit('close',false)" style="z-index: 1; width: fit-content" :disabled="isSaving">{{ $t('global.cancel') }}        </button>
    <button class="btn btn-primary font-md text-capitalize" @click="validateSelectedItems(true)" :disabled="clearButtonLogicComputed || forecastVolumeValidate || isSaving" style="z-index: 1; width: fit-content"> <span v-if="!isSaving">{{ $t('global.save') }}</span><span class="spinner-border spinner-border-sm" v-if="isSaving" role="status" aria-hidden="true"></span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, toRefs, ref, onMounted, onUnmounted } from 'vue';
import ListForecast from "../../components/ListForecast.vue";
import CalculumModal from "@/modules/components/CalculumModal.vue";
import { useToast } from "vue-toastification";
import { useI18n } from "vue-i18n";
import { useEntityCardStore } from "@/stores/entityCard";

export default defineComponent({
    name: 'ForeCastModal',
    components: {
        ListForecast,
        CalculumModal
    },
    props: {
        programUuid: { type: String, required: true },
        companyId: { type: String, required: true },
        companyType: { type: String, required: false, default: "" },
        selectedIndex: { type: Number, required: true },
        spendFileVersionIdActive: { type: String, required: false, default: "" }
    },
    emits: ['close','send-forecast'],
    setup(props, { emit }) {
        const entityCardStore = useEntityCardStore();
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
        const toast = useToast();
        const isSaving = ref(false)
        const modalSize = ref('lg-75')

        const width = ref(window.innerWidth)

        const updateScreenSize = () => {              
            width.value = window.innerWidth
            modalSize.value = window.innerWidth < 1550 ? 'xl-95' : 'lg-75'
        }
        

        onMounted(() => {
            updateScreenSize();
            window.addEventListener('resize', updateScreenSize, { passive: true });
        })

        onUnmounted(() => {
            window.removeEventListener('resize', updateScreenSize);
        })

        interface Negotiation {
            allChecked: boolean;
            selectedItems: any[];
            forecastVolume: number | null
        }

        const data = reactive<Negotiation>({
            allChecked: false,
            selectedItems: [],
            forecastVolume: 0
        })

        const selectedTabIndex = computed(() => {
            return props.selectedIndex;
        });

        const clearButtonLogicComputed = computed(() => {
            if (Object.keys(data.selectedItems).length === 0) {
                return true;
            }
            return false;
        });

        const forecastVolumeError = computed(() => {
            if (data.forecastVolume && data.forecastVolume < -100) {
                return 'Spend Volume Change must be at least -100';
            }
            if (data.forecastVolume && data.forecastVolume > 100000) {
                return 'Spend Volume Change cannot exceed 100000%';
            }
            return '';
        });

        const forecastVolumeValidate = computed(() => {
            if (data.forecastVolume && data.forecastVolume < -100) {
                return true
            }
            if (data.forecastVolume && data.forecastVolume > 100000) {
                return true
            }
            return false
        });

       
        function selectAllRow(rowData: any, items: any, checked: boolean) {
            data.allChecked = checked;
            data.selectedItems = items ? rowData : [];
        }
    
        function selectRow(rowData: any) {            
            data.allChecked = false;
            data.selectedItems = rowData;
        }

        const MAX_FORECAST_PERCENT = 100000;
        const saveError = ref(false);

        // AB#20354: the grid cells are free text, so the limit is checked when Save is clicked.
        function exceedsLimit() {
            return data.selectedItems.some((item: any) => {
                const original = Number(item.volume);
                if (!original) {
                    return false;
                }
                return ((Number(item.forecastVolume) - original) / original) * 100 > MAX_FORECAST_PERCENT;
            });
        }

        function validateSelectedItems(isToSave: boolean = false) {
            if (forecastVolumeError.value) {
                toast.error(forecastVolumeError.value);
                return;
            }
            if (data.selectedItems && data.selectedItems.length === 0) {
                toast.error(translate.t("home.entityCard.warnings.noSelected"));
                return;
            }
            saveError.value = isToSave && exceedsLimit();
            if (saveError.value) {
                return;
            }
            saveOrClearValues(isToSave);
        }

        const foreCastVolumeSet = ref(0)

        function sendForecast(values: any){            
            foreCastVolumeSet.value = values
        }

        function saveOrClearValues(isToSave: boolean) {
            
            const payload = {
                spendFileUuid: props.spendFileVersionIdActive,
                spends: data.selectedItems.map((item: any) => ({
                    uuid: item.uuid,
                    forecastVolume: isToSave
                        ? item.forecastVolume
                        : null
                }))
            };

            isSaving.value = true

            const params = {
                payload: payload,                 
                callbackSuccess: () => {                                        
                    // Call API to save forecastVolume with payload
                    toast.success(translate.t("global.forecastVolumeSaved"));                    
                    isSaving.value = false
                    emit('send-forecast',foreCastVolumeSet.value)
                    emit('close',true);
                },
                callbackError: (callbackErrorData: any) => {
                    isSaving.value = false
                    emit('send-forecast',0)
                    toast.error(translate.t("global.forecastVolumeSavedError"));                    
                },
            };            
            entityCardStore.updateSpendForecastVolumes(params);            
        }

       

        return {
            ...toRefs(data),
            selectedTabIndex,
            selectAllRow,
            selectRow,
            clearButtonLogicComputed,
            validateSelectedItems,
            forecastVolumeError,
            forecastVolumeValidate,
            isSaving,
            modalSize,
            saveError,
            sendForecast
        }
    },

})
  
</script>