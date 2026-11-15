<template>
  <td v-if="behavior === 'data-changed' && dataItem.dataChanged !== '-'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p class="ellipsis_custom pointer pt-3 " :title="dataItem.dataChanged"> {{
        dataItem.dataChanged }} </p>
    </Tooltip>
  </td>

  <td v-else-if="behavior === 'user-message' && dataItem.dataChanged !== '-'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p class="ellipsis_custom pointer pt-3 " :title="dataItem.userMessage"> {{
        dataItem.userMessage }} </p>
    </Tooltip>
  </td>


  <td v-else-if="behavior === 'limitUsers'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p class="ellipsis_custom pointer pt-3 limit-users-value" :title="getLimitUsers()">{{ getLimitUsers() }}</p>

    </Tooltip>
  </td>

  <td v-else-if="behavior === 'regionFinancingData'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p class="ellipsis_custom pointer pt-3 limit-users-value" :title="getValueBasedOnBehavior(behavior)">{{
        getValueBasedOnBehavior(behavior) }}</p>
    </Tooltip>
  </td>

  <td v-else-if="behavior === 'industryFinancingData'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p class="ellipsis_custom pointer pt-3 limit-users-value" :title="getValueBasedOnBehavior(behavior)">{{
        getValueBasedOnBehavior(behavior) }}</p>
    </Tooltip>
  </td>


  <td v-else-if="behavior === 'countryFinancingData'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p class="ellipsis_custom pointer pt-3 limit-users-value" :title="getValueBasedOnBehavior(behavior)">
        {{ getValueBasedOnBehavior(behavior) }}</p>
    </Tooltip>
  </td>


  <td v-else-if="behavior === 'naicsFinancingData'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p class="ellipsis_custom pointer pt-3 limit-users-value" :title="getValueBasedOnBehavior(behavior)">{{
        getValueBasedOnBehavior(behavior) }}</p>
    </Tooltip>
  </td>

  <td v-else-if="behavior === 'naicsDescriptionFinancingData'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p class="ellipsis_custom pointer pt-3 limit-users-value" :title="getValueBasedOnBehavior(behavior)">{{
        getValueBasedOnBehavior(behavior) }}</p>
    </Tooltip>
  </td>

  <td v-else-if="behavior === 'adminUserTeam'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td v-else-if="behavior === 'entityExternalId'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td v-else-if="behavior === 'harmonizations'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td v-else-if="behavior === 'regulatoryCountrySource'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p
        :title="getRegulationCountrySourceValue(dataItem.regulatoryCountrySource)"
        class="ellipsis_custom pointer pt-3 text-center"
      >
        {{ getRegulationCountrySourceValue(dataItem.regulatoryCountrySource) }}
      </p>
    </Tooltip>
  </td>
  <td v-else-if="behavior === 'creditScoreSource'">
    <div class="credit-score-source-cell">
      <p v-if="dataItem.creditScoreSource" class="text-center">
        {{ dataItem.creditScoreSource.toLowerCase() === 'internal'
          ? $t('home.analyze.table.creditRatingEstimatedYes')
          : $t('home.analyze.table.creditRatingEstimatedNo') }}
      </p>
    </div>
  </td>
  <td v-else-if="behavior === 'creditRating'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td v-else-if="behavior === 'entityCompanySize'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>

  <td v-else-if="behavior === 'countryCreditRating'">
    <div class="country-credit-rating-cell">
      <div class="country-credit-rating-cell__name-wrap">
        <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
          <p :title="getValueBasedOnBehavior(behavior)" class="country-credit-rating-cell__name pointer text-center text-capitalize">{{
            getValueBasedOnBehavior(behavior) }}
          </p>
        </Tooltip>
      </div>
    </div>
  </td>

  <td v-else-if="behavior === 'entityStockPerformanceMarketIndex'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>

  <td v-else-if="behavior === 'entityBuyerLeverageLevel'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td v-else-if="behavior === 'entitySupplierLeverageLevelText'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td
    v-else-if="behavior === 'name' || behavior === 'country' || behavior === 'region' || behavior === 'industry' || behavior === 'naicsCode'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>

  <td v-else-if="behavior === 'nameFinancingData'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-left text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td v-else-if="behavior === 'spendCount'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>

  <td v-else-if="behavior === 'paymentTermsAgreed'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td v-else-if="behavior === 'supplierCount'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td v-else-if="behavior === 'spendAlias'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td v-else-if="behavior === 'commodityMatch'">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-center text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td v-else-if="behavior === 'roles'" class="custom-class-for-grid-manage-team text-left" role="gridcell">
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p :title="getValueBasedOnBehavior(behavior)" class="ellipsis_custom pointer pt-3 text-capitalize">{{
        getValueBasedOnBehavior(behavior) }}
      </p>
    </Tooltip>
  </td>
  <td v-else>
    <Tooltip v-if="!isEmpty" class='ellipsis_tooltip' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <p class="ellipsis_custom pointer pt-3" :title="getValueBasedOnBehavior(behavior)">{{
        getValueBasedOnBehavior(behavior) }}</p>
    </Tooltip>
    <span v-else class="pl-2 custom-text"></span>
  </td>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { getRegulationCountrySourceValue } from '../../../utils'
