<template>
  <intl :locale="locale">
    <div>
      <CalculumRecalculationModal :show="showModalRecalculation" @hide="hideModalRecalculation" />

      <!-- Loading Skeleton. Hidden by default. -->
      <GridSkeleton v-if="skeletonIsShowing" />
      <Grid
        v-else ref="grid" :key="keyGrid" :data-items="gridData" :columns="columns"
        :column-menu="!loadingExtra ? columnMenu : false" :selected-field="selectable ? selectedField : undefined"
        :take="takeToFilter" :skip="skipToFilter" :sort="sort" :filter="filterToGrid"
        :sortable="!loadingExtra ? sortable : false" :pageable="total > 0 ? pageable : null" :resizable="resizable"
        :reorderable="reorderingColumns" :expand-field="expandField"
        :row-render="rowColorfunction" :detail="detailName"
        :expand-column="{ locked: true, columnMenu: false }" :total="total" :style="{ height: gridHeight }"
        @pagechange="pageChange" @expandchange="expandChange" @datastatechange="dataStateChange"
        @columnreorder="onColumnReorder" @headerselectionchange="onHeaderSelectionChange"
        @selectionchange="onSelectionChange">
        <template #columnMenuTemplate="{ props }">
          <ColumnMenuGraphql
          :key="keyColumns" :column="props.column" :filterable="props.filterable"
            :filter="filterToGridForColumnMenu" :sortable="props.sortable" :sort="props.sort" :datos="setdataForColumns"
            :remainig-items="remainItem" :summary-operation="summaryOperation" :total="forRecordsCount.recordsCount ?? 0" :loading-items-api="loadingItems"
            @sortchange="(e) => props.onSortchange(e)" @filterchange="(e) => props.onFilterchange(e)"
            @closemenu="(e) => props.onClosemenu(e)" @contentfocus="(e) => props.onContentfocus(e)"
            @columnssubmit="onColumnsSubmit" @send-column-filtered="sendColumnFiltered"
            @show-values-by-column="showValuesbycolumn" />
        </template>

        <template #columnMenuTemplateActions="{ props }">
          <ColumnMenuActions
          v-show="!hideEditColumnMenu" :allow-exclude="allowExclude" :allow-move-between="allowMoveBetween"
            :adjust-pilot-account="adjustPilotAccount" :datos="gridData" :has-financing="hasFinancing"
            :has-harmonization="hasHarmonization" :level-of-grid="levelOfGrid" :remove-group="removeGroup"
            :sort="props.sort" :sortable="props.sortable" :column="props.column" :filter="props.filter"
            :filterable="props.filterable" @closemenu="props.onClosemenu" @columnssubmit="onColumnsSubmit"
            @contentfocus="props.onContentfocus" @filterchange="props.onFilterchange"
            @grid-add-group="gridAddGroup" @grid-add-vgroup="gridAddVGroup" @grid-approach="gridApproach"
            @grid-exclude="gridExclude" @grid-include-pilot="gridIncludePilot" @grid-remove-group="gridRemoveGroup"
            @negotiation-status-changed="
              (negotiationStatus) =>
                negotiationStatusOnChanged(negotiationStatus)
            " @show-harmonization-modal="closeHarmonizationModal" @show-move-between-modal="closeMoveBetweenModal" @show-remove-plan-modal="closeRemovePlanModal"
            @show-target-modal-emit="showTargetModal" @show-target-clear-modal="showTargetClearModal"
            @sortchange="props.onSortchange" @show-supplier-standard-modal="showSupplierStandardModal"
            @show-peer-group-standard-modal="showPeerGroupStandardModal"
            @show-multiple-export-modal="$emit('show-multiple-export-modal',levelOfGrid )" />
        </template>

        <template #columnMatchTemplateActions="{ props }">
          <ColumnMatchActions
            :column="props.column" :filterable="props.filterable" :filter="props.filter"
            :sortable="props.sortable" :sort="props.sort" :datos="gridData" @sortchange="props.onSortchange"
            @filterchange="props.onFilterchange" @closemenu="props.onClosemenu"
            @contentfocus="props.onContentfocus" @columnssubmit="onColumnsSubmit"
            @grid-match-remove="gridMatchRemove" />
        </template>

        <toolbar v-if="showToolbar || isFilterApplied" id="toolbarTabsFilterOptions" :class-name="customToolbar">
          <GraphqlGridToolbar
            :title="title"
            :loading-extra="loadingExtra"
            :is-filter-applied="isFilterApplied"
            :show-excel-toolbar="showExcelToolbar"
            :tabs="graphqlGridToolbarTabs"
            :match="graphqlGridToolbarMatch"
            :column-selector="graphqlGridToolbarColumnSelector"
            @select="onToolbarSelect"
            @clear-filters="clearFilters"
            @grid-match-remove="gridMatchRemove"
            @match-edit-list="$emit('match-edit-list')"
            @submit-columns-menu="onToolbarSubmitColumnsMenu"
            @reset-default-columns="resetDefaultColumns"
            @export-excel="exportExcel"
          />
        </toolbar>
        <template #listSuppliersChildBoxes="{ props }">
          <SupplierGridBoxes
            :data-item="props.dataItem" :level="selectedLevelForExpandChildGrids"
            :selected-program-id="selectedProgramId" :type-of-9-boxes="typeOf9Boxes" />
        </template>

        <template #detailTemplateSupplier="{ props }">
          <SupplierGridDetails :data-item="props.dataItem" :tab="selectedTabIndex" />
        </template>

        <template #detailTemplateParent="{ props }">
          <ParentGridDetails :data-item="props.dataItem" :tab="selectedTabIndex" />
        </template>

        <template #detailTemplateSupplierAnalyze="{ props }">
          <SupplierGridAnalyze
            :data-item="props.dataItem" :cols-cache="gridColumns"
            :selected-program-id="selectedProgramId" :tab="selectedTabIndex" />
        </template>

        <template #listParentsChildBoxes="{ props }">
          <ParentGridBoxes
            :data-item="props.dataItem" :level="selectedLevelForExpandChildGrids"
            :selected-program-id="selectedProgramId" :type-of-9-boxes="typeOf9Boxes" />
        </template>

        <template #detailTemplateParentAnalyze="{ props }">
          <ParentGridAnalyze
            :data-item="props.dataItem" :cols-cache="gridColumns"
            :selected-program-id="selectedProgramId" :field="props.field"
            :company-type="companyType" :tab="selectedTabIndex" />
        </template>

        <template #detailTemplateSupplierAnalyzeEdit="{ props }">
          <SupplierGridAnalyzeEdit
            :data-item="props.dataItem" :tab="selectedTabIndex"
            :selected-program-id="selectedProgramId" />
        </template>

        <template #approvedDataChangeColumn="{ props }">
          <AdminDataColumn :data-item="props.dataItem" @show-modal="showAdminDataChangeModal" />
        </template>

        <!-- Negotiation Status -->

        <template #negotiationStatus="{ props }">
          <ColumnNegotiationStatus :data-item="props.dataItem" />
        </template>

        <!-- END Negotiation Status -->

        <!-- PLAN LIST -->

        <template #planListSupplierIndustryNameTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="planListSupplierIndustryName" />
        </template>

        <!-- /** REGULATORY TERMS */ -->

        <template #regulatoryTermsColumn="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="regulatoryTerms" />
        </template>

        <!-- /** ENFORCED PROMOTED */ -->

        <template #enforcedPromotedColumn="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="enforcedPromoted" />
        </template>

        <!-- /** MATCH LIST */ -->
        <template #domainMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="domainMatch" />
        </template>
        <template #currencyMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="currencyMatch" />
        </template>
        <template #originalPaymentTermDescriptionMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="originalPaymentTermDescriptionMatch" />
        </template>
        <template #alpha3CodeMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="alpha3CodeMatch" />
        </template>
        <template #countryMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="countryMatch" />
        </template>
        <template #originalZipCodeMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="originalZipCodeMatch" />
        </template>
        <template #originalAddressMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="originalAddressMatch" />
        </template>
        <template #cityMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="cityMatch" />
        </template>
        <template #originalCityMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="originalCityMatch" />
        </template>
        <template #stateMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="stateMatch" />
        </template>

        <template #zipCodeMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="zipCodeMatch" />
        </template>

        <template #originalStateMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="originalStateMatch" />
        </template>
        <template #nameMatchListTooltipSticky="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="nameMatchList" :sticky="false" />
        </template>
        <template #aggregatedLinesCountMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="aggregatedLinesCountMatch" />
        </template>

        <template #aggreatedLinesCountMatchFooter="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="aggreatedLinesCountMatchFooter" :data-set="gridData" />
        </template>
        <template #originalIdNumberMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="originalIdNumberMatch" />
        </template>

        <template #confidenceScoreColumnSticky="{ props }">
          <ConfidenceScoreColumn :data-item="props.dataItem" :sticky="false" />
        </template>
        <template #addressTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="address" />
        </template>

        <template #suppliersReceivedAddressTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="suppliersReceivedAddress" />
        </template>

        <template #suppliersReceivedOriginalCommodityTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="suppliersReceivedOriginalCommodity" />
        </template>

        <template #suppliersReceivedUltimateParentTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="suppliersReceivedUltimateParent" />
        </template>

        <template #suppliersReceivedNameMatchListTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="suppliersReceivedName" />
        </template>

        <template #supplierNameMatchListUltimateParentTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="supplierNameMatchListUltimateParent" />
        </template>

        <template #clusterSimilarityRateText="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterSimilarityRateText" />
        </template>

        <template #clusterSupplierRegion="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterSupplierRegion" />
        </template>

        <template #clusterSupplierCountryCode="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterSupplierCountryCode" />
        </template>

        <template #clusterBuyerLeverage="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterBuyerLeverage" />
        </template>

        <template #clusterBuyerCountryCode="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterBuyerCountryCode" />
        </template>

        <template #clusterNaicsCode="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterNaicsCode" />
        </template>

        <template #clusterFirstQuartile="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterFirstQuartile" />
        </template>

        <template #clusterMedian="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterMedian" />
        </template>

        <template #clusterThirdQuartile="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterThirdQuartile" />
        </template>

        <template #clusterNinety="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterNinety" />
        </template>

        <template #clusterOccurrences="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterOccurrences" />
        </template>

        <template #clusterMin="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterMin" />
        </template>

        <template #clusterMax="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterMax" />
        </template>

        <template #clusterInfo="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterInfo" />
        </template>

        <template #clusterAverage="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterAverage" />
        </template>

        <template #clusterIdPeerGroup="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterIdPeerGroup" />
        </template>

        <template #clusterIdSupplierStandard="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterIdSupplierStandard" />
        </template>

        <template #clusterBuyerRegion="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterBuyerRegion" />
        </template>

        <template #clusterVersion="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterVersion" />
        </template>

        <template #clusterCompaniesCount="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterCompaniesCount" />
        </template>

        <template #clusterCompanies="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterCompanies" />
        </template>

        <template #clusterSuppliers="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterSuppliers" />
        </template>

        <template #clusterParents="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterParents" />
        </template>

        <template #clusterSupplierName="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterSupplierName" />
        </template>

        <template #clusterParentName="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="clusterParentName" />
        </template>

        <template #nameMatchListTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="nameMatchList" />
        </template>

        <template #originalParentCompanyNameMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="originalParentCompanyNameMatch" />
        </template>

        <template #originalSupplierNameMatch="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="originalSupplierNameMatch" />
        </template>

        <template #selectedCompanyFinancialDataView="{ props }">
          <SelectedEntity :data-item="props.dataItem" @select-company-entity="selectCompanyEntity" />
        </template>

        <template #selectedCompanyFinancialDataViewName="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="nameFinancingData" />
        </template>
        <template #selectedCompanyFinancialDataViewCountry="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="countryFinancingData" />
        </template>
        <template #selectedCompanyFinancialDataViewRegion="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="regionFinancingData" />
        </template>
        <template #selectedCompanyFinancialDataViewIndustry="{ props }">
          <TooltipColumn :data-item="props.dataItem" behavior="industryFinancingData" :field="props.field" />
        </template>
        <template #selectedCompanyFinancialDataViewNaicsCode="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="naicsFinancingData" />
        </template>


        <!-- /** Tooltip Text Ellipsis */ -->

        <template #supplierCommodityTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="supplierCommodity" />
        </template>

        <template #spendCommodityTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="spendCommodity" />
        </template>

        <!-- /** Tooltip For Original Name */ -->

        <template #spendOriginalNameTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="spendOriginalName" />
        </template>

        <template #entityOriginalNameTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="entityOriginalName" />
        </template>

        <template #spendOriginalNameProgramListTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="supplierOriginalNameProgramList" />
        </template>

        <template #supplierOriginalNameTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="supplierOriginalName" />
        </template>

        <template #defaultTeamNameTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="defaultTeamName" />
        </template>

        <template #parentOriginalNameTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="parentOriginalName" />
        </template>

        <template #spendBuyerEntityTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="spendBuyerEntity" />
        </template>

        <template #supplierBuyerEntityTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="supplierBuyerEntity" />
        </template>

        <template #spendTeamTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="spendTeam" />
        </template>

        <template #programListSpendTeamTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="spendTeamProgramList" />
        </template>

        <template #planListSpendTeamTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="spendTeamProgramList" />
        </template>

        <template #supplierTeamTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="supplierTeam" />
        </template>

        <template #parentTeamTooltip="{ props }">
          <TooltipText :data-item="props.dataItem" behavior="parentTeam" />
        </template>


        <template #detailTemplateParentAnalyzeEdit="{ props }">
          <ParentGridAnalyzeEdit
            :data-item="props.dataItem" :selected-program-id="selectedProgramId"
            :tab="selectedTabIndex" />
        </template>

        <template #datesInfoTemplate="{ props }">
          <DatesColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
        </template>

        <template #moneyTemplate="{ props }">
          <MoneyColumn
            v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field"
            :program-inrecalculation="programInrecalculation" :locale="userNumberFormatting" />
        </template>

        <template #percentColumn="{ props }">
          <PercentColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field"
            :locale="userNumberFormatting" />
        </template>

        <template #moneyTemplateRound="{ props }">
          <MoneyColumnRound
            v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field"
            :decimals="1" />
        </template>

        <template #moneyTemplateRound0decimals="{ props }">
          <MoneyColumnRound
            v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field"
            :decimals="0" />
        </template>

        <template #moneyRoundSummaryTemplate="{ props }">
          <MoneyColumnRoundSummary :data-set="gridData" :field="props.field" />
        </template>

        <template #moneyRoundSummaryNoneDecimalsTemplate="{ props }">
          <MoneyColumnRoundSummary :data-set="gridData" :field="props.field" />
        </template>

        <template #TotalsBycolumnsSum="{ props }">
          <TotalsFooterColumn
