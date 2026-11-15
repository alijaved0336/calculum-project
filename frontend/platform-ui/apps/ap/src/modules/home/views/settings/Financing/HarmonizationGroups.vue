<template>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.homePreference.confirm')" @close="cancelChangeProgram" v-if="showModalLocalChanges">
  <template v-slot:modalContent>
    <p>{{ $t('home.homePreference.unsavedChangesProgram') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancelChangeProgram">           <span>{{ $t('global.cancel') }} </span></button>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="discardChanges">           <span>{{ $t('global.discard') }}    </span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="saveChanges"><span>{{ $t('global.save') }}</span></button>
  </template>
</CalculumModal>
<CalculumLoading v-if="loadingProgramApiCalls" :modal="true"></CalculumLoading>
<div class="row w-100">
  <div class="col-8 d-flex justify-content-between">       </div>
  <div class="col-4 d-flex section-badges">
    <HomeProgramStatusDropdown v-if="!loadingProgramApiCalls" :listOptions="dropdownProgramValues.programsList" :selectedProgramUri="programValues.selectedProgramId" :widthDropdownPercent="'100%'" :key="keyDropdown" @select-program-dropdown="changeProgram"></HomeProgramStatusDropdown>
  </div>
  <div class="col-12 mt-4">
    <HarmonizationComponent v-if="!loadingProgramApiCalls && dataProgramSelected !== null" :selectedProgramId="programValues.selectedProgramId" :dataProgram="dataProgramSelected" :key="harmonizationKey" :saveGroupsProp="saveGroups" :spendFileInrecalculation="spendFileInrecalculation" @user-made-changes="userMadeChangesHarmonization"></HarmonizationComponent>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent, reactive, onMounted, toRefs, watch, computed } from 'vue'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useAnalyzeStore } from '@/stores/analyze'
