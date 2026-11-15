<template>
  <intl :locale="locale">
    <div>
      <CalculumRecalculationModal
        :show="showModalRecalculation"
        @hide="hideModalRecalculation"
      />

      <Grid
        ref="grid"
        :style="{ height: gridHeight }"
        :data-items="dataResult"
        :columns="columns"
        :column-menu="!loadingExtra ? columnMenu : false"
        :selected-field="selectable ? selectedField : undefined"
        :take="take"
        :skip="skip"
        :sort="sort"
        :filter="filter"
        :sortable="!loadingExtra ? sortable : false"
        :pageable="enabledPagination ? pageable : null"
        :resizable="resizable"
        :loader="loading"
        :reorderable="reorderingColumns"
        :row-render="rowColors ? rowColorfunction : undefined"
        :detail="detailName"
        :expand-field="expandField"
        :expand-column="{ locked: true, columnMenu: false }"
        @datastatechange="dataStateChange"
        @selectionchange="onSelectionChange"
        @headerselectionchange="onHeaderSelectionChange"
        @columnreorder="onColumnReorder"
        @expandchange="expandChange"
      >
        <template #pager="{ currentPage, pageSize, total: pagerTotal }">
          <ClientGridPager
            :current-page="currentPage"
            :page-size="pageSize"
            :total="pagerTotal"
            @change-page="changePage"
          />
        </template>

        <template #columnMenuTemplate="{ props }">
          <ColumnTemplate
            :key="keyColumns"
            :column="props.column"
            :filterable="props.filterable"
            :filter="props.filter"
            :sortable="props.sortable"
            :sort="props.sort"
            :datos="gridData"
            @sortchange="
              (e) => {
                props.onSortchange(e);
              }
            "
            @filterchange="
              (e) => {
                props.onFilterchange(e, e2);
              }
            "
            @closemenu="(e) => props.onClosemenu(e)"
            @contentfocus="(e) => props.onContentfocus(e)"
            @columnssubmit="onColumnsSubmit"
            @send-column-filtered="sendColumnFiltered"
          />
        </template>

        <template #harmCol="{ props }">
          <ColumnTemplate
            :column="props.column"
            :filterable="props.filterable"
            :filter="props.filter"
            :sortable="props.sortable"
            :sort="props.sort"
            :datos="gridData"
            @sortchange="(e) => props.onSortchange(e)"
            @filterchange="(e) => props.onFilterchange(e, e2)"
            @closemenu="(e) => props.onClosemenu(e)"
            @contentfocus="(e) => props.onContentfocus(e)"
            @columnssubmit="onColumnsSubmit"
            @send-column-filtered="sendColumnFiltered"
          />
        </template>

        <template #columnMenuTemplateActions="{ props }">
          <ColumnMenuActions
            :has-financing="hasFinancing"
            :column="props.column"
            :datos="gridData"
            :editable-harmonization="editableHarmonization"
            :remove-group="removeGroup"
            :filter="props.filter"
            :filterable="props.filterable"
            :has-harmonization="hasHarmonization"
            :allow-exclude="allowExclude"
            :sort="props.sort"
            :sortable="props.sortable"
            @contentfocus="(e) => props.onContentfocus(e)"
            @columnssubmit="onColumnsSubmit"
            @grid-approach="gridApproach"
            @filterchange="(e) => props.onFilterchange(e)"
            @closemenu="(e) => props.onClosemenu(e)"
            @grid-exclude="gridExclude"
            @grid-remove-group="gridRemoveGroup"
            @grid-add-group="gridAddGroup"
            @negotiation-status-changed="
              (negotiationStatus) =>
                negotiationStatusOnChanged(negotiationStatus)
            "
            @show-harmonization-modal="closeHarmonizationModal"
            @show-target-modal="(levelOfGrid) => showTargetModal(levelOfGrid)"
            @sortchange="(e) => props.onSortchange(e)"
          />
        </template>

        <template #columnMatchTemplateActions="{ props }">
          <ColumnMatchActions
            :column="props.column"
            :filterable="props.filterable"
            :filter="props.filter"
            :sortable="props.sortable"
            :sort="props.sort"
            :datos="gridData"
            @sortchange="(e) => props.onSortchange(e)"
            @filterchange="(e) => props.onFilterchange(e)"
            @closemenu="(e) => props.onClosemenu(e)"
            @contentfocus="(e) => props.onContentfocus(e)"
            @columnssubmit="onColumnsSubmit"
            @grid-match-remove="gridMatchRemove"
          />
        </template>

        <template #columnMenuActionsAdminConsoleSpendFile="{ props }">
          <ColumnMenuActionsAdminConsoleSpendFile
            :column="props.column"
            :filterable="props.filterable"
            :filter="props.filter"
            :sortable="props.sortable"
            :sort="props.sort"
            :datos="gridData"
            @sortchange="(e) => props.onSortchange(e)"
            @filterchange="(e) => props.onFilterchange(e)"
            @closemenu="(e) => props.onClosemenu(e)"
            @contentfocus="(e) => props.onContentfocus(e)"
            @action-click="actionsMenuOnActionClicked"
          />
        </template>

        <template #pendingRecalculateReasonsColumn="{ props }">
          <ColumnUList
            :list="props.dataItem.pendingRecalculateReasons?.split('|') ?? []"
          />
        </template>

        <toolbar
          v-if="showToolbar"
          :class-name="customToolbar"
        >
          <ClientGridToolbar
            :title="title"
            :loading-extra="loadingExtra"
            :is-filter-applied="isFilterApplied"
            :show-excel-toolbar="showExcelToolbar"
            :tabs="clientGridToolbarTabs"
            :match="clientGridToolbarMatch"
            :compare="clientGridToolbarCompare"
            :column-selector="clientGridToolbarColumnSelector"
            @select="onSelect"
            @clear-filters="clearFilters"
            @grid-match-remove="gridMatchRemove"
            @match-edit-list="emitMatchList"
            @reset-peers="$emit('reset-peers')"
            @submit-columns-menu="onSubmitColumnsMenu"
            @reset-default-columns="resetDefaultColumns"
            @export-excel="exportExcel"
          />
        </toolbar>

        <template #levelOfAccessForSpendFile="{ props }">
          <LevelOfAccess
            :data-item="props.dataItem"
            behavior="spendFile"
            @update-level-of-access="handleUpdateLevelOfAccess"
          />
        </template>

        <template #adminNotes="{ props }">
          <AdminNotes
            :data-item="props.dataItem"
            behavior="adminNotes"
            @update-row-data-notes="updateRowDataNotes"
          />
        </template>
        <template #colorUiGroup="{ props }">
          <ColorsUiGroup :data-item="props.dataItem" />
        </template>

        <template #logoUiGroup="{ props }">
          <LogoUiGroup :data-item="props.dataItem" />
        </template>

        <template #stockExchangeColumn="{ props }">
          <StockExchange :data-item="props.dataItem" />
        </template>

        <template #couponRateDescriptionColumn="{ props }">
          <CouponRateDescription :data-item="props.dataItem" />
        </template>

        <template #yieldColumnFundingCost="{ props }">
          <YieldColumnFundingCost :data-item="props.dataItem" />
        </template>

        <template #actions="{ props }">
          <Actions
            :data-item="props.dataItem"
            @delete="deleteSelectedTemplate"
            @edit="editSelectedTemplate"
            @error-noty="showNotyError"
          />
        </template>

        <template #companyNames="{ props }">
          <CompanyNames
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            @show-modal-for-companies="showModalForCompanies"
          />
        </template>

        <template #adminCheckedRequest="{ props }">
          <AdminCheckedRequest :data-item="props.dataItem" />
        </template>

        <template #actionsSuperAdmin="{ props }">
          <Actions
            :data-item="props.dataItem"
            :for-ui-group-grid="true"
            :is-super-admin="true"
            @edit-companies="editCompanies"
            @edit-ui-group="editUiGroup"
            @delete="deleteSelectedTemplate"
            @edit="editSelectedUiGroup"
            @error-noty="showNotyError"
          />
        </template>

        <template #actionsCompany="{ props }">
          <ActionsCompany
            :data-item="props.dataItem"
            @refresh-companies="refreshCompanies"
          />
        </template>

        <template #actionsListInvitations="{ props }">
          <ActionsListInvitations
            :data-item="props.dataItem"
            @refresh-invitations="refreshInvitations"
          />
        </template>

        <template #actionsValueProposition="{ props }">
          <ActionsValuePropositions
            :data-item="props.dataItem"
            @refresh-invitations="refreshValuePropositions"
            @launch-share-modal="launchShareModal"
          />
        </template>

        <template #shareValueProposition="{ props }">
          <ActionsValuePropositions
            :data-item="props.dataItem"
            :behavior="true"
            @launch-share-modal="launchShareModal"
          />
        </template>

        <template #openValueProposition="{ props }">
          <ActionsValuePropositions
            :data-item="props.dataItem"
            :behavior="true"
            :launch-by-name="true"
            :field="props.field"
            @launch-share-modal="launchShareModal"
          />
        </template>

        <template #actionsInvitationsValueProposition="{ props }">
          <ActionsByInvitations
            :data-item="props.dataItem"
            @refresh-invitations="refreshValuePropositions"
          />
        </template>

        <template #harmonizationGroups="{ props }">
          <HarmonizationTemplateColumn :data-item="props.dataItem" />
        </template>

        <template #financingConditions="{ props }">
          <FinancingConditions :data-item="props.dataItem" />
        </template>

        <template #includeExcludeConditions="{ props }">
          <IncludeExcludeConditions :data-item="props.dataItem" />
        </template>

        <template #financingGroups="{ props }">
          <FinancingGroups :data-item="props.dataItem" />
        </template>

        <template #dateCreated="{ props }">
          <DateCreated :data-item="props.dataItem" />
        </template>

        <template #selectRejectField="{ props }">
          <SelectRejectField
            :data-item="props.dataItem"
            @select-reject-row="(item) => $emit('selectRejectRow', item)"
          />
        </template>

        <template #matchedColumn="{ props }">
          <MatchedColumn :data-item="props.dataItem" />
        </template>

        <template #excludedColumnsMatched="{ props }">
          <ExcludedColumnsMatched :data-item="props.dataItem" />
        </template>

        <template #confidenceScoreColumn="{ props }">
          <ConfidenceScoreColumn :data-item="props.dataItem" />
        </template>
        <template #confidenceScoreColumnSticky="{ props }">
          <ConfidenceScoreColumn
            :data-item="props.dataItem"
            :sticky="false"
          />
        </template>

        <template #onlyDeleteColumnForSpend="{ props }">
          <OnlyDeleteColumn
            :data-item="props.dataItem"
            :for-spend="true"
            @download="onDownloadFile"
            @delete="onDeleteFile"
            @clean-file="cleanFile"
            @reload-spendfiles="$emit('reload-spendfiles')"
          />
        </template>

        <template #peerGroupAndSupplierStandardAdjustments="{ props }">
          <DownloadUpload
            :data-item="props.dataItem"
            behavior="peerGroupAndSupplierStandardAdjustments"
            @download="
              (item, behavior) => $emit('download-adjustments', item, behavior)
            "
            @upload="
              (item, fileName, behavior) =>
                $emit('upload-adjustments', item, fileName, behavior)
            "
          />
        </template>

        <!-- UC-SET-07 / AB#19711: the AR sale-files grid's own adjustments column. Emits the same
             pair of events as its payables siblings, distinguished by the behavior string, so the
             Receivables view routes them to the AR endpoints. -->
        <template #peerGroupAndBuyerStandardAdjustments="{ props }">
          <DownloadUpload
            :data-item="props.dataItem"
            behavior="peerGroupAndBuyerStandardAdjustments"
            @download="
              (item, behavior) => $emit('download-adjustments', item, behavior)
            "
            @upload="
              (item, fileName, behavior) =>
                $emit('upload-adjustments', item, fileName, behavior)
            "
          >
            <!-- AB#20259's own column, folded in here: download, upload and what happened are one
                 decision about one file, and as a separate column the answer sat two headers away
                 from the question. Passed through the slot rather than built into DownloadUpload,
                 which the payables columns share and which has no such endpoint. -->
            <template #extra>
              <AdjustmentsOutcomeAction
                :data-item="props.dataItem"
                behavior="peerGroupAndBuyerStandardAdjustments"
                @click="(item, behavior) => $emit('outcome-adjustments', item, behavior)"
              />
            </template>
          </DownloadUpload>
        </template>

        <!-- UC-SET-08 / AB#19911: the Credit Rating adjustments column. A second column rather
             than a second dataset in the one above, because the two files sit at different grains
             (sale line vs buyer/parent) and AR serves them as separate exports and queues. The
             behavior string is what routes the shared events to the right endpoint. -->
        <template #creditRatingAdjustments="{ props }">
          <DownloadUpload
            :data-item="props.dataItem"
            behavior="creditRatingAdjustments"
            @download="
              (item, behavior) => $emit('download-adjustments', item, behavior)
            "
            @upload="
              (item, fileName, behavior) =>
                $emit('upload-adjustments', item, fileName, behavior)
            "
          >
            <!-- Its own action for the reason the two files are two columns: AR keeps a separate
                 record per file, and asking the credit-rating route about a version whose only
                 upload was a Peer Group file answers "nobody has uploaded" — deliberately. -->
            <template #extra>
              <AdjustmentsOutcomeAction
                :data-item="props.dataItem"
                behavior="creditRatingAdjustments"
                @click="(item, behavior) => $emit('outcome-adjustments', item, behavior)"
              />
            </template>
          </DownloadUpload>
        </template>

        <template #smeAdjustments="{ props }">
          <DownloadUpload
            :data-item="props.dataItem"
            behavior="smeAdjustments"
            @download="
              (item, behavior) => $emit('download-adjustments', item, behavior)
            "
            @upload="
              (item, fileName, behavior) =>
                $emit('upload-adjustments', item, fileName, behavior)
            "
          />
        </template>

        <template #externalActionsForSpend="{ props }">
          <ExternalActionsSpendColumn
            :data-item="props.dataItem"
            :text="buttonText"
            @click="onButtonDenominatorMatchClick"
          />
        </template>

        <template #onlyDeleteColumnForCompare="{ props }">
          <OnlyDeleteColumn
            :data-item="props.dataItem"
            :for-compare="true"
            @download="onDownloadFile"
            @delete="onDeleteFile"
            @clean-file="cleanFile"
          />
        </template>

        <template #cleanDownloadDelete="{ props }">
          <CleanDownloadDelete
            :data-item="props.dataItem"
            @download="onDownloadFile"
            @delete="onDeleteFile"
            @clean-file="cleanFile"
          />
        </template>

        <template #statusColumn="{ props }">
          <StatusColumn :data-item="props.dataItem" />
        </template>

        <template #cleanDownloadDeleteEMIS="{ props }">
          <CleanDownloadDeleteEMISColumn
            :data-item="props.dataItem"
            for-e-m-i-s="true"
            @download="onDownloadFile"
            @delete="onDeleteFile"
            @clean-file="cleanFile"
          />
        </template>

        <template #filesDownloadDeleteColumn="{ props }">
          <DownloadDeleteColumn
            :data-item="props.dataItem"
            :hide-download="true"
            @download="onDownloadFile"
            @delete="onDeleteFile"
          />
        </template>

        <template #filesDownloadColumn="{ props }">
          <DownloadColumn
            :data-item="props.dataItem"
            @download="onDownloadFile"
          />
        </template>

        <template #recalculateButtonColumn="{ props }">
          <RecalculateButtonColumn
            :data-item="props.dataItem"
            :text="buttonText"
            @click="onActionButtonClicked"
          />
        </template>

        <template #deleteSaleFileVersionColumn="{ props }">
          <DeleteSaleFileVersionColumn
            :data-item="props.dataItem"
            @click="onActionButtonClicked"
          />
        </template>

        <template #actionsButtonColumn="{ props }">
          <ActionsButtonColumn
            :data-item="props.dataItem"
            :text="buttonText"
            @click="onActionButtonClicked"
          />
        </template>

        <template #resetStatusButtonColumn="{ props }">
          <ResetStatusButtonColumn
            :data-item="props.dataItem"
            :text="buttonText"
            @click="onActionButtonClicked"
          />
        </template>

        <template #listSuppliersChildBoxes="{ props }">
          <SupplierGridBoxes
            :data-item="props.dataItem"
            :level="selectedLevelForExpandChildGrids"
          />
        </template>

        <template #detailTemplateSupplier="{ props }">
          <SupplierGridDetails :data-item="props.dataItem" />
        </template>

        <template #detailTemplateParent="{ props }">
          <ParentGridDetails :data-item="props.dataItem" />
        </template>

        <template #detailTemplateSupplierAnalyze="{ props }">
          <SupplierGridAnalyze
            :data-item="props.dataItem"
            :cols-cache="gridColumns"
          />
        </template>

        <template #entityNameLink="{ props }">
          <EntityNameColumn :data-item="props.dataItem" />
        </template>

        <template #dataChangedValues="{ props }">
          <DataChangedValues :data-item="props.dataItem" />
        </template>

        <template #listParentsChildBoxes="{ props }">
          <ParentGridBoxes
            :data-item="props.dataItem"
            :level="selectedLevelForExpandChildGrids"
          />
        </template>

        <template #detailTemplateParentAnalyze="{ props }">
          <ParentGridAnalyze
            :data-item="props.dataItem"
            :cols-cache="gridColumns"
          />
        </template>

        <template #detailTemplateSupplierAnalyzeEdit="{ props }">
          <SupplierGridAnalyzeEdit
            :data-item="props.dataItem"
            :company-type="companyType"
            @update-row-data-parent="updaterowData"
          />
        </template>

        <template #approvedDataChangeColumn="{ props }">
          <AdminDataColumn
            :data-item="props.dataItem"
            @show-modal="showAdminDataChangeModal"
          />
        </template>

        <!-- Negotiation Status -->

        <template #negotiationStatus="{ props }">
          <ColumnNegotiationStatus :data-item="props.dataItem" />
        </template>

        <!-- END Negotiation Status -->

        <!-- /** PLAN LIST */ -->

        <template #planListSupplierIndustryNameTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="planListSupplierIndustryName"
          />
        </template>

        <!-- /** REGULATORY TERMS */ -->
        <template #regulatoryTermsColumn="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="regulatoryTerms"
          />
        </template>

        <!-- /** ENFORCED PROMOTED */ -->
        <template #enforcedPromotedColumn="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="enforcedPromoted"
          />
        </template>

        <!-- /** MATCH LIST */ -->
        <template #addressTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="address"
          />
        </template>

        <template #suppliersReceivedAddressTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="suppliersReceivedAddress"
          />
        </template>

        <template #suppliersReceivedOriginalCommodityTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="suppliersReceivedOriginalCommodity"
          />
        </template>

        <template #suppliersReceivedUltimateParentTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="suppliersReceivedUltimateParent"
          />
        </template>

        <template #suppliersReceivedNameMatchListTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="suppliersReceivedName"
          />
        </template>

        <template #supplierNameMatchListUltimateParentTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="supplierNameMatchListUltimateParent"
          />
        </template>

        <template #nameMatchListTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="nameMatchList"
          />
        </template>
        <template #nameMatchListTooltipSticky="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="nameMatchList"
            :sticky="false"
          />
        </template>

        <!-- /** Tooltip Text Ellipsis */ -->
        <template #supplierCommodityTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="supplierCommodity"
          />
        </template>

        <template #spendCommodityTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="spendCommodity"
          />
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
          <TooltipText
            :data-item="props.dataItem"
            behavior="defaultTeamName"
          />
        </template>

        <template #parentOriginalNameTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="parentOriginalName"
          />
        </template>

        <template #recalculationDateSpendFiles="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="recalculationDateSpendFiles"
          />
        </template>

        <!-- /** Tooltip For Buyers */ -->
        <template #spendBuyerEntityTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="spendBuyerEntity"
          />
        </template>

        <template #statusDescriptionSpendFile="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="statusDescription"
          />
        </template>

        <template #statusRecalculationSpendFile="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="statusRecalculation"
          />
        </template>

        <template #supplierBuyerEntityTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="supplierBuyerEntity"
          />
        </template>

        <!-- /** Tooltip For Procurement Team */ -->
        <template #spendTeamTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="spendTeam"
          />
        </template>

        <template #programListSpendTeamTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="spendTeamProgramList"
          />
        </template>

        <template #planListSpendTeamTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="spendTeamProgramList"
          />
        </template>

        <template #supplierTeamTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="supplierTeam"
          />
        </template>

        <template #parentTeamTooltip="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="parentTeam"
          />
        </template>

        <template #actionsDataChange="{ props }">
          <ActionsEditCloneDelete
            :data-item="props.dataItem"
            @clone-item="cloneItem"
            @delete-item="deleteItem"
            @edit-item="editItem"
            @mark-as-solved="markAsSolved"
          />
        </template>
        <template #detailTemplateParentAnalyzeEdit="{ props }">
          <ParentGridAnalyzeEdit
            :company-type="companyType"
            :data-item="props.dataItem"
            @send-status-filter="filterStatusbyRow"
          />
        </template>

        <template #supplierInfoTemplate="{ props }">
          <SupplierInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
          />
        </template>

        <template #suppliersAnalyzedAndMatchedInfoTemplate="{ props }">
          <SupplierInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem.suppliersAnalyzedAndMatched"
            :field="props.field"
          />
        </template>

        <template #suppliersReceivedInfoTemplate="{ props }">
          <SupplierInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem.suppliersReceived"
            :field="props.field"
          />
        </template>

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

        <template #percentColumn="{ props }">
          <PercentColumn
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

        <template #moneyRoundSummaryTemplate="{ props }">
          <MoneyColumnRoundSummary
            :data-set="footerDataSet"
            :field="props.field"
          />
        </template>

        <template #sumSimpleNumbers="{ props }">
          <SumSimpleNumbers
            :data-set="gridData"
            :field="props.field"
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

        <template #moneyRoundSummaryNoneDecimalsTemplate="{ props }">
          <MoneyColumnRoundSummary
            :data-set="gridData"
            :field="props.field"
          />
        </template>

        <template #weightAvgRoundSummaryOneDecimalsTemplate="{ props }">
          <WeightAvgColumnSummaryOneDecimals
            :data-set="gridData"
            :field="props.field"
          />
        </template>

        <template #weightAvgRoundSummaryNoneDecimalsTemplate="{ props }">
          <WeightAvgColumnSummaryNoneDecimals
            :data-set="footerDataSet"
            :field="props.field"
            :weight-field="footerWeightFieldOf(props.field)"
          />
        </template>

        <template #textJointColumnSummaryTemplate="{ props }">
          <TextJointColumnSummary
            :data-set="gridData"
            :field="props.field"
          />
        </template>

        <template #executionFooterTemplate="{ props }">
          <ExecutionFooter
            :data-set="gridData"
            :field="props.field"
          />
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

        <template #adminUserTeam="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="adminUserTeam"
          />
        </template>
        <template #selectedCompanyFinancialDataViewName="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="name"
          />
        </template>
        <template #selectedCompanyFinancialDataViewCountry="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="countryFinancingData"
          />
        </template>
        <template #selectedCompanyFinancialDataViewRegion="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="regionFinancingData"
          />
        </template>
        <template #selectedCompanyFinancialDataViewIndustry="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            behavior="industryFinancingData"
            :field="props.field"
          />
        </template>
        <template #selectedCompanyFinancialDataViewNaicsCode="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="naicsFinancingData"
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

        <template #selectedCompanyFinancialDataView="{ props }">
          <SelectedEntity
            :data-item="props.dataItem"
            @select-company-entity="selectCompanyEntity"
          />
        </template>

        <template #actionsFinancingView="{ props }">
          <AdminUserActions
            :show-only-edit-and-delete="true"
            :data-item="props.dataItem"
            @edit-user="editUserFromAdminDashboard"
            @delete-user="deleteUserFromAdminDashboard"
            @toggle-options="toggleOptionsAdminDashboard"
            @revoke-access="revokeAccessAdminDashboard"
            @grant-access="grantAccess"
            @resend-invitation="resendInvitationAdminDashboard"
            @invalidate-token="invalidateToken"
          />
        </template>

        <!-- Admin Console -->
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
            @invalidate-token="invalidateToken"
          />
        </template>

        <template #scfActions="{ props }">
          <ButtonColumn
            :data-item="props.dataItem"
            :text="'Recalculate'"
            :action="'recalculate'"
            :is-enabled="
              props.dataItem.status === 'ready' ||
              props.dataItem.status === 'error'
            "
            @click="onActionButtonClicked"
          />
        </template>

        <!-- Module Analyze -->
        <template #moduleAnalyzeIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'moduleAnalyzeIsAvailable'"
            :checked="props.dataItem.moduleAnalyzeIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- Module Program (aka Opportunity)-->
        <template #moduleProgramIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'moduleProgramIsAvailable'"
            :checked="props.dataItem.moduleProgramIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- Module Plan -->
        <template #modulePlanIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'modulePlanIsAvailable'"
            :checked="props.dataItem.modulePlanIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- Module Manage -->
        <template #moduleManageIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'moduleManageIsAvailable'"
            :checked="props.dataItem.moduleManageIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- Module Entity (aka Suppliers) -->
        <template #moduleEntityCardIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'moduleEntityCardIsAvailable'"
            :checked="props.dataItem.moduleEntityCardIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- Module Compare -->
        <template #moduleCompareIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'moduleCompareIsAvailable'"
            :checked="props.dataItem.moduleCompareIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- Module Overview (aka Match) -->
        <template #moduleOverviewIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'moduleOverviewIsAvailable'"
            :checked="props.dataItem.moduleOverviewIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- Module AR (Account Receivable) — UC-ENT-12 -->
        <template #moduleArIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'moduleArIsAvailable'"
            :checked="props.dataItem.moduleArIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- F.25 Entity Download PDF -->
        <template #featureDownloadPdfEntityIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'featureDownloadPdfEntityIsAvailable'"
            :checked="props.dataItem.featureDownloadPdfEntityIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- FEATURE Download Excel -->
        <template #featureDownloadExcelCell="{ props }">
          <ColumnCheckbox
            :behavior="'downloadExcelIsAvailable'"
            :checked="props.dataItem.downloadExcelIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- FEATURE Match Dowload Excel -->
        <template #matchDowloadExcelCell="{ props }">
          <ColumnCheckbox
            :behavior="'matchDowloadExcelIsAvailable'"
            :checked="props.dataItem.matchDowloadExcelIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- FEATURE SCF Strategy -->
        <template #scfStandardStrategy="{ props }">
          <ColumnCheckbox
            :behavior="'scfStandardStrategyIsAvailable'"
            :checked="props.dataItem.scfStandardStrategy"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- Feature Email Negotiations -->
        <template #featureEmailNegotiationsIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'featureEmailNegotiationsIsAvailable'"
            :checked="props.dataItem.featureEmailNegotiationsIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- FEATURE Credit Rating -->
        <template #featureCreditRating="{ props }">
          <ColumnCheckbox
            :behavior="'featureCreditRating'"
            :checked="props.dataItem.featureCreditRating"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- FEATURE V CARD-->
        <template #featureVCardIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'featureVCardIsAvailable'"
            :checked="props.dataItem.featureVCardIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- ACTIVE CLIENT (WI#18362) -->
        <template #activeClient="{ props }">
          <ColumnCheckbox
            :behavior="'activeClient'"
            :checked="props.dataItem.activeClient"
            :label="activeClientModeLabel(props.dataItem)"
            :resettable="props.dataItem.activeClientMode === 'manual'"
            :resetPending="props.dataItem.activeClientResetPending === true"
            :resetLabel="$t('adminBackend.companiesAdmin.activeClientMode.resetToAuto')"
            @reset="activeClientOnReset({ dataItem: props.dataItem })"
            @item-checked="
              (checked) =>
                activeClientOnChecked({
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- FEATURE SME -->
        <template #featureSME="{ props }">
          <ColumnCheckbox
            :behavior="'featureSME'"
            :checked="props.dataItem.featureSME"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- FEAUTURE Pilot Account-->
        <template #featurePilotAccountIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'featurePilotAccountIsAvailable'"
            :checked="props.dataItem.featurePilotAccountIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- PILOT LIMIT ACCOUNT DATE -->
        <template #featurePilotAccountTimeLimit="{ props }">
          <InputDateSelection
            :data-item="props.dataItem"
            :saved-company-entities="savedEntities"
            @date-selected="dateSelected"
          />
        </template>

        <!-- 9 BOXES FINANCING  -->
        <template #feature9BoxesFinancing="{ props }">
          <ColumnCheckbox
            :behavior="'feature9BoxesFinancing'"
            :checked="props.dataItem.feature9BoxesFinancing"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- FEATURE Supplier Standard -->
        <template #featureSupplierStandard="{ props }">
          <ColumnCheckbox
            :behavior="'featureSupplierStandard'"
            :checked="props.dataItem.featureSupplierStandard"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- FEATURE Peer Group Standard -->
        <template #featurePeerGroupStandard="{ props }">
          <ColumnCheckbox
            :behavior="'featurePeerGroupStandard'"
            :checked="props.dataItem.featurePeerGroupStandard"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <template #featureSupportBot="{ props }">
          <ColumnCheckbox
            :behavior="'featureSupportBot'"
            :checked="props.dataItem.featureSupportBot"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <template #featureAiBotNegotiation="{ props }">
          <ColumnCheckbox
            :behavior="'featureAiBotNegotiation'"
            :checked="props.dataItem.featureAiBotNegotiation"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <template #featureDynamicFilteredSummariesIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'featureDynamicFilteredSummariesIsAvailable'"
            :checked="props.dataItem.featureDynamicFilteredSummariesIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- 10 "F.10 Payment Terms vs Price  -->
        <template #paymentTermsvsPriceCell="{ props }">
          <ColumnCheckbox
            :behavior="'featurePaymentTermsvsPrice'"
            :checked="props.dataItem.featurePaymentTermsvsPrice"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- "F.11 Value Proposition Cell  -->
        <template #valuePropositionCell="{ props }">
          <ColumnCheckbox
            :behavior="'featureValueProposition'"
            :checked="props.dataItem.featureValueProposition"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- "F.12 Leverage Distribution Cell  -->
        <template #featureLeverageDistributionCell="{ props }">
          <ColumnCheckbox
            :behavior="'featureLeverageDistribution'"
            :checked="props.dataItem.featureLeverageDistribution"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- "F.13 Entity Card Newsletter Cell  -->
        <template #featureEntityCardNewsletterCell="{ props }">
          <ColumnCheckbox
            :behavior="'featureEntityCardNewsletter'"
            :checked="props.dataItem.featureEntityCardNewsletter"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- F.15 Keep Historical Data -->
        <template #featureKeepHistoricalDataCell="{ props }">
          <ColumnCheckbox
            :behavior="'featureKeepHistoricalData'"
            :checked="props.dataItem.featureKeepHistoricalData"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- F.16 Supplier Insights -->
        <template #featureSupplierInsightsIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'featureSupplierInsightsIsAvailable'"
            :checked="props.dataItem.featureSupplierInsightsIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- F.17 Forecast Volume -->
        <template #featureForecastVolumeIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'featureForecastVolumeIsAvailable'"
            :checked="props.dataItem.featureForecastVolumeIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- F.21 Potential Suppliers -->
        <template #featurePotentialSuppliersIsAvailable="{ props }">
          <ColumnCheckbox
            :behavior="'featurePotentialSuppliersIsAvailable'"
            :checked="props.dataItem.featurePotentialSuppliersIsAvailable"
            @item-checked="
              (checked) =>
                companiesGridModuleOnChecked({
                  fieldName: props.field,
                  dataItem: props.dataItem,
                  checked,
                })
            "
          />
        </template>

        <!-- F.22 Potential Suppliers limit input -->
        <template #potentialSuppliersLimitCell="{ props }">
          <InputPotentialSuppliersLimit
            :data-item="props.dataItem"
            :feature-enabled="
              props.dataItem.featurePotentialSuppliersIsAvailable
            "
            @limit-changed="potentialSuppliersLimitChanged"
          />
        </template>

        <!-- Potential Suppliers usage badge -->
        <template #potentialSuppliersUsageCell="{ props }">
          <PotentialSuppliersUsage
            :data-item="props.dataItem"
            :feature-enabled="
              props.dataItem.featurePotentialSuppliersIsAvailable
            "
          />
        </template>

        <!-- END Admin Console -->

        <template #excludeInfoTemplate="{ props }">
          <ExcludeColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
            :level-of-grid="levelOfGrid"
            @show-recalculation="showRecalculation"
            @close-loading="closeLoading"
            @update-row-data="updaterowData"
            @show-spend-modal="showSpendModal"
            @filter-status-by-row="filterStatusbyRow"
          />
        </template>

        <template #harmonizationTemplate="{ props }">
          <HarmonizationColumnEntity
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
            :editable-harmonization="editableHarmonization"
            :level-of-grid="levelOfGrid"
            @show-recalculation="showRecalculation"
            @close-loading="closeLoading"
            @update-row-data="updaterowData"
            @show-harmonization-modal="closeHarmonizationModal"
            @filter-harmonization-by-row="filterHarmonizationbyRow"
          />
        </template>

        <template #financingTemplate="{ props }">
          <FinancingColumnEntity
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
            :remove-group="removeGroup"
            :level-of-grid="levelOfGrid"
            @show-recalculation="showRecalculation"
            @close-loading="closeLoading"
            @update-row-data="updaterowData"
            @show-harmonization-modal="closeHarmonizationModal"
            @filter-financing-by-row="filterFinancingbyRow"
          />
        </template>

        <template #harmofinanTemplate="{ props }">
          <HarmoFinanStyle
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
            :columns-locked="columnsLocked"
          />
        </template>

        <template #flagTemplate="{ props }">
          <FlagColumns
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
          />
        </template>

        <template #flagCompareAddCompanies="{ props }">
          <FlagColumns
            :data-item="props.dataItem"
            :field="props.field"
            for-compare-add-companies="true"
          />
        </template>

        <template #decimalsTemplate="{ props }">
          <NoDecimalsColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
            :locale="userNumberFormatting"
          />
        </template>

        <template #customDataPointNumericTemplate="{ props }">
          <CustomDataPointNumericColumn
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

        <template #teamNameColumn="{ props }">
          <TextColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
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

        <template #ethnicTemplate="{ props }">
          <EthnicColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
          />
        </template>

        <template #womanTemplate="{ props }">
          <WomanColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
          />
        </template>

        <template #esgTemplate="{ props }">
          <EsgColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
          />
        </template>

        <template #dateTermsTemplate="{ props }">
          <DateTermsColumn
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

        <template #totalTemplateString="{ props }">
          <TotalStringCell :field="props.field" />
        </template>

        <template #supplierSpendsInfoTemplate="{ props }">
          <CompanyAbstractInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
            behavior="provider"
            :grid-level="levelOfGrid"
            :company-type="companyType"
            :entire-data="gridData"
            @change-tab="changeTab"
          />
        </template>

        <template #supplierSpendsInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
            behavior="provider"
            :grid-level="levelOfGrid"
            :company-type="companyType"
            :entire-data="gridData"
            @change-tab="changeTab"
          />
        </template>

        <template #supplierSpendsInfoNavigateTemplate="{ props }">
          <SpendsSupplierInfoNavigateColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
          />
        </template>
        <template #supplierSpendsInfoNavigateTemplateSticky="{ props }">
          <SpendsSupplierInfoNavigateColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
            :sticky="false"
          />
        </template>

        <template #originalParentCompanyNameMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="originalParentCompanyNameMatch"
          />
        </template>

        <template #selectedCompanyFinancialDataViewYear="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="year"
          />
        </template>

        <template #selectedCompanyFinancialDataViewDpo="{ props }">
          <EditValueColumn
            :data-item="props.dataItem"
            behavior="dpo"
            @value-changed="valueChanged"
          />
        </template>

        <template #selectedCompanyFinancialDataViewDso="{ props }">
          <EditValueColumn
            :data-item="props.dataItem"
            behavior="dso"
            @value-changed="valueChanged"
          />
        </template>
        <template #selectedCompanyFinancialDataViewC2c="{ props }">
          <EditValueColumn
            :data-item="props.dataItem"
            behavior="c2c"
            @value-changed="valueChanged"
          />
        </template>

        <template #entityColumnTemplate="{ props }">
          <EntityColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :is-for-parent="isForParent"
            :field="props.field"
            :company-type="companyType"
            :restrict-modal="false"
            :compare-list="compareList"
            @change-tab="changeTab"
          />
        </template>

        <template #entityColumnTemplatePotentialSupplier="{ props }">
          <EntityColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :is-for-parent="isForParent"
            :field="props.field"
            :company-type="companyType"
            :restrict-modal="false"
            :disable-click="true"
            @change-tab="changeTab"
          />
        </template>

        <template #selectedCompanyFinancialDataViewDio="{ props }">
          <EditValueColumn
            :data-item="props.dataItem"
            behavior="dio"
            @value-changed="valueChanged"
          />
        </template>

        <template #selectedCompanyFinancialataViewInventory="{ props }">
          <EditValueColumn
            :data-item="props.dataItem"
            behavior="inventory"
            @value-changed="valueChanged"
          />
        </template>

        <template #selectedCompanyFinancialDataViewTradeReceivable="{ props }">
          <EditValueColumn
            :data-item="props.dataItem"
            behavior="tradeReceivable"
            @value-changed="valueChanged"
          />
        </template>

        <template #selectedCompanyFinancialDataViewTradePayable="{ props }">
          <EditValueColumn
            :data-item="props.dataItem"
            behavior="tradePayable"
            @value-changed="valueChanged"
          />
        </template>

        <template #selectedCompanyFinancialDataViewTotalRevenue="{ props }">
          <EditValueColumn
            :data-item="props.dataItem"
            behavior="totalRevenue"
            @value-changed="valueChanged"
          />
        </template>
        <template #selectedCompanyFinancialDataViewCostOfGoods="{ props }">
          <EditValueColumn
            :data-item="props.dataItem"
            behavior="costOfGoods"
            @value-changed="valueChanged"
          />
        </template>

        <template #cityMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="cityMatch"
          />
        </template>

        <template #currencyMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="currencyMatch"
          />
        </template>

        <template #countryMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="countryMatch"
          />
        </template>

        <template #stateMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="stateMatch"
          />
        </template>

        <template #zipCodeMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="zipCodeMatch"
          />
        </template>

        <template #originalStateMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="originalStateMatch"
          />
        </template>

        <template #originalPaymentTermDescriptionMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="originalPaymentTermDescriptionMatch"
          />
        </template>

        <template #originalZipCodeMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="originalZipCodeMatch"
          />
        </template>

        <template #originalCityMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="originalCityMatch"
          />
        </template>

        <template #domainMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="domainMatch"
          />
        </template>

        <template #alpha3CodeMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="alpha3CodeMatch"
          />
        </template>

        <template #originalAddressMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="originalAddressMatch"
          />
        </template>

        <template #originalSupplierNameMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="originalSupplierNameMatch"
          />
        </template>

        <template #aggregatedLinesCountMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="aggregatedLinesCountMatch"
          />
        </template>

        <template #aggreatedLinesCountMatchFooter="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="aggreatedLinesCountMatchFooter"
            :data-set="gridData"
          />
        </template>

        <template #originalIdNumberMatch="{ props }">
          <TooltipText
            :data-item="props.dataItem"
            behavior="originalIdNumberMatch"
          />
        </template>

        <template #buyerSpendsInfoTemplate="{ props }">
          <CompanyAbstractInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :entire-data="gridData"
            :field="props.field"
            behavior="buyer"
            :grid-level="levelOfGrid"
            :company-type="companyType"
            @change-tab="changeTab"
          />
        </template>

        <template #buyerSpendsInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :entire-data="gridData"
            :field="props.field"
            behavior="buyer"
            :sticky="true"
            :grid-level="levelOfGrid"
            :company-type="companyType"
            @change-tab="changeTab"
          />
        </template>

        <template #buyerInfoTemplate="{ props }">
          <CompanyAbstractInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :entire-data="gridData"
            :field="props.field"
            behavior="buyer"
            :grid-level="levelOfGrid"
            :company-type="companyType"
            @change-tab="changeTab"
          />
        </template>

        <template #buyerInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :entire-data="gridData"
            :field="props.field"
            behavior="buyer"
            :sticky="true"
            :grid-level="levelOfGrid"
            :company-type="companyType"
            @change-tab="changeTab"
          />
        </template>

        <template #providerInfoTemplate="{ props }">
          <CompanyAbstractInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :entire-data="gridData"
            :field="props.field"
            behavior="provider"
            :for-plan-edit="forPlanEdit"
            :grid-level="levelOfGrid"
            :company-type="companyType"
            @change-tab="changeTab"
          />
        </template>

        <template #providerInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :entire-data="gridData"
            :field="props.field"
            behavior="provider"
            :sticky="true"
            :for-plan-edit="forPlanEdit"
            :grid-level="levelOfGrid"
            :company-type="companyType"
            @change-tab="changeTab"
          />
        </template>
        <template #supplierInListParentCompanyInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :entire-data="gridData"
            :field="props.field"
            :for-supplier="true"
            behavior="provider"
            :sticky="true"
            :for-plan-edit="forPlanEdit"
            :grid-level="levelOfGrid"
            :company-type="companyType"
            @change-tab="changeTab"
          />
        </template>

        <template #parentCompanyInfoTemplate="{ props }">
          <CompanyAbstractInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :entire-data="gridData"
            :field="props.field"
            behavior="providerParent"
            :grid-level="levelOfGrid"
            :company-type="companyType"
            @change-tab="changeTab"
          />
        </template>
        <template #parentCompanyInfoTemplateSticky="{ props }">
          <CompanyAbstractInfoColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :entire-data="gridData"
            :field="props.field"
            behavior="providerParent"
            :sticky="true"
            :grid-level="levelOfGrid"
            :company-type="companyType"
            @change-tab="changeTab"
          />
        </template>

        <template #activeProgramColumn="{ props }">
          <ActiveProgramColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
          />
        </template>

        <template #dataChangedValuesResult="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="data-changed"
          />
        </template>

        <template #buyerCountryColumn="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="buyerCountry"
          />
        </template>

        <template #buyerRegionColumn="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="buyerRegion"
          />
        </template>

        <template #commodityColumn="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="commodity"
          />
        </template>

        <!-- /** SPEND Commodity Column */ -->

        <template #commoditySpendColumn="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="commoditySpend"
          />
        </template>

        <template #industryColumn="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="industry"
          />
        </template>

        <template #userMessage="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="user-message"
          />
        </template>

        <template #userRoles="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="roles"
          />
        </template>

        <template #limitUsers="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="limitUsers"
          />
        </template>

        <template #industryCompareAddCompaniesColumn="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="compareIndustry"
          />
        </template>

        <template #buyerInfoTooltip="{ props }">
          <TooltipColumn
            :data-item="props.dataItem"
            :field="props.field"
            behavior="buyerInfo"
          />
        </template>

        <!--
          Nine Boxes
         -->
        <template #nineBoxes="{ props }">
          <NineBoxes :data-item="props.dataItem" />
        </template>

        <template #nineBoxesCashFlowImpact="{ props }">
          <NineBoxesCashFlowImpact :data-item="props.dataItem" />
        </template>

        <template #nineBoxesSuccessProbability="{ props }">
          <ProbabilityOfSuccessLabel :data-item="props.dataItem" />
        </template>

        <template #detailSummaryPlanList="{ props }">
          <SummaryChildGrid :data-item="props.dataItem" />
        </template>

        <template #goToPlan="{ props }">
          <GoToPlan :data-item="props.dataItem" />
        </template>

        <template #headerCell>
          <span class="k-link"></span>
        </template>

        <template #showFlags="{ props }">
          <ShowFlags
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :field="props.field"
          />
        </template>

        <template #forecastEditValueColumnCell="{ props }">
          <ForecastEditValueColumn
            :field="props.field"
            :data-item="props.dataItem"
            @value-changed="valueChanged"
          />
        </template>

        <template #entityColumnTemplateParent="{ props }">
          <EntityColumn
            v-if="props.rowType !== 'groupHeader'"
            :data-item="props.dataItem"
            :is-for-parent="isForParent"
            :field="props.field"
            :company-type="companyType"
            :tab="selectedTabIndex"
            :restrict-modal="true"
            @change-tab="changeTab"
          />
        </template>

        <template #statusPotentialSupplierColumns="{ props }">
          <PotentialRequestsStatus :data-item="props.dataItem" />
        </template>

        <template #rainbowPills="{ props }">
          <RainbowPillsCell
            :classes="props.dataItem.classes"
            :pill-label="props.dataItem.pillLabel"
          />
        </template>
      </Grid>
    </div>
  </intl>
</template>

<script setup lang="ts">
import {
  onMounted,
  reactive,
  ref,
  watch,
  toRef,
  toRefs,
  computed,
} from "vue";

// Kendo
import {
  Grid as KendoGrid,
  GridToolbar as toolbar,
} from "@progress/kendo-vue-grid";
import { IntlProvider as intl } from "@progress/kendo-vue-intl";
// Kendo Grid has no typed named slots; keep template checking usable under script setup.
const Grid = KendoGrid as any;
import { useUser } from "@/composables";
import { useClientGridAdminUserActions } from "@/modules/components/grid/calculum-grid/composables/useClientGridAdminUserActions";
import { useClientGridColumnCache } from "@/modules/components/grid/calculum-grid/composables/useClientGridColumnCache";
import { useClientGridColumnMenus } from "@/modules/components/grid/calculum-grid/composables/useClientGridColumnMenus";
import { useClientGridCompaniesAdminModules } from "@/modules/components/grid/calculum-grid/composables/useClientGridCompaniesAdminModules";
import { useClientGridExcel } from "@/modules/components/grid/calculum-grid/composables/useClientGridExcel";
import { useClientGridExpand } from "@/modules/components/grid/calculum-grid/composables/useClientGridExpand";
import { useClientGridFileActions } from "@/modules/components/grid/calculum-grid/composables/useClientGridFileActions";
import { useClientGridFilterChange } from "@/modules/components/grid/calculum-grid/composables/useClientGridFilterChange";
import { useClientGridFinancingEntitySelect } from "@/modules/components/grid/calculum-grid/composables/useClientGridFinancingEntitySelect";
import { useClientGridInvitationActions } from "@/modules/components/grid/calculum-grid/composables/useClientGridInvitationActions";
import { useClientGridModalEmits } from "@/modules/components/grid/calculum-grid/composables/useClientGridModalEmits";
import { useClientGridProcess } from "@/modules/components/grid/calculum-grid/composables/useClientGridProcess";
import { useClientGridRecalculationModal } from "@/modules/components/grid/calculum-grid/composables/useClientGridRecalculationModal";
import { useClientGridRowFilterEmits } from "@/modules/components/grid/calculum-grid/composables/useClientGridRowFilterEmits";
import { useClientGridRowUpdate } from "@/modules/components/grid/calculum-grid/composables/useClientGridRowUpdate";
import { useClientGridSelection } from "@/modules/components/grid/calculum-grid/composables/useClientGridSelection";
import { useClientGridTabs } from "@/modules/components/grid/calculum-grid/composables/useClientGridTabs";
import { useClientGridUiGroupActions } from "@/modules/components/grid/calculum-grid/composables/useClientGridUiGroupActions";
import TotalStringCell from "@/modules/components/grid/calculum-grid/cells/TotalStringCell.vue";
import RainbowPillsCell from "@/modules/components/grid/calculum-grid/cells/RainbowPillsCell.vue";
import ClientGridPager from "@/modules/components/grid/calculum-grid/chrome/ClientGridPager.vue";
import ClientGridToolbar from "@/modules/components/grid/calculum-grid/chrome/ClientGridToolbar.vue";
import { buildClientGridRowClass } from "@/modules/components/grid/calculum-grid/utils/buildClientGridRowClass";
import { hasSelectedGridItems } from "@/modules/components/grid/calculum-grid/utils/hasSelectedGridItems";
import {
  findFooterWeightField,
  resolveFooterDataSet,
} from "@/modules/components/grid/calculum-grid/utils/footerTotals";

// Columns
import Actions from "@/modules/components/grid/columns/Actions.vue";
import ActionsCompany from "@/modules/components/grid/columns/ActionsCompany.vue";
import ActionsListInvitations from "@/modules/components/grid/columns/ActionsListInvitations.vue";
import ActionsValuePropositions from "@/modules/components/grid/columns/ActionsValuePropositions.vue";
import ActionsByInvitations from "@/modules/components/grid/columns/ActionsByInvitations.vue";
import ActionsEditCloneDelete from "@/modules/components/grid/columns/ActionsEditCloneDelete.vue";
import ActiveProgramColumn from "./columns/ActiveProgramColumn.vue";
import AdminCheckedRequest from "@/modules/components/grid/columns/AdminCheckedRequest.vue";
import AdminDataColumn from "@/modules/components/grid/columns/AdminDataColumn.vue";
import AdminUserActions from "@/modules/components/grid/columns/AdminUserActions.vue";
import AdminUserEnabledStatus from "@/modules/components/grid/columns/AdminUserEnabledStatus.vue";
import AdminUserLastAccess from "@/modules/components/grid/columns/AdminUserLastAccess.vue";
import AdminUsername from "@/modules/components/grid/columns/AdminUsername.vue";
import AliasTextEditableColumn from "./columns/AliasTextEditableColumn.vue";
import ButtonColumn from "./columns/ButtonColumn.vue";
import {
  MoneyColumn,
  ConfidenceScoreColumn,
  NoDecimalsColumn,
  PercentColumn,
  TextColumn,
  TooltipColumn,
  TooltipText,
} from "@ada/design-system";
import CalculumRecalculationModal from "@/modules/components/CalculumRecalculationModal.vue";
import CleanDownloadDelete from "@/modules/components/grid/columns/CleanDownloadDelete.vue";
import CleanDownloadDeleteEMISColumn from "@/modules/components/grid/columns/CleanDownloadDeleteEMISColumn.vue";
import ColorsUiGroup from "@/modules/components/grid/columns/ColorsUiGroup.vue";
import ColumnCheckbox from "./columns/ColumnCheckbox.vue";
import ColumnMatchActions from "./columns/ColumnMatchActions.vue";
import ColumnMenu from "./columns/ColumnMenu.vue";
import ColumnMenuActions from "./columns/ColumnMenuActions.vue";
import ColumnMenuActionsAdminConsoleSpendFile from "./columns/ColumnMenuActionsAdminConsoleSpendFile.vue";
import ColumnNegotiationStatus from "./columns/ColumnNegotiationStatus.vue";
import ColumnUList from "./columns/ColumnUList.vue";
import CompanyAbstractInfoColumn from "./columns/CompanyAbstractInfoColumn.vue";
import CompanyNames from "@/modules/components/grid/columns/CompanyNames.vue";
import CouponRateDescription from "@/modules/components/grid/columns/CouponRateDescription.vue";
import DateCreated from "@/modules/components/grid/columns/DateCreated.vue";
import DatesColumn from "./columns/DatesColumn.vue";
import DateTermsColumn from "./columns/DateTermsColumn.vue";
import DownloadColumn from "./columns/DownloadColumn.vue";
import DownloadDeleteColumn from "./columns/DownloadDeleteColumn.vue";
import EditValueColumn from "./columns/EditValueColumn.vue";
import EntityColumn from "./columns/graphql/EntityColumn.vue";
import EntityNameColumn from "./columns/EntityNameColumn.vue";
import EsgColumn from "./columns/EsgColumn.vue";
import EthnicColumn from "./columns/EthnicColumn.vue";
import ExcludeColumn from "./columns/ExcludeColumn.vue";
import ExcludedColumnsMatched from "@/modules/components/grid/columns/ExcludedColumnsMatched.vue";
import ExecutionFooter from "./columns/ExecutionFooter.vue";
import ExternalActionsSpendColumn from "./columns/ExternalActionsSpendColumn.vue";
import FinancingColumnEntity from "./columns/FinancingColumnEntity.vue";
import FinancingConditions from "@/modules/components/grid/columns/FinancingConditions.vue";
import FinancingGroups from "@/modules/components/grid/columns/FinancingGroups.vue";
import FlagColumns from "./columns/FlagColumns.vue";
import getMinMaxDate from "@/modules/components/grid/columns/getMinMaxDate.vue";
import GoToPlan from "./columns/GoToPlan.vue";
import HarmoFinanStyle from "./columns/HarmoFinanStyle.vue";
import HarmonizationColumnEntity from "./columns/HarmonizationColumnEntity.vue";
import HarmonizationTemplateColumn from "@/modules/components/grid/columns/HarmonizationTemplateColumn.vue";
import IncludeExcludeConditions from "@/modules/components/grid/columns/IncludeExcludeConditions.vue";
import InputDateSelection from "./columns/InputDateSelection.vue";
import InputPotentialSuppliersLimit from "./columns/InputPotentialSuppliersLimit.vue";
import LogoUiGroup from "@/modules/components/grid/columns/LogoUiGroup.vue";
import MatchedColumn from "@/modules/components/grid/columns/MatchedColumn.vue";
import MoneyColumnRound from "./columns/MoneyColumnRound.vue";
import MoneyColumnRoundSummary from "./columns/MoneyColumnRoundSummary.vue";
import NineBoxes from "@/modules/components/grid/columns/NineBoxes.vue";
import NineBoxesCashFlowImpact from "@/modules/components/grid/columns/NineBoxesCashFlowImpact.vue";
import ProbabilityOfSuccessLabel from "@ada/design-system/components/grid/custom-columns/ProbabilityOfSuccessLabel.vue";
import CustomDataPointNumericColumn from "./columns/CustomDataPointNumericColumn.vue";
import OnlyDeleteColumn from "@/modules/components/grid/columns/OnlyDeleteColumn.vue";
import ParentGridAnalyze from "./ParentGridAnalyze.vue";
import ParentGridAnalyzeEdit from "./ParentCFEdit.vue";
import ParentGridBoxes from "./ParentGridBoxes.vue";
import ParentGridDetails from "@/modules/components/grid/ParentChildGrid.vue";
import DownloadUpload from "./columns/DownloadUpload.vue";
import AdjustmentsOutcomeAction from "./columns/AdjustmentsOutcomeAction.vue";
import RecalculateButtonColumn from "./columns/RecalculateButtonColumn.vue";
import DeleteSaleFileVersionColumn from "./columns/DeleteSaleFileVersionColumn.vue";
import ActionsButtonColumn from "./columns/ActionsButtonColumn.vue";
import ResetStatusButtonColumn from "./columns/ResetStatusButtonColumn.vue";
import SelectedEntity from "./columns/SelectedEntity.vue";
import SelectRejectField from "@/modules/components/grid/columns/SelectRejectField.vue";
import StatusColumn from "@/modules/components/grid/columns/StatusColumn.vue";
import StockExchange from "@/modules/components/grid/columns/StockExchange.vue";
import SummaryChildGrid from "@/modules/home/plan/components/SummaryChildGrid.vue";
import SumSimpleNumbers from "./columns/SumSimpleNumbers.vue";
import SupplierGridAnalyze from "./SupplierGridAnalyze.vue";
import SupplierGridAnalyzeEdit from "./SupplierCFEdit.vue";
import SupplierGridBoxes from "./SupplierGridBoxes.vue";
import SupplierGridDetails from "./SupplierGrid.vue";
import TextJointColumnSummary from "./columns/TextJointColumnSummary.vue";
import WeightAvgColumnSummaryNoneDecimals from "./columns/WeightAvgColumnSummaryNoneDecimals.vue";
import WeightAvgColumnSummaryOneDecimals from "./columns/WeightAvgColumnSummaryOneDecimals.vue";
import WomanColumn from "./columns/WomanColumn.vue";
import YieldColumnFundingCost from "@/modules/components/grid/columns/YieldColumnFundingCost.vue";
import LevelOfAccess from "@/modules/components/grid/columns/LevelOfAccess.vue";
import AdminNotes from "@/modules/components/grid/columns/AdminNotes.vue";
import ForecastEditValueColumn from "./columns/ForecastEditValueColumn.vue";
import PotentialRequestsStatus from "@/modules/components/grid/columns/PotentialRequestsStatus.vue";

import { useI18n } from "vue-i18n";
import ShowFlags from "./columns/graphql/ShowFlags.vue";
import { useUserStore } from "@/stores/user";

/** Historical template alias for ColumnMenu. */
const ColumnTemplate = ColumnMenu;

defineOptions({ name: "CalculumGrid" });

const props = defineProps({
  allowExclude: { type: Boolean, default: true },
  allowExportExcel: { type: Boolean, default: false },
  buttonText: { type: String, required: false, default: null },
  childrenColumns: { type: Boolean, default: false },
  columnMenu: { type: Boolean, default: true },
  columnsLocalName: { type: String, default: "" },
  columnsLocked: { type: Boolean, default: false },
  companyType: { type: String, required: false, default: null },
  csvFileName: { type: String, default: "List" },
  defaultPageSize: { type: Number, default: 25 },
  editableHarmonization: { type: Boolean, default: true },
  editedData: { type: Array, default: () => [] },
  editList: { type: Boolean, required: false },
  enabledPagination: { type: Boolean, default: true },
  entityCard: { type: Boolean, default: false },
  // Opt-in (WI#20545): the money and weighted-average totals cover the rows the
  // filters leave, not the whole list. Off keeps every other grid's totals as they are.
  footerFollowsFilter: { type: Boolean, default: false },
  forAdminDataChange: { type: Boolean, required: false },
  forCompanyAdmin: { type: Boolean, required: false },
  forCompaniesAdminPilotRelated: {
    type: Boolean,
    required: false,
    default: false,
  },
  forFinancialDataViewGrid: {
    type: Boolean,
    required: false,
    default: false,
  },

  forCompareAddCompany: { type: Boolean, required: false },
  forLastPaymentTermsCheck: { type: Boolean, required: false },
  forPlanEdit: { type: Boolean, default: false },
  forSuperAdmin: { type: Boolean, required: false },
  gridColumns: { type: Array, required: true },
  girdCsvColumns: { type: Array, required: false, default: () => [] },
  gridData: { type: Array, required: true },
  gridHeight: { type: String, default: "auto" },
  grouping: { type: Boolean, default: false },
  hasFinancing: { type: Boolean, required: false },
  hasHarmonization: { type: Boolean, required: false },
  headerscontrollers: { type: Boolean, default: false },
  hideColumnSelector: { type: Boolean, default: false },
  hideEditColumnMenu: { type: Boolean, default: false },
  hideMenuColumns: { type: Boolean, default: false },
  isForMatchView: { type: Boolean, default: false },
  isExpanded: { type: Boolean, default: false },
  isForParent: { type: Boolean, default: false },
  isSummaryListPlan: { type: Boolean, default: false },
  levelOfGrid: { type: String, default: "spends" },
  loading: { type: Boolean, default: false },
  loadingExtra: { type: Boolean, default: false },
  matchList: { type: Boolean, default: false },
  nameOfList: { type: String, required: false, default: null },
  nameTemplateChild: { type: String, required: false, default: null },
  pagingSizeCustomArray: { type: Array, required: false, default: () => [] },
  rejectedData: { type: Array, default: () => [] },
  removeGroup: { type: Boolean, default: true },
  reorderingColumns: { type: Boolean, default: true },
  rowColors: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  selectableOrdering: { type: Boolean, default: false },
  selectedData: { type: Array, default: () => [] },
  selectedLevelForExpandChildGrids: { type: Boolean, required: false },
  selectedTabFromView: { type: Number, default: 0 },
  showTabsLevels: { type: Boolean, default: false },
  showToolbar: { type: Boolean, default: true },
  title: { type: String, default: "" },
  total: { type: Number, default: 0 },
  userApprovedTheChangeOfHarmonzation: { type: Boolean, required: false },
  programIsRecalculating: { type: Boolean, required: false, default: false },
  compareList: { type: Boolean, required: false, default: false },
  targetOperation: { type: String, required: false, default: null },
});

const emit = defineEmits([
  "buttonDenominatorMatchClick",
  "change-tab-from-grid",
  "check-only-one",
  "close-loading",
  "deleteSelectedUiGroup",
  "filterchange",
  "grid-add-group",
  "grid-approach",
  "grid-exclude",
  "grid-match-remove",
  "grid-remove",
  "match-edit-list",
  "pagechange",
  "refresh-companies",
  "reset-default-columns",
  "resetApprovedValue",
  "select-company-entity-financing-data-view",
  "selectAllRow",
  "send-approach-filter",
  "send-financing-filter",
  "send-harmonization-filter",
  "send-status-filter",
  "show-harmonization-modal",
  "show-spend-modal",
  "sortchange",
  "update-row-data-parent",
  "actions-menu-on-action-clicked",
  "button-action-clicked",
  "change-tab",
  "value-changed",
  "clean-file",
  "clone-item",
  "active-client-checked",
  "active-client-reset",
  "companies-grid-module-checked",
  "date-selected",
  "potential-suppliers-limit-changed",
  "dataChange",
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
  "grant-access",
  "grantAccess",
  "resetIdentityProvider",
  "negotiation-status-changed",
  "onButtonDenominatorMatchClick",
  "download-adjustments",
  "outcome-adjustments",
  "upload-adjustments",
  "reload-spendfiles",
  "resend-invitation-user-admin-dashboard",
  "revoke-access-user-admin-dashboard",
  "selectRejectRow",
  "selectRow",
  "show-data-change-modal",
  "show-target-modal",
  "showHarmonizationModal",
  "showModalForCompanies",
  "showNotyError",
  "toggle-options-admin-dashboard",
  "reset-peers",
  "edit-peers",
  "update-level-of-access",
  "reset-more-than20",
  "reset-identity-provider",
  "refresh-invitations",
  "invalidate-token",
  "update-row-data-notes",
  "launch-share-modal",
  "send-pagination-size",
]);

const { userIsAdmin, userIsSuperAdmin } = useUser();

const customToolbar = ref("k-toolbar k-grid-toolbar custom-toolbar");

const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });

