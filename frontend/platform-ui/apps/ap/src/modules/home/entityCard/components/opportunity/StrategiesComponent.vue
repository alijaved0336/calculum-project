<!-- eslint-disable vue/no-v-html -->
<template>  
  <div
    v-if="data && data.extra"
    class="row extra-section"
  >
    <div class="col-12">
      <template
        v-for="strategy in dataExtraComputed"
        :key="strategy.key"
      >
        <div
          v-if="strategy.terms || strategy.details"
          class="card p-0 mb-4"
        >
          <div
            style="padding: 0.5rem 0.5rem !important"
            class="card-body d-flex flex-column"
          >
            <!-- Line Chart -->
            <EntityTermsChartLine
              v-if="strategy.terms !== null"
              :bar-size="setBarSize(strategy.terms)"
              :color="strategy.color"
              :set-color="
                PaymentTermsStrategiesUtils.getColorByStrategyKeyDetailsSection(
                  strategy.key,
                )
              "
              :title="getTitle(strategy.key)"
              :subtitle="getSubTitle(strategy)"
              :tooltip-text="
                $t('home.entityCard.strategies.' + strategy.key + 'Tooltip')
              "
              :used-strategy="true"
              :value="strategy.terms"
            />

            <!-- Badges below the line chart -->
            <div
              v-if="strategy.details"
              class="row d-flex"
              :style="'padding-left: 56px;'"
              :class="strategy.terms ? '' : 'mt-2'"
            >
              <tooltip
                :open-delay="100"
                :anchor-element="'target'"
                position="auto"
              />

              <template
                v-for="(detail, detailKey) in strategy.details"
                :key="detailKey"
              >
                <!-- Supplier Standard Strategy and Peer Group Standard Strategy has current calculation method highlighted -->
                <div
                  v-if="strategy.calculationMethod === detailKey"
                  class="info-button mr-4 mb-2 bg-gray-500"
                  :title="
                    $te('global.' + detailKey + 'Tooltip')
                      ? $t('global.' + detailKey + 'Tooltip')
                      : ''
                  "
                >
                  <IconCheckCircleFill2 class="w-3 h-3 text-white-0" />

                  <!-- Name -->
                  <span class="text-sm font-normal text-white-0">
                    {{
                      $t(
                        "home.entityCard.strategies.extra.details." + detailKey,
                      )
                    }}
                  </span>

                  <!-- Value -->
                  <span class="text-sm font-bold text-white-0 text-capitalize">
                    {{ detail ?? $t("global.notAvailable") }}
                  </span>
                </div>

                <!-- Default -->
                <div
                  v-else
                  class="info-button mr-4 mb-2"
                  :title="
                    $te('global.' + detailKey + 'Tooltip')
                      ? $t('global.' + detailKey + 'Tooltip')
                      : ''
                  "
                >
                  <!-- Name -->
                  <span class="text-sm font-normal text-gray-500">
                    {{
                      $t(
                        "home.entityCard.strategies.extra.details." + detailKey,
                      )
                    }}
                  </span>

                  <!-- Value -->
                  <span class="text-sm font-bold text-gray-600 text-capitalize">
                    {{ detail ?? $t("global.notAvailable") }}
                  </span>
                </div>
              </template>              
            </div>
            
            


            <!-- Leverage Distribution for supplier standard strategy -->
            <div v-if="getStrategyKey === 'supplierStandardStrategy' && useFeatureLeverageDistribution && showSupplierLeverageDistributionChart">
                <VerticalBarChart
                  :chart-title="$t('global.occurrenceDistributionBuyerLeverageChart')" 
                  :x-axis-title="''" 
                  :y-axis-title="''" 
                  :data-first-series="buyerLeverageDistribution.map((item) => item[1])" 
                  :categories-data="buyerLeverageDistribution.map((item) => item[0])" 
                  :is-big-number="false" 
                  :chart-type="''"                    
                  :section="'leverageDistributionChartSection'"
                  :width-chart="'100%'"
                  :maximum-fraction-digits="0"
                  :minimum-fraction-digits="0"
                  :buyer-leverage-distribution="buyerLeverageDistributionString"
                />
            </div>
            <!-- end of Leverage Distribution for supplier standard strategy -->
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Display Small Cards with more details -->

  <template v-if="data && data.infoCards">
    <div class="row info-cards">
      <template
        v-for="card in dataInfoCardsComputed"
        :key="card.key"
      >
        <div
          v-if="card.key"
          :class="{
            'col-sm-6 col-md-6 col-lg-6 col-xl-4': infoCardsLength <= 3,
            'col-sm-6 col-md-6 col-lg-6 col-xl-3': infoCardsLength > 3,
          }"
        >
          <CardTitleValue
            :title="titleOfCards(card.key)"
            :hide-controls="hideControls"
            :info-key="card.key"
            :group-assigned="card.groupAssigned ? card.groupAssigned : null"
            :value-rate="card.value ? card.value : null"
            :float-days="card.floatDays ? card.floatDays : null"
            :percent-value="card.percentValue ? card.percentValue : null"
            :value="card.value || card.value === 0 || card.value !== null ? getInfoCardParsedValue(card.key, card.value) : 'N/A'"
            :countries="card.countries ?? undefined"
            :bg-color-class="'bg-white border-coolgray-200'"
            :value-classes="getInfoCardValueClasses(card.key)"
            :tool-tip="
              $te('home.entityCard.infoCards.' + card.key + 'Tooltip')
                ? $t('home.entityCard.infoCards.' + card.key + 'Tooltip')
                : ''
            "
            @change-groups="sendGroups"
          />
        </div>
      </template>
    </div>
  </template>

  

  <template v-if="data && (data.combinationGroups || getConfigPG2)">
    <div
      v-if="(getStrategyKey === 'supplierStandard2Strategy' && useFeatureSupplierStandard && userIsSuperAdmin) || (getStrategyKey === 'peerGroupStandard2Strategy' && useFeaturePeerGroupStandard && userIsSuperAdmin)"
      class="card bg-white p-4 extra-below-card"
    >
      <VariableSelectorSupplierStandard v-if="getStrategyKey === 'supplierStandard2Strategy' && useFeatureSupplierStandard && userIsSuperAdmin" :allow-edit-variables="allowEditVariables" :model-value="getCombinationGroups[0]" :config-id="configId" :charts="getCharts" :level-type="levelType" :entity-uuid="entityUuid" :buyer-leverage-distribution="buyerLeverageDistributionString" :config-was-customized="configWasCustomizedComputed" :terms="getTerms" @save="handleStrategyConfigSave"/>

      <VariableSelectorPeerGroupStandard v-if="getStrategyKey === 'peerGroupStandard2Strategy' && useFeaturePeerGroupStandard && userIsSuperAdmin" :allow-edit-variables="allowEditVariables" :model-value="getConfigPG2" :config-id="configId" :level-type="levelType" :entity-uuid="entityUuid" :charts="getCharts" :config-was-customized="configWasCustomizedComputed" :terms="getTerms" :buyer-leverage-distribution="buyerLeverageDistributionString" @save="handleStrategyConfigSave"/>
    </div>
  </template>

  <!-- extra data below-->

  <template v-if="data && data.extraBelow">
    <div
      v-if="extraBelowComputed.length > 0"
      class="card bg-white p-4 extra-below-card"
    >
      <div
        v-if="
          selectedHarmonizationGroup !== null && activeHarmonizationGroup > -1
        "
        class="col-12 p-2 rounded-lg active-harmonization-section"
      >
        <div class="d-flex flex-column">
          <div class="d-flex align-items-cente mb-4">
            <span class="font-weight-600 text-base mr-2">
              {{ $t("home.entityCard.assignedHarmonizationGroups") }}
            </span>
            <span
              :class="getRainbowPillClasses(activeHarmonizationGroup)"
              class="options-cell no-cursor text-center rounded-3xl text-sm font-medium d-flex align-items-center justify-content-center"
            >
              <iconBlueBadge
                :custom-path-color="
                  getRainbowPillClasses(activeHarmonizationGroup)
                "
                class="icon-svg-16 mr-1"
              />
              {{ selectedHarmonizationGroup.key ?? "-" }}
            </span>
          </div>

          <!-- Click to toggle the display of the harmonization groups -->
          <div
            class="d-flex align-items-center mb-4 cursor-pointer"
            @click="isExpanded = !isExpanded"
          >
            <span
              class="text-capitalize font-md font-semibold text-gray-400 mr-2 cursor-pointer"
            >
              {{ $t("home.entityCard.unusedHarmonizationGroups") }}
            </span>
            <i
              class="fa"
              :class="
                isExpanded
                  ? 'active-mode fa-chevron-up text-gray-400 cursor-pointer '
                  : 'fa-chevron-down text-gray-400 cursor-pointer'
              "
            />
          </div>

          <!-- Display the unused harmonization groups -->
          <template v-if="isExpanded">
            <template
              v-for="card in extraBelowComputed"
              :key="card.key"
            >
              <div
                v-if="card.key"
                class="d-flex align-items-center flex-wrap gap-2 harmonization-groups-section"
              >
                <div
                  v-for="(value, idx) in card.value"
                  :key="idx"
                  class="d-flex align-items-center"
                >
                  <span
                    v-if="!value.isSelected"
                    class="gray-bg options-cell no-cursor text-center rounded-3xl text-sm font-medium pills-custom-padding"
                  >
                    {{ value.key }}
                  </span>
                </div>
              </div>
              <!-- end of display unused harmonization groups -->
            </template>
            <!-- end of display unused harmonization groups -->
          </template>
          <!-- end of display unused harmonization groups -->
        </div>
      </div>
    </div>
    <!-- end row -->
  </template>
  <!-- end of data.extraBelow-->

  <!-- Display ADABOT Scripts -->
  <div
    v-if="adabot && Object.keys(adabot.details).length > 0"
    class="row adabot-section"
  >
    <div class="col-12">
      <div class="card">
        <div class="card-body d-flex flex-column p-2">
          <!-- US-17561 AC-07: Adabot keeps using the full dataset under a global filter -->
          <GlobalFilterNotice
            class="mb-2"
            :message="$t('globalFilters.notice.adabot')"
          />
          <div
            v-for="(text, index) in adabot.details"
            :key="index"
            class="adabot-details"
            v-html="text"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { onMounted, defineComponent, computed, reactive, toRefs, watch } from "vue";

