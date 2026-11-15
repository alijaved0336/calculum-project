<template>
<div class="component-editor-container" v-if="showModalEdit" @click.self="cancelEdition">
  <div class="d-flex component-editor-body">
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons"><span class="cursor-pointer" @click="cancelEdition"><i class="fa-solid fa-xmark"></i></span></div>
    </div>
    <div class="row mt-2">
      <div class="col-6">
        <div class="form-group">
          <label for="title">
            <input class="form-control required" id="title" type="text" name="title" v-model="objData.spendVolume.data" placeholder="Set the spend volume analyzed"/><span>{{ 'Spend Volume Analyzed' }}</span>
          </label>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="leftTitle">
            <input class="form-control required" id="leftTitle" type="text" name="leftTitle" v-model="objData.matchRate.data" placeholder="Set macth rate"/><span>{{ 'Match Rate' }}</span>
          </label>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="middleTitle">
            <input class="form-control required" id="middleTitle" type="text" name="middleTitle" v-model="objData.supplier.valueData" placeholder="Set the suppliers analyzed"/><span>{{ 'Suppliers Analyzed' }}</span>
          </label>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="level">
            <select class="form-control required" id="level" name="level" v-model="objData.supplier.level" placeholder="Set the confidence score level">
              <option v-for="(item, index) in objData.supplier.options" :key="index" :value="item.label" :selected="objData.supplier.level === item.label">{{ item.label }}</option>
            </select><span>{{ `Confidence Score Level` }}</span>
          </label>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="rightTitle">
            <input class="form-control required" id="rightTitle" type="text" name="rightTitle" v-model="objData.opportunity.cashFlow" placeholder="Set the opportunity cash flow"/><span>{{ 'Opportunity Cash flow' }}</span>
          </label>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="opportunity">
            <input class="form-control required" id="opportunity" type="text" name="opportunity" v-model="objData.opportunity.opportunity" placeholder="Set the opportunity"/><span>{{ 'Opportunity' }}</span>
          </label>
        </div>
      </div>
      <div class="col-12">
        <Editor v-model="textToEditor" :tools="basicTools" :default-content="textToEditor" :content-style="{ height: '40vh' }" @change="onEditorChange"></Editor>
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
  <div class="row">
    <div class="col-md-7">
      <div class="row">
        <div class="col-md-6">
          <!--  Spend Volume Analyzed Box -->
          <TopLeftBox :title="objData.spendVolume.title" :value-data="objData.spendVolume.data"></TopLeftBox>
        </div>
        <div class="col-md-6">
          <!--  Match Rate Box -->
          <TopRightBox :title="objData.matchRate.title" :value-data="objData.matchRate.data"></TopRightBox>
        </div>
      </div>
      <div class="row">
        <div class="col-md-6">
          <!--  Supplier Analyzed Box -->
          <BottomLeftBox :title="objData.supplier.title" :value-data="objData.supplier.valueData" :confidence-score="objData.supplier.confidenceScore" :level="objData.supplier.level"></BottomLeftBox>
        </div>
        <div class="col-md-6">
          <!--  Opportunity Box -->
          <BottomRightBox :cash-flow-title="objData.opportunity.cashFlowTitle" :cash-flow="objData.opportunity.cashFlow" :opportunity-title="objData.opportunity.opportunityTitle" :opportunity="objData.opportunity.opportunity"></BottomRightBox>
        </div>
      </div>
    </div>
    <div class="col-md-5">
      <div class="px-7 detailed-text-container" v-html="textToEditor"></div>
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
import { defineComponent, PropType, reactive, ref, toRefs } from 'vue';
import { SpendVolumeType } from '../types';
import { ObjectUtils } from '@/utils';
import TopLeftBox from './boxes/TopLeftBox.vue';
import TopRightBox from './boxes/TopRightBox.vue';
import BottomLeftBox from './boxes/BottomLeftBox.vue';
import BottomRightBox from './boxes/BottomRightBox.vue';
import { Editor } from '@progress/kendo-vue-editor';
import { basicTools } from '../data/editor';
import { Tooltip } from '@progress/kendo-vue-tooltip'
export default defineComponent({
    name: 'SpendVolumeComponent',
    components: {
        TopRightBox, Editor,
        TopLeftBox, BottomLeftBox, BottomRightBox, Tooltip
    },
    props: {
        editionMode: { type: Boolean, required: false, default: false },
        objectContent: { type: Object as PropType<SpendVolumeType>, required: true },
    },
    emits: ['change-content'],
    setup(props, { emit }) {
        interface DataInterface {
            showModalEdit: boolean,
            objData: SpendVolumeType
            objDataInitial: SpendVolumeType
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
            emit('change-content', data.objData, { obj: data.objData, text: textToEditor.value }, 'spendVolume')
            data.showModalEdit = false
        }
        function cancelEdition() {
            
            data.showModalEdit = false
            textToEditor.value = ObjectUtils.cloneDeep(textDefaultToShow.value)
        }
        return {
            ...toRefs(data), showModal, cancelEdition, saveText, textToEditor, onEditorChange, basicTools
        }
    }
});
</script>

<style lang="scss" scoped>
.detailed-text-container {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
}

.modal-btn {
    z-index: 1;
    width: fit-content;
}

.card {
    min-height: 50px !important;
}

</style>