const userStore = useUserStore();

const savedCompanyEntitiesForPilotRelatedData = reactive({
  savedEntities: [],
});
const getShowMenuFilter = (selectable) =>
  selectable ? "columnMenuTemplate" : false;
const showExportComputed = computed(
  () => userIsAdmin.value || userIsSuperAdmin.value,
);

const calculumGrid = reactive({
  csvColumns: props.girdCsvColumns,
  // In the future change this for correct locale value in vuex
  locale: "en-US",
  pageable: {
    buttonCount: 5,
    info: true,
    type: "numeric",
    pageSize: props.defaultPageSize,
    // pageSizes: getPageSize(props.pagingSizeCustomArray.length),
    pageSizes: [5, 10, 25, 50, 100, 150, 175],
    previousNext: true,
  },
  showMenuFilter: getShowMenuFilter(props.selectableOrdering),
  isSuperAdmin: userStore.isSuperAdmin,
  userNumberFormatting: userStore.getUserNumberFormatting,
  showExport: showExportComputed.value,
  keyColumns: new Date().getUTCMilliseconds(),
});

const {
  csvColumns,
  locale,
  pageable,
  showMenuFilter,
  isSuperAdmin,
  userNumberFormatting,
  showExport,
  keyColumns,
} = toRefs(calculumGrid);

