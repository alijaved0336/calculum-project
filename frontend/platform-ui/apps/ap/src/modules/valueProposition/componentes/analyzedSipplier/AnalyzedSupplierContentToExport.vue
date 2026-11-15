<template>
<div class="content-editor">
  <div class="row mb-3">
    <div class="col-md-7 d-flex flex-column">
      <div class="row mb-3">
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1" :class="isExportingToPdf ? 'pdf-export-mode' : ''">
            <div class="img-logo-container"><img class="img-logo" v-if="showLogo && objData.logo" :src="urlImage" @error="handleErrorImage"/>
              <NoCompanyLogo v-else :letter="hasCompanyLogo"></NoCompanyLogo>
            </div>
          </div>
        </div>
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1" :class="isExportingToPdf ? 'pdf-export-mode' : ''">
            <CompanyDetilsComponent :valueData="objData.companyDetails"></CompanyDetilsComponent>
          </div>
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1" :class="isExportingToPdf ? 'pdf-export-mode' : ''">
            <YourLeverageBoxComponent :title="objData.spendVolume.title" :valueData="objData.spendVolume.data"></YourLeverageBoxComponent>
          </div>
        </div>
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1" :class="isExportingToPdf ? 'pdf-export-mode' : ''">
            <YourLeverageBoxComponent :title="objData.yourLeverage.title" :valueData="objData.yourLeverage.data"></YourLeverageBoxComponent>
          </div>
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1" :class="isExportingToPdf ? 'pdf-export-mode' : ''">
            <CredtRatingComponent :objData="objData.creditRating"></CredtRatingComponent>
          </div>
        </div>
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1" :class="isExportingToPdf ? 'pdf-export-mode' : ''">
            <SupplierCostBoxComponent :objData="objData.supplierCostFinancing"></SupplierCostBoxComponent>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-md-12 d-flex flex-column">
          <div class="row mb-3">
            <div class="col-md-6 d-flex flex-column">
              <div class="container-opportunity-payment flex-grow-1">
                <InfoColorsComponent :objData="objData.paymentTermOpp" :type="'paymentTermOpp'"></InfoColorsComponent>
              </div>
            </div>
            <div class="col-md-6 d-flex flex-column">
              <div class="container-opportunity-cash flex-grow-1">
                <InfoColorsComponent :objData="objData.cashFOpp" :type="'cashFOpp'"></InfoColorsComponent>
              </div>
            </div>
          </div>
          <div class="row d-flex flex-grow-1">
            <div class="col-md-12 d-flex flex-column">
              <div class="detailed-text-container flex-grow-1" :class="isExportingToPdf ? 'pdf-export-mode' : ''">
                <PaymentTermsComponent :objData="objData.paymentTerms"></PaymentTermsComponent>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-5 d-flex flex-column">
      <div class="detailed-text-container mb-3" :class="isExportingToPdf ? 'pdf-export-mode' : ''">
        <div v-html="textToEditor"></div>
      </div>
      <div class="detailed-text-container mb-3 adabot-details-pdf" :class="showStandards.marginText + (isExportingToPdf ? ' pdf-export-mode' : '')">
        <div v-html="textToEditorSecond"></div>
      </div>
      <div class="standard-container mb-3" v-if="hasSupplierTerms" :class="showStandards.marginSupplier">
        <StandardComponent :objData="objData.standard.supplier" :isExportingToPdf="isExportingToPdf"></StandardComponent>
      </div>
      <div class="peer-group-container mb-3" v-if="hasPeerGroupTerms">
        <StandardComponent :objData="objData.standard.peerGroup" :isExportingToPdf="isExportingToPdf"></StandardComponent>
      </div>
      <div class="detailed-text-container mb-3">
        <div v-html="$t('global.vpDisclaimer')"></div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { ObjectUtils } from '@/utils';
