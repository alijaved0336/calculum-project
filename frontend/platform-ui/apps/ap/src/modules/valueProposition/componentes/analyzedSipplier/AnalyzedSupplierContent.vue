<template>
<div class="component-editor-container" v-if="showModalEdit" @click.self="cancelEdition">
  <div class="d-flex component-editor-body">
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons"><span class="cursor-pointer" @click="cancelEdition"><i class="fa-solid fa-xmark"></i></span></div>
      <div class="col-6">
        <div class="d-flex gap-2"><span class="upload-files-calculum mt-4" @click="modyfyImage">{{ $t('global.chooseAFile') }}<br/>({{ $t('global.maxUploadSize', { size: maxImageMb }) }})
            <div class="icon"><i class="fa-solid fa-upload"></i></div></span></div>
        <input id="logoCompany" type="file" accept=".jpg,.png" name="logo-value-proposition" style="display: none" @change="onChangeLogo"/>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="companyUrl">
            <input class="form-control required" id="companyUrl" type="text" name="companyUrl" v-model="objData.companyDetails.url" placeholder="Set the URL"/><span>{{ 'URL' }}</span>
          </label>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="companyPhone">
            <input class="form-control required" id="companyPhone" type="text" name="companyPhone" v-model="objData.companyDetails.phone" placeholder="Set the phone"/><span>{{ 'Phone' }}</span>
          </label>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="companyCountry">
            <input class="form-control required" id="companyCountry" type="text" name="companyCountry" v-model="objData.companyDetails.country" placeholder="Set the country"/><span>{{ 'Country' }}</span>
          </label>
        </div>
      </div>
      <div class="col-12 mt-4">
        <Editor v-model="textToEditor" :tools="basicTools" :default-content="textToEditor" :content-style="{ height: '25vh' }" @change="onEditorChange"></Editor>
      </div>
      <div class="col-12 mt-4">
        <Editor v-model="textToEditorSecond" :tools="basicTools" :default-content="textToEditorSecond" :content-style="{ height: '25vh' }" @change="onEditorChangeSecond"></Editor>
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
<div class="content-editor more-margin" v-if="objData.visibility || editionMode">
  <div class="row mb-3">
    <div class="col-md-7 d-flex flex-column">
      <div class="row mb-3 flex-grow-1">
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1">
            <div class="img-logo-container"><img class="img-logo" v-if="objData.logo" :src="urlImage"/>
              <NoCompanyLogo v-else :letter="hasCompanyLogo"></NoCompanyLogo>
            </div>
          </div>
        </div>
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1">
            <CompanyDetilsComponent :valueData="objData.companyDetails"></CompanyDetilsComponent>
          </div>
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1">
            <YourLeverageBoxComponent :title="objData.spendVolume.title" :valueData="objData.spendVolume.data"></YourLeverageBoxComponent>
          </div>
        </div>
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1">
            <YourLeverageBoxComponent :title="objData.yourLeverage.title" :valueData="objData.yourLeverage.data"></YourLeverageBoxComponent>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1">
            <CredtRatingComponent :objData="objData.creditRating"></CredtRatingComponent>
          </div>
        </div>
        <div class="col-md-6 d-flex flex-column">
          <div class="detailed-text-container flex-grow-1">
            <SupplierCostBoxComponent :objData="objData.supplierCostFinancing"></SupplierCostBoxComponent>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-5 d-flex">
      <div class="detailed-text-container flex-grow-1">
        <div v-html="textToEditor"></div>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-md-7 d-flex flex-column">
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
          <div class="detailed-text-container flex-grow-1">
            <PaymentTermsComponent :objData="objData.paymentTerms" :onSCF="objData.onSCF"></PaymentTermsComponent>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-5 d-flex flex-column">
      <div class="detailed-text-container flex-grow-1" :class="showStandards.marginText">
        <div v-html="textToEditorSecond"></div>
      </div>
      <div class="standard-container flex-grow-1" v-if="hasSupplierTerms" :class="showStandards.marginSupplier">
        <StandardComponent :objData="objData.standard.supplier"></StandardComponent>
      </div>
      <div class="peer-group-container flex-grow-1" v-if="hasPeerGroupTerms">
        <StandardComponent :objData="objData.standard.peerGroup"></StandardComponent>
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
import { ObjectUtils } from '@/utils';
import { computed, defineComponent, PropType, reactive, ref, toRefs } from 'vue';
import { AnalyzedSupplierType } from '../../types';
import { basicTools } from '../../data/editor';
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
import { useToast } from 'vue-toastification'
import { useI18n } from 'vue-i18n'
import { useValuePropositionStore } from '@/stores/valueProposition'
import { getMediaUrl } from '@/services/media/mediaActions';
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from '@/utils/uploadLimits';
export default defineComponent({
    name: 'AnalyzedSupplierContent',
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
    },
    emits: ['change-content'],
    setup(props, { emit }) {
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
        const toast = useToast()
        const valuePropositionStore = useValuePropositionStore()
        interface DataInterface {
            allowedMimeTypes: Array<string>,
            loading: boolean,
            maxFileSize: number
            showModalEdit: boolean,
            objData: AnalyzedSupplierType
            objDataInitial: AnalyzedSupplierType
        }
        const data: DataInterface = reactive<DataInterface>({
            allowedMimeTypes: [
                'image/png',
                'image/jpeg'
            ],
            loading: false,
            maxFileSize: MAX_IMAGE_BYTES,
            showModalEdit: false,
            objData: ObjectUtils.cloneDeep(props.objectContent),
            objDataInitial: ObjectUtils.cloneDeep(props.objectContent),
        })
        const textDefaultToShow = ref<string>(data.objData.textFirst)
        const textToEditor = ref(ObjectUtils.cloneDeep(textDefaultToShow.value))

        const textDefaultToShowSecond = ref<string>(data.objData.textSecond)
        const textToEditorSecond = ref(ObjectUtils.cloneDeep(textDefaultToShowSecond.value))
        const onEditorChange = (event: any) => {
            textToEditor.value = event.html;
        };

        const onEditorChangeSecond = (event: any) => {
            textToEditorSecond.value = event.html;
        };

        const showModal = () => {
            data.showModalEdit = true
        }

        const cancelEdition = () => {
            data.showModalEdit = false
            data.objData = ObjectUtils.cloneDeep(data.objDataInitial)
        }

        const saveText = () => {
            data.objData.textFirst = textToEditor.value
            data.objData.textSecond = textToEditorSecond.value
            emit('change-content', data.objData, { obj: data.objData }, 'analyzedSupplier')
            data.showModalEdit = false
        }


        const imageValue = ref(null)
        function modyfyImage() {
            const fileDOM: any | null = document.getElementById('logoCompany')
            if (fileDOM !== null) {
                fileDOM.click()
            }
        }
        async function onChangeLogo(event: any) {
            imageValue.value = event.target.files[0]
            const file = event.target.files[0]
            if (imageValue.value) {
                const isValid = await ObjectUtils.validateFileType(imageValue.value, data.allowedMimeTypes);
                if (!isValid) {
                    imageValue.value = null
                    return
                }

                if (file.size > data.maxFileSize) {
                    toast.error(translate.t('global.fileTooLargeMb', { size: MAX_IMAGE_MB }))
                    return
                }


                data.loading = true
                const params = {
                    file: imageValue.value,
                    callbackSuccess: (callbackSuccessData: any) => {
                        data.loading = false
                        data.objData.logo = callbackSuccessData
                        emit('change-content', data.objData, { obj: data.objData }, 'analyzedSupplier')
                    },
                    callbackError: () => {
                        data.loading = false
                    }
                }
                valuePropositionStore.postUploadImagesValueProposition(params)
            }
        }
        const hasCompanyLogo = computed(() => {
            const match = data.objData.supplierName.match(/Analyzed Supplier Example\s*([A-Za-z])/);
            return match ? match[1] : '?'
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
            logo = getMediaUrl(logo)
            return logo
        })

        const hasSupplierTerms = computed(() => {
            return data.objData?.standard?.supplier?.value?.terms !== undefined && 
                   data.objData?.standard?.supplier?.value?.terms !== null
        })
        

        const hasPeerGroupTerms = computed(() => {
            return data.objData?.standard?.peerGroup?.value?.terms !== undefined && 
                   data.objData?.standard?.peerGroup?.value?.terms !== null
        })


        return {
            ...toRefs(data), showModal, cancelEdition, saveText, textToEditor, onEditorChange, textToEditorSecond, onEditorChangeSecond, basicTools, onChangeLogo, modyfyImage, urlImage, hasCompanyLogo, showStandards, hasSupplierTerms, hasPeerGroupTerms, maxImageMb: MAX_IMAGE_MB
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
.more-margin{
    margin-bottom: 3.5rem;
}
</style>
