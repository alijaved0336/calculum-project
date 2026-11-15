<template>
<div class="card shadow-none" :class="loading ? 'bg-blur' : ''">
  <div class="card-body d-flex flex-column" :class="useFeatureCreditRating ? 'justify-content-between' : '' ">
    <div class="row">
      <div class="col-12 d-flex justify-content-between">
        <h5 class="mb-0 text-base text-capitalize font-bold">{{ title }}
          <CalculumTooltipIcon :infoText="tooltipText" :advancedTooltipClass="true" :uniqueIdentifier="uniqueIdentifier" :keyPopOver="keyPopOver"></CalculumTooltipIcon><i class="fa-solid fa-pencil text-sm cursor-pointer ml-1" v-if="showEditOption" :id="uniqueIdentifier + '-pencil'" @click.stop="$emit('openEdit')"></i>
        </h5>
      </div>
    </div>
    <div class="row mt-2" v-if="!useFeatureCreditRating">
      <div class="col-12 d-flex flex-column">
        <CreditScoreTeaser></CreditScoreTeaser><span class="text-gray-500 text-sm font-medium">{{ $t('global.InterestedInTheCreditRating') }}</span>
      </div>
    </div>
    <div class="row" v-if="useFeatureCreditRating">
      <div class="col">
        <div class="d-flex mr-2" v-if="showCountryAndFlag"><span class="mr-2 text-capitalize text-gray-500">{{ country.name }}</span><span class="flag-country my-auto mr-1" :style="`background-image: url('${ country.flagImgSrc }') !important;`"></span></div>
        <div class="d-flex align-items-center justify-content-between"><span class="text-4xl font-bold grade-big-letter" id="letterGradeValue">{{ letterGrade }}</span>
          <CalculumArcCircle :level="level" :grade-level-text="gradeLevelText" :level-color="levelColorByLevel" :width="arcCircleWidth" :height="arcCircleHeight" :radius="arcCircleRadius"></CalculumArcCircle>
        </div>
      </div>
    </div>
    <div class="row" v-if="useFeatureCreditRating">
      <div class="col">
        <div class="d-flex align-items-center justify-content-between"><span class="font-md font-semibold text-gray-400" id="source-entity" v-if="isInternalOverride || source?.toLowerCase() === 'internal'">{{ $t('home.entityCard.details.estimatedSource') }}</span></div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang='ts'>
import { computed, defineComponent } from 'vue'
import { getLevelColor } from '@/utils'
import CalculumArcCircle from '@/modules/components/charts/CalculumArcCircle.vue'
import { CalculumLoading } from '@ada/design-system'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import InformationCircleSvg from '@/resources/assets/images/icons/svg/nav/InformationCircleSvg.vue'
import CreditScoreTeaser from "@/resources/assets/images/icons/iconCreditScoreTeaser.vue";

export default defineComponent({
  name: 'EntityCardTextArc',
  components: {
    CalculumLoading,
    CalculumTooltipIcon,
    CalculumArcCircle,
    InformationCircleSvg,
    CreditScoreTeaser
  },  
  //- gradeLevelText: e.g. "Medium"
  //- letterGrade: e.g. "BB+"
  //- noRatingForSupplier: e.g. false
  //- source: e.g. "Internal"
  //- title: e.g. "Credit Rating"
  //- tooltipText: e.g. "Credit Rating Tooltip"
  props: {
    gradeLevelText: { type: String, required: false, default: '' },  // e.g. "Medium"
    letterGrade: { type: String, required: false, default: '' },    // e.g. "BB+"
    level: { type: Number, required: false, default: 0 },  // e.g. 2
    loading: { type: Boolean, required: false, default: false },  // e.g. false
    noRatingForSupplier: { type: Boolean, required: false, default: false },  // ? - Remove this
    showDetails: { type: Boolean, required: false, default: false },  // e.g. false
    showCountryAndFlag: { type: Boolean, required: false, default: false },  // e.g. false
    source: { type: String, required: false, default: '' },  // e.g. "Internal"
    title: { type: String, required: true },  // e.g. "Credit Rating"
    tooltipText: { type: String, required: false, default: '' },  // e.g. "Credit Rating Tooltip"
    arcCircleWidth: { type: Number, required: false },
    arcCircleHeight: { type: Number, required: false },
    arcCircleRadius: { type: Number, required: false },
    country: { type: Object, required: false, default: { name: '', flagImgSrc: '' } },  // e.g. {name: "United States", flagImgSrc: "https://restcountries.eu/data/usa.svg"}
    uniqueIdentifier : { type: String, required: false, default: '' } ,
    keyPopOver: { type: String, required: false, default: '' },
    useFeatureCreditRating: { type: Boolean, required: false, default: true },
    showEditOption: { type: Boolean, required: false, default: false },
    isInternalOverride: { type: Boolean, required: false, default: false },
  },
  emits: ['showModalDetails', 'openEdit'],
  setup(props, emits) {
    return {
      emits,
      levelColorByLevel: computed(() => {
        return getLevelColor(props.level)
      })
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

// ? - Remove this
.icon-svg {
  height: 15px;
}

// ? - Remove this when all views are updated
.card {
  padding: 0;
  margin-bottom: 16px;
}

.card-body {
  padding: 24px;
}
</style>