const { savedEntities } = toRefs(savedCompanyEntitiesForPilotRelatedData);

const { showExcelToolbar, exportExcel } = useClientGridExcel({
  isForMatchView: () => props.isForMatchView,
  loadingExtra: () => props.loadingExtra,
  allowExportExcel: () => props.allowExportExcel,
  gridData: () => props.gridData,
  csvFileName: () => props.csvFileName,
  csvColumns: () => calculumGrid.csvColumns,
});

const { selectedTabIndex, tabs, onSelect } = useClientGridTabs({
  selectedTabFromView: toRef(props, "selectedTabFromView"),
  emit,
});

const sortable = ref(true);
const resizable = ref(true);
const filterSelected = ref(false);
const filterData = ref();

// dataResult assigned after process; selection reads it lazily on events.
let dataResult;

const {
  selectedField,
  selectedItems,
  allSelected,
  areAllSelected,
  onHeaderSelectionChange,
  onSelectionChange,
} = useClientGridSelection({
  gridData: () => props.gridData,
  dataResult: () => dataResult.value,
  filterSelected,
  filterData,
  compareList: () => props.compareList,
  editList: () => props.editList,
  forCompareAddCompany: () => props.forCompareAddCompany,
  forAdminDataChange: () => props.forAdminDataChange,
  forLastPaymentTermsCheck: () => props.forLastPaymentTermsCheck,
  selectable: () => props.selectable,
  selectableOrdering: () => props.selectableOrdering,
  matchList: () => props.matchList,
  columnsLocalName: () => props.columnsLocalName,
  showMenuFilter: toRef(calculumGrid, "showMenuFilter"),
  emit,
});