:data-set="totalsBycolumnsData" :field="props.field" :loading-data="loadData"
            :behavior="'sum'" :analyze-store="analyzeStore" :locale="userNumberFormatting" />
        </template>

        <template #TotalsBycolumnsCount="{ props }">
          <TotalsFooterColumn
:data-set="totalsBycolumnsData" :field="props.field" :loading-data="loadData"
            :behavior="'count'" :analyze-store="analyzeStore" :locale="userNumberFormatting" />
        </template>

        <template #TotalsBycolumnsAvgWeightedCeil="{ props }">
          <TotalsFooterColumn
:data-set="totalsBycolumnsData" :field="props.field" :loading-data="loadData"
            :behavior="'avg.weighted.ceil'" :analyze-store="analyzeStore" :locale="userNumberFormatting" />
        </template>

        <template #TotalsBycolumnsCountTrue="{ props }">
          <TotalsFooterColumn
:data-set="totalsBycolumnsData" :field="props.field" :loading-data="loadData"
            :behavior="'count.true'" :analyze-store="analyzeStore" :locale="userNumberFormatting" />
        </template>

        <template #weightAvgRoundSummaryOneDecimalsTemplate="{ props }">
          <WeightAvgColumnSummaryOneDecimals :data-set="gridData" :field="props.field" />
        </template>

        <template #weightAvgRoundSummaryNoneDecimalsTemplate="{ props }">
          <WeightAvgColumnSummaryNoneDecimals :data-set="gridData" :field="props.field" />
        </template>

        <template #textJointColumnSummaryTemplate="{ props }">
          <TextJointColumnSummary :data-set="gridData" :field="props.field" />
        </template>

        <template #adminUsername="{ props }">
          <AdminUsername :data-item="props.dataItem" />
        </template>

        <template #adminUserLastAccess="{ props }">
          <AdminUserLastAccess :data-item="props.dataItem" />
        </template>

        <template #adminUserDisabledStatus="{ props }">
          <AdminUserEnabledStatus :data-item="props.dataItem" />
        </template>

        <template #excludeInfoTemplate="{ props }">
          <ExcludeColumn
