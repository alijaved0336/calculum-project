<template>
<intl :locale="locale">
  <div class="detailChild">
    <gridChild
      ref="grid"
      :data-items="dataResult"
      :columns="columnsToShow"
      :column-menu="!loadingExtra ? columnMenu : false"
      :take="take"
      :skip="skip"
      :sort="sort"
      :filter="filter"
      :sortable="!loadingExtra ? sortable : false"
      :pageable="false"
      :resizable="resizable"
      :loader="loading"
      :reorderable="reorderable"
      :row-render="validatePilotRowEntity"
      @datastatechange="dataStateChange"
      @columnreorder="onColumnReorder"
    >
      <template #datesInfoTemplate="{ props }">
        <DatesColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
        />
      </template>

      <template #moneyTemplate="{ props }">
        <MoneyColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          :locale="userNumberFormatting"
        />
      </template>

      <template #teamNameColumn="{ props }">
          <TextColumn :data-item="props.dataItem" :field="props.field" :aligment="'left'" />
      </template> 

      <template #decimalsTemplate="{ props }">
        <NoDecimalsColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          :locale="userNumberFormatting"
        />
      </template>

      <template #moneyTemplateRound="{ props }">
        <MoneyColumnRound
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          :decimals="1"
        />
      </template>

      <template #moneyTemplateRound0decimals="{ props }">
          <MoneyColumnRound
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
            :decimals="0"
          />
        </template>

      <template #harmofinanTemplate="{ props }">
        <HarmoFinanStyle
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
        />
      </template>

      <template #textTemplate="{ props }">
        <TextColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
        />
      </template>

      <!-- <template #flagTemplate="{ props }">
        <FlagColumns
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
        />
      </template> -->

      <template #percentColumn="{ props }">
        <PercentColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          :locale="userNumberFormatting"
        />
      </template>

      <template #supplierInfoTemplate="{ props }">
        <CompanyAbstractInfoColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          behavior="provider"
          :company-type="companyType"
          :entire-data="gridData"
        />
      </template>

      <template #supplierInfoTemplateSticky="{ props }">
        <CompanyAbstractInfoColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          behavior="provider"
          :sticky="true"
          :company-type="companyType"
          :entire-data="gridData"
        />
      </template>

      <template #providerInfoTemplate="{ props }">
        <CompanyAbstractInfoColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          behavior="provider"
          :company-type="companyType"
          :entire-data="gridData"
        />
      </template>

      <template #providerInfoTemplateSticky="{ props }">
        <CompanyAbstractInfoColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          behavior="provider"
          :sticky="true"
          :company-type="companyType"
          :entire-data="gridData"
        />
      </template>

      <template #buyerSpendsInfoTemplate="{ props }">
        <CompanyAbstractInfoColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          behavior="buyer"
          :company-type="companyType"
          :entire-data="gridData"
        />
      </template>

      <template #buyerSpendsInfoTemplateSticky="{ props }">
        <CompanyAbstractInfoColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          behavior="buyer"
          :sticky="true"
          :company-type="companyType"
          :entire-data="gridData"
        />
      </template>

      <template #buyerInfoTemplate="{ props }">
        <CompanyAbstractInfoColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          behavior="buyer"
          :company-type="companyType"
          :entire-data="gridData"
        />
      </template>

      <template #buyerInfoTemplateSticky="{ props }">
        <CompanyAbstractInfoColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          behavior="buyer"
          :sticky="true"
          :company-type="companyType"
          :entire-data="gridData"
        />
      </template>

      <template #parentCompanyInfoTemplate="{ props }">
        <CompanyAbstractInfoColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          behavior="providerParent"
          :company-type="companyType"
          :entire-data="gridData"
        />
      </template>

      <template #parentCompanyInfoTemplateSticky="{ props }">
        <CompanyAbstractInfoColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          behavior="providerParent"
          :sticky="true"
          :company-type="companyType"
          :entire-data="gridData"
        />
      </template>
      <template #activeProgramColumn="{ props }">
        <ActiveProgramColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
        />
      </template>

      <!-- /** REGULATORY TERMS */ -->
      <template #regulatoryTermsColumn="{ props }">
        <TooltipText :data-item="props.dataItem" behavior="regulatoryTerms" />
      </template>

      <!-- /** ENFORCED PROMOTED */ -->
      <template #enforcedPromotedColumn="{ props }">
        <TooltipText
          :data-item="props.dataItem"
          behavior="enforcedPromoted"
        />
      </template>

      <!-- /** Tooltip For Procurement Team */ -->
      <template #supplierTeamTooltip="{ props }">
        <TooltipText :data-item="props.dataItem" behavior="supplierTeam" />
      </template>

      <template #parentTeamTooltip="{ props }">
        <TooltipText :data-item="props.dataItem" behavior="parentTeam" />
      </template>

      <template #spendTeamTooltip="{ props }">
        <TooltipText :data-item="props.dataItem" behavior="spendTeam" />
      </template>

      <template #programListSpendTeamTooltip="{ props }">
        <TooltipText
          :data-item="props.dataItem"
          behavior="spendTeamProgramList"
        />
      </template>

      <!-- /** Tooltip For Commodity */ -->

      <template #commoditySpendColumn="{ props }">
        <TooltipColumn :data-item="props.dataItem" behavior="commoditySpend" />
      </template>
      <template #commodityColumn="{ props }">
        <TooltipColumn :data-item="props.dataItem" behavior="commodity" />
      </template>

      <template #supplierCommodityTooltip="{ props }">
        <TooltipText
          :data-item="props.dataItem"
          behavior="supplierCommodity"
        />
      </template>

      <template #spendCommodityTooltip="{ props }">
        <TooltipText :data-item="props.dataItem" behavior="spendCommodity" />
      </template>

      <!-- /** Tooltip For Original Name */ -->
      <template #spendOriginalNameTooltip="{ props }">
        <TooltipText
          :data-item="props.dataItem"
          behavior="spendOriginalName"
        />
      </template>

      <template #spendOriginalNameProgramListTooltip="{ props }">
        <TooltipText
          :data-item="props.dataItem"
          behavior="supplierOriginalNameProgramList"
        />
      </template>

      <template #supplierOriginalNameTooltip="{ props }">
        <TooltipText
          :data-item="props.dataItem"
          behavior="supplierOriginalName"
        />
      </template>

      <template #defaultTeamNameTooltip="{ props }">
        <TooltipText :data-item="props.dataItem" behavior="defaultTeamName" />
      </template>

      <template #parentOriginalNameTooltip="{ props }">
        <TooltipText
          :data-item="props.dataItem"
          behavior="parentOriginalName"
        />
      </template>

      <!-- /** Tooltip For Industry */ -->
      <template #industryColumn="{ props }">
        <TooltipColumn
          :data-item="props.dataItem"
          :field="props.field"
          behavior="industry"
        />
      </template>

      <!-- /** Tooltip For Buyer */ -->
      <template #buyerInfoTooltip="{ props }">
        <TooltipColumn
          :data-item="props.dataItem"
          :field="props.field"
          behavior="buyerInfo"
        />
      </template>

      <template #spendBuyerEntityTooltip="{ props }">
        <TooltipText
          :data-item="props.dataItem"
          behavior="spendBuyerEntity"
        />
      </template>

      <template #excludeInfoTemplate="{ props }">
        <ExcludeColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          :level-of-grid="levelOfGrid"
          :type-grid="'details'"
          :selected-program-id="programUUID"
          :avoid-action="true"
          @filter-status-by-row="filterStatusbyRow"
          @update-row-data="updaterowData"
        />
      </template>

      <template #pilotTemplate="{ props }">
          <PilotColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" :selected-program-id="programUUID" :level-of-grid="levelOfGrid" type-grid="details" :avoid-action="true" />
        </template>  


      <template #supplierInListParentCompanyInfoTemplateSticky="{ props }">
        <CompanyAbstractInfoColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
          :field="props.field" :for-supplier="true" behavior="provider" :company-type="companyType" :sticky="true" :entire-data="gridData" />
      </template>

      <template #nineBoxesFinancingSCF="{ props }">
          <NineBoxes 
            type-of9-boxes="scf9Box" :data-item="props.dataItem"
            :program-inrecalculation="programInrecalculation" />
        </template>

      <template #nineBoxes="{ props }">
        <NineBoxes type-of9-boxes="cashFlow" :data-item="props.dataItem" />
      </template>

      <template #nineBoxesFinancing="{ props }">
          <NineBoxes
            type-of9-boxes="financing"
            :data-item="props.dataItem"
            :program-inrecalculation="false"
          />
        </template>


      <template #nineBoxesCashFlowImpact="{ props }">
        <NineBoxesCashFlowImpact :data-item="props.dataItem" :field="'cashFlowImpactLabel'"/>
      </template>
      <template #nineBoxesSuccessProbability="{ props }">
        <ProbabilityOfSuccessLabel :data-item="props.dataItem" 
        :field="'successProbabilityLabel'" />
      </template>

      <template #nineBoxesVcard="{ props }">
          <NineBoxes
            type-of9-boxes="vcard"
            :data-item="props.dataItem"
            :program-inrecalculation="false"
          />
        </template>

        <template #vCardEconomicProfitImpactLabelVcard="{ props }">
          <NineBoxesCashFlowImpact
            :data-item="props.dataItem"
            :program-inrecalculation="false"
            :field="'vCardEconomicProfitImpactLabel'"
          />
        </template>

      <template #getMinDate="{ props }">
        <getMinMaxDate
          :data-set="gridData"
          :field="props.field"
          :get-max="false"
        />
      </template>

      <template #getMaxDate="{ props }">
        <getMinMaxDate
          :data-set="gridData"
          :field="props.field"
          :get-max="true"
        />
      </template>

      <template #sumSimpleNumbers="{ props }">
        <SumSimpleNumbers :data-set="gridData" :field="props.field" />
      </template>

      <template #goToPlan="{ props }">
        <GoToPlan :data-item="props.dataItem" />
      </template>

      <template #entityColumnTemplate="{ props }">
        <EntityColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          :company-type="companyType"
        />
      </template>

     
      <template #restrictModalEntitySpend="{ props }">
        <EntityColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :is-for-parent="true"
          :field="props.field"
          :company-type="companyType"
          :tab="tab"
          :level-of-grid="levelOfGrid"
          :restrict-:modal="true"
          :child-grid-expanded="childGridExpanded"
        />
      </template>
      <template #restrictModalEntitySupplier="{ props }">
        <EntityColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :is-for-parent="true"
          :field="props.field"
          :company-type="companyType"
          :tab="tab"
          :level-of-grid="levelOfGrid"
          :restrict-:modal="true"
          :child-grid-expanded="childGridExpanded"
        />
      </template>

        

      <template #entityOriginalNameTooltip="{ props }">
        <TooltipText
          :data-item="props.dataItem"
          behavior="entityOriginalName"
        />
      </template>

      <template #programColumn="{ props }">
        <ProgramColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
        />
      </template>

      <template #aliasTemplate="{ props }">
        <AliasTextEditableColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          @update-row-data="updaterowData"
        />
      </template>

      <template #showFlags="{ props }">
        <ShowFlags
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
        />
      </template>

      <template #HarmonizationFinancingView="{ props }">
        <HarmonizationFinancingView
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
        />
      </template>

      <template #entityColumnTemplateParent="{ props }">
        <EntityColumn
          v-if="props.rowType !== 'groupHeader'"
          :data-item="props.dataItem"
          :field="props.field"
          :company-type="companyType"
          :tab="tab"
          :behavior="'parent'"
         
        />
      </template>
      
      

      <template #harmonizationLevelText="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="harmonizations"
          />
        </template>
      <template #entityExternalIdText="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="entityExternalId"
          />
        </template>
      <template #paymentTermsAgreed="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="paymentTermsAgreed"
          />
        </template>
        <template #creditRatingSourceText="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="creditRatingSource"
          />
        </template>
        <template #creditRatingText="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="creditRating"
          />
        </template>
        <template #countryCreditRatingText="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="countryCreditRating"
          />
        </template>
        <template #entityStockPerformanceMarketIndexText="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="entityStockPerformanceMarketIndex"
          />
        </template>
        
        <template #entityCompanySizeText="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="entityCompanySize"
          />
          </template>
        <template #supplierCountCell="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="supplierCount"
          />
        </template>
        <template #spendCountCell="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="spendCount"
          />
        </template>
        <template #spendAliasCell="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="spendAlias"
          />
        </template>
        <template #entityBuyerLeverageLevelText="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="entityBuyerLeverageLevel"
          />
        </template>

      <!-- Negotiation Status -->

      <template #negotiationStatus="{ props }">
        <ColumnNegotiationStatus :data-item="props.dataItem" />
      </template>

      <!-- END Negotiation Status -->

      <template #scalePotentialScfrevenueColumn="{ props }">
        <NineBoxesCashFlowImpact :data-item="props.dataItem"  :field="'scalePotentialSCFRevenue'" />
      </template>

      <template #scaleFinancingValueToSupplierColumn="{ props }">
        <ProbabilityOfSuccessLabel :data-item="props.dataItem"  :field="'scaleFinancingValueToSupplier'" />
      </template>

      <template #scaleUsingFinancingColumn="{ props }">
        <ProbabilityOfSuccessLabel :data-item="props.dataItem"  :field="'scaleUsingFinancing'" />
      </template>

        <template #vCardBadge="{ props }">
          <VCardRelated
            :field="props.field"  
            :data-item="props.dataItem"
            :v-card-group-name="true"
            :item-index="getItemIndex(props.dataItem)"
          />
        </template>

        <template #booleanYesNoColumn="{ props }">
          <BooleanYesNoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
          />
        </template>
        
        <template #vCardRebatePercentCell="{ props }">
          <VCardRelated
            :field="props.field"
            :data-item="props.dataItem"
            :v-card-group-rebate="true"
          />
        </template>
        
        <template #vCardAcceptanceTypeCell="{ props }">
          <VCardRelated
            :field="props.field"
            :data-item="props.dataItem"
            :v-card-acceptance-type="true"
          />
        </template>


        <template #textTemplateLeftAlign="{ props }">
          <TextColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
            :aligment="'left'"
          />
        </template>


    </gridChild>
  </div>