const {
  defaultColumns,
  columnsToShow,
  columns,
  chooseColumnsKey,
  onColumnReorder,
  onSubmitColumnsMenu,
  resetDefaultColumns,
} = useClientGridColumnCache({
  gridColumns: () => props.gridColumns,
  childrenColumns: () => props.childrenColumns,
  hideMenuColumns: () => props.hideMenuColumns,
  selectable: () => props.selectable,
  areAllSelected,
  showMenuFilter: toRef(calculumGrid, "showMenuFilter"),
  compareList: () => props.compareList,
  matchList: () => props.matchList,
  selectableOrdering: () => props.selectableOrdering,
  levelOfGrid: () => props.levelOfGrid,
  emit,
});

const {
  sendColumnFiltered,
  gridExclude,
  gridApproach,
  gridRemoveGroup,
  gridAddGroup,
  closeHarmonizationModal,
  gridMatchRemove,
  showTargetModal,
  negotiationStatusOnChanged,
} = useClientGridColumnMenus({
  childrenColumns: () => props.childrenColumns,
  columnsToShow,
  defaultColumns,
  allSelected,
  showMenuFilter: toRef(calculumGrid, "showMenuFilter"),
  levelOfGrid: () => props.levelOfGrid,
  emit,
});

const {
  dataResult: processDataResult,
  skip,
  take,
  sort,
  filter,
  defaultGroupFilter,
  isFilterApplied,
  dataStateChange,
  clearFilters: clearFiltersProcess,
  setFilterAndReprocess,
} = useClientGridProcess({
  gridData: () => props.gridData,
  defaultPageSize: () => props.defaultPageSize,
  emit,
  filterSelected,
  filterData,
  selectedItems,
});
dataResult = processDataResult;

