<template>
<div class="row w-100 mt-4">
  <CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
  <div class="col-12 add-button-section d-flex end-justify-content gap-2">
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="createValueProposition"><span id="add-button-for-value-proposition">{{ 'Create New' }}</span></button>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent, toRefs, reactive, computed, ref } from 'vue'
import { images } from '@/resources/assets/assets'
import { ObjectUtils, StringUtils } from "@/utils";
import { useAppStore } from '@/stores/app';
import { useEntityCardStore } from '@/stores/entityCard';
import { useValuePropositionStore } from '@/stores/valueProposition'
import * as Validator from "@/utils/validators";
import Dropdown from "@/modules/components/dropdown/Dropdown.vue";
import { CalculumLoading } from '@ada/design-system'
import { useSpendFile, useCompany } from '@/composables';
import { useToast } from 'vue-toastification'
import { useI18n } from 'vue-i18n';

export default defineComponent({
    name: 'ValuePropositionForm',
    components: {
        Dropdown,
        CalculumLoading
    },
    emits: ['refresh-vp-list'],
    setup(props: any,  { emit }) {
        const appStore = useAppStore()
        const entityCardStore = useEntityCardStore();
        const valuePropositionStore = useValuePropositionStore()
        const logoValueProposition = ref(null)
        const toast = useToast();
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

        const { spendFileVersionActiveIri } = useSpendFile()
        const { companyActiveName } = useCompany()
        

        interface DataInterface {            
            companyLogoUrl: string,
            valuePropositionName: string,
            valuePropositionCurrency: string,
            valuePropositionEmailForInvitations: string,
            allowedMimeTypes: Array<string>,
            validationfields: boolean,
            errorEmails: boolean,
            expirationDays: number | null,
            errorDaysInvitation: boolean,
            currencyList: Array<any>,
            loading: boolean
        }
        
        const data = reactive<DataInterface>({
            companyLogoUrl: '',
            valuePropositionName: '',
            valuePropositionCurrency: 'USD',
            valuePropositionEmailForInvitations: '',
            allowedMimeTypes:[
            'image/png',
            'image/jpeg'
            ],
            validationfields: false,
            errorEmails: false,
            expirationDays: null,
            errorDaysInvitation: false,
            currencyList: [],
            loading: false
        });

        const showLogo = computed(() => {
            if (logoValueProposition.value !== null && logoValueProposition.value !== undefined) {
                return URL.createObjectURL(logoValueProposition.value)
            } else if (data.companyLogoUrl) {
                return data.companyLogoUrl
            } else {
                return null
            }
        })

        function onClickModifyLogo () {
            const fileDOM: any | null = document.getElementById('logo-value-proposition')
            if (fileDOM !== null) {
                fileDOM.click()
            }
        }


        async function onChangeLogo (event: any) {
            logoValueProposition.value = event.target.files[0]
            if (logoValueProposition.value) {
                const isValid = await ObjectUtils.validateFileType(logoValueProposition.value, data.allowedMimeTypes);
                if (!isValid) {                
                toast.error("Invalid file type");
                logoValueProposition.value = null
                return
                }
            }
        }

        function checkFields() {
            if  (                 
                (data.valuePropositionName === null || StringUtils.isNullUndefinedOrEmpty(data.valuePropositionName)) ||
                (data.valuePropositionCurrency === null || StringUtils.isNullUndefinedOrEmpty(data.valuePropositionCurrency)) ||
                (data.expirationDays === null || isNaN(data.expirationDays))
            ) {
                data.validationfields = false
            } else {
                if ( !StringUtils.isNullUndefinedOrEmpty(data.valuePropositionEmailForInvitations) ){
                    const emailList = StringUtils.getEmails(data.valuePropositionEmailForInvitations)
                    data.errorEmails = emailList.some((email: any) => !Validator.isValidEmail(email));
                    data.validationfields = !data.errorEmails
                } else {
                    data.validationfields = true
                }

                if (!isNaN(data.expirationDays) && ( data.expirationDays < 1 || data.expirationDays > 30 )   ) {                    
                    data.errorDaysInvitation = true                    
                } else {
                    data.errorDaysInvitation = false
                }

            }
        }

        const disabledSendbutton = computed (() => {
            return !data.errorDaysInvitation && data.validationfields
        })

        function selectCurrency(program: { key: string; value: string }) {
            data.valuePropositionCurrency = program.key;            
        }
        
        function createValueProposition() {
            data.loading = true
            const valuePropName=`Value Proposition New ${valuePropositionStore.getCantValuesPropositions()+1}`
            const params = {
                activeProgramDefaultId: entityCardStore.getSelectedProgram,
                valuePropositionName: valuePropName,                
                valuePropositionCurrency: appStore.getCurrencyTo,
                expirationDays: 15,
                spendFileVersion: spendFileVersionActiveIri.value,
                callbackSuccess: (callbackSuccessData: any) => {
                    const vpId = StringUtils.removeIRI(callbackSuccessData.data['@id'])
                    const url = `/home/value-proposition-internal/${vpId}`
                    window.open(url, '_blank')
                    data.loading = false
                    emit('refresh-vp-list')
                    toast.success(translate.t('global.successSavingValueProposition'));
                },
                callbackError: () => {
                    toast.error(translate.t('global.errorSavingData'));
                    emit('refresh-vp-list')                    
                    data.loading = false
                },
            };
            valuePropositionStore.createValueProposition(params);
        }


        return {
            ...toRefs(data),
            showLogo,
            images,
            onChangeLogo,
            onClickModifyLogo,
            checkFields,
            disabledSendbutton,
            selectCurrency,
            createValueProposition
        };
    }


})
</script>