</intl>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, ref, watch, toRefs, computed} from 'vue'
import { filterGroupByField, Grid, GridColumnProps, GridDataStateChangeEvent, GridFilterChangeEvent } from '@progress/kendo-vue-grid'
import { DataResult, SortDescriptor, State, process, CompositeFilterDescriptor } from '@progress/kendo-data-query'
import { IntlProvider } from '@progress/kendo-vue-intl'
import ActiveProgramColumn from './columns/ActiveProgramColumn.vue'
import AliasTextEditableColumn from './columns/AliasTextEditableColumn.vue'
import { BooleanYesNoColumn, MoneyColumn, NoDecimalsColumn, PercentColumn, TextColumn, TooltipColumn, TooltipText } from '@ada/design-system'
import ColumnNegotiationStatus from './columns/ColumnNegotiationStatus.vue'
import CompanyAbstractInfoColumn from './columns/CompanyAbstractInfoColumn.vue'
import DatesColumn from './columns/DatesColumn.vue'
import EntityColumn from './columns/graphql/EntityColumn.vue'
import ExcludeColumn from './columns/ExcludeColumn.vue'
import getMinMaxDate from '@/modules/components/grid/columns/getMinMaxDate.vue'
import GoToPlan from './columns/GoToPlan.vue'
import HarmoFinanStyle from './columns/HarmoFinanStyle.vue'
import HarmonizationFinancingView from './columns/HarmonizationFinancingView.vue'
import MoneyColumnRound from './columns/MoneyColumnRound.vue'
import NineBoxes from '@/modules/components/grid/columns/NineBoxes.vue'
import NineBoxesCashFlowImpact from '@/modules/components/grid/columns/NineBoxesCashFlowImpact.vue'
import ProbabilityOfSuccessLabel from '@ada/design-system/components/grid/custom-columns/ProbabilityOfSuccessLabel.vue'
import PilotColumn from './columns/PilotColumn.vue'
import ProgramColumn from './columns/graphql/ProgramColumn.vue'
import ShowFlags from './columns/graphql/ShowFlags.vue'
import SumSimpleNumbers from './columns/SumSimpleNumbers.vue'
import VCardRelated from './columns/VCardRelated.vue'
import { useUser } from '@/composables'
import * as kendoChartRelated from "@/utils/kendoChartRelated";
import { useUserStore } from '@/stores/user'