// WI#20545 (opt-in) — totals over the filtered rows, and per-column weight fields.
const footerDataSet = computed(() =>
  resolveFooterDataSet(props.gridData, filter.value, props.footerFollowsFilter),
);
function footerWeightFieldOf(field: string): string | undefined {
  return findFooterWeightField(props.gridColumns, field);
}

const { expandField, detailName, expandChange } = useClientGridExpand({
  isExpanded: toRef(props, "isExpanded"),
  nameTemplateChild: toRef(props, "nameTemplateChild"),
});

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
  markAsSolved,
} = useClientGridAdminUserActions({ emit });

const {
  showModalForCompanies,
  editCompanies,
  editUiGroup,
  deleteSelectedUiGroup,
  deleteSelectedTemplate,
  editSelectedTemplate,
} = useClientGridUiGroupActions({ emit });

const {
  filterHarmonizationbyRow,
  filterFinancingbyRow,
  filterApproachbyRow,
  filterStatusbyRow,
} = useClientGridRowFilterEmits({ emit });

const {
  onDownloadFile,
  onActionButtonClicked,
  actionsMenuOnActionClicked,
  onButtonDenominatorMatchClick,
  onDeleteFile,
  cleanFile,
} = useClientGridFileActions({ emit });

const {
  showHarmonizationModal,
  resetApprovedValue,
  refreshCompanies,
  showSpendModal,
  showNotyError,
} = useClientGridModalEmits({ emit });

