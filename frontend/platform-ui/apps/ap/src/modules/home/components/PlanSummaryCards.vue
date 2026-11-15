<template>
<div class="row">
  <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"></Tooltip>
  <div class="col-12 mb-2 d-flex gap-2"><span class="text-base font-normal text-gray-500" :title="`${planData.planName}`">{{ `${planData.planName}`  }}</span>
    <iconCalendars></iconCalendars><span class="text-base font-normal text-gray-500">{{ ` ${formatData.getMonthDayAndYear(planData.planStartDate ?? '')} - ${formatData.getMonthDayAndYear(planData.planEndDate ?? '')} `  }}</span>
  </div>
</div>
<div class="row" v-if="isPlanCompleted">
  <div class="col-xl-4 col-lg-12 col-md-12 col-sm-12 col-12">
    <div class="card plan-summary-item-card-height card-completed-phases shadow-none">
      <div class="d-flex flex-column justify-content-between"></div>
    </div>
  </div>
  <div class="col-xl-4 col-lg-12 col-md-12 col-sm-12 col-12">
    <div class="card plan-summary-item-card-height shadow-none">
      <div class="d-flex flex-column justify-content-between">
        <div class="d-flex phase-title gap-2">
          <iconCompletedPlan></iconCompletedPlan><span class="text-base font-semibold text-gray-600 ellipsis">{{  $t('home.homePage.planCompleted')  }}                    </span>
        </div>
        <div class="d-flex flex-column phase-title">
          <div class="row w-100">
            <div class="col-8">
              <div class="d-flex mt-1 w-100"><span class="text-sm font-normal text-gray-500">{{ $t('home.analyze.target') }}</span><span class="tags-card tags-card-number">{{ StringUtils.formatBigNumbers(totCashFlow ?? 0) }}                    </span></div>
              <div class="d-flex mt-1 w-100">                           <span class="text-sm font-normal text-gray-500">{{ $t('home.homePage.achieved') }}</span><span class="tags-card tags-card-number">{{ StringUtils.formatBigNumbers(totAgreedCashFlow ?? 0) }}</span></div>
            </div>
            <div class="col-4 percentage-value">
              <div class="d-flex mt-1 w-100"><span class="tags-card tags-card-number text-2xl" :title="getPercentage(totAgreedCashFlow?? 0, totCashFlow ?? 0)+'%'">{{ getPercentage(totAgreedCashFlow?? 0, totCashFlow ?? 0) }}%    </span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-4 col-lg-12 col-md-12 col-sm-12 col-12">
    <div class="card plan-summary-item-card-height card-completed-phases shadow-none">
      <div class="d-flex flex-column justify-content-between"></div>
    </div>
  </div>