v-if="props.rowType !== 'groupHeader'" :key="excludeColumnKey" :data-item="props.dataItem"
            :field="props.field" :filter="filterToGridForColumnMenu" :selected-program-id="selectedProgramId"
            :level-of-grid="levelOfGrid" @show-recalculation="showRecalculation" @close-loading="closeLoading"
            @update-row-data="updaterowData" @show-spend-modal="showSpendModal"
            @filter-status-by-row="filterStatusbyRow" />
        </template>

        <template #pilotTemplate="{ props }">
          <PilotColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field"
            :selected-program-id="selectedProgramId" :level-of-grid="levelOfGrid" @update-row-data="updaterowData" />
        </template>

        <template #harmonizationTemplate="{ props }">
          <HarmonizationColumn
v-if="props.rowType !== 'groupHeader'" :key="harmonizationColumnKey"
            :data-item="props.dataItem" :filter="filterToGridForColumnMenu" :selected-program-id="selectedProgramId"
            :level-of-grid="levelOfGrid" :program-inrecalculation="programInrecalculation" @close-loading="closeLoading"
            @update-row-data="updaterowData" @show-recalculation="showRecalculation"
            @show-harmonization-modal="closeHarmonizationModal"
            @filter-harmonization-by-row="filterHarmonizationbyRow" />
        </template>

        <template #financingTemplate="{ props }">
          <FinancingColumn
v-if="props.rowType !== 'groupHeader'" :key="financingColumnKey" :data-item="props.dataItem"
            :field="props.field" :filter="filterToGridForColumnMenu" :selected-program-id="selectedProgramId"
            :program-inrecalculation="programInrecalculation" :remove-group="removeGroup" :level-of-grid="levelOfGrid"
            @close-loading="closeLoading" @update-row-data="updaterowData"
            @show-harmonization-modal="closeHarmonizationModal" @filter-financing-by-row="filterFinancingbyRow"
            @show-recalculation="showRecalculation" />
        </template>

        <template #harmofinanTemplate="{ props }">
          <HarmoFinanStyle
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field"
            :columns-locked="columnsLocked" />
        </template>

        <template #flagTemplate="{ props }">
          <FlagColumns v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
        </template>

        <template #showFlags="{ props }">
          <ShowFlags v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
        </template>

        <template #flagCompareAddCompanies="{ props }">
          <FlagColumns :data-item="props.dataItem" :field="props.field" :for-compare-add-companies="true" />
        </template>

        <template #companiesListTemplate="{ props }">
          <CompaniesListColumn
            :data-item="props.dataItem"
            :field="props.field"
            @edit-user-company="$emit('edit-user-company', $event)"
            @show-more-user-company="$emit('companies-list-show-more', $event)"
          />
        </template>

        <template #companyUiGroupNameBadges="{ props }">
          <CompanyUiGroupNameColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
          />
        </template>

        <template #decimalsTemplate="{ props }">
          <NoDecimalsColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field"
            :program-inrecalculation="programInrecalculation" :locale="userNumberFormatting" />
        </template>

        <template #customDataPointNumericTemplate="{ props }">
          <CustomDataPointNumericColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
        </template>

        <template #regulatoryCountrySourceTemplate="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="regulatoryCountrySource" />
        </template>

        <template #textTemplate="{ props }">
          <TextColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
        </template>

        <template #textTemplateLeftAlign="{ props }">
          <TextColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field"
            :aligment="'left'" />
        </template>

        <template #teamNameColumn="{ props }">
          <TeamNameCell
            :data-item="props.dataItem" :field="props.field" :row-type="props.rowType"
            :handle-edit-program-action="handleEditProgramAction"
            :active-manage-team-row-key="activeManageTeamRowKey"
            :handlers="teamNameCellHandlers" />
        </template>

        <template #ethnicTemplate="{ props }">
          <EthnicColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
        </template>

        <template #womanTemplate="{ props }">
          <WomanColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
        </template>

        <template #esgTemplate="{ props }">
          <EsgColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
        </template>

        <template #dateTermsTemplate="{ props }">
          <DateTermsColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
        </template>

        <template #aliasTemplate="{ props }">
          <AliasTextEditableColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" @update-row-data="updaterowData" />
        </template>

        <template #totalTemplateString="{ props }">
          <TotalStringCell :field="props.field" />
        </template>

        <template #supplierSpendsInfoTemplate="{ props }">
          <CompanyAbstractInfoColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :entire-data="gridData" behavior="provider" />
        </template>

        <template #supplierSpendsInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :entire-data="gridData" behavior="provider" />
        </template>

        <template #buyerSpendsInfoTemplate="{ props }">
          <CompanyAbstractInfoColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :entire-data="gridData" behavior="buyer" />
        </template>

        <template #buyerSpendsInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :entire-data="gridData" behavior="buyer" :sticky="true" />
        </template>

        <template #buyerInfoTemplate="{ props }">
          <CompanyAbstractInfoColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :entire-data="gridData" behavior="buyer" />
        </template>

        <template #buyerInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :entire-data="gridData" behavior="buyer" :sticky="true" />
        </template>

        <template #providerInfoTemplate="{ props }">
          <CompanyAbstractInfoColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :entire-data="gridData" behavior="provider" />
        </template>

        <template #entityColumnTemplate="{ props }">
          <EntityColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :is-for-parent="isForParent"
            :field="props.field" :company-type="companyType" :restrict-modal="false" :disable-click="compareList"
            @change-tab="changeTab" />
        </template>
        <!-- parent info on supplier level tab-->
        <template #entityColumnTemplateParent="{ props }">
          <EntityColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :is-for-parent="isForParent"
            :field="props.field" :company-type="companyType" :tab="selectedTabIndex" :restrict-modal="true"
            @change-tab="changeTab" />
        </template>

        <template #restrictModalEntitySpend="{ props }">
          <EntityColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :is-for-parent="isForParent"
            :field="props.field" :company-type="companyType" :tab="selectedTabIndex" :restrict-modal="true"
            @change-tab="changeTab" />
        </template>
        <template #restrictModalEntitySupplier="{ props }">
          <EntityColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :is-for-parent="isForParent"
            :field="props.field" :company-type="companyType" :tab="selectedTabIndex" :restrict-modal="true"
            @change-tab="changeTab" />
        </template>

        <template #providerInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :entire-data="gridData" behavior="provider" :sticky="true" />
        </template>

        <template #supplierInListParentCompanyInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :entire-data="gridData" :for-supplier="true" behavior="provider" :sticky="true" />
        </template>

        <template #parentCompanyInfoTemplate="{ props }">
          <CompanyAbstractInfoColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :entire-data="gridData" behavior="providerParent" />
        </template>

        <template #parentCompanyInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :entire-data="gridData" behavior="providerParent" :sticky="true" />
        </template>

        <template #activeProgramColumn="{ props }">
          <ActiveProgramColumn
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" />
        </template>

        <template #historicalSourceTemplate="{ props }">
          <HistoricalSourceColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" />
        </template>

        <template #programColumn="{ props }">
          <ProgramColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
        </template>

        <template #dataChangedValuesResult="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="data-changed" />
        </template>
        <template #entityExternalIdText="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="entityExternalId" />
        </template>
        <template #harmonizationLevelText="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="harmonizations" />
        </template>
        <template #creditRatingSourceText="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="creditScoreSource" />
        </template>
        <template #creditRatingText="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="creditRating" />
        </template>
        <template #countryCreditRatingText="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="countryCreditRating" />
        </template>
        <template #entityStockPerformanceMarketIndexText="{ props }">
          <TooltipColumn