const {
  refreshInvitations,
  refreshValuePropositions,
  launchShareModal,
} = useClientGridInvitationActions({ emit });

const { selectCompanyEntity } = useClientGridFinancingEntitySelect({
  gridData: toRef(props, "gridData"),
  emit,
});

const {
  showModalRecalculation,
  showRecalculation,
  hideModalRecalculation,
} = useClientGridRecalculationModal();

const { updaterowData, updateRowDataNotes } = useClientGridRowUpdate({
  showMenuFilter: toRef(calculumGrid, "showMenuFilter"),
  emit,
});

const {
  handleUpdateLevelOfAccess,
  dateSelected,
  potentialSuppliersLimitChanged,
  activeClientModeLabel,
  activeClientOnChecked,
  activeClientOnReset,
  companiesGridModuleOnChecked,
  seedPilotSavedEntities,
} = useClientGridCompaniesAdminModules({
  savedEntities: toRef(savedCompanyEntitiesForPilotRelatedData, "savedEntities"),
  t: (key) => translate.t(key),
  emit,
});

const { onFilterChange } = useClientGridFilterChange({
  columns,
  setFilterAndReprocess,
});

function changeTab(tab) {
  emit("change-tab", tab);
}

function valueChanged(valueOb) {
  emit("value-changed", valueOb);
}