</div>
<div class="row" v-else>
  <div class="col-xl-4 col-lg-12 col-md-12 col-sm-12 col-12">
    <div class="card plan-summary-item-card-height shadow-none">
      <div class="d-flex flex-column justify-content-between">
        <div class="d-flex phase-title"><span class="text-base font-semibold text-gray-600 ellipsis" v-if="planData.previous.end" :title="$t('home.homePage.previousPhaseEnded') + ' ' + `${formatData.getMonthDay(planData.previous.end) }`">{{ $t('home.homePage.previousPhaseEnded') + ' ' + `${formatData.getMonthDay(planData.previous.end) }`  }}</span><span class="text-base font-semibold text-gray-600 ellipsis" v-else>{{ $t('home.homePage.noPreviousPhase') }}</span></div>
        <div class="d-flex flex-column phase-title">
          <div class="row w-100">
            <div class="col-8">
              <div class="d-flex mt-1 w-100"><span class="text-sm font-normal text-gray-500">{{ planData.previous.cashFlow ?  $t('home.analyze.target') : $t('home.homePage.greatStart') }}</span><span class="tags-card tags-card-number" v-if="planData.previous.cashFlow">{{ StringUtils.formatBigNumbers(planData.previous.cashFlow) }}</span></div>
              <div class="d-flex mt-1 w-100"><span class="text-sm font-normal text-gray-500">{{ $t('home.homePage.achieved') }}</span><span class="tags-card tags-card-number">{{ StringUtils.formatBigNumbers(planData.previous.agreedCashFlow ?? 0) }}</span></div>
            </div>
            <div class="col-4 percentage-value">
              <div class="d-flex mt-1 w-100"><span class="tags-card tags-card-number bg-white-0 text-2xl" :title="getPercentage(planData.previous.agreedCashFlow ?? 0, planData.previous.cashFlow ?? 0)+'%'">{{ getPercentage(planData.previous.agreedCashFlow ?? 0, planData.previous.cashFlow ?? 0) }}%</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-4 col-lg-12 col-md-12 col-sm-12 col-12">
    <div class="card plan-summary-item-card-height shadow-none">
      <div class="d-flex flex-column justify-content-between">
        <div class="d-flex phase-title"><span class="text-base font-semibold text-gray-600 ellipsis" v-if="planData.current.end" :title="$t('home.homePage.currentPhaseEnded') + ' ' + `${formatData.getMonthDay(planData.current.end) }`">{{ $t('home.homePage.currentPhaseEnded') }} {{ `${formatData.getMonthDay(planData.current.end) }`  }}</span><span class="text-base font-semibold text-gray-600 ellipsis" v-else>{{ $t('home.homePage.noCurrentPhase') }}</span></div>
        <div class="d-flex flex-column phase-title">
          <div class="row w-100">
            <div class="col-8">
              <div class="d-flex mt-1 w-100"><span class="text-sm font-normal text-gray-500">{{ $t('home.analyze.target') }}</span><span class="tags-card tags-card-number">{{ StringUtils.formatBigNumbers(planData.current.cashFlow ?? 0) }}                    </span></div>
              <div class="d-flex mt-1 w-100"><span class="text-sm font-normal text-gray-500">{{ $t('home.homePage.achieved') }}</span><span class="tags-card tags-card-number">{{ StringUtils.formatBigNumbers(planData.current.agreedCashFlow ?? 0) }}</span></div>
            </div>
            <div class="col-4 percentage-value">
              <div class="d-flex mt-1 w-100"><span class="tags-card tags-card-number text-2xl" :title="getPercentage(planData.current.agreedCashFlow ?? 0, planData.current.cashFlow ?? 0)+'%'">{{ getPercentage(planData.current.agreedCashFlow ?? 0, planData.current.cashFlow ?? 0) }}%</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-4 col-lg-12 col-md-12 col-sm-12 col-12">
    <div class="card plan-summary-item-card-height shadow-none">
      <div class="d-flex flex-column justify-content-between">
        <div class="d-flex phase-title"><span class="text-base font-semibold text-gray-600 ellipsis" v-if="planData.next.end" :title="$t('home.homePage.nextPhaseStarts') + ' ' + `${formatData.getMonthDay(planData.next.end) }`">{{ $t('home.homePage.nextPhaseStarts') }}  {{ `${formatData.getMonthDay(planData.next.end) }`  }}</span><span class="text-base font-semibold text-gray-600 ellipsis" v-else>{{ $t('home.homePage.allSet') }}</span></div>
        <div class="d-flex flex-column phase-title">
          <div class="row w-100" v-if="planData.next.end">
            <div class="col-8">
              <div class="d-flex mt-1 w-100"><span class="text-sm font-normal text-gray-500">{{ $t('home.analyze.target') }}</span><span class="tags-card tags-card-number" v-if="planData.next.cashFlow">{{ StringUtils.formatBigNumbers(planData.next.cashFlow) }}</span></div>
              <div class="d-flex mt-1 w-100"><span class="text-sm font-normal text-gray-500">{{ $t('home.homePage.achieved') }}</span><span class="tags-card tags-card-number">{{ StringUtils.formatBigNumbers(planData.next.agreedCashFlow ?? 0) }}</span></div>
            </div>
            <div class="col-4 percentage-value">
              <div class="d-flex mt-1 w-100"><span class="tags-card tags-card-number bg-white-0 text-2xl" :title="getPercentage(planData.next.agreedCashFlow ?? 0, planData.next.cashFlow ?? 0)+'%'">{{ getPercentage(planData.next.agreedCashFlow ?? 0, planData.next.cashFlow ?? 0) }}%</span></div>
            </div>
          </div>
          <div class="row w-100" v-else>
            <div class="col-12"><span class="text-sm font-normal text-gray-500">{{ $t('home.homePage.almostFinished') }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent, reactive, toRefs, onMounted } from 'vue'
import { PlanSummaryCard  } from '@/types/homeView';
import type { PropType } from 'vue';
import * as formatData from "@/utils/FormatData";
import {  StringUtils } from '@/utils'
import { Tooltip } from "@progress/kendo-vue-tooltip";
import iconCalendars from '@/resources/assets/images/icons/iconCalendars.vue'
import iconCompletedPlan from '@/resources/assets/images/icons/iconCompletedPlan.vue'

export default defineComponent({
    name: 'PlanSummaryCards',
    components: { iconCalendars, iconCompletedPlan, Tooltip },
    props: {
        planData: { type: Object as PropType<PlanSummaryCard>, required: true },
        number: { type: Number, required: true, default: 0 }
    },
    setup( props ) {
        
        interface DataInterface {
            isPlanCompleted: boolean,
            totCashFlow: number,
            totAgreedCashFlow: number 
        }

        const data = reactive<DataInterface>({ 
            isPlanCompleted: false,
            totCashFlow: 0,
            totAgreedCashFlow: 0
        })

        onMounted(() => {
            data.totCashFlow = props.planData.previous.cashFlow + props.planData.current.cashFlow + props.planData.next.cashFlow
            data.totAgreedCashFlow = props.planData.previous.agreedCashFlow + props.planData.current.agreedCashFlow + props.planData.next.agreedCashFlow
            if (data.totCashFlow === data.totAgreedCashFlow) {
                data.isPlanCompleted = true
            }
        })

        function getPercentage(agreedCashFlow: number, cashFlow: number) {
            
            if (cashFlow === 0) {
                return 0
            }            
            
            const result = (agreedCashFlow / cashFlow) * 100
            if (!isFinite(result) || isNaN(result)) {
                return 0
            }            
            return Math.ceil(result)
        }
        
        return {
            ...toRefs(data),
            formatData,
            StringUtils,
            getPercentage
        }
    }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";


.plan-summary-item-card-height {
    min-height: 110px;
    max-height: 110px;
}

.percentage-value {
    align-content: center;
}

.card-completed-phases {
    border: 1px solid var(--gray-200, #EAECF0);
    background: var(--gray-50, #F9FAFB);
}

</style>