:data-item="props.dataItem" :field="props.field"
            behavior="entityStockPerformanceMarketIndex" />
        </template>

        <template #entityCompanySizeText="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="entityCompanySize" />
        </template>
        <template #isSME="{ props }">
          <SmeColumn :data-item="props.dataItem" />
        </template>
        <template #booleanYesNoColumn="{ props }">
          <BooleanYesNoColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
        </template>
        <template #supplierCountCell="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="supplierCount" />
        </template>
        <template #spendCountCell="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="spendCount" />
        </template>
        <template #spendAliasCell="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="spendAlias" />
        </template>
        <template #entityBuyerLeverageLevelText="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="entityBuyerLeverageLevel" />
        </template>
        <template #paymentTermsAgreed="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="paymentTermsAgreed" />
        </template>
        <template #entitySupplierLeverageLevelText="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="entitySupplierLeverageLevelText" />
        </template>

        <template #commodityColumn="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="commodityMatch" />
        </template>

        <!-- SPEND Commodity Column -->

        <template #commoditySpendColumn="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="commoditySpend" />
        </template>

        <template #industryColumn="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="industry" />
        </template>

        <template #userMessage="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="user-message" />
        </template>

        <template #userRoles="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="roles" />
        </template>

        <template #industryCompareAddCompaniesColumn="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="compareIndustry" />
        </template>

        <template #buyerInfoTooltip="{ props }">
          <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="buyerInfo" />
        </template>

        <!-- Nine Boxes -->

        <template #nineBoxes="{ props }">
          <NineBoxes
            type-of9-boxes="cashFlow" :data-item="props.dataItem"
            :program-inrecalculation="programInrecalculation" />
        </template>
        <template #nineBoxesFinancing="{ props }">
          <NineBoxes
            type-of9-boxes="financing" :data-item="props.dataItem"
            :program-inrecalculation="programInrecalculation" />
        </template>

        <template #nineBoxesFinancingSCF="{ props }">
          <NineBoxes
            type-of9-boxes="scf9Box" :data-item="props.dataItem"
            :program-inrecalculation="programInrecalculation" />
        </template>

        <template #nineBoxesVcard="{ props }">
          <NineBoxes
            type-of9-boxes="vcard" :data-item="props.dataItem"
            :program-inrecalculation="programInrecalculation" />
        </template>

        <template #nineBoxesCashFlowImpact="{ props }">
          <NineBoxesCashFlowImpact
:data-item="props.dataItem" :program-inrecalculation="programInrecalculation"
            :field="'cashFlowImpactLabel'" />
        </template>

        <template #nineBoxesCashFlowImpactSCF="{ props }">
          <NineBoxesCashFlowImpact
:data-item="props.dataItem" :program-inrecalculation="programInrecalculation"
            :field="'cashFlowImpactLabelSCF'" />
        </template>


        <template #vCardEconomicProfitImpactLabelVcard="{ props }">
          <NineBoxesCashFlowImpact
:data-item="props.dataItem" :program-inrecalculation="programInrecalculation"
            :field="'vCardEconomicProfitImpactLabel'" />
        </template>

        <template #scalePotentialScfrevenueColumn="{ props }">
          <NineBoxesCashFlowImpact
:data-item="props.dataItem" :program-inrecalculation="programInrecalculation"
            :field="'scalePotentialSCFRevenue'" />
        </template>

        <template #nineBoxesSuccessProbability="{ props }">
          <ProbabilityOfSuccessLabel
:data-item="props.dataItem" :program-inrecalculation="programInrecalculation"
            :field="'successProbabilityLabel'" />
        </template>

        <template #scaleFinancingValueToSupplierColumn="{ props }">
          <ProbabilityOfSuccessLabel
:data-item="props.dataItem" :program-inrecalculation="programInrecalculation"
            :field="'scaleFinancingValueToSupplier'" />
        </template>

        <template #scaleUsingFinancingColumn="{ props }">
          <ProbabilityOfSuccessLabel
:data-item="props.dataItem" :program-inrecalculation="programInrecalculation"
            :field="'scaleUsingFinancing'" />
        </template>

        <!-- END Nine Boxes -->

        <!-- Graphql columns -->

        <template #HarmonizationFinancingView="{ props }">
          <HarmonizationFinancingView
v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem"
            :field="props.field" :columns-locked="columnsLocked" :program-inrecalculation="programInrecalculation" />
        </template>

        <template #detailPlanSuppliersGraphql="{ props }">
          <SupplierGridPlanGraphql
:data-item="props.dataItem" :plan-id="planId" :phase-id="phaseId"
            :overview-plan-list="overviewPlanList" :tab="selectedTabIndex" />
        </template>

        <template #detailPlanParentsGridGraphql="{ props }">
          <ParentsGridPlanGraphql
:data-item="props.dataItem" :plan-id="planId" :phase-id="phaseId"
            :overview-plan-list="overviewPlanList" :tab="selectedTabIndex" />
        </template>

        <!-- FOR VCARD RELATED-->
        <template #vCardBadge="{ props }">
          <VCardRelated
:field="props.field" :data-item="props.dataItem" :v-card-group-name="true"
            :item-index="getItemIndex(props.dataItem)" />
        </template>
        <template #vCardRebatePercentCell="{ props }">
          <VCardRelated :field="props.field" :data-item="props.dataItem" :v-card-group-rebate="true" />
        </template>
        <template #vCardAcceptanceTypeCell="{ props }">
          <VCardRelated :field="props.field" :data-item="props.dataItem" :v-card-acceptance-type="true" />
        </template>

        <template #forecastEditValueColumnCell="{ props }">
          <ForecastEditValueColumn :field="props.field" :data-item="props.dataItem" @value-changed="valueChanged" />
        </template>



        <!-- END VCARD RELATED-->

        <!-- Admin Console User Actions -->
        <template #adminUserActions="{ props }">
          <AdminUserActions
            :for-super-admin-value="forSuperAdmin"
            :for-company-admin-value="forCompanyAdmin"
            :data-item="props.dataItem"
            @edit-user="editUserFromAdminDashboard"
            @delete-user="deleteUserFromAdminDashboard"
            @toggle-options="toggleOptionsAdminDashboard"
            @revoke-access="revokeAccessAdminDashboard"
            @reset-identity-provider="resetIdentityProvider"
            @grant-access="grantAccess"
            @resend-invitation="resendInvitationAdminDashboard"
            @invalidate-token="invalidateToken" />
        </template>

        <template #adminUserActionsGlobalManage="{ props }">
          <AdminUserActions
            :for-super-admin-value="forSuperAdmin"
            :for-company-admin-value="forCompanyAdmin"
            :global-manage-value="true"
            :data-item="props.dataItem"
            @edit-user="editUserFromAdminDashboard"
            @delete-user="deleteUserFromAdminDashboard"
            @toggle-options="toggleOptionsAdminDashboard"
            @revoke-access="revokeAccessAdminDashboard"
            @reset-identity-provider="resetIdentityProvider"
            @grant-access="grantAccess"
            @resend-invitation="resendInvitationAdminDashboard"
            @invalidate-token="invalidateToken" />
        </template>
        <!-- END Admin Console -->

      </Grid>
    </div>
  </intl>
</template>

<script setup lang="ts">
import {
  onMounted,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
  toRef,
  toRefs,
  computed,
  type PropType,
  type Ref,
} from "vue";