function clearFilters() {
  clearFiltersProcess();
  sendColumnFiltered(null, null);
}

const showClearButton = computed(() =>
  hasSelectedGridItems(props.gridData),
);

function closeLoading() {
  emit("close-loading");
}

function rowColorfunction(h, trElement, defaultSlots, rowProps) {
  const trProps = {
    class: buildClientGridRowClass({
      baseClass: rowProps.class,
      dataItem: rowProps.dataItem,
      entityCard: props.entityCard,
      isForParent: props.isForParent,
      isSummaryListPlan: props.isSummaryListPlan,
    }),
  };
  return h("tr", trProps, defaultSlots);
}

/**
 * onMounted
 */
onMounted(() => {
  calculumGrid.keyColumns++;
  if (props.forCompaniesAdminPilotRelated) {
    seedPilotSavedEntities(props.gridData);
  }
});

/**
 * WATCHERS
 */

watch(
  () => props.hideEditColumnMenu,
  () => {
    calculumGrid.showMenuFilter = false;
  },
  { deep: true },
);

function pageChange(e) {
  emit("pagechange", e);
}

function sortChange(e) {
  emit("sortchange", e);
}

function filterChange(e) {
  emit("filterchange", e);
}

function emitMatchList() {
  const options = document.getElementById("actions-click-match-options");
  if (options !== null) {
    options.click();
  }
  emit("match-edit-list");
}

const clientGridToolbarTabs = computed(() => ({
  show: props.showTabsLevels,
  selectedIndex: selectedTabIndex.value,
  items: tabs.value,
}));

const clientGridToolbarMatch = computed(() => ({
  show: props.matchList,
  selectable: props.selectable,
  allSelected: allSelected.value,
  rejectedData: props.rejectedData,
}));

const clientGridToolbarCompare = computed(() => ({
  show: props.compareList,
  showClearButton: showClearButton.value,
}));

const clientGridToolbarColumnSelector = computed(() => ({
  hide: props.hideColumnSelector,
  chooseColumnsKey: chooseColumnsKey.value,
  columns: columnsToShow.value,
  childrenColumns: props.childrenColumns,
  targetOperation: props.targetOperation,
}));
</script>