export default defineComponent({
name: "CalculumChildGrid",
components: {
  ActiveProgramColumn,
  AliasTextEditableColumn,
  BooleanYesNoColumn,
  ColumnNegotiationStatus,
  CompanyAbstractInfoColumn,
  DatesColumn,
  EntityColumn,
  ExcludeColumn,
  getMinMaxDate,
  GoToPlan: GoToPlan as any,
  gridChild: Grid,
  HarmoFinanStyle,
  HarmonizationFinancingView,
  intl: IntlProvider,
  MoneyColumn,
  MoneyColumnRound,
  NineBoxes,
  NineBoxesCashFlowImpact,
  ProbabilityOfSuccessLabel,
  NoDecimalsColumn,
  PercentColumn,
  PilotColumn,
  ProgramColumn,
  ShowFlags,
  SumSimpleNumbers,
  TextColumn,
  TooltipColumn,
  TooltipText,
  VCardRelated,
},
props: {
  columnMenu: { type: Boolean, required: false, default: true },
  companyType: { type: String, required: false, default: "" },
  csvFileName: { type: String, required: false, default: "List" },
  defaultPageSize: { type: Number, required: false, default: 50 },
  editList: { type: Boolean, required: false },
  gridColumns: { type: Array, required: true },
  gridData: { type: Array, required: true },
  levelOfGrid: { type: String, required: false, default: "spends" },
  loading: { type: Boolean, required: false, default: false },
  loadingExtra: { type: Boolean, required: false, default: false },
  programUUID: { type: String, required: false, default: "" },
  selectable: { type: Boolean, required: false, default: false },
  currentTab: { type: Number, required: false, default: 0 },
  childGridExpanded: { type: Boolean, required: false, default: false },
  tab: { type: Number, required: false, default: 0 },
},
emits: ["send-status-filter", "update-row-data-parent"],
setup(props: Record<string, any>, { emit }: { emit: (event: 'send-status-filter' | 'update-row-data-parent', ...args: any[]) => void }) {
  const keyComponent = ref(90001);
  const { isPilotAccount } = useUser();
  const userStore = useUserStore();

  onMounted(() => {
    const dataState: State = {
      skip: skip.value,
      take: take.value,
      sort: sort.value,
      filter: filter.value
    };
    dataResult.value = process(data() ?? [], dataState);
    removefilters()
  });


    function removefilters() {
    for (const row of calculumGrid.columnsToShow) {
        row.columnMenu =
          row.filterable === false 
      }
  }

  interface CalculumGrid {
    defaultColumns: any[];
    columnsToShow: any[];
    locale: string;
    userNumberFormatting: string;
    pageable: {
      buttonCount: number;
      info: boolean;
      type: string;
      pageSizes: number[];
      previousNext: boolean;
    };
  }

  const calculumGrid = reactive<CalculumGrid>({
    defaultColumns: props.gridColumns as any[],
    columnsToShow: props.gridColumns as any[],
    // In the future change this for correct locale value in vuex
    locale: "en-US",
    userNumberFormatting: userStore.getUserNumberFormatting,
    pageable: {
      buttonCount: 5,
      info: true,
      type: "numeric",
      pageSizes: [10, 25, 50, 100, 150],
      previousNext: true
    }
  });

  // Constants
  const dataResult = ref<DataResult>({ data: [] as any, total: 0 });
  const skip = ref<number | undefined>(0);
  const take = ref<number | undefined>(props.defaultPageSize);
  const sortable = ref(true);
  const resizable = ref(true);
  const reorderable = ref(false);
  const sort = ref<SortDescriptor[] | undefined>([]);
  const filter = ref<CompositeFilterDescriptor | undefined>();

  const filterSelected = ref(false);
  const filterData = ref();
  const selectedItems = ref();
  const allSelected = ref(false);

  // Methods
  const data = () => {
    return props.gridData;
  };

  /**
   * Updates the application state based on the provided data state.
   *
   * @param {State} dataState - The new data state to update the application state with.
   * @return {void} This function does not return anything.
   */
  const createAppState = (dataState: State) => {
    take.value = dataState.take;
    skip.value = dataState.skip;
    sort.value = dataState.sort;
    filter.value = dataState.filter;
  };

  /**
   * Updates the application state based on the provided data state change event.
   *
   * @param {GridDataStateChangeEvent} event - The event object containing the new data state.
   * @return {void} This function does not return anything.
   */
  const dataStateChange = (event: GridDataStateChangeEvent) => {
    createAppState(event.data);
    let isColumnActive = null;
    const changedColumn = calculumGrid.defaultColumns.find(
      column => column.field === event.event?.field
    );
    isColumnActive = filterGroupByField(
      event.event?.field,
      event.data.filter
    );
    if (changedColumn) {
      changedColumn.headerClassName = isColumnActive ? "active" : "";
    }
    if (event.data?.filter?.logic) {
      dataResult.value = process(data(), {
        sort: event.data.sort,
        filter: event.data.filter
      });
      filterData.value = dataResult.value.data;
      filterSelected.value = true;
      dataResult.value = process(data(), {
        skip: event.data.skip,
        take: event.data.take,
        sort: event.data.sort,
        filter: event.data.filter
      });
    } else {
      dataResult.value = process(data(), {
        skip: event.data.skip,
        take: event.data.take,
        sort: event.data.sort
      });
      selectedItems.value = null;
      filterData.value = null;
      filterSelected.value = false;
    }
  };

  watch(props, () => {
    const dataState: State = {
      skip: skip.value,
      take: take.value,
      sort: sort.value,
      filter: filter.value
    };
    dataResult.value = process(data(), dataState);
    allSelected.value = false;
    keyComponent.value = keyComponent.value + 1;
  });

  let columns = calculumGrid.columnsToShow as GridColumnProps[];
  /**
   * Updates the columns array with the new order of columns from the given options.
   *
   * @param {GridFilterChangeEvent} event - The event object containing the new filter.
   * @return {void} This function does not return anything.
   */
  function onFilterChange(event: GridFilterChangeEvent) {
    const isColumnActive = filterGroupByField(
      event.event.field,
      event.filter
    );
    const changedColumn = columns.find(function(column) {
      return column.field === event.event.field;
    });

    if (changedColumn) {
      changedColumn.headerClassName = isColumnActive ? "active" : "";
    }

    filter.value = event.filter;
    const dataState: State = {
      skip: skip.value,
      take: take.value,
      sort: sort.value,
      filter: filter.value
    };
    dataResult.value = process(data(), dataState);
  }

  /**
   * Updates the columns array with the new order of columns from the given options.
   *
   * @param {Object} options - An object containing the new order of columns.
   * @param {GridColumnProps[]} options.columns - An array of GridColumnProps representing the new order of columns.
   * @return {void} This function does not return anything.
   */
  function onColumnReorder(options: { columns: GridColumnProps[] }) {
    columns = options.columns;
  }

  /**
   * Emits an event to update the parent grid with new row data.
   *
   * @param {any} records - The new row data to be updated.
   * @param {any} type - The type of update being performed.
   * @return {void} This function does not return anything.
   */
  function updaterowData(records: any, type: any) {
    emit("update-row-data-parent", records, type);
  }

  /**
   * Emits an event to filter the rows of a child grid based on the given status, idForFilter, and entityType.
   *
   * @param {any} status - The status to filter the rows by.
   * @param {any} idForFilter - The id of the filter to apply.
   * @param {any} entityType - The type of entity to filter the rows by.
   * @return {void} This function does not return anything.
   */
  function filterStatusbyRow(status: any, idForFilter: any, entityType: any) {
    emit("send-status-filter", status, idForFilter, entityType);
  }

  /**
   * Validates a pilot row entity by adding a blur effect class if the row is a pilot account.
   *
   * @param {any} h - The Vue createElement function.
   * @param {any} trElement - The table row element.
   * @param {any} defaultSlots - The default slots for the table row.
   * @param {any} rowProps - The properties of the row.
   * @return {any} The table row element with the blur effect class added.
   */
  function validatePilotRowEntity(
    h: any,
    trElement: any,
    defaultSlots: any,
    rowProps: any
  ) {
    let finalClass = verifyIfPilotAccountAddBlurEffect(rowProps);
    let trProps = {
      class: finalClass
    };
    return h("tr", trProps, defaultSlots);
  }

  /*** Verify if pilot account add blur effect ***/
  function verifyIfPilotAccountAddBlurEffect(rowProps:any) {
    let validatedValue = kendoChartRelated.validatePilotAccount(rowProps, props.editList, isPilotAccount());
    return validatedValue;
  }

  const isPilotAccountConfirm = computed(() => {
    return isPilotAccount()
  })

  /**
   * Calculate the index of the dataItem in the gridData array
   * @param {object} dataItem - the item to find in the gridData array
   * @returns {number} - the index of the dataItem in the gridData array
   */
    function getItemIndex(dataItem : any) {
    return props.gridData.findIndex((item: any) => item === dataItem);
  
  }
 

  return {
    ...toRefs(calculumGrid),
    allSelected,
    columns,
    dataResult,
    dataStateChange,
    filter,
    filterStatusbyRow,
    getItemIndex,
    isPilotAccountConfirm,
    keyComponent,
    onColumnReorder,
    onFilterChange,
    reorderable,
    resizable,
    selectedItems,
    skip,
    sort,
    sortable,
    take,
    updaterowData,
    validatePilotRowEntity
  };
}
});
</script>
