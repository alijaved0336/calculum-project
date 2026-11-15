<template>
<div class="component-editor-container" v-if="showModalEdit" @click.self="cancelEdition">
  <div class="d-flex component-editor-body">
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons"><span class="cursor-pointer" @click="cancelEdition"><i class="fa-solid fa-xmark"></i></span></div>
    </div>
    <div class="row mt-2">
      <div class="col-lg-12">
        <Editor v-model="textToEditorFirst" :tools="basicTools" :default-content="textToEditorFirst" :content-style="{ height: '25vh' }" @change="onEditorChangeFirst"></Editor>
      </div>
      <div class="col-lg-12 mt-4">
        <Editor v-model="textToEditorLast" :tools="basicTools" :default-content="textToEditorLast" :content-style="{ height: '25vh' }" @change="onEditorChangeLast"></Editor>
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
  <div class="row mb-4 d-flex">
    <div class="col-md-7 d-flex">
      <div class="row flex-grow-1">
        <div class="col-md-12 mb-4">
          <div class="detailed-text-container">
            <div class="row">
              <div class="col-12 mb-2"><span class="text-gray-700 text-xl cursor-pointer truncate-title font-semibold">{{ 'Payment Terms (d)' }}</span></div>
              <div class="col-md-6">
                <div class="d-flex flex-column flex-grow-1">
                  <BarsWrapper class="mb-2" :main-value="objData.paymenTermsDays.contractualAvgPaymentTerms" :extra-value="objData.paymenTermsDays.currentAvgPaymentTerms" :contractual-value="objData.paymenTermsDays.contractualAvgPaymentTerms" :title="'Contractual'" :show-skeleton="false" :type="'contractual'"></BarsWrapper>
                  <BarsWrapper class="mb-2" :main-value="objData.paymenTermsDays.proposedAvgPaymentTerms" :extra-value="objData.paymenTermsDays.paymentCycleFloat" :title="'Opportunity'" :show-skeleton="false" :type="'opportunity'"></BarsWrapper>
                  <BarsWrapper class="mb-2" :main-value="objData.paymenTermsDays.expectedAvgPaymentTerms" :extra-value="objData.paymenTermsDays.expectedFloat" :title="'Expected'" :show-skeleton="false" :type="'expected'"></BarsWrapper>
                </div>
              </div>
              <div class="col-md-6 mt-9">
                <div class="cashFlow-card-inside">
                  <div class="d-flex flex-column justify-content-center align-items-center text-center">
                    <h2 class="font-weight-bold card-text-content mb-0">{{ objData.paymenTermsDays.increasingPaymentTerms.value }}</h2>
                    <p>{{ objData.paymenTermsDays.increasingPaymentTerms.name }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-12">
          <div class="detailed-text-container">
            <CashFlowOpportunity :object-content="objData.cashFlowOpportunity"></CashFlowOpportunity>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-5 d-flex">
      <div class="detailed-text-container flex-grow-1">
        <div v-html="textToEditorFirst"></div>
      </div>
    </div>
  </div>
  <div class="row mb-4">
    <div class="col-md-12">
      <div class="detailed-text-container">
        <WaterfallBarComponent :chartTitle="objData.charts.vertical.perOptimizacion.chartTitle" :dataValues="objData.charts.vertical.perOptimizacion.dataValues" :isBigNumberBar="true" :xAxisTitle="'Strategies'" :yAxisTitle="'Amount'" :title="objData.charts.vertical.perOptimizacion.chartTitle" :totalShow="''" :showLegends="false"></WaterfallBarComponent>
      </div>
    </div>
  </div>
  <div class="row d-flex">
    <div class="col-md-12 d-flex">
      <div class="detailed-text-container">
        <div v-html="textToEditorLast"></div>
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
import { defineComponent, PropType, reactive, ref, toRefs } from 'vue'
import { Editor } from '@progress/kendo-vue-editor';
import { basicTools } from '../data/editor';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import CashFlowOpportunity from './CashFlowOpportunity.vue'
import WaterfallBarComponent from './WaterfallBarComponent.vue'
import BarsWrapper from '@/modules/components/BarsWrapper.vue'
import { SustancialAmountType } from '../types';

export default defineComponent({
    name: 'SustancialAmount',
    components: {
        Editor, Tooltip, CashFlowOpportunity, BarsWrapper,WaterfallBarComponent
    },
    props: {
        editionMode: { type: Boolean, required: false, default: false },
        objectContent: { type: Object as PropType<SustancialAmountType>, required: true }
    },
    emits: ['change-content'],
    setup(props, { emit }) {
        interface DataInterface {
            showModalEdit: boolean,
            objData: SustancialAmountType
            objDataInitial: SustancialAmountType
        }

        const data: DataInterface = reactive<DataInterface>({
            showModalEdit: false,
            objData: ObjectUtils.cloneDeep(props.objectContent),
            objDataInitial: ObjectUtils.cloneDeep(props.objectContent)
        })

        const textDefaultToShowFirst = ref(props.objectContent.textFirst)
        const textToEditorFirst = ref(ObjectUtils.cloneDeep(textDefaultToShowFirst.value))
        const textDefaultToShowLast = ref(props.objectContent.textLast)
        const textToEditorLast = ref(ObjectUtils.cloneDeep(textDefaultToShowLast.value))
        const onEditorChangeFirst = (event: any) => {
            textToEditorFirst.value = event.html;
        };
        const onEditorChangeLast = (event: any) => {
            textToEditorLast.value = event.html;
        };
        const showModal = () => {
            data.showModalEdit = true
        }
        const saveText = () => {
            data.objData.textFirst = textToEditorFirst.value
            data.objData.textLast = textToEditorLast.value
            emit('change-content', data.objData, { obj: data.objData, textFirst: textToEditorFirst.value, textLast: textToEditorLast.value }, 'sustancialAmount')
            data.showModalEdit = false
        }
        function cancelEdition() {
            data.showModalEdit = false
            textToEditorFirst.value = ObjectUtils.cloneDeep(textDefaultToShowFirst.value)
            textToEditorLast.value = ObjectUtils.cloneDeep(textDefaultToShowLast.value)
        }
        return {
            ...toRefs(data), showModal, cancelEdition, saveText, textToEditorFirst, textToEditorLast, onEditorChangeFirst, onEditorChangeLast, basicTools
        }
    }
})
</script>

<style scoped lang="scss">
@use "../../../resources/assets/styles/variables/colors" as *;
@use "sass:map";

.detailed-text-container {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
}
.card-text-content {
    color: map.get($colors, "primary-500");
    font-size: 2.5rem;
}
.cashFlow-card-inside{
  background-color: #f9efef;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
}
</style>
