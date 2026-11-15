<template>
<CalculumModal :size="'xl'" :showClose="true" :title="$t('global.countryRiskInformation')" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row">
      <div class="col-xl-3">
        <div class="row mb-2">
          <div class="col"><span class="font-semibold">{{ $t('home.entityCard.rating.riskOverview') }}</span></div>
        </div>
        <div class="row mb-3">
          <div class="col">
            <p class="mb-1"><span>{{ $t('home.entityCard.rating.economicRisk') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.economicRiskTooltip')" :options="{ placement: 'auto' }"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.economicRisk }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.economicRisk)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col">
            <p class="mb-1"> <span>{{ $t('home.entityCard.rating.politicalRisk') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.politicalRiskTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.politicalRisk }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.politicalRisk)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <p class="mb-1"> <span>{{ $t('home.entityCard.rating.financialSystemRisk') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.financialSystemRiskTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.financingSystemRisk }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.financingSystemRisk)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
      </div>
      <div class="col-xl-3">
        <div class="row mb-2">
          <div class="col"><span class="font-semibold">{{ $t('home.entityCard.rating.policyOverview') }}</span></div>
        </div>
        <div class="row mb-3">
          <div class="col">
            <p class="mb-1"><span>{{ $t('home.entityCard.rating.internationalTransactionsPolicy') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.internationalTransactionsPolicyTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.internationalTransactionsPolicy }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.internationalTransactionsPolicy)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col">
            <p class="mb-1"> <span>{{ $t('home.entityCard.rating.monetaryPolicy') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.monetaryPolicyTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.monetaryPolicy }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.monetaryPolicy)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <p class="mb-1"> <span>{{ $t('home.entityCard.rating.fiscalPolicy') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.fiscalPolicyTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.fiscalPolicy }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.fiscalPolicy)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
      </div>
      <div class="col-xl-3">
        <div class="row mb-2">
          <div class="col"><span class="font-semibold">{{ $t('home.entityCard.rating.stabilityOverview') }}</span></div>
        </div>
        <div class="row mb-3">
          <div class="col">
            <p class="mb-1"><span>{{ $t('home.entityCard.rating.governmentStability') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.governmentStabilityTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.governmentStability }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.governmentStability)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col">
            <p class="mb-1"> <span>{{ $t('home.entityCard.rating.socialStability') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.socialStabilityTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.socialStability }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.socialStability)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <p class="mb-1"> <span>{{ $t('home.entityCard.rating.regionalStability') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.regionalStabilityTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.regionalStability }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.regionalStability)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
      </div>
      <div class="col-xl-3">
        <div class="row mb-2">
          <div class="col"><span class="font-semibold">{{ $t('home.entityCard.rating.generalOverview') }}</span></div>
        </div>
        <div class="row mb-3">
          <div class="col">
            <p class="mb-1"><span>{{ $t('home.entityCard.rating.businessEnvironmentRisk') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.businessStabilityTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.businessEnvironmentRisk }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.businessEnvironmentRisk)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col">
            <p class="mb-1"> <span>{{ $t('home.entityCard.rating.laborFlexibility') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.laborFlexibilityTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.laborFlexibility }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.laborFlexibility)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <p class="mb-1"> <span>{{ $t('home.entityCard.rating.legalSystem') }}
                <CalculumTooltipIcon :infoText="$t('home.entityCard.rating.legalSystemTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3">{{ country.legalSystem }}</span></p>
            <LevelDashesChart :level="levelByGradeLevelText(country.legalSystem)" :is-level-color-inverted="true"></LevelDashesChart>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumModal>
</template>
                  
<script lang="ts">
import { defineComponent } from "vue";
import { fontIcons } from "@/resources/assets/assets";
import { LevelDashesChart } from "@ada/design-system";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: "ModalCountryRating",
  components: {
    CalculumTooltipIcon,
    LevelDashesChart,
    CalculumModal
  },  
  props: {
    country: { type: Object, required: true }
  },
  emits: ['close'],
  setup() {
    /**
     * Get level by grade level text
     * 
     * ? - Extract this function to a util file
     */
    function levelByGradeLevelText(gradeLevelText: string): number {
      switch (gradeLevelText) {
        case 'Very Low':
          return 1
        case 'Low':
          return 2
        case 'Medium':
          return 3
        case 'High':
          return 4
        case 'Very High':
          return 5
        default:
          return 0
      }
    }

    return {
      fontIcons,
      levelByGradeLevelText
    }
  }
});
</script>
<style lang="scss" scoped></style>
  