import { useEntityCardStore } from '@/stores/entityCard'
import { useSubscribeStore } from '@/stores/subscribe'
import { useSpendFile } from '@/composables'
import useProgramList from "@/composables/useProgramList";
import HomeProgramStatusDropdown from "@/modules/home/components/HomeProgramStatusDropdown.vue";
import * as formatData from '@/utils/FormatData'
import { ObjectUtils, NumberUtils, StringUtils } from '@/utils'
import { DataInterfaceHarmonizationGroups } from './types'
import HarmonizationComponent from '@/modules/home/analyze/components/HarmonizationComponent.vue'
import { CalculumLoading } from '@ada/design-system'
import useFirebase from "@/composables/firebase/useFirebase";
import { translate } from '@/utils/translation'
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
    name: 'HarmonizationGroups',
    components: {
        HomeProgramStatusDropdown, CalculumLoading, CalculumModal, HarmonizationComponent
    },
    props: {
        saveGroupsProp: { type: Boolean, required: true },
        spendFileInrecalculation: { type: Boolean, default: false }
    },

    emits: ['cancel-n-continue'],
    setup(props: any, { emit }) {
        const globalFiltersStore = useGlobalFiltersStore()
        const analyzeStore = useAnalyzeStore()
        const entityCardStore = useEntityCardStore()
        const subscribeStore = useSubscribeStore()
        const {
            spendFileVersionActiveId
        } = useSpendFile()

        const { setProgramsToDropdown, setSelectedProgramValues } = useProgramList();
        const { subscribeToPrograms, fnSetUnsubscribeProgram} = useFirebase();

        let setGlobalFilter = formatData.convertFiltersToREST(
            globalFiltersStore.getFiltersApplied,
        );

        const data = reactive<DataInterfaceHarmonizationGroups>({
            programValues: {
                recalculationInProgress: false,
                pendingRecalculation: false,
                selectedProgramId: null,
                isBoxesRecalculating: null
            },
            dropdownProgramValues: {
                programsList: null,
            },
            keyDropdown: NumberUtils.getRandomInt(),
            loadingProgramApiCalls: false,
            dataProgramSelected: null,
            harmonizationKey: NumberUtils.getRandomInt(),
            saveGroups: false,
            localChanges: false,
            showModalLocalChanges: false,
            newSelectedProgram: ''
        })


        onMounted(() => {
            data.programValues.selectedProgramId = entityCardStore.getSelectedProgram
            getAllPrograms()
        })


        function getAllPrograms() {
            data.loadingProgramApiCalls = true
            const params = {
                scope: 'all',
                marked: null,
                firstName: null,
                lastName: null,
                spendFileVersion: spendFileVersionActiveId.value,
                callbackSuccess: (callbackSuccessData: any) => {
                    data.dropdownProgramValues = setProgramsToDropdown(callbackSuccessData);
                    data.programValues = setSelectedProgramValues(callbackSuccessData)
                    getProgram()

                },
                callbackError: () => {
                    data.loadingProgramApiCalls = false

                }
            }
            analyzeStore.fetchAllPrograms(params)
        }

        function getProgram(): void {
            data.loadingProgramApiCalls = true

            const params = {
                programId: data.programValues.selectedProgramId,
                globalFilter: setGlobalFilter,
                callbackSuccess: (callbackSuccessData: any) => {
                    data.programValues.recalculationInProgress =
                        callbackSuccessData.recalculationInProgress;
                    data.programValues.pendingRecalculation =
                        callbackSuccessData.pendingRecalculation;
                    data.dataProgramSelected = callbackSuccessData;
                    data.programValues.isBoxesRecalculating = callbackSuccessData.isBoxesRecalculating
                    data.loadingProgramApiCalls = false
                    data.keyDropdown++
                    data.harmonizationKey++                    
                },
                callbackError: () => {
                    data.loadingProgramApiCalls = false
                },
            };
            analyzeStore.getProgram(params);
        }



        watch(
            () => globalFiltersStore.getFiltersApplied,
            (newValue) => {
                setGlobalFilter = formatData.convertFiltersToREST(newValue);
                getProgram()
            },
        );

        function changeProgram(programID: any) {
            if (data.programValues.selectedProgramId === StringUtils.removeIRI(programID)) {
                data.keyDropdown++
                return
            }

            if (data.localChanges) {
                data.newSelectedProgram = programID
                data.showModalLocalChanges = true
                return
            }
            changeSelectedProgram(programID)
        }


        function changeSelectedProgram(programID: any) {
            data.newSelectedProgram = ''
            data.localChanges = false
            const programInList = data.dropdownProgramValues.programsList.find((x: any) => StringUtils.removeIRI(x['@id']) === StringUtils.removeIRI(programID))

            if (!programInList) { return }

            data.programValues.selectedProgramId = StringUtils.removeIRI(programID)
            data.programValues.recalculationInProgress = programInList.recalculationInProgress
            data.programValues.pendingRecalculation = programInList.pendingRecalculation
            entityCardStore.setSelectedProgram(data.programValues.selectedProgramId)
            data.keyDropdown++
            getProgram()
            fnSetUnsubscribeProgram()
            subscribeToPrograms([data.programValues.selectedProgramId])
        }

        function cancelChangeProgram() {
            data.showModalLocalChanges = false
            data.newSelectedProgram = ''
        }

        function discardChanges() {
            data.showModalLocalChanges = false
            data.localChanges = false
            changeSelectedProgram(data.newSelectedProgram)
        }

        function saveChanges() {
            data.showModalLocalChanges = false
            data.newSelectedProgram = ''
            data.localChanges = false
            data.saveGroups = true
        }


        watch(() => props.saveGroupsProp, () => {
            data.saveGroups = props.saveGroupsProp
        }, { deep: true })


        watch(
            () => subscribeStore.refreshPrograms,
            (newValue) => {
                switch (newValue) {
                    case "calculationPending":
                        data.programValues.pendingRecalculation = true;
                        data.programValues.recalculationInProgress = false;
                        data.programValues.isBoxesRecalculating = false;
                        break;

                    case "recalculating":
                        data.programValues.pendingRecalculation = false;
                        data.programValues.recalculationInProgress = true;
                        data.programValues.isBoxesRecalculating = true;
                        break;

                    //This is the "intermediate" state ready, but still hiding the expected values
                    case "calculationReady":
                        data.programValues.pendingRecalculation = false;
                        data.programValues.recalculationInProgress = false;
                        data.programValues.isBoxesRecalculating = true;
                        getAllPrograms()
                        break;

                    case "estimationPending":
                    case "estimating":
                        data.programValues.pendingRecalculation = false;
                        data.programValues.recalculationInProgress = false;
                        data.programValues.isBoxesRecalculating = true;
                        break;

                    //The final state and refresh all and show all the values
                    case "ready":
                        data.programValues.pendingRecalculation = false;
                        data.programValues.recalculationInProgress = true;
                        data.programValues.isBoxesRecalculating = true;
                        getAllPrograms()
                        break;

                    default:
                        break;
                }
            },
        );

        function userMadeChangesHarmonization(status: boolean) {
            data.localChanges = status
        }

        return {
            ...toRefs(data),
            changeProgram,        
            cancelChangeProgram,
            discardChanges,
            saveChanges,
            userMadeChangesHarmonization
        }
    }

})
</script>

<style scoped>
.section-badges {
    justify-content: end;
}
</style>