// Kendo
import {
  Grid as KendoGrid,
  GridToolbar as toolbar,
} from "@progress/kendo-vue-grid";
import { IntlProvider as intl } from "@progress/kendo-vue-intl";
// Kendo Grid has no typed named slots; keep template checking usable under script setup.
const Grid = KendoGrid as any;
// Columns
import { useSpendFile } from "@/composables";
import ActiveProgramColumn from "./columns/ActiveProgramColumn.vue";
import AdminDataColumn from "@/modules/components/grid/columns/AdminDataColumn.vue";
import AdminUserActions from "@/modules/components/grid/columns/AdminUserActions.vue";
import AdminUserEnabledStatus from "@/modules/components/grid/columns/AdminUserEnabledStatus.vue";
import AdminUserLastAccess from "@/modules/components/grid/columns/AdminUserLastAccess.vue";
import AdminUsername from "@/modules/components/grid/columns/AdminUsername.vue";
import AliasTextEditableColumn from "./columns/AliasTextEditableColumn.vue";
import { BooleanYesNoColumn, MoneyColumn, TotalsFooterColumn, NoDecimalsColumn, PercentColumn, TextColumn, TooltipColumn, TooltipText, ConfidenceScoreColumn } from "@ada/design-system";
import CalculumRecalculationModal from "@/modules/components/CalculumRecalculationModal.vue";
import ColumnMatchActions from "./columns/ColumnMatchActions.vue";
import ColumnMenuActions from "./columns/ColumnMenuActions.vue";
import ColumnMenuGraphql from "./columns/ColumnMenuGraphql.vue";
import ColumnNegotiationStatus from "./columns/ColumnNegotiationStatus.vue";
import CompaniesListColumn from "./columns/CompaniesListColumn.vue";
import CompanyAbstractInfoColumn from "./columns/CompanyAbstractInfoColumn.vue";
import CompanyUiGroupNameColumn from "./columns/CompanyUiGroupNameColumn.vue";
import DatesColumn from "./columns/DatesColumn.vue";
import DateTermsColumn from "./columns/DateTermsColumn.vue";
import EntityColumn from "./columns/graphql/EntityColumn.vue";
import EsgColumn from "./columns/EsgColumn.vue";
import EthnicColumn from "./columns/EthnicColumn.vue";
import ExcludeColumn from "./columns/ExcludeColumn.vue";
import FinancingColumn from "./columns/FinancingColumn.vue";
import FlagColumns from "./columns/FlagColumns.vue";
import GridSkeleton from "@/modules/home/components/skeletons/GridSkeleton.vue";
import HarmoFinanStyle from "./columns/HarmoFinanStyle.vue";
import HarmonizationColumn from "./columns/HarmonizationColumn.vue";
import HarmonizationFinancingView from "./columns/HarmonizationFinancingView.vue";
import MoneyColumnRound from "./columns/MoneyColumnRound.vue";
import MoneyColumnRoundSummary from "./columns/MoneyColumnRoundSummary.vue";
import NineBoxes from "@/modules/components/grid/columns/NineBoxes.vue";
import NineBoxesCashFlowImpact from "@/modules/components/grid/columns/NineBoxesCashFlowImpact.vue";
import ProbabilityOfSuccessLabel from "@ada/design-system/components/grid/custom-columns/ProbabilityOfSuccessLabel.vue";
import CustomDataPointNumericColumn from "./columns/CustomDataPointNumericColumn.vue";
import ParentGridAnalyze from "./ParentGridAnalyze.vue";
import ParentGridAnalyzeEdit from "./ParentCFEdit.vue";
import ParentGridBoxes from "./ParentGridBoxes.vue";
import ParentGridDetails from "@/modules/components/grid/ParentChildGrid.vue";
import ParentsGridPlanGraphql from "./ParentsGridPlanGraphql.vue";
import PilotColumn from "./columns/PilotColumn.vue";
import ProgramColumn from "./columns/graphql/ProgramColumn.vue";
import SelectedEntity from "./columns/SelectedEntity.vue";
import ShowFlags from "./columns/graphql/ShowFlags.vue";
import SupplierGridAnalyze from "./SupplierGridAnalyze.vue";
import SupplierGridAnalyzeEdit from "./SupplierCFEdit.vue";
import SupplierGridBoxes from "./SupplierGridBoxes.vue";
import SupplierGridDetails from "./SupplierGrid.vue";
import SupplierGridPlanGraphql from "./SupplierGridPlanGraphql.vue";
import TextJointColumnSummary from "./columns/TextJointColumnSummary.vue";
import SmeColumn from "@/modules/components/grid/columns/SmeColumn.vue";
import WeightAvgColumnSummaryNoneDecimals from "./columns/WeightAvgColumnSummaryNoneDecimals.vue";
import WeightAvgColumnSummaryOneDecimals from "./columns/WeightAvgColumnSummaryOneDecimals.vue";
import WomanColumn from "./columns/WomanColumn.vue";
import VCardRelated from "./columns/VCardRelated.vue";
import { useUserStore } from '@/stores/user';
import { useAnalyzeStore } from '@/stores/analyze';
import ForecastEditValueColumn from "./columns/ForecastEditValueColumn.vue";
import HistoricalSourceColumn from "./columns/HistoricalSourceColumn.vue"
import TeamNameCell from "@/modules/components/grid/calculum-grid-graphql/cells/TeamNameCell.vue";
import TotalStringCell from "@/modules/components/grid/calculum-grid-graphql/cells/TotalStringCell.vue";
import GraphqlGridToolbar from "@/modules/components/grid/calculum-grid-graphql/chrome/GraphqlGridToolbar.vue";
import { useGraphqlGridDataState } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridDataState";
import {
  nextGraphqlGridShowMenuFilter,
  useGraphqlGridSelection,
  type GraphqlGridColumnMenuFilter,
  type GraphqlGridSelectableItem,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridSelection";
import { useGraphqlGridExpand } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridExpand";
import {
  useGraphqlGridColumnCache,
  type GraphqlGridColumn,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridColumnCache";
import { useGraphqlGridColumnMenus } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridColumnMenus";
import { useGraphqlGridExcel } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridExcel";
import {
  useGraphqlGridTabs,
  type GraphqlGridTabSelectEvent,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridTabs";
import { useGraphqlGridEditProgram } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridEditProgram";
import { useGraphqlGridAdminUserActions } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridAdminUserActions";
import { useGraphqlGridUiGroupActions } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridUiGroupActions";
import { useGraphqlGridRowFilterEmits } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridRowFilterEmits";
import { useGraphqlGridFileActions } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridFileActions";
import { useGraphqlGridModalEmits } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridModalEmits";
import { useGraphqlGridPilotBlur } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridPilotBlur";
import {
  useGraphqlGridFinancingEntitySelect,
  type GraphqlGridFinancingEntity,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridFinancingEntitySelect";
import { useGraphqlGridRecalculationModal } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridRecalculationModal";
import { useGraphqlGridRowUpdate } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridRowUpdate";
import { buildGraphqlGridRowClass } from "@/modules/components/grid/calculum-grid-graphql/utils/buildGraphqlGridRowClass";
import { findGridDataItemIndex } from "@/modules/components/grid/calculum-grid-graphql/utils/findGridDataItemIndex";

type GraphqlGridLevel = "spends" | "suppliers" | "parents";

defineOptions({ name: "CalculumGridGraphql" });

const gridProps = defineProps({
  adjustPilotAccount: { type: Boolean, required: false, default: false },
  allowExclude: { type: Boolean, required: false, default: true },
  allowMoveBetween: { type: Boolean, required: false, default: false },
  allowExportExcel: { type: Boolean, required: false, default: false },
  buttonText: { type: String, required: false, default: "" },
  childrenColumns: { type: Boolean, required: false, default: false },
  clusterCollectionName: { type: String, required: false, default: null },
  collectionQuery: { type: String, required: false, default: "" },
  columnMenu: { type: Boolean, required: false, default: true },
  columnsLocked: { type: Boolean, required: false, default: false },
  companyType: { type: String, required: false, default: "" },
  compareList: { type: Boolean, required: false, default: false },
  csvFileName: { type: String, required: false, default: "List" },
  defaultPageSize: { type: Number, required: false, default: 25 },
  disableBlurEfect: { type: Boolean, required: false, default: false },
  editList: { type: Boolean, required: false },
  enabledPagination: { type: Boolean, required: false, default: true },
  entityCard: { type: Boolean, required: false, default: false },
  filter: { type: Array, required: true },
  forClustersUniqueValuesApi: {
    type: Boolean,
    required: false,
    default: false,
  },
  /** When true, enables Company Users / Admin grid: revoke, resend invitation, reset IdP, invalidate token, etc. */
  forCompanyAdmin: { type: Boolean, required: false, default: false },
  /** When true, enables Super Admin–only features in the grid. */
  forSuperAdmin: { type: Boolean, required: false, default: false },
  forListViewRelatedToPilot: {
    type: Boolean,
    required: false,
    default: false,
  },
  gridColumns: {
    type: Array as PropType<GraphqlGridColumn[]>,
    required: true,
    default: () => [],
  },
  gridData: { type: Array as PropType<GraphqlGridSelectableItem[]>, required: true },
  gridHeight: { type: String, required: false, default: "auto" },
  hasFinancing: { type: Boolean, required: false },
  hasHarmonization: { type: Boolean, required: false },
  hideColumnSelector: { type: Boolean, default: false },
  hideEditColumnMenu: { type: Boolean, required: false, default: false },
  hideMenuColumns: { type: Boolean, required: false, default: false },
  isExpanded: { type: Boolean, required: false },
  isForParent: { type: Boolean, required: false, default: false },
  isForMatchView: { type: Boolean, default: false },
  levelOfGrid: {
    type: String as PropType<GraphqlGridLevel>,
    required: false,
    default: "spends",
  },
  listPeers: { type: Boolean, required: false, default: false },
  loading: { type: Boolean, required: false, default: false },
  loadingExtra: { type: Boolean, required: false, default: false },
  matchList: { type: Boolean, required: false, default: false },
  nameTemplateChild: { type: String, required: false, default: "" },
  onlyShowActiveTab: { type: Boolean, required: false, default: false },
  overviewPlanList: { type: Boolean, required: false, default: false },
  pagingSizeCustomArray: { type: Array, required: false, default: null },
  phaseId: { type: String, required: false, default: "" },
  planId: { type: String, required: false, default: "" },
  programInrecalculation: { type: Boolean, required: false, default: false },
  rejectedData: { type: Array, default: () => [] },
  removeGroup: { type: Boolean, required: false, default: true },
  reorderingColumns: { type: Boolean, required: false, default: true },
  rowColors: { type: Boolean, required: false, default: false },
  section: { type: String, required: true },
  selectable: { type: Boolean, required: false, default: false },
  selectableOrdering: { type: Boolean, required: false, default: false },
  selectedLevelForExpandChildGrids: { type: Boolean, required: false },
  selectedProgramId: { type: String, required: false, default: "" },
  selectedTabFromView: { type: Number, required: false, default: 0 },
  showTabsLevels: { type: Boolean, required: false, default: false },
  showToolbar: { type: Boolean, required: false, default: true },
  skeletonIsShowing: { type: Boolean, default: false },
  skip: { type: Number, default: 0 },
  summaryOperation: { type: String, required: false, default: "unique" },
  take: { type: Number, default: 0 },
  targetOperation: { type: String, required: false, default: null },
  title: { type: String, required: false, default: "" },
  total: { type: Number, default: 0 },
  typeOf9Boxes: { type: String, required: false, default: "cashflow" },
  totalsBycolumns: { type: String, required: false, default: "" },
  useGraphqlFilters: { type: Boolean, required: false, default: false }, // When true, uses GraphQL for filter values instead of REST
  userApprovedTheChangeOfHarmonzation: { type: Boolean, required: false },
  isCatalogList: { type: Boolean, required: false },
  entityUuid: { type: String, required: false, default: "" },
  showOptions: { type: Boolean, required: false, default: true },
  search: { type: String, required: false, default: "" },
  /** When true, this grid instance handles edit-program actions from the store (only one grid per view should be true to avoid multiple handlers). */
  handleEditProgramAction: { type: Boolean, required: false, default: false },
  groupUuid: { type: String, required: false, default: "" },
});
const emit = defineEmits([
  "grid-add-vgroup",
  "buttonClick",
  "change-tab",
  "clean-file",
  "clone-item",
  "companies-list-show-more",
  "edit-user-company",
  "delete-item",
  "delete-user-from-company",
  "deleteFile",
  "deleteSelectedTemplate",
  "downloadFile",
  "edit-item",
  "edit-user-from-admin-dashboard",
  "editCompanies",
  "editSelectedTemplate",
  "editUiGroup",
  "match-edit-list",
  "exportCSV",
  "grantAccess",
  "grid-include-pilot",
  "reset-peers",
  "revoke-access-user-admin-dashboard",
  "resend-invitation-user-admin-dashboard",
  "reset-identity-provider",
  "invalidate-token",
  "select-company-entity-financing-data-view",
  "selectRejectRow",
  "show-data-change-modal",
  "show-target-clear-modal",
  "show-target-modal",
  "showHarmonizationModal",
  "showModalForCompanies",
  "showNotyError",
  "toggle-options-admin-dashboard",
  "dataChange",
  "change-tab-from-grid",
  "reset-default-columns",
  "grid-match-remove",
  "refresh-companies",
  "show-spend-modal",
  "resetApprovedValue",
  "show-move-between-modal",
  "show-remove-plan-modal",
  "show-harmonization-modal",
  "show-supplier-standard-modal",
  "show-peer-group-standard-modal",
  "grid-exclude",
  "grid-approach",
  "grid-remove",
  "close-loading",
  "grid-add-group",
  "update-row-data-parent",
  "negotiation-status-changed",
  "pagechange",
  "send-status-filter",
  "send-approach-filter",
  "send-financing-filter",
  "send-harmonization-filter",
  "deleteSelectedUiGroup",
  "grant-access",
  "selectRow",
  "selectAllRow",
  "show-multiple-export-modal",
  "manage-team-move",
  "manage-team-remove",
  "value-changed",
  "manage-commodity-move",
  "manage-commodity-remove",
  "manage-custom-column-move",
  "manage-custom-column-remove",
  "callbackOnSubmit",
  "manage-supplier-industry-move",
  "manage-supplier-credit-rating-move",
  "manage-supplier-ultima-parent-move",
]);

const {
  skipToFilter,
  takeToFilter,
  sort,
  filterToGrid,
  pageable,
  isFilterApplied,
  dataStateChange,
  pageChange,
  clearFilters: resetGraphqlGridFilters,
  resetDataState,
} = useGraphqlGridDataState({
  skip: toRef(gridProps, "skip"),
  take: toRef(gridProps, "take"),
  filter: toRef(gridProps, "filter"),
  defaultPageSize: toRef(gridProps, "defaultPageSize"),
  pagingSizeCustomArray: toRef(gridProps, "pagingSizeCustomArray"),
  emit,
});

const customToolbar = ref("k-toolbar k-grid-toolbar custom-toolbar");

const { selectedTabIndex, tabs, onSelect } = useGraphqlGridTabs({
  onlyShowActiveTab: toRef(gridProps, "onlyShowActiveTab"),
  selectedTabFromView: toRef(gridProps, "selectedTabFromView"),
  isReceivable: false,
  emit,
});

const { showExcelToolbar, exportExcel } =
  useGraphqlGridExcel({
    forCompanyAdmin: toRef(gridProps, "forCompanyAdmin"),
    isForMatchView: toRef(gridProps, "isForMatchView"),
    collectionQuery: toRef(gridProps, "collectionQuery"),
    loadingExtra: toRef(gridProps, "loadingExtra"),
    allowExportExcel: toRef(gridProps, "allowExportExcel"),
    emit,
  });

const { spendFileVersionActiveId } = useSpendFile();

const userStore = useUserStore();

const analyzeStore = useAnalyzeStore();

// Optimized function to generate unique keys without side effects
let keyCounter = 0;
const getNextKey = () => {
  keyCounter++;
  return keyCounter;
};

const calculumGrid = reactive({
  // In the future change this for correct locale value in vuex
  locale: "en-US",
  // Narrow: reactive() widens string-literal unions to `string | boolean`.
  showMenuFilter: nextGraphqlGridShowMenuFilter(
    gridProps.selectableOrdering,
    false,
  ) as GraphqlGridColumnMenuFilter,
  keyColumns: getNextKey(),
  loadData: false,
  isSuperAdmin: userStore.isSuperAdmin,
  userNumberFormatting: userStore.getUserNumberFormatting,
  keyFooterTotals: getNextKey(),
});

const {
  locale,
  showMenuFilter,
  keyColumns,
  loadData,
  isSuperAdmin,
  userNumberFormatting,
  keyFooterTotals,
} = toRefs(calculumGrid);

const sortable = ref(true);
const resizable = ref(true);
const {
  selectedField,
  selectedItems,
  allSelected,
  areAllSelected,
  onHeaderSelectionChange,
  onSelectionChange,
} = useGraphqlGridSelection({
  gridData: toRef(gridProps, "gridData"),
  section: toRef(gridProps, "section"),
  listPeers: toRef(gridProps, "listPeers"),
  selectable: toRef(gridProps, "selectable"),
  showOptions: toRef(gridProps, "showOptions"),
  selectableOrdering: toRef(gridProps, "selectableOrdering"),
  showMenuFilter: toRef(calculumGrid, "showMenuFilter"),
  emit,
});
const { expandField, detailName, expandChange } = useGraphqlGridExpand({
  isExpanded: toRef(gridProps, "isExpanded"),
  nameTemplateChild: toRef(gridProps, "nameTemplateChild"),
});
const {
  defaultColumns,
  columnsToShow,
  columns,
  keyGrid,
  chooseColumnsKey,
  excludeColumnKey,
  harmonizationColumnKey,
  financingColumnKey,
  onColumnReorder,
  onSubmitColumnsMenu,
  resetDefaultColumns,
} = useGraphqlGridColumnCache({
  gridColumns: toRef(gridProps, "gridColumns"),
  childrenColumns: toRef(gridProps, "childrenColumns"),
  hideMenuColumns: toRef(gridProps, "hideMenuColumns"),
  filter: toRef(gridProps, "filter"),
  selectable: toRef(gridProps, "selectable"),
  areAllSelected,
  showMenuFilter: toRef(calculumGrid, "showMenuFilter"),
  listPeers: toRef(gridProps, "listPeers"),
  matchList: toRef(gridProps, "matchList"),
  selectableOrdering: toRef(gridProps, "selectableOrdering"),
  handleEditProgramAction: toRef(gridProps, "handleEditProgramAction"),
  section: toRef(gridProps, "section"),
  levelOfGrid: toRef(gridProps, "levelOfGrid"),
  emit,
});
const {
  dataForColumns,
  loadingItems,
  remainItem,
  forRecordsCount,
  setdataForColumns,
  sendColumnFiltered,
  showValuesbycolumn,
  gridIncludePilot,
  gridExclude,
  gridApproach,
  gridRemoveGroup,
  showTargetModal,
  showTargetClearModal,
  showSupplierStandardModal,
  showPeerGroupStandardModal,
  gridAddVGroup,
  gridAddGroup,
  closeHarmonizationModal,
  closeMoveBetweenModal,
  closeRemovePlanModal,
  gridMatchRemove,
  negotiationStatusOnChanged,
} = useGraphqlGridColumnMenus({
  section: toRef(gridProps, "section"),
  levelOfGrid: toRef(gridProps, "levelOfGrid"),
  forClustersUniqueValuesApi: toRef(gridProps, "forClustersUniqueValuesApi"),
  summaryOperation: toRef(gridProps, "summaryOperation"),
  clusterCollectionName: toRef(gridProps, "clusterCollectionName"),
  targetOperation: toRef(gridProps, "targetOperation"),
  companyType: toRef(gridProps, "companyType"),
  editList: toRef(gridProps, "editList"),
  selectedProgramId: toRef(gridProps, "selectedProgramId"),
  planId: toRef(gridProps, "planId"),
  phaseId: toRef(gridProps, "phaseId"),
  entityUuid: toRef(gridProps, "entityUuid"),
  groupUuid: toRef(gridProps, "groupUuid"),
  search: toRef(gridProps, "search"),
  filterToGrid,
  defaultColumns,
  allSelected,
  showMenuFilter: toRef(calculumGrid, "showMenuFilter"),
  loadData: toRef(calculumGrid, "loadData"),
  spendFileVersionActiveId,
  emit,
});
const {
  activeManageTeamRowKey,
  onManageTeamOpen,
  closeManageTeam,
  handleTeamChange,
} = useGraphqlGridEditProgram({
  handleEditProgramAction: toRef(gridProps, "handleEditProgramAction"),
  levelOfGrid: toRef(gridProps, "levelOfGrid"),
  handlers: {
    gridAddGroup,
    gridAddVGroup,
    gridExclude,
    showTargetModal,
    showTargetClearModal,
    closeHarmonizationModal,
    closeMoveBetweenModal,
    negotiationStatusOnChanged,
  },
  emit,
});

const teamNameCellHandlers = {
  onManageTeamOpen,
  closeManageTeam,
  handleTeamChange,
};

const {
  showAdminDataChangeModal,
  deleteUserFromAdminDashboard,
  editUserFromAdminDashboard,
  grantAccess,
  revokeAccessAdminDashboard,
  toggleOptionsAdminDashboard,
  resendInvitationAdminDashboard,
  resetIdentityProvider,
  invalidateToken,
  cloneItem,
  editItem,
  deleteItem,
} = useGraphqlGridAdminUserActions({ emit });

const {
  showModalForCompanies,
  editCompanies,
  editUiGroup,
  deleteSelectedUiGroup,
  deleteSelectedTemplate,
  editSelectedTemplate,
} = useGraphqlGridUiGroupActions({ emit });

const {
  filterHarmonizationbyRow,
  filterFinancingbyRow,
  filterApproachbyRow,
  filterStatusbyRow,
} = useGraphqlGridRowFilterEmits({ emit });

const { onDownloadFile, onButtonClick, onDeleteFile, cleanFile } =
  useGraphqlGridFileActions({ emit });

const {
  showHarmonizationModal,
  resetApprovedValue,
  refreshCompanies,
  showSpendModal,
  showNotyError,
} = useGraphqlGridModalEmits({ emit });

const { verifyIfPilotAccountAddBlurEffect } = useGraphqlGridPilotBlur({
  section: toRef(gridProps, "section"),
  disableBlurEffect: toRef(gridProps, "disableBlurEfect"),
  editList: toRef(gridProps, "editList"),
});

const { selectCompanyEntity } = useGraphqlGridFinancingEntitySelect({
  gridData: toRef(gridProps, "gridData") as Ref<GraphqlGridFinancingEntity[]>,
  emit,
});

const {
  showModalRecalculation,
  showRecalculation,
  hideModalRecalculation,
} = useGraphqlGridRecalculationModal();

const { updaterowData } = useGraphqlGridRowUpdate({
  showMenuFilter: toRef(calculumGrid, "showMenuFilter"),
  emit,
});

/** Historical template alias for column-menu submit (same as toolbar column selector). */
const onColumnsSubmit = onSubmitColumnsMenu;

function changeTab(tab: unknown) {
  emit("change-tab", tab);
}

function closeLoading() {
  emit("close-loading");
}

function valueChanged(valueOb: unknown) {
  emit("value-changed", valueOb);
}

function clearFilters() {
  resetGraphqlGridFilters();
  sendColumnFiltered(null, null);
}

function onToolbarSelect(event: unknown) {
  onSelect(event as GraphqlGridTabSelectEvent);
}

function onToolbarSubmitColumnsMenu(payload: unknown) {
  onSubmitColumnsMenu(payload as GraphqlGridColumn[]);
}

function rowColorfunction(
  h: (...args: any[]) => unknown,
  _trElement: unknown,
  defaultSlots: unknown,
  rowProps: {
    class?: string;
    dataItem: GraphqlGridSelectableItem & { isPilot?: boolean };
  },
) {
  const trProps = {
    class: buildGraphqlGridRowClass({
      baseClass: rowProps.class ?? "",
      dataItem: rowProps.dataItem,
      entityCard: gridProps.entityCard,
      isForParent: gridProps.isForParent,
      blurSuffix: verifyIfPilotAccountAddBlurEffect(rowProps),
    }),
  };
  return h("tr", trProps, defaultSlots);
}

/**
 * Función para limpiar datos del grid y liberar memoria
 */
const cleanupGridData = () => {
  // Limpiar arreglos grandes
  dataForColumns.value = [];
  defaultColumns.value = [];
  columnsToShow.value = [];

  // Limpiar referencias reactivas
  selectedItems.value = [];
  allSelected.value = false;

  // Limpiar filtros y estado
  resetDataState();
};

/**
 * onMounted
 */
onMounted(() => {
  calculumGrid.keyColumns++;
  calculumGrid.loadData = gridProps.loading;
});

/**
 * onBeforeUnmount - Clear memory when disassembling the component
 */
onBeforeUnmount(() => {
  cleanupGridData();
});

/**
 * WATCHERS
 */

watch(
  () => gridProps.loading,
  () => {
    calculumGrid.loadData = gridProps.loading;
  },
  { deep: true },
);

watch(
  () => gridProps.hideEditColumnMenu,
  () => {
    calculumGrid.showMenuFilter = false;
  },
  { deep: true },
);

/**
 * Calculate the index of the dataItem in the gridData array
 * @param {object} dataItem - the item to find in the gridData array
 * @returns {number} - the index of the dataItem in the gridData array
 */
function getItemIndex(dataItem: GraphqlGridSelectableItem) {
  return findGridDataItemIndex(gridProps.gridData, dataItem);
}

/** TotalsFooterColumn expects an object; host historically passes a string key/bag. */
const totalsBycolumnsData = computed(
  () => gridProps.totalsBycolumns as unknown as Record<string, unknown>,
);

/** ColumnMenuGraphql `filter` is typed as Object; working filter is unknown. */
const filterToGridForColumnMenu = computed(
  () => filterToGrid.value as Record<string, unknown>,
);

const graphqlGridToolbarTabs = computed(() => ({
  show: gridProps.showTabsLevels,
  selectedIndex: selectedTabIndex.value,
  items: tabs.value,
}));

const graphqlGridToolbarMatch = computed(() => ({
  show: gridProps.matchList,
  selectable: gridProps.selectable,
  allSelected: allSelected.value,
  rejectedData: gridProps.rejectedData,
}));

const graphqlGridToolbarColumnSelector = computed(() => ({
  hide: gridProps.hideColumnSelector,
  chooseColumnsKey: chooseColumnsKey.value,
  columns: columnsToShow.value,
  childrenColumns: gridProps.childrenColumns,
  targetOperation: gridProps.targetOperation,
}));
</script>

<style lang="scss">
@import "../../../resources/assets/styles/variables/colors";

.k-pager-nav {
  border-color: $color-black;
  color: $color-black !important;
  background-color: $color-white;
}

.k-link {
  color: $color-black !important;

  &.k-state-selected {
    color: $color-white !important;
  }
}

.k-header {
  font-weight: bold !important;
}

.k-grid .k-grid-header .k-header .k-link {
  height: auto;
}

.k-grid .k-grid-header .k-header {
  white-space: normal;
}

th.k-header.active>div>div {
  color: $color-red;
}

tr.k-master-row.hideExpanded>td.k-hierarchy-cell>a {
  display: none !important;
}

tr.k-master-row>td.k-hierarchy-cell>a>.k-icon.k-svg-icon.k-svg-i-plus>svg {
  display: none !important;
}

tr.k-master-row>td.k-hierarchy-cell>a>.k-icon.k-svg-icon.k-svg-i-minus>svg {
  display: none !important;
}

tr.k-master-row>td.k-hierarchy-cell>a>.k-icon.k-svg-icon.k-svg-i-plus {
  width: 25px;
  height: 25px;
  border-radius: 25%;
  background-image: url("@/resources/assets/images/icons/chevAccordionDown.svg") !important;
  background-size: 50% !important;
  background-repeat: no-repeat !important;
  background-position: 50% 50% !important;
  cursor: pointer;

  &:hover {
    background: $color-primary-100 !important;
    width: 25px;
    height: 25px;
    border-radius: 25%;
    background-image: url("@/resources/assets/images/icons/chevAccordionDown.svg") !important;
    background-size: 50% !important;
    background-repeat: no-repeat !important;
    background-position: 50% 50% !important;
    cursor: pointer;
  }
}

tr.k-master-row>td.k-hierarchy-cell>a>.k-icon.k-svg-icon.k-svg-i-minus {
  width: 25px;
  height: 25px;
  border-radius: 25%;
  background-image: url("@/resources/assets/images/icons/chevAccordionUp.svg") !important;
  background-size: 50% !important;
  background-repeat: no-repeat !important;
  background-position: 50% 50% !important;
  cursor: pointer;

  &:hover {
    background: $color-primary-100 !important;
    width: 25px;
    height: 25px;
    border-radius: 25%;
    background-image: url("@/resources/assets/images/icons/chevAccordionUp.svg") !important;
    background-size: 50% !important;
    background-repeat: no-repeat !important;
    background-position: 50% 50% !important;
    cursor: pointer;
  }
}

th.k-header>div>a>span>svg {
  display: none !important;
}

th.k-header>div>a>span {
  background-image: url("@ada/design-system/assets/icons/filter.svg") !important;
  background-size: 90% !important;
  background-repeat: no-repeat !important;
  background-position: 50% 50% !important;
}

th.k-header.active>div>a>span {
  background-image: url("@/resources/assets/images/icons/filterActive.svg") !important;
  background-size: 90% !important;
  background-repeat: no-repeat !important;
  background-position: 50% 50% !important;
}

th.k-header.inactive>div>a>span {
  background-image: url("@ada/design-system/assets/icons/filter.svg") !important;
  background-size: 90% !important;
  background-repeat: no-repeat !important;
  background-position: 50% 50% !important;
}

th.filter-options>div>a>span {
  right: 1rem !important;
  top: 1.2rem !important;
  border-radius: 25%;
  width: 28px;
  height: 28px;
  color: $color-primary-500 !important;
  background-image: url("@/resources/assets/images/icons/edit_pencil.svg") !important;
  background-size: 60% !important;
  background-repeat: no-repeat !important;
  background-position: 50% 50% !important;
  cursor: pointer;
}

th.filter-options>div>a>span:hover {
  background: $color-primary-100 !important;
  right: 1rem !important;
  top: 1.2rem !important;
  border-radius: 25%;
  width: 28px;
  height: 28px;
  color: $color-primary-500 !important;
  background-image: url("@/resources/assets/images/icons/edit_pencil_hover.svg") !important;
  background-size: 60% !important;
  background-repeat: no-repeat !important;
  background-position: 50% 50% !important;
  cursor: pointer;
}

.k-header>.k-link>.k-i-sort-asc-sm {
  color: $color-red;
}

.k-button-icon,
.k-input-value-text {
  &:hover {
    color: $color-white !important;
  }
}

.export-buttons {
  margin-left: auto;
  margin-right: 0;
}

.data-buttons {
  margin-left: 0;
  margin-right: auto;
}

.k-dropdownlist {
  margin-bottom: 5px !important;
  margin-top: 5px !important;
}

tr.k-detail-row {
  background: rgb(169, 169, 169) !important;
}

.k-button-text:hover {
  color: #ffffff !important;
}

.wrap-text-column {
  overflow-wrap: anywhere;
}

svg.icon-svg__button-18.cursor-pointer.delete-rows {
  align-self: center !important;
}

.d-flex.delete-button-match {
  align-items: center;
  justify-content: center;
}

svg.icon-svg__button-18.delete-match.cursor-pointer {
  fill: $color-gray-700;
}

svg.icon-svg__button-18.delete-match.cursor-pointer:hover {
  fill: $color-red !important;
}

.three-dots-icon {
  max-height: 16px;
  fill: $color-gray-500
}

.export-grid-button {
    width: fit-content;
    align-items: center;
    gap: 5px;

    span {
      color: $color-gray-500;
    }

    svg {
      fill: $color-gray-500 !important;
    }

    &:hover {
      span {
        color: $color-primary-500;
      }

      svg {
        fill: $color-primary-500 !important;
      }
    }
}

div#options-exportcsv {
    right: 10px !important;
}


</style>
