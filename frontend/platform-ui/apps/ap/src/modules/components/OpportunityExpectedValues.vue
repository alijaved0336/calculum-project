<template>
<div class="d-flex flex-column values-container">
  <div class="title-section text-center" v-if="title">
    <h5 class="text-base font-bold">{{ title }}
      <CalculumTooltipIcon v-if="titleTooltip" :infoText="titleTooltip"></CalculumTooltipIcon>
    </h5>
  </div>
  <div class="d-flex flex-column text-center body-section" :class="showOpportunityExpectedOpportunity === 'OPPORTUNITY_AND_EXPECTED' || showExpectedForVcard ? '' : 'body-section-no-rebate'"><span class="mb-1 min-h-4 mx-auto text-gray-500 text-xs"> {{ topTitle }}</span>
    <div class="d-flex horizontal-aligments-center" v-if="showSkeleton || activeSkeleton">
      <SkeletonRectangle :size="'sm'"></SkeletonRectangle>
    </div>
    <p class="font-semibold text-gray-700" v-else :class=" !StringUtils.isNullUndefinedOrEmpty(opportunity) ? 'text-5xl opportunity-'+type : 'na-font-size'">{{  StringUtils.isNullUndefinedOrEmpty(opportunity) ? 'N/A' : opportunity }}</p>
  </div>
  <div class="d-flex flex-column text-center footer-section expected-section-values" v-if="showOpportunityExpectedOpportunity === 'OPPORTUNITY_AND_EXPECTED' || showExpectedForVcard"><span class="mb-1 min-h-4 mx-auto text-gray-500 text-xs">{{ bottomTitle }}</span>
    <div class="d-flex horizontal-aligments-center" v-if="showSkeleton || activeSkeleton">
      <SkeletonRectangle :size="'sm'"></SkeletonRectangle>
    </div><span class="mx-auto font-semibold text-gray-700" v-else :class=" !StringUtils.isNullUndefinedOrEmpty(expected) ? 'text-xl' : 'na-font-size'">{{  StringUtils.isNullUndefinedOrEmpty(expected) ? 'N/A' : expected }}  </span>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent, computed } from 'vue'
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import { useI18n } from 'vue-i18n';
import { useSpendFile } from '@/composables';
import { StringUtils } from '@/utils';

export default defineComponent({
    name: 'OpportunityExpectedValues',
    components: {
        CalculumTooltipIcon,
        SkeletonRectangle
    },
    props: {
        showSkeleton: { type: Boolean, default: false },
        activeSkeleton: { type: Boolean, default: false },
        customTopTitle: { type: String, default: '' },
        customBottomTitle: { type: String, default: '' },
        title: { type: String, default: '' },
        titleTooltip: { type: String, default: '' },
        opportunity: { type: String, default: '' },
        expected: { type: String, default: '' },        
        type: { type: String, default: '' },

    },
    emits: [],
    setup( props, { emit } ) {
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

        const { showOpportunityExpectedOpportunity } = useSpendFile()
        
        /**
         * Top and bottom titles
         */
        const topTitle = computed(() => {
            return props.customTopTitle && props.customTopTitle.length > 0 ? props.customTopTitle : translate.t('global.opportunity')
        })

        const bottomTitle = computed(() => {
            return props.customBottomTitle && props.customBottomTitle.length > 0 ? props.customBottomTitle : translate.t('global.expected')
        })

        const showExpectedForVcard = computed(() => {
            return props.type ===  'vCard-cashFlow' || props.type === 'vCard-rebate' || props.type === 'vCard-economicProfit'
        })

        return {
            bottomTitle,
            topTitle,
            showOpportunityExpectedOpportunity,
            showExpectedForVcard,
            StringUtils
        }
    }
})
</script>

<style lang="scss" scoped>
.title-section{
  height: 50px;
}

.body-section {
  height: 90px;
  flex-wrap: wrap;
  justify-content: center;

    &-no-rebate {
      height: 140px !important;
    }

}

.footer-section{
  height: 50px;
  flex-wrap: wrap;
  justify-content: center;
}

</style>