// Utils
import {
  getRainbowPillClasses,
  PaymentTermsStrategiesUtils,
  StringUtils,
} from "@/utils";

import {
  formatNumberWithSign,
  formatPercentage,
  getNumberWithDecimals,
  getStrategyModalityValue,
  getRegulationCountrySourceValue,
} from "@/utils/FormatData";

import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useI18n } from "vue-i18n";
import { useEntityCardStore } from '@/stores/entityCard';
import CardTitleValue from "@/modules/components/cards/CardTitleValue.vue";
import EntityTermsChartLine from "./EntityTermsChartLine.vue";
import iconBlueBadge from "@/resources/assets/images/icons/iconBlueBadge.vue";
import IconCheckCircleFill2 from "@/resources/assets/images/icons/IconCheckCircleFill2.vue";
import { useUserStore } from '@/stores/user';
import VerticalBarChart from '@/modules/components/charts/kendo/VerticalBarChart.vue'
import { useUser } from '@/composables'
import VariableSelectorSupplierStandard from './VariableSelectorSupplierStandard.vue';
import VariableSelectorPeerGroupStandard from './VariableSelectorPeerGroupStandard.vue';
import GlobalFilterNotice from '@/modules/globalFilters/components/GlobalFilterNotice.vue';


export default defineComponent({
  name: "StrategiesComponent",
  components: {
    CardTitleValue,
    EntityTermsChartLine,
    iconBlueBadge,
    IconCheckCircleFill2,
    Tooltip,
    VerticalBarChart,
    VariableSelectorSupplierStandard,
    VariableSelectorPeerGroupStandard,
    GlobalFilterNotice
  },
  props: {
    data: { type: Object, default: null },
    adabot: { type: Object, default: null },
    hideControls: { type: Boolean, default: false },
    buyerLeverageDistributionString: { type: String, required: false, default: null },
    allowEditVariables: { type: Boolean, required: false, default: false },
    configId: { type: String, required: true },
    levelType: { type: String, required: true },
    entityUuid: { type: String, default: null },
  },
  emits: ["show-results", "changeLine", "change-groups", "changeTab", "save"],
  setup(props, { emit }) {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const entityCardStore = useEntityCardStore();
    const userStore = useUserStore();
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid)
    const { useFeatureLeverageDistribution, userIsSuperAdmin, useFeatureSupplierStandard, useFeaturePeerGroupStandard } = useUser();
    const MAX_DAYS = 180; // Max number of days in the x-axis

    interface DataInterface {
      activeHarmonizationGroup: number;
      isExpanded: boolean;      
    }

    const data = reactive<DataInterface>({
      activeHarmonizationGroup: 0,
      isExpanded: false
    });

    const addClickListener = () => {

      //* For strategies

      const elements = document.querySelectorAll(
        ".change-tab-strategies-cta",
      ) as NodeListOf<HTMLElement>;
      elements.forEach((element) => {
        element.addEventListener("click", showTab);
      });

      //* for tabs

      const elementsTab = document.querySelectorAll(
        ".change-entity-tab",
      ) as NodeListOf<HTMLElement>;
        elementsTab.forEach((element) => {
        element.addEventListener("click", changeEntityTab);
      });

    };

    const changeEntityTab = (event: Event) => {
      const target = event.target as HTMLElement;
      const tabName = target.dataset.entityTab;
      emit("changeTab", tabName);
    };

    function handleStrategyConfigSave(callbackSuccessData: any) {
      emit("save", { strategyKey: props.data?.key, callbackSuccessData });
    }

    function titleOfCards(keyCard: any) {
      if (
        keyCard === "harmonizationLevel" ||
        keyCard === "harmonizationRoundingRules"
      ) {
        return keyCard === "harmonizationLevel"
          ? t("home.entityCard.infoCards.harmonizationLevel")
          : t("home.entityCard.infoCards.harmonizationRoundingRules");
      }

      if (
        keyCard === "fundingCost" ||
        keyCard === "waccPost" ||
        keyCard === "waccPre"
      ) {
        let setMethod = userStore.getFinancingStrategyMethod;
        return `${t("home.entityCard.infoCards." + keyCard)} (${t(
          "home.homeCompanySettings." + setMethod,
        )})`;
      } else {
        return `${t("home.entityCard.infoCards." + keyCard)}`;
      }
    }

    onMounted(() => {
      const button = document.getElementById("agreedTermsAdabotSaveResults");
      if (button) {
        button.addEventListener("click", handleActiveResultTab);
      }
      addClickListener();
    });

    const showTab = (event: Event) => {
      const target = event.target as HTMLElement;
      const strategieName = target.dataset.strategyName;
      emit("changeLine", strategieName);
    };

    function handleActiveResultTab() {
      emit("show-results");
    }

    /**
     * Set bar size
     */
    function setBarSize(size: number) {
      const newSize = (size * 100) / MAX_DAYS;
      return newSize > 100 ? 100 : newSize;
    }

    // ─── Formatters for getInfoCardParsedValue ────────────────────────────────
    type InfoCardFormatter = (v: string | number | boolean, na: string) => string;

    const _fmtHarmonization: InfoCardFormatter = (v, na) => v == null ? na : `${v}`;
    const _fmtNumber:        InfoCardFormatter = (v, na) => typeof v === "number" ? v.toString() : na;
    const _fmtBigNumber:     InfoCardFormatter = (v, na) => typeof v === "number" ? StringUtils.formatBigNumbers(v) : na;
    const _fmtDecimalPct:    InfoCardFormatter = (v, na) => typeof v === "number" ? getNumberWithDecimals(v, 2) + "%" : na;
    const _fmtString:        InfoCardFormatter = (v, na) => typeof v === "string" ? v : na;
    const _fmtPercentage:    InfoCardFormatter = (v, na) => typeof v === "number" ? formatPercentage(v) : na;
    const _fmtBoolYesNo:     InfoCardFormatter = (v, na) => {
      if (typeof v !== "boolean") return na;
      return v ? t("global.yes") : t("global.no");
    };

    const INFO_CARD_KEY_MAP: Record<string, InfoCardFormatter> = {
      harmonizationLevel:             _fmtHarmonization,
      harmonizationRoundingRules:     _fmtHarmonization,
      applicableStrategies:           _fmtNumber,
      spendLinesInGroup:              _fmtNumber,
      supplierLinesInGroup:           _fmtNumber,
      q3:                             _fmtNumber,
      max:                            _fmtNumber,
      regulationTerms:                _fmtNumber,
      numberOfOccurrences:            _fmtNumber,
      cashFlowOpportunity:            _fmtBigNumber,
      withoutCashDiscount:            _fmtBigNumber,
      withCashDiscount:               _fmtBigNumber,
      contractualWithCashDiscount:    _fmtBigNumber,
      contractualWithoutCashDiscount: _fmtBigNumber,
      discount:                       _fmtDecimalPct,
      contractualDiscount:            _fmtDecimalPct,
      mainIndustry:                   _fmtString,
      mainRegion:                     _fmtString,
      currentDiscount:                _fmtPercentage,
      financingRate:                  _fmtPercentage,
      waccPost:                       _fmtPercentage,
      waccPre:                        _fmtPercentage,
      fundingCost:                    _fmtPercentage,
      changeInTerms:       (v, na) => typeof v === "number" ? (formatNumberWithSign(v) ?? na) : na,
      regulationModality:  (v, na) => typeof v === "string" ? getStrategyModalityValue(v) : na,
      regulationCountrySource: (v, na) => typeof v === "string" ? getRegulationCountrySourceValue(v) : na,
      groupBehavior:       (v, na) => typeof v === "string" ? getFormattedValue(v) : na,
      groupAssigned:       (v, na) => typeof v === "string" ? getFormattedValue(v) : na,
      similarity:          (v, na) => typeof v === "string" ? getFormattedValue(v) : na,
      dsoAdjustmentEnabled:           _fmtBoolYesNo,
      includeParentTerms:             _fmtBoolYesNo,
      includeSisterTerms:             _fmtBoolYesNo,
      calculationMethod:   (v, na) => {
        if (typeof v !== "string") return na;
        return v === "3q" ? "3Q" : v;
      },
    };

    /**
     * Get info card parsed value from value
     */
    function getInfoCardParsedValue(
      key: string,
      value: string | number | boolean,
    ): string {
      const na = t("global.notAvailable");
      const formatter = INFO_CARD_KEY_MAP[key];
      const result = formatter ? formatter(value, na) : `${value}`;
      return StringUtils.isNullUndefinedOrEmpty(result) ? na : result;
    }

    // for example the value could be "grpup a , group2"
    // i need to see if there is only one value
    //then i just return value , with first letter capitalized
    //if  there are more than one value, return the list of valeus, with capitalized first letter and a comma with space
    // for example "Group A, Group B"

    function getFormattedValue(value: string): string {
      // Validate
      if (typeof value !== "string") {
        return "";
      }

      // Split the string by commas
      // It also works if there's only one value
      const values = value.split(",");

      // If there are multiple values, capitalize the first letter of each value and join them with commas
      const formattedValues = values.map((v: string) => {
        return StringUtils.capitalizeFirstCharacter(v.trim());
      });

      return formattedValues.join(", ");
    }

    /**
     * Get info card value classes from key and value
     *
     * If key is harmonizationGroup, applicableStrategies, spendLinesInGroup, suppliersInGroup
     * set text-sm font-bold
     *
     * @param key {string}
     * @param value {string}
     */
    function getInfoCardValueClasses(key: string): string {
      switch (key) {
        case "harmonizationLevel":
        case "harmonizationRoundingRules":
        case "mainIndustry":
        case "mainRegion":
        case "regulationModality":
        case "regulationCountrySource":
          return "text-sm font-medium font-semibold";
        default:
          return "text-2xl font-bold";
      }
    }

    const selectedHarmonizationGroup = computed(() => {
      const extraBelow = props.data.extraBelow;

      if (extraBelow !== null && extraBelow !== undefined) {
        const harmonizationGroups = extraBelow.find(
          (item: any) => item.key === "harmonizationGroups",
        );

        if (harmonizationGroups) {
          const selectedGroupIndex = harmonizationGroups.value.findIndex(
            (group: any) => group.isSelected === true,
          );

          return selectedGroupIndex !== -1 
            ? { ...harmonizationGroups.value[selectedGroupIndex], index: selectedGroupIndex }
            : null;
        }
      }

      return null;
    });


    const getCombinationGroups =  computed(() => {

      const extraBelow = props.data.combinationGroups

      if (extraBelow !== null && extraBelow !== undefined) {
        return props.data.combinationGroups
      } 
      return []

    })

    const configWasCustomizedComputed =  computed(() => {
      if (StringUtils.isNullUndefinedOrEmpty(props.data.configWasCustomized)) {
        return false
      }
      return props.data.configWasCustomized
    })


    const getTerms =  computed(() => {
      return props.data.terms
    })

    const getConfigPG2 = computed(() => props.data.configuration ?? null)

    const getCharts =  computed(() => {

      const extraBelow = props.data.charts

      if (extraBelow !== null && extraBelow !== undefined) {
        return props.data.charts
      } 
      return []

    })


    

    // Watch for changes in selectedHarmonizationGroup and update activeHarmonizationGroup
    watch(selectedHarmonizationGroup, (newValue) => {
      data.activeHarmonizationGroup = newValue ? newValue.index : -1;
    }, { immediate: true });

    /**
     * extra info below the info cards
     */
    const extraBelowComputed = computed(() => {
      return props.data.extraBelow;
    });
    

    const getStrategyKey = computed(() => {
      return props.data.key;
    });

    /**
     * extra data, currently filtering out the harmonization
     */

     const buyerLeverageDistribution = computed(() => {

      if (props.data && props.data.buyerLeverage) {        
          const levelsChartData: Array<[string, number]> = [
            ['Low Leverage', props.data.buyerLeverage.low ?? 0],
            ['Medium Leverage', props.data.buyerLeverage.med ?? 0],
            ['High Leverage', props.data.buyerLeverage.high ?? 0],
          ];
        return levelsChartData;
      }
      return []; // Return empty object when props.data or props.data.buyerLeverage is falsy
    });


    // if user is super admin, show the leverage distribution chart
    const showSupplierLeverageDistributionChart = computed(() => {
      if (props.data && props.data.buyerLeverage) {        

        if (StringUtils.isNullUndefinedOrEmpty(props.data.buyerLeverage.low) && StringUtils.isNullUndefinedOrEmpty(props.data.buyerLeverage.med) && StringUtils.isNullUndefinedOrEmpty(props.data.buyerLeverage.high)) {
          return false;
        }
        return true;
      }
      return false; // Return false when props.data or props.data.buyerLeverage is falsy
    });


    const dataExtraComputed = computed(() => {
      if (props.data && props.data.extra) {
        // Use Object.keys() to get an array of keys, then filter the keys
        const filteredKeys = Object.keys(props.data.extra).filter(
          (key: any) =>
            key !== "harmonization" &&
            key !== "harmonizationTerms" &&
            !(hideAverageDaysPaid.value && key === "currentTerms") &&
            !(!userStore.getShowPayOnTerms && key === "payOnTermsStrategy"),
        );

        // Use reduce to create a new object with the filtered keys and values
        const filteredExtra = filteredKeys.reduce((acc: any, key: any) => {
          const strategy = props.data.extra[key];
          if (strategy && strategy.details) {
            const sortedDetails = Object.keys(strategy.details)
              .sort((a, b) => {
                const valA = strategy.details[a] ?? '';
                const valB = strategy.details[b] ?? '';
                return String(valA).localeCompare(String(valB), undefined, { numeric: true });
              })
              .reduce((detailAcc: any, detailKey: string) => {
                detailAcc[detailKey] = strategy.details[detailKey];
                return detailAcc;
              }, {});
            acc[key] = { ...strategy, details: sortedDetails };
          } else {
            acc[key] = strategy;
          }
          return acc;
        }, {});

        return filteredExtra;
      }
      return {}; // Return empty object when props.data or props.data.extra is falsy
    });

    /**
     * data info cards
     */

    const dataInfoCardsComputed = computed(() => {
      if (props.data.key === "vCard") {
        // Check if infoCards is null or undefined
        if (!props.data.infoCards) {
          return [];
        }

        const rebatePercentCard = props.data.infoCards.find(
          (item: any) => item.key === "vCardRebatePercent",
        );
        const rebatePercentValue = rebatePercentCard
          ? rebatePercentCard.value
          : null;

        const floatDaysCard = props.data.infoCards.find(
          (item: any) => item.key === "vCardFloatDays",
        );
        const floatDaysValue = floatDaysCard ? floatDaysCard.value : null;

        const result = props.data.infoCards
          .map((card: any) => {
            if (card.key === "vCardRebate") {
              return {
                ...card,
                percentValue: rebatePercentValue, // Include percentValue
              };
            }
            if (card.key === "vCardCashFlowGain") {
              return {
                ...card,
                floatDays: floatDaysValue, // Include floatDays
              };
            }
            return card;
          })
          .filter(
            (card: any) =>
              card.key !== "vCardRebatePercent" &&
              card.key !== "vCardFloatDays",
          );

        return result;
      } else {
        return props.data.infoCards ?? [];
      } 
    });

    /**
     * length of info cards array
     */
    const infoCardsLength = computed(() => {
      return props.data.infoCards.length ?? 0;
    });

    function sendGroups(idGroup: string, type: string, level: string) {
      emit("change-groups", idGroup, type, level);
    }

    function getTitle(strategyKey: string) {
      if (strategyKey !== 'currentTerms') {
         return t('home.entityCard.strategies.' + strategyKey)

      } else {

        if (entityCardStore.getSelectedEntity?.companyTypeForTheme === "potential-supplier" || entityCardStore.getSelectedEntity?.companyTypeForTheme === "potential-parent") {
          return t('home.entityCard.strategies.estimatedTerms')
         }

        return t('global.averageDaysPaid')
      }
    }

    /**
     * Supplier Standard 2.0 only: "(DSO Adjusted)" / "(DSO Based)" annotation shown next to the
     * strategy title in this detail card. `strategy` here comes from dataExtraComputed, so
     * `strategy.details` already carries dsoAdjustmentApplied/dsoFallbackApplied.
     */
    function getSubTitle(strategy: any) {
      if (strategy.key !== 'supplierStandard2Strategy') {
        return '';
      }
      return PaymentTermsStrategiesUtils.getSupplierStandard2DsoAnnotation(strategy.details);
    }

    return {
      ...toRefs(data),
      getTitle,
      getSubTitle,
      hideAverageDaysPaid,
      dataExtraComputed,
      dataInfoCardsComputed,
      extraBelowComputed,
      getInfoCardParsedValue,
      getInfoCardValueClasses,
      getRainbowPillClasses,
      handleActiveResultTab,
      infoCardsLength,
      PaymentTermsStrategiesUtils,
      selectedHarmonizationGroup,
      sendGroups,
      setBarSize,
      titleOfCards,
      getStrategyKey,
      handleStrategyConfigSave,
      useFeatureLeverageDistribution,
      buyerLeverageDistribution,
      showSupplierLeverageDistributionChart,
      userIsSuperAdmin,
      useFeatureSupplierStandard,
      useFeaturePeerGroupStandard,
      getCombinationGroups,
      getCharts,
      configWasCustomizedComputed,
      getTerms,
      getConfigPG2,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/utils/_borders.scss";

.gray-bg {
  background: $color-gray-200;
}

.gray {
  background: rgba(252, 252, 253, 0.5);
  border: 1px solid $color-gray-200;
}

.card {
  min-height: auto !important;

  &:hover {
    box-shadow: 0 1px 5px $shadow;
  }
}

.adabot-section {
  ul {
    margin: 0;
    padding: 0;

    li {
      list-style: disc !important;
    }
  }
}

p {
  color: $color-gray-600 !important;
  font-size: 14px !important;
  font-style: normal !important;
  font-weight: 400 !important;
  margin-bottom: 0px !important;
  cursor: unset;
}

.info-button {
  display: flex;
  padding: 2px 6px;
  align-items: center;
  gap: 10px;
  border-radius: 4px;
  background: $color-gray-100;
  height: fit-content;
}

//- Show bullet in list items
.adabot-details {
  &:deep(ul) {
    margin-left: 24px;
  }

  &:deep(ul li) {
    list-style: disc;
  }

  &:deep(ul li.change-tab-strategies-cta) {
    cursor: pointer;
    border-bottom: 1px solid transparent;
    color: #667085;
    transition: all 0.3s ease;
  }

  &:deep(ul li.change-tab-strategies-cta:hover) {
    text-decoration: underline;
    cursor: pointer;
  }

  &:deep(.change-entity-tab) {
    color: $color-primary-500;
    font-weight: bolder;
  }

  &:deep(em) {
    color: $color-gray-600;
    font-size: x-small;
  }
}

</style>
