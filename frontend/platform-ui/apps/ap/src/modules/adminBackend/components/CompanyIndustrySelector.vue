<template>
<div class="row mt-4">
  <div class="col-12"><span class="text-gray-600 text-base font-semibold">{{ $t('welcome.components.welcomeAddIndustry.selectIndustry') }}</span>
    <div class="form-group">
      <label for="company-activity-industry-first-level">
        <select class="form-control required" v-model="industryFirstLevel" @change="getSubIndustries('first')" name="company-activity-industry-first-level" id="company-activity-industry-first-level">
          <option value="null" hidden="hidden" selected="selected">{{ $t('welcomeCompanyProfile.form.activityPlaceholder') }}</option>
          <option v-for="industry in industries" :value="industry">{{ industry.name }}</option>
        </select><span>{{ $t('welcomeCompanyProfile.form.activity') }} {{ $t('welcomeCompanyProfile.form.firstLevel') }}<sup>*</sup></span>
      </label>
    </div>
  </div>
</div>
<div class="row d-flex justify-content-center" v-if="loadingSecondLevel">
  <div class="spinner-border my-3" role="status" aria-hidden="true" style="color: #6c757d;"></div>
</div>
<div class="row" v-if="industryFirstLevel !== null && industryFirstLevel.childIndustriesCount > 0 && secondLevelIndustries.length > 0">
  <div class="col-12">
    <div class="form-group">
      <label for="company-activity-industry-second-level">
        <select class="form-control required" v-model="industrySecondLevel" @change="getSubIndustries('second')" name="company-activity-industry-second-level" id="company-activity-industry-second-level">
          <option value="null" hidden="hidden" selected="selected">{{ $t('welcomeCompanyProfile.form.activityPlaceholder') }}</option>
          <option v-for="industry in secondLevelIndustries" :value="industry">{{ industry['name'] }}</option>
        </select><span>{{ $t('welcomeCompanyProfile.form.activity') }}  {{ $t('welcomeCompanyProfile.form.secondLevel') }}<sup>*</sup></span>
      </label>
    </div>
  </div>
</div>
<div class="row d-flex justify-content-center" v-if="loadingThirdLevel">
  <div class="spinner-border my-3" role="status" aria-hidden="true" style="color: #6c757d;"></div>
</div>
<div class="row" v-if="industrySecondLevel !== null && industrySecondLevel.childIndustriesCount > 0 && thirdLevelIndustries.length > 0">
  <div class="col-12">
    <div class="form-group">
      <label for="company-activity-industry-third-level">
        <select class="form-control required" v-model="industryThirdLevel" name="company-activity-industry-third-level" @change="setIndustry('third',industryThirdLevel['@id'],0)" id="company-activity-industry-third-level">
          <option value="null" hidden="hidden" selected="selected">{{ $t('welcomeCompanyProfile.form.activityPlaceholder') }}</option>
          <option v-for="industry in thirdLevelIndustries" :value="industry">{{ industry['name'] }}</option>
        </select><span>{{ $t('welcomeCompanyProfile.form.activity') }}  {{ $t('welcomeCompanyProfile.form.thirdLevel') }}<sup>*</sup></span>
      </label>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import * as Utils from '@/services/app/api'
import * as App from '@/services/app/api'
import { ref, reactive, toRefs, computed, defineComponent } from 'vue'
import { useAppStore } from '@/stores/app'
import { fontIcons } from '@/resources/assets/assets'

export default defineComponent({
  name: 'CompanyIndustrySelector',
  components: { },
  emits: {
    addIndustry: Object
  },
  setup (props, { emit }) {
    const appStore = useAppStore()
    const industryFirstLevel = ref<any | null>(null)
    const industrySecondLevel = ref<any | null>(null)
    const industryThirdLevel = ref<any | null>(null)
    const industriesData = reactive({
      secondLevelIndustries: [] as any[],
      loadingSecondLevel: false,
      thirdLevelIndustries: [] as any[],
      loadingThirdLevel: false,
      industries: [] as any[]
    })

    getIndustries()
    function getIndustries() {
      const params = {
        callbackSuccess: (callbackSuccessData: any) => {
          industriesData.industries = callbackSuccessData
        },
        callbackError: () => {
          
        }
      }
      // Load industries directly from API since they're not in the store anymore
      App.getIndustries().then(response => {
        if (response.success) {
          params.callbackSuccess(response.data['hydra:member'])
        } else {
          params.callbackError()
        }
      }).catch(() => {
        params.callbackError()
      })
    }

    function getSubIndustries (level: string) {
      let industryId: any = null
      if (level === 'first' &&
        industryFirstLevel.value !== null) {
        industryId = industryFirstLevel.value['@id']
        industriesData.loadingSecondLevel = true
      }
      if (level === 'second' && industrySecondLevel.value !== null) {
        industriesData.loadingThirdLevel = true
        industryId = industrySecondLevel.value['@id']
      }
      const response = Utils.getSubIndustries(industryId)
      response.then((successResponse) => {

        const newIndustries = successResponse.data['hydra:member']
        setIndustry(level,industryId,newIndustries.length)

        if (level === 'first') {
          industriesData.loadingSecondLevel = false
          industriesData.secondLevelIndustries = successResponse.data['hydra:member']
          industrySecondLevel.value = null
          industryThirdLevel.value = null          
        } else if (level === 'second') {
          industriesData.loadingThirdLevel = false
          industriesData.thirdLevelIndustries = successResponse.data['hydra:member']
          industryThirdLevel.value = null          
        }
      })
    }


    function setIndustry(level: string, industry: string, subcategories: number) {
      switch(level) {
        case 'first':
          if (subcategories > 0) {
            emit('addIndustry', null)
          } else {
            emit('addIndustry', industry)
          }
          break;        
        case 'second':
          if (subcategories > 0) {
            emit('addIndustry', null)
          } else {
            emit('addIndustry', industry)
          }
          break;
        case 'third':
          emit('addIndustry', industry)
          break;
        default:
          emit('addIndustry', null)
          break;
      }
    }

    
    return {
      fontIcons,
      ...toRefs(industriesData),
      industryFirstLevel,
      industrySecondLevel,
      industryThirdLevel,    
      getSubIndustries,
      setIndustry
    }
  }
})
</script>
