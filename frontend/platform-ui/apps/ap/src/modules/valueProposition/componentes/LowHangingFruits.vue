<template>
<div class="component-editor-container" v-if="showModalEdit" @click.self="cancelEdition">
  <div class="d-flex component-editor-body">
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons"><span class="cursor-pointer" @click="cancelEdition"><i class="fa-solid fa-xmark"></i></span></div>
    </div>
    <div class="row mt-2">
      <div class="col-lg-12">
        <Editor v-model="textToEditor" :tools="basicTools" :default-content="textToEditor" :content-style="{ height: '25vh' }" @change="onEditorChange"></Editor>
      </div>
    </div>
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons-edition">
        <button class="btn outline-secondary-btn font-md text-capitalize modal-btn" @click="cancelEdition">{{ $t('global.cancel') }}        </button>
        <button class="btn btn-primary font-md text-capitalize modal-btn" @click="saveText">{{ $t('global.save') }}</button>
      </div>
    </div>
  </div>
</div>
<div class="content-editor mb-4" v-if="objData.visibility || editionMode">
  <div class="row mb-3 d-flex">
    <div class="col-md-7 d-flex">
      <div class="detailed-text-container flex-grow-1">
        <LowHangingCFOpp :object-content="objData.cashFlowOpportunity"></LowHangingCFOpp>
      </div>
    </div>
    <div class="col-md-5 d-flex">
      <div class="detailed-text-container flex-grow-1">
        <div class="px-4 too-high" v-html="textToEditor"></div>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-md-12">
      <div class="detailed-text-container">
        <div class="d-flex-flex-column justify-content-between align-items-center mb-12">
          <h1 class="mb-1 font-bold text-base mb-6"><span class="text-gray-700 text-2xl cursor-pointer truncate-title font-semibold">{{ objData.nineBox.title }}      </span></h1>
        </div>
        <NineBoxes :boxes-info="objData.nineBox.boxesInfo" :yAxisTitle="'Probability of Success'" :xAxisTitle="'Buyer Impact (Cash Flow)'" :boxTitle="objData.nineBox.boxTitle" :typeOf9Boxes="objData.nineBox.typeOf9Boxes" :selectedLevel="'supplier'" :loading="false" :loadingDataBoxes="false" :programInrecalculation="false" :isBoxesRecalculating="false"></NineBoxes>
      </div>
    </div>
  </div>
  <div class="overlay-vp-editor" v-if="editionMode">
    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch">
      <div class="d-flex gap-2">
        <div class="icon-subcomponent" @click="showModal" :title="'Edit Content'"><i class="fa-solid fa-pencil text-sm" :title="'Edit Content'"></i></div>
        <div class="icon-subcomponent" @click="$emit('change-content', objData, null, 'delete')" :title="'Delete Content'"><i class="fa-solid fa-trash-can text-sm" :title="'Delete Content'"></i></div>
        <div class="icon-subcomponent" v-if="objData.visibility" :title="'Hide Content'" @click="$emit('change-content', objData, null, 'showOrHide')"><i class="fa-solid fa-eye-slash text-sm" :title="'Hide Content'"> </i></div>
        <div class="icon-subcomponent" v-if="!objData.visibility" :title="'Show Content'" @click="$emit('change-content', objData, null, 'showOrHide')"> <i class="fa-solid fa-eye text-base" :title="'Show Content'"></i></div>
      </div>
    </Tooltip>
  </div>
</div>
</template>

<script lang="ts">
import { ObjectUtils } from '@/utils'
import { defineComponent, PropType, provide, reactive, ref, toRefs } from 'vue'
import { Editor } from '@progress/kendo-vue-editor';
import { basicTools } from '../data/editor';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import LowHangingCFOpp from './LowHangingCFOpp.vue'
import NineBoxes from '@/modules/home/analyze/components/NineBoxes.vue';
import { LowHangingFruitsType } from '../types';
export default defineComponent({
    name: 'LowHangingFruits',
    components: {
        Editor, Tooltip, LowHangingCFOpp, NineBoxes
    },
    props: {
        editionMode: { type: Boolean, required: false, default: false },
        objectContent: { type: Object as PropType<LowHangingFruitsType>, required: true }
    },
    emits: ['change-content'],
    setup(props, { emit }) {
        interface DataInterface {
            showModalEdit: boolean,
            objData: LowHangingFruitsType
            objDataInitial: LowHangingFruitsType
        }

        const data: DataInterface = reactive<DataInterface>({
            showModalEdit: false,
            objData: ObjectUtils.cloneDeep(props.objectContent),
            objDataInitial: ObjectUtils.cloneDeep(props.objectContent)
        })
        const textDefaultToShow = ref(props.objectContent.text)
        const textToEditor = ref(ObjectUtils.cloneDeep(textDefaultToShow.value))
        const onEditorChange = (event: any) => {
            textToEditor.value = event.html;
        };
        const showModal = () => {
            data.showModalEdit = true
        }
        const saveText = () => {
            data.objData.text = textToEditor.value
            emit('change-content', data.objData, { obj: data.objData }, 'lowHangingFruits')
            data.showModalEdit = false
        }
        function cancelEdition() {
            data.showModalEdit = false
            textToEditor.value = ObjectUtils.cloneDeep(textDefaultToShow.value)
        }
        provide('fromValuePropositionLowHangingFruits', true)
        return {
            ...toRefs(data), showModal, cancelEdition, saveText, textToEditor, onEditorChange, basicTools
        }
    }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
.detailed-text-container {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
}

.too-high {
    overflow-x: hidden;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 0.4rem;
    }

    &::-webkit-scrollbar-thumb {
        border-radius: 10px;
        background-color: $scrollbar-thumb !important;

        &:hover {
            cursor: pointer;
        }
    }
}
</style>