export default defineComponent({
  name: 'TooltipColumn',
  components: {
    Tooltip,
  },
  props: {
    dataItem: { type: Object, required: true },
    behavior: { type: String, required: true },
    level: { type: Number, required: false, default: 0 },
  },
  setup(props) {
    const isEmpty = ref(true)

    const smeLabel = computed(() => {
      return props.dataItem.isSME
    })

    const getLevel = computed(() => {
      if (props.level === 0) {
        return 'spend'
      } else if (props.level === 1) {
        return 'supplier'
      } else if (props.level === 2) {
        return 'parent'
      }
      return 'spend'
    })

    function checkIfNullOrUndefined(text: any) {
      if (text !== undefined && text !== null && text.length > 0) {
        isEmpty.value = false
        return props.behavior === 'roles' ? getRoleValues(text) : text
      } else {
        isEmpty.value = true
        return ''
      }
    }


    function getLimitUsers() {
      return (props.dataItem.externalUsers ?? '-') + " of " + (props.dataItem.limitUsers ?? 'N/A');
    }

    function getRoleValues(roles: Array<string>) {
      return roles.map((item: string) => item.replace('ROLE_', '')).join(', ');
    }

    /***
     * this is for to reuse the column
     * the user could pass the prop for the given field,
     * so to make more dynamic , we are passing the dataItem.theGivenFieldType here
     */
    function getValueBasedOnBehavior(behavior: string) {
      // Map behaviors to their corresponding data paths
      const behaviorMap: Record<string, string> = {
        'buyerCountry': 'buyerCountry',
        'buyerRegion': 'buyerRegion',
        'commoditySpend': 'commodity',
        'commodity': 'commodities',
        'commodityMatch': 'commodity',
        'industry': 'industry',
        'buyerInfo': 'buyer.list',
        'compareIndustry': 'industry.description',
        'industryFinancingData': 'entityIndustryName',
        'countryFinancingData': 'entityCountryName',
        'naicsFinancingData': 'entityIndustryCode',
        'naicsDescriptionFinancingData': 'naicsDescription',
        'regionFinancingData': 'entityRegion',
        'region': 'region',
        'roles': 'roles',
        'adminUserTeam': 'team.name',
        'entityExternalId': 'entityExternalId',
        'nameFinancingData': 'entityName',
        'name': 'name',
        'paymentTermsAgreed': 'termsWithoutCashDiscount',
        'smeSource': 'smeSource',
        'spendCount': 'spendCounts',
        'supplierCount': 'supplierCounts',
        'spendAlias': 'spendAlias',
        'creditRating': 'creditRating',
        'entityStockPerformanceMarketIndex': 'entityStockPerformanceMarketIndex',
        'countryCreditRating': 'countryCreditRating',
        'country': 'country',
        'naicsCode': 'naicsCode',
        'creditScoreSource': 'creditScoreSource',
        'entityBuyerLeverageLevel': 'entityBuyerLeverageLevel',
        'entityCompanySize': 'entityCompanySize',
        'entitySupplierLeverageLevelText': 'entitySupplierLeverageLevel',
        'harmonizations': 'harmonizationLevels'
      };

      // Special cases
      if (behavior === 'user-message') return props.dataItem.userMessage;
      if (behavior === 'limitUsers') return 4;
      if (behavior === 'data-changed') return props.dataItem.dataChanged;

      // Handle mapped behaviors
      const path = behaviorMap[behavior];

      if (path) {
        if (behavior === 'roles') {
          return  getRoleValues(props.dataItem.roles)
        }

        const value = path.split('.').reduce((obj, key) => obj?.[key], props.dataItem);
        return value ?? '-';
      }

      return undefined; // or whatever default you prefer for unmatched cases
    }
    return {
      checkIfNullOrUndefined,
      getLevel,
      smeLabel,
      getLimitUsers,
      getValueBasedOnBehavior,
      getRegulationCountrySourceValue,
      isEmpty,
    }
  }
})

</script>

<style scoped>
/* AB#20356: the "Country Rating" branch (behavior === 'countryCreditRating') had the same
   top-only `pt-3` padding bug already fixed in TextColumn.vue/EntityLogoColumn.vue/
   CountryFlagColumn.vue - scoped narrowly to this one behavior branch, since this component's
   ~20 other branches share the same pt-3 pattern but aren't part of this bug. */
.country-credit-rating-cell {
  display: flex;
  align-items: center;
  height: 100%;
}

/* AB#20356 follow-up: was the global `ellipsis_custom` class (`width: calc(100% - 10px)` on a
   `display: inline-block` <p>) sitting directly inside <Tooltip> - that %-width resolves against
   Tooltip's own unstyled wrapper, which shrinks to its own content instead of filling the
   remaining flex space, giving inconsistent, name-length-dependent truncation. Same fix as
   EntityLogoColumn.vue's __name-wrap/__name: a flex item with `flex: 1 1 0%; min-width: 0` gives a
   deterministic remaining width regardless of what Tooltip renders around the text. */
.country-credit-rating-cell__name-wrap {
  flex: 1 1 0%;
  min-width: 0;
  overflow: hidden;
}

.country-credit-rating-cell__name {
  display: block;
  overflow: hidden;
  margin: 0;
  white-space: nowrap;
  text-overflow: ellipsis;

  /* Same fix as TooltipText.vue's .text-column-cell__name: the <Tooltip> above carries
     `ellipsis_tooltip_custom_text` (_layout.scss), which Vue 3 always forwards onto the <div>
     Kendo's Tooltip wraps this <p> in regardless of inheritAttrs - its `line-height: 1.25rem`
     cascades onto this <p> (which never set its own), inflating the cell. An explicit declaration
     on the element itself always wins over an inherited one. */
  line-height: normal;
}

/* AB#20356 follow-up: the 'creditScoreSource' branch had the same pt-3-only pattern, and no
   wrapper div at all - scoped narrowly here too, same reasoning as .country-credit-rating-cell
   above. */
.credit-score-source-cell {
  display: flex;
  align-items: center;
  height: 100%;
}
</style>