import { computed, defineComponent, PropType, reactive, ref, toRefs } from 'vue';
import { AnalyzedSupplierType } from '../../types';
import EntityCardTextArc from '@/modules/home/entityCard/components/EntityCardTextArc.vue';
import SupplierCostBoxComponent from './boxes/SupplierCostBoxComponent.vue';
import YourLeverageBoxComponent from './boxes/YourLeverageBoxComponent.vue';
import GeneralyzedInfoBoxComponent from './boxes/GeneralyzedInfoBoxComponent.vue';
import BarsWrapper from '@/modules/components/BarsWrapper.vue';
import { Editor } from '@progress/kendo-vue-editor';
import { Tooltip } from '@progress/kendo-vue-tooltip';
import CredtRatingComponent from './boxes/CredtRatingComponent.vue';
import InfoColorsComponent from './boxes/InfoColorsComponent.vue';
import InfoStandardBoxComponent from './boxes/InfoStandardBoxComponent.vue';
import StandardComponent from './StandardComponent.vue';
import EntityTermsChartLine from '@/modules/home/entityCard/components/opportunity/EntityTermsChartLine.vue';
import PaymentTermsComponent from './PaymentTermsComponent.vue';
import CompanyDetilsComponent from './boxes/CompanyDetilsComponent.vue';
import NoCompanyLogo from './boxes/NoCompanyLogo.vue';
import { getMediaUrl } from '@/services/media/mediaActions';
export default defineComponent({
    name: 'AnalyzedSupplierContentToExport',
    components: {
        EntityCardTextArc, Editor, Tooltip, CredtRatingComponent, InfoColorsComponent,
        SupplierCostBoxComponent, YourLeverageBoxComponent, GeneralyzedInfoBoxComponent, BarsWrapper,
        InfoStandardBoxComponent, PaymentTermsComponent, NoCompanyLogo,
        StandardComponent,
        EntityTermsChartLine,
        CompanyDetilsComponent
    },
    props: {
        editionMode: { type: Boolean, required: false, default: false },
        objectContent: { type: Object as PropType<AnalyzedSupplierType>, required: true },
        isExportingToPdf: { type: Boolean, required: false, default: false },
        supplierName: { type: String, required: false, default: '' },
    },
    emits: ['change-content'],
    setup(props, { emit }) {
        
        interface DataInterface {
            objData: AnalyzedSupplierType            
        }
        const data: DataInterface = reactive<DataInterface>({            
            objData: ObjectUtils.cloneDeep(props.objectContent)            
        })
        const textDefaultToShow = ref<string>(data.objData.textFirst)
        const textToEditor = ref(ObjectUtils.cloneDeep(textDefaultToShow.value))

        const showLogo = ref(true)

        const textDefaultToShowSecond = ref<string>(data.objData.textSecond)
        const textToEditorSecond = ref(ObjectUtils.cloneDeep(textDefaultToShowSecond.value))
        const onEditorChange = (event: any) => {
            textToEditor.value = event.html;
        };

        const hasCompanyLogo = computed(() => {

            if (!props.supplierName || props.supplierName.length === 0) {
                return '-';
            }
            return props.supplierName.charAt(0);
           
        })
        const showStandards = computed<{
            marginText: string
            marginSupplier: string
        }>(() => {
            const existSomeStandard = data.objData.standard.supplier.value.terms || data.objData.standard.peerGroup.value.terms
            const existSupplierStandard = existSomeStandard && data.objData.standard.peerGroup.value.terms
            const show = {
                marginText: existSomeStandard ? 'mb-3' : '',
                marginSupplier: existSupplierStandard ? 'mb-3' : ''
            }
            return show
        })
        const urlImage = computed(() => {
            let logo = data.objData.logo            
            return getMediaUrl(logo)
        })

        const hasSupplierTerms = computed(() => {
            return data.objData?.standard?.supplier?.value?.terms !== undefined && 
                   data.objData?.standard?.supplier?.value?.terms !== null
        })
        

        const hasPeerGroupTerms = computed(() => {
            return data.objData?.standard?.peerGroup?.value?.terms !== undefined && 
                   data.objData?.standard?.peerGroup?.value?.terms !== null
        })


        function handleErrorImage(event: any) {
            showLogo.value = false;
        }


        return {
            ...toRefs(data), textToEditor, onEditorChange, textToEditorSecond, urlImage, hasCompanyLogo, showStandards, showLogo, handleErrorImage, hasSupplierTerms, hasPeerGroupTerms
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

.container-opportunity-payment {
    background-color: $color-primary-600;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;

}

.container-opportunity-cash {
    background-color: #475467;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
}

.img-logo {
    height: 100%;
    width: auto;
    max-width: 100%;
    object-fit: contain;
}

.img-logo-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
}
</style>
