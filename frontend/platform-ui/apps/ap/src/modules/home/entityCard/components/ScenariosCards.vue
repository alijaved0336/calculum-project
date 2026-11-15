<template>
<div class="card cursor-pointer" :class="{ 'selected-scenario': selectedScenario ===  scenarios['@id'] }">
  <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
    <div v-if="canDelete" class="delete-scenarios close-button close-scenarios-card"><i class="fa-solid fa-trash-can text-sm" :title="'Remove the Scenario'" @click="$emit('deleteScenario', scenarios['@id'])"></i></div>
  </Tooltip>
  <div class="row" @click="$emit('setSelectedScenario', scenarios)">
    <div class="col-12 mb-2">
      <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'"><span class="text-base font-semibold title-data" :title="getScenarioName">{{ getScenarioName }}</span></Tooltip>
    </div>
    <div class="col-6 mb-2 d-flex flex-column"><span class="text-xs font-semibold text-gray-400 text-center">{{ 'PT Change' }}</span><span class="font-semibold text-gray-700 text-base text-center">{{ getPTChange }}</span></div>
    <div class="col-6 mb-2 d-flex flex-column"><span class="text-xs font-semibold text-gray-400 text-center">{{ 'Price Change' }}</span><span class="font-semibold text-gray-700 text-base text-center">{{ getPriceChange }}</span></div>
    <div class="col-6 d-flex flex-column text-center"><span class="text-xs font-semibold text-gray-400 text-center">{{ 'Program' }}</span>
      <Tooltip class="w-100 text-center" :open-delay="50" :anchor-element="'target'" :position="'top'"><span class="font-semibold text-gray-700 text-base text-center" :title="getProgramName">{{ getProgramName }}                </span></Tooltip>
    </div>
    <div class="col-6 d-flex flex-column"><span class="text-xs font-semibold text-gray-400 text-center">{{ 'Economic Profit' }}
        <div class="economic-profit-round-container d-flex flex-column justify-content-center">               <span class="font-semibold text-gray-700 text-base text-center">{{ getEconomicProfit }}</span></div></span></div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';  
import { Tooltip } from '@progress/kendo-vue-tooltip';
import { CalculatedScenario } from '@/types/CalculatedScenario';
import { StringUtils } from '@/utils'
import { useUserStore } from '@/stores/user'
export default defineComponent({
  name: 'ScenariosCards',
  components: {
    Tooltip
  },
  props: {
    scenarios: {
      type: Object as PropType<CalculatedScenario>,
      required: true,
    },
    selectedScenario: {
      type: String,
      required: false,
      default: null,
    }
  },
  emits: ['setSelectedScenario', 'deleteScenario'],
  setup(props) {

    const userStore = useUserStore()

    // AB#19912. The API lets the creator or an admin delete a scenario; anyone else got a 403
    // behind a trash icon that looked available. createdBy is normally an object carrying '@id',
    // but the serializer may collapse it to the IRI string, so both shapes are accepted.
    const creatorIri = computed<string | null>(() => {
      const createdBy: unknown = props.scenarios.createdBy
      if (typeof createdBy === 'string') return createdBy
      if (createdBy && typeof createdBy === 'object' && '@id' in createdBy) {
        return String((createdBy as { '@id': unknown })['@id'])
      }
      return null
    })

    const canDelete = computed(() => {
      const me = userStore.actualUser
      if (!me) return false
      if (userStore.isAdmin) return true
      return creatorIri.value !== null && creatorIri.value === me['@id']
    })

    const getScenarioName = computed(() => {
      return props.scenarios.name
    })

    const getPTChange = computed(() => {
      return props.scenarios.changeInTerms > 0 ? `+${props.scenarios.changeInTerms}` : `${props.scenarios.changeInTerms}`
    })

    const getPriceChange = computed(() => {
      return props.scenarios.priceChange > 0 ? `+${props.scenarios.priceChange}` : `${props.scenarios.priceChange}`
    })

    const getProgramName = computed(() => {
      switch (props.scenarios.calculationType) {
        case "none":
          return "No Program";
        case "vCard":
          return "Vcard";
        case "scf":
          return "SCF";
        default:
          return null;
      }      
    })

    const getEconomicProfit = computed(() => {
      const buyerProfit = props.scenarios.calculatedData?.data?.buyer?.economicProfit || 0
      const buyerProfitFoarmatted = StringUtils.formatBigNumbers(props.scenarios.calculatedData?.data?.buyer?.economicProfit ?? 0)
      return buyerProfit > 0 ? `+${buyerProfitFoarmatted}` : `${buyerProfitFoarmatted}`
    })

    return {
      canDelete,
      getScenarioName,
      getPTChange,
      getPriceChange,
      getProgramName,
      getEconomicProfit
    };
  },
});
</script>

<style lang="scss" scoped>
.card {
    min-height: 100px;
    padding: 10px;
    margin-bottom: 0.5rem;
    border: 2px solid transparent;
    transition: border-color 0.2s ease-in-out;
    cursor: pointer;
}

.selected-scenario {
    border: 2px solid #007bff;
    box-shadow: 0 0 8px rgba(0, 123, 255, 0.3);
}

.economic-profit-round-container {
    background-color: #CFE9E6;
    padding: 0.25rem;
    border-radius: 0.5rem;    
}

.delete-scenarios {
    position: absolute;
    top: 5px;
    right: 10px;
    z-index: 1000;    
}

.title-data {
    width: 90%;
    display: block;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
}


.card * {
    cursor: pointer;
}
</style>