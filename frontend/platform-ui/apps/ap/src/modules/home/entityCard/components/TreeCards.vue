<template>
<TreeCardEntitySkeleton v-if="treeData.loading"> </TreeCardEntitySkeleton>
<div :class="{ 'bg-blur': treeData.loading }" v-else>
  <!-- US-17561 AC-10: warn that the tree advice ignores the active filter. No filter
       labels here, same as the Adabot notice. -->
  <div class="row" v-if="!isGlobalFilterEmptyComputed">
    <div class="col-12 mb-2">
      <GlobalFilterNotice :message="$t('globalFilters.notice.corporateTree')" />
    </div>
  </div>
  <div class="row" v-if="!isGlobalFilterEmptyComputed">
    <div class="col-12 d-flex justify-content-end custom-position">
      <div class="d-flex align-items-center">
        <div class="d-flex align-items-center mr-2"><span class="chart-legend-circle medium bg-gray-700 mr-2 circle-border"></span><span>{{ $t('home.entityCard.corporate.potential') }}</span></div>
        <div class="d-flex align-items-center"><span class="chart-legend-circle medium bg-white mr-2 circle-border"> </span><span>{{ $t('home.entityCard.corporate.filtered') }}</span></div>
        <div class="d-flex align-items-center ml-2"><span class="chart-legend-circle medium bg-coolgray-100 mr-2"></span><span>{{ $t('home.entityCard.corporate.unfiltered') }}</span></div>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-12">
      <div class="row" style="justify-content: center !important;"><span class="text-capitalize text-center tree-family-header">{{ $t('global.parents') }}</span><span class="text-capitalize text-center tree-family-header" v-if="showSuppliersHeader" style="margin: 0 40px;"> {{ $t('global.suppliers') }}</span><span class="text-capitalize text-center tree-family-header" v-if="showSpendHeader">{{ $t('global.spendLines') }}</span></div>
    </div>
  </div>
  <div class="row relative">
    <div class="col-12">
      <blocks-tree v-if="!treeData.loading" :data="computedTreeData" :horizontal="treeOrientation == '0'" :collapsable="true" :props="{ label: 'name', expand: 'expand', children: 'children', key: 'uuid' }" @node-expand="onNodeExpand">
        <template #node="{ data, context }">
          <div class="card tree-family-card" v-if="!data.isSpend && !data.isPotentialSpend" :class="{ 'card-selected': data.isSelected, 'no-available': data.parentUnavailable, 'cursor-pointer': isCursorPointerClass(data), 'default': isDefaultClass(data), 'disabled': isDefaultClass(data), 'potential': isPotentialSupplier(data), 'shadow-none': isPilotEntity(data) }" @click="goToOverview(data)" data-toggle="tooltip" data-placement="top" :title="isFilterMismatch(data) ? $t('globalFilters.notice.corporateTreeTooltip') : ''">
            <div class="card-body p-0" v-if="data.parentUnavailable" style="align-content: center; display: grid;">
              <div class="row">
                <div class="col-12"><span class="mb-4 font-semibold">{{ $t('global.noParentAvailable') }}</span></div>
              </div>
            </div>
            <template v-else>
              <div class="d-flex gap-1 p-2 min-h-5" v-if="data.disabled">
                <PillLabelNumberBadge :label="$t('home.entityCard.excluded')" :label-classes="'text-gray-400 bg-gray-100'"></PillLabelNumberBadge>
              </div>
              <div class="card-body" :class="{ 'default': isDefaultClass(data), 'disabled': isDefaultClass(data), 'potential': isPotentialSupplier(data), 'blur-effect': isPilotEntity(data) }">
                <div class="row">
                  <div class="col-12 company-name-wrapper" style="margin-bottom:15px;"><span class="company-name" style="font-weight:600;" @click.stop :data-toggle="'tooltip'" :data-placement="'top'" :title="getIsSpendValue(data) ? data.alias ?? '-' : data.name ?? '-'">{{ getIsSpendValue(data) ? data.alias ?? '-' : data.name ?? '-' }} </span></div>
                  <div class="col-12 d-flex justify-content-center align-items-center" style="margin-bottom:15px;"><img v-if="data.logoUrl" :src="getIconUrlForCompany(data)" :alt="(getIsSpendValue(data) ? data.alias ?? '-' : data.name ?? '-').substring(0, 20)" style="width: auto !important;max-height: 40px;"/>
                    <div class="circle" v-else><span class="text-capitalize font-weight-bold">{{ data.name ? data.name.substring(0, 1) : '' }}</span></div>
                  </div>
                </div>
                <div class="tree-card-grid">
                  <div class="grid-cell"><span class="text-sm font-normal mr-1" :class="{ 'text-white-0': isPotentialSupplierFontColor(data), 'text-gray-500': !isPotentialSupplierFontColor(data) }" @click.stop data-toggle="tooltip" data-placement="top" :title="$t('home.entityCard.overview.treeCard.volume')">{{ $t('home.entityCard.overview.treeCard.volume') }}:</span><span class="text-sm font-semibold" :class="{ 'text-white-0': isPotentialSupplierFontColor(data), 'text-gray-700': !isPotentialSupplierFontColor(data) }" @click.stop data-toggle="tooltip" data-placement="top" :title="StringUtils.formatNumberWithOneDecimal(data.volume)">{{ (data.volume === 0 || data.volume === null) ? '-' : StringUtils.formatBigNumbers(data.volume) }}</span></div>
                  <div class="grid-cell"><span class="text-sm font-normal mr-1 no-wrap" :class="{ 'text-white-0': isPotentialSupplierFontColor(data), 'text-gray-500': !isPotentialSupplierFontColor(data) }" @click.stop data-toggle="tooltip" data-placement="top" :title="$t('home.entityCard.overview.treeCard.cashFlow')">{{ $t('home.entityCard.overview.treeCard.cashFlow') }}:</span>
                    <div class="skeleton-value" v-if="programIsRecalculating">
                      <Skeleton class="skeletons-bg ml-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '14px', borderRadius: '8px' }"></Skeleton>
                    </div><span class="text-sm font-semibold" v-else :class="{ 'text-white-0': isPotentialSupplierFontColor(data), 'text-gray-700': !isPotentialSupplierFontColor(data) }" @click.stop data-toggle="tooltip" data-placement="top" :title="((data.hasProgram && !data.disabled) ? StringUtils.formatNumberWithOneDecimal(data.cashFlow) : '-')">{{ ((data.hasProgram && !data.disabled) ? (data.cashFlow === 0 || data.cashFlow === null) ? '-' : StringUtils.formatBigNumbers(data.cashFlow) : '-') }}</span>
                  </div>
                  <div class="grid-cell"><span class="text-sm font-normal mr-1" :class="{ 'text-white-0': isPotentialSupplierFontColor(data), 'text-gray-500': !isPotentialSupplierFontColor(data) }" @click.stop data-toggle="tooltip" data-placement="top" :title="$t('home.entityCard.overview.treeCard.contractualPT')">{{ $t('home.entityCard.overview.treeCard.contractualPT') }}:</span><span class="text-sm font-semibold" :class="{ 'text-white-0': isPotentialSupplierFontColor(data), 'text-gray-700': !isPotentialSupplierFontColor(data) }" @click.stop data-toggle="tooltip" data-placement="top" :title="data.contractualActual ? data.contractualActual + 'd' : '-'">{{ data.contractualActual ? data.contractualActual + 'd' : '-' }}</span></div>
                  <div class="grid-cell"><span class="text-sm font-normal mr-1" :class="{ 'text-white-0': isPotentialSupplierFontColor(data), 'text-gray-500': !isPotentialSupplierFontColor(data) }" @click.stop data-toggle="tooltip" data-placement="top" :title="$t('home.entityCard.country')">{{ $t('home.entityCard.country') }}:</span><span class="text-gray-700 text-sm font-semibold country-text" @click.stop data-toggle="tooltip" data-placement="top" :title="data.country?.name ? getCountry(data.country.name) : '-'">{{ data.country ? (data.country.alpha3Code ? data.country.alpha3Code : '-') : '-' }}</span></div>
                  <div class="grid-cell"><span class="text-sm font-normal mr-1" :class="{ 'text-white-0': isPotentialSupplierFontColor(data), 'text-gray-500': !isPotentialSupplierFontColor(data) }" @click.stop data-toggle="tooltip" data-placement="top" :title="(getIsSpendValue(data) ? $t('home.entityCard.overview.treeCard.proposedPT') + ' ' : $t('home.entityCard.overview.treeCard.proposedPTAvg') + ' ')">{{ (getIsSpendValue(data) ? $t('home.entityCard.overview.treeCard.proposedPT') + " " : $t('home.entityCard.overview.treeCard.proposedPTAvg') + " ") }}:</span>
                    <div class="skeleton-value" v-if="programIsRecalculating">
                      <Skeleton class="skeletons-bg ml-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '14px', borderRadius: '8px' }"></Skeleton>
                    </div><span class="text-sm font-semibold" v-else :class="{ 'text-white-0': isPotentialSupplierFontColor(data), 'text-gray-700': !isPotentialSupplierFontColor(data) }" @click.stop data-toggle="tooltip" data-placement="top" :title="((data.hasProgram && !data.disabled) ? (data.proposed === 0 || data.proposed === null) ? '-' : (data.proposed + 'd') : '-')">{{ ((data.hasProgram && !data.disabled) ? (data.proposed === 0 || data.proposed === null) ? '-' : (data.proposed + 'd') : '-') }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
          <div class="card mb-0 min-h-px" v-else :class="{ 'shadow-none': isPilotEntity(data) }">
            <div class="card-body card-for-spend" @click="redirectToSpend(data)" :class="{ 'card-selected': data.isSelected, 'cursor-pointer': isCursorPointerClass(data), 'no-available': data.parentUnavailable, 'default': isDefaultClass(data), 'disabled': isDefaultClass(data), 'potential': isPotentialSupplier(data), 'card-for-spend': getIsSpendValue(data), 'blur-effect': isPilotEntity(data) }" data-toggle="tooltip" data-placement="top" :title="isFilterMismatch(data) ? $t('globalFilters.notice.corporateTreeTooltip') : ''">
              <div class="spend-card-wrapper">
                <div class="spend-alias-border" @click.stop data-toggle="tooltip" data-placement="right" :title="disabledProgram ? $t('home.entityCard.programIsDisabled') : (getIsSpendValue(data) ? data.alias ?? '-' : data.name ?? '-')">
                  <div class="spend-alias-text">{{ getIsSpendValue(data) ? data.alias ?? '-' : data.name ?? '-' }}</div>
                </div>
                <div class="tree-card-grid">
                  <div class="grid-cell"><span class="spend-details mr-1 font-weight-400" @click.stop data-toggle="tooltip" data-placement="top" :title="$t('home.entityCard.overview.treeCard.volume')">{{ $t('home.entityCard.overview.treeCard.volume') }}:</span><span class="spend-details font-weight-600" @click.stop data-toggle="tooltip" data-placement="top" :title="StringUtils.formatNumberWithOneDecimal(data.volume)">{{ (data.volume === 0 || data.volume === null) ? '-' : StringUtils.formatBigNumbers(data.volume) }}</span></div>
                  <div class="grid-cell"><span class="spend-details mr-1 font-weight-400" @click.stop data-toggle="tooltip" data-placement="top" :title="$t('home.entityCard.overview.treeCard.cashFlow')">{{ $t('home.entityCard.overview.treeCard.cashFlow') }}:</span>
                    <div class="skeleton-value" v-if="programIsRecalculating">
                      <Skeleton class="skeletons-bg ml-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '14px', borderRadius: '8px' }"></Skeleton>
                    </div><span class="spend-details font-weight-600" v-else :class="{ 'text-white-0': isPotentialSupplierFontColor(data) }" @click.stop data-toggle="tooltip" data-placement="top" :title="((data.hasProgram && !data.disabled) ? StringUtils.formatNumberWithOneDecimal(data.cashFlow) : '-')">{{ ((data.hasProgram && !data.disabled) ? (data.cashFlow === 0 || data.cashFlow === null) ? '-' : StringUtils.formatBigNumbers(data.cashFlow) : '-') }}</span>
                  </div>
                  <div class="grid-cell"><span class="spend-details mr-1 font-weight-400" @click.stop data-toggle="tooltip" data-placement="top" :title="$t('home.entityCard.overview.treeCard.contractualPT')">{{ $t('home.entityCard.overview.treeCard.contractualPT') }}:</span><span class="spend-details font-weight-600" @click.stop data-toggle="tooltip" data-placement="top" :title="data.contractualActual ? data.contractualActual + 'd' : '-'">{{ data.contractualActual ? data.contractualActual + 'd' : '-' }}</span></div>
                  <div class="grid-cell"><span class="spend-details mr-1 font-weight-400" @click.stop data-toggle="tooltip" data-placement="top" :title="$t('home.entityCard.overview.treeCard.buyerName')">{{ $t('home.entityCard.overview.treeCard.buyerName') }}:</span><span class="spend-details font-weight-600" @click.stop data-toggle="tooltip" data-placement="top" :title="data.buyingEntityName ? data.buyingEntityName : '-'">{{ data.buyingEntityName ? data.buyingEntityName : '-' }}</span></div>
                  <div class="grid-cell"><span class="spend-details mr-1 font-weight-400" @click.stop data-toggle="tooltip" data-placement="top" :title="(getIsSpendValue(data) ? $t('home.entityCard.overview.treeCard.proposedPT') + ' ' : $t('home.entityCard.overview.treeCard.proposedPTAvg') + ' ')">{{ (getIsSpendValue(data) ? $t('home.entityCard.overview.treeCard.proposedPT') + " " : $t('home.entityCard.overview.treeCard.proposedPTAvg') + " ") }}:</span>
                    <div class="skeleton-value" v-if="programIsRecalculating">
                      <Skeleton class="skeletons-bg ml-2 mt-1 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '14px', borderRadius: '8px' }"></Skeleton>
                    </div><span class="spend-details font-weight-600" v-else @click.stop data-toggle="tooltip" data-placement="top" :title="((data.hasProgram && !data.disabled) ? (data.proposed === 0 || data.proposed === null) ? '-' : (data.proposed + 'd') : '-')">{{ ((data.hasProgram && !data.disabled) ? (data.proposed === 0 || data.proposed === null) ? '-' : (data.proposed + 'd') : '-') }}</span>
                  </div>
                  <div class="grid-cell"><span class="spend-details mr-1 font-weight-400" @click.stop data-toggle="tooltip" data-placement="top" :title="$t('home.entityCard.overview.treeCard.commodity')">{{ $t('home.entityCard.overview.treeCard.commodity') }}:</span><span class="spend-details font-weight-600" @click.stop data-toggle="tooltip" data-placement="top" :title="data.commodity ? data.commodity : '—'">{{ data.commodity ? data.commodity : '—' }}</span></div>
                </div>
                <div class="excluded-badge-wrapper" v-if="data.disabled" @click.stop>
                  <PillLabelNumberBadge :class="{ 'blur-effect': isPilotEntity(data) }" :label="$t('home.entityCard.excluded')" :label-classes="'text-gray-400 bg-gray-100'"></PillLabelNumberBadge>
                </div>
              </div>
            </div>
          </div>
        </template>
      </blocks-tree>
    </div>
  </div>
</div>
</template>

<script lang="ts">

import { EntityCard } from '@/types'
import { getMediaUrl } from '@/services/media/mediaActions'
import { ImageType } from '@/services/media/mediaTypes'
import { reactive, ref, toRefs, watch, defineComponent, onMounted, computed, onBeforeUnmount, nextTick } from 'vue'
import { Skeleton } from "@progress/kendo-vue-indicators";
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useEntityCardStore } from '@/stores/entityCard'
import * as formatData from '@/utils/FormatData'
import { CalculumLoading } from '@ada/design-system'
import PillLabelNumberBadge from '@/modules/components/PillLabelNumberBadge.vue'
import TreeCardEntitySkeleton from '../../components/skeletons/TreeCardEntitySkeleton.vue'
import GlobalFilterNotice from '@/modules/globalFilters/components/GlobalFilterNotice.vue'
import { useSpendFile, useUser } from '@/composables';
import { StringUtils } from '@/utils';

import $ from 'jquery'

export default defineComponent({
  name: 'TreeCards',
  components: { CalculumLoading, GlobalFilterNotice, PillLabelNumberBadge, Skeleton, TreeCardEntitySkeleton },
  props: {
    companyId: { type: String, required: true },
    companyType: { type: String, required: true },
    disabledProgram: { type: Boolean, required: false },
    programIsRecalculating: { type: Boolean, required: false, default: false },
    programTarget: { type: String, required: true },
    selectedProgramUri: { type: String, required: true },
  },
  emits: ['redirectToSpendEvent'],
  setup(props: any, { emit }) {
    const globalFiltersStore = useGlobalFiltersStore()
    const entityCardStore = useEntityCardStore()
    const { user, isPilotAccount } = useUser();

    const { spendFileVersionActiveIri } = useSpendFile();

    const imageErrors = ref<any>([])

    function getIconUrlForCompany(data: any) {
      return getMediaUrl(data.logoUrl, ImageType.MEDIA)
    }

    const treeCards = reactive<EntityCard.TreeCards>({
      companyId: props.companyId,
      programId: props.selectedProgramUri,
      programTarget: props.programTarget,
      loading: false,
      toggleFilteredSpends: true,
      isGlobalFilterEmpty: false
    })

    const selected = ref<any>([])
    const treeOrientation = ref('0')
    const treeData = reactive({
      loading: true,
      data: {}
    })


    /**
     * checks if node is spend or potential spend
     * @param node 
     */
    const getIsSpendValue = (node: any) => {
      return node.isSpend || node.isPotentialSpend
    }

    const computedTreeData = computed(() => {
      return treeData.data
    })

    const isRootExpanded = ref(false)
    const isAnyEntityExpanded = ref(false)
    const expandedEntityUuids = new Set<string>()

    const showSuppliersHeader = computed(() => isRootExpanded.value)

    const showSpendHeader = computed(() => isAnyEntityExpanded.value)

    function onNodeExpand(_e: Event, data: any, nodeContext: any) {
      const isExpanded: boolean = nodeContext.isExpanded()

      if (data.nodeType === 'Parent') {
        isRootExpanded.value = isExpanded
        if (!isExpanded) {
          // When root collapses, all entity nodes are removed from DOM (v-if), reset entity state
          expandedEntityUuids.clear()
          isAnyEntityExpanded.value = false
        } else {
          // Root re-expanded: entity nodes are re-mounted using their data.expand value.
          // Re-initialize from treeData.data.children so the set reflects the actual mounted state.
          expandedEntityUuids.clear()
          const children: any[] = (treeData.data as any)?.children ?? []
          children.forEach((child: any) => {
            if (child.expand && child.uuid) expandedEntityUuids.add(child.uuid)
          })
          isAnyEntityExpanded.value = expandedEntityUuids.size > 0
        }
      } else {
        if (isExpanded) {
          expandedEntityUuids.add(data.uuid)
        } else {
          expandedEntityUuids.delete(data.uuid)
        }
        isAnyEntityExpanded.value = expandedEntityUuids.size > 0
      }
    }

    /**
     * checks if global filters are applied
     */
    const isGlobalFilterEmptyComputed = computed(() => {
      return globalFiltersStore.getFiltersApplied.filters.length === 0;
    })

    /**
     * determines if default class is applied
     * for case 1, if global filters are applied
     * it checks if the node is not a potential entity, and also is included in the filter
     * case 2, no global filters are applied
     * checks if the entity is a potential entity and is included in the filter (which is true by default)
     */

    function isDefaultClass(node: any) {
      // A family-member card (parent, supplier OR spend line) is greyed out ("default"/disabled
      // styling) only when a global filter is active and this node does NOT match it. Potential
      // entities keep their own style and are never greyed by the filter.
      // NOTE: the BE flag is `isIncludedInFilters` (plural). A prior `isIncludedInFilter` typo made
      // this branch always-undefined, so with a filter active nothing was greyed — e.g. a spend line
      // whose buyer was filtered out still rendered as a normal card.
      if (isGlobalFilterEmptyComputed.value) {
        return false
      }
      const isPotential = node.isPotentialParent || node.isPotentialProvider || node.isPotentialSpend
      if (isPotential) {
        return false
      }
      return node.isIncludedInFilters === false
    }


    /**
     * US-17561 AC-11: true when a family-member card is greyed out because it does
     * not match the active global filter, which is what earns it the explanatory
     * tooltip. The copy itself is resolved with $t in the template, like the rest
     * of this component.
     */
    function isFilterMismatch(node: any): boolean {
      return !isGlobalFilterEmptyComputed.value && isDefaultClass(node) === true
    }

    const isPilotEntity = (node: any) => {

      if (user && user?.value?.isSuperAdmin) {
        return false
      }

      return isPilotAccount() && !node.isPilot
    }

    /**
     * checks if global filters are applied and if node is potential supplier
     * @param node 
     */
    const isPotentialSupplierFontColor = (node: any) => {
      if (!isGlobalFilterEmptyComputed.value) {
        if ((node.isPotentialParent || node.isPotentialProvider || node.isPotentialSpend) && node.isIncludedInFilter) {
          return true
        } else {
          return false
        }
      } else {
        return node.isPotentialParent || node.isPotentialProvider || node.isPotentialSpend
      }
    }

    /**
     * checks if node needs cursor pointer based on if availale or not
     * @param node 
     */
    const isCursorPointerClass = (node: any) => {


      if (isPilotAccount() && !node.isPilot) {
        return false
      }

      if (node.isPotentialParent === true || node.isSelected === true) {
        return false
      }
      else if (!isGlobalFilterEmptyComputed.value) {
        if (node.nodeType === 'Parent' && node.hasOwnProperty('parentUnavailable') && node.parentUnavailable === false && node.isIncludedInFilters) {
          return true
        }
        else {
          return node.isIncludedInFilters && !node.disabled
        }
      } else {
        return node.isIncludedInFilters && !node.disabled;
      }
    }


    /**
     * checks if node is potential supplier
     * determined the bg color for the card
     * @param node 
     */
    const isPotentialSupplier = (node: any) => {
      if (node.isPotentialParent || node.isPotentialProvider || node.isPotentialSpend) {
        return true
      } else {
        return false
      }
    }


    function getSupplierTreeFamily() {
      const params = {
        programId: props.selectedProgramUri || null,
        companyId: props.companyId,
        globalFilter: formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied),
        spendFileVersion: spendFileVersionActiveIri.value,
        callbackSuccess: (callbackSuccessData: any) => {
          if (callbackSuccessData?.children) {
            callbackSuccessData.children.forEach((child: any) => { child.expand = false })
          }
          treeData.data = callbackSuccessData
          treeData.loading = false
          expandedEntityUuids.clear()
          isRootExpanded.value = !!callbackSuccessData?.expand
          isAnyEntityExpanded.value = callbackSuccessData?.children?.some((child: any) => child.expand) ?? false
          // setTimeout(() => {
          //   $('.org-tree-node-btn.expanded').hide()
          // }, 100)
        },
        callbackError: () => {
          treeData.loading = false
        }
      }
      entityCardStore.getSupplierTreeFamily(params)
    }


    function toggleFilteredSpendsChange() {
      treeCards.toggleFilteredSpends = !treeCards.toggleFilteredSpends
    }


    /** WATCHERS */

    /** Watch for changes in the global filters and applies them to the Charts */
    watch(() => globalFiltersStore.getFiltersApplied, (newFiltersApplied, oldFiltersApplied) => {
      // if getFilers is empty
      treeCards.isGlobalFilterEmpty = newFiltersApplied.filters.length === 0
      treeData.loading = true
      getSupplierTreeFamily()
    }, { deep: true, immediate: false })

    // watch(props, () => {
    //   treeData.loading = true
    //   getSupplierTreeFamily()
    // })

    const toggleSelect = (node: any, isSelected: boolean) => {
      isSelected
        ? selected.value.push(node.some_id)
        : selected.value.splice(selected.value.indexOf(node.some_id), 1)
      if (node.children?.length) {
        node.children.forEach((ch: any) => {
          toggleSelect(ch, isSelected)
        })
      }
    }

    function getCountry(country: string) {
      if (country !== null && country !== undefined) {
        let str = country.split(' ')
        let countryName = ''
        str.forEach((function (section: any) {
          countryName += section.charAt(0).toUpperCase() + section.substring(1) + ' '
        }))
        return countryName
      }

    }

    /**
     * When user clicks on a Parent/Supplier card, it will redirect to Overview
     */
    function goToOverview(node: any) {
      // avoid navigate to overview if user is a pilot
      if (isPilotAccount() && !node.isPilot && (user && !user.value?.isSuperAdmin)) {
        return
      }

      //Avoid navigate to the entity if: node.isPotentialParent = true
      if (node.isPotentialParent) {
        return
      }

      let entityType = (node.isPotentialParent || node.isPotentialProvider) ? 'potential-supplier' :
        node.nodeType === 'Parent' ? 'parent' : 'supplier';

      const isGlobalFiltersNotEmpty = !isGlobalFilterEmptyComputed.value;
      // this will block the redirect if props.companyId === node.uuid
      const isParentAvailable = node.nodeType === 'Parent' && !node.parentUnavailable
      const isNotParent = node.nodeType !== 'Parent'

      /**
       * Case 1: If global filters are applied, the node is not a spend, and the card is included in filters
       * Update the selected entity in the store
       */
      if (isGlobalFiltersNotEmpty) {
        if ((isParentAvailable && node.isIncludedInFilters && !node.isSelected) || (isNotParent && node.isIncludedInFilters)) {
          entityCardStore.setSelectedEntity({
            companyId: node.uuid,
            domain: node.domain,
            spendVolume: node.volume,
            country: node.countryName,
            negotiationStatus: node.negotiationStatus,
            companyTypeForTheme: entityType
          })
          entityCardStore.setIsModalEntityShowing(true)
        }
      } else {
        if ((isParentAvailable && !node.isSelected) || (isNotParent && !node.isSelected)) {
          entityCardStore.setSelectedEntity({
            companyId: node.uuid,
            domain: node.domain,
            spendVolume: node.volume,
            country: node.countryName,
            negotiationStatus: node.negotiationStatus,
            companyTypeForTheme: entityType
          })
          entityCardStore.setIsModalEntityShowing(true)
        }
      }
    }

    function findParentObject(root: any, supplierUuid: string): any {
      if (root?.children?.length > 0) {
        for (const child of root.children) {
          if (child.supplierUuid === supplierUuid) {
            return root;
          } else {
            const parent = findParentObject(child, supplierUuid);
            if (parent) {
              return parent;
            }
          }
        }
      }
      return null;
    }

    function findChildIndexByUuid(parent: any, childUuid: any): any {
      if (parent?.children?.length > 0) {
        for (let i = 0; i < parent.children.length; i++) {
          if (parent.children[i].uuid === childUuid) {
            return i; // Return the index if found
          }
        }
      }
      return -1; // Return -1 if not found
    }

    /**
     * When user clicks on a card, it will redirect to Spend File
     * Case 1: If none of the global filters are applied or the spend is excluded
     * the redirect will not be available
     * Case 2: If at least one of the global filters are applied and the spend if available
     * it will redirect the user
     */
    function redirectToSpend(mySpendObj: any) {
      let entityType = (mySpendObj.isPotentialParent || mySpendObj.isPotentialProvider || mySpendObj.isPotentialSpend) ? 'potential-supplier' : 'supplier'

      let matchingNode = findParentObject(treeData.data, mySpendObj.supplierUuid)
      let index = findChildIndexByUuid(matchingNode, mySpendObj.uuid)

      if (isPilotAccount() && !mySpendObj.isPilot && (user && !user.value?.isSuperAdmin)) {
        //do nothing
      } else {
        if (isGlobalFilterEmptyComputed.value === false) {
          if (props.companyId === mySpendObj.supplierUuid && props.disabledProgram === false && mySpendObj.isIncludedInFilters && !mySpendObj.disabled) {
            entityCardStore.setSelectedEntity({
              companyId: mySpendObj.supplierUuid,
              domain: mySpendObj.domain,
              spendVolume: mySpendObj.volume,
              country: mySpendObj.countryName,
              negotiationStatus: mySpendObj.negotiationStatus,
              fromDifferentSupplier: mySpendObj.uuid,
              spendAlias: mySpendObj.alias,
              companyTypeForTheme: entityType
            })
          }
        } else {
          if (props.disabledProgram === false && !mySpendObj.disabled) {
            if (props.companyId === mySpendObj.supplierUuid) {
              emit('redirectToSpendEvent', mySpendObj.supplierUuid, props.companyId === mySpendObj.supplierUuid, index + 1);
            } else {
              entityCardStore.setSelectedEntity({
                companyId: mySpendObj.supplierUuid,
                domain: mySpendObj.domain,
                spendVolume: mySpendObj.volume,
                country: mySpendObj.countryName,
                negotiationStatus: mySpendObj.negotiationStatus,
                fromDifferentSupplier: mySpendObj.uuid,
                companyTypeForTheme: entityType
              })
            }
          }
        }
      }
    }

    /**
     * Initialize Bootstrap tooltips
     */
    const initializeTooltips = () => {
      nextTick(() => {
        // Destroy existing tooltips first to avoid duplicates
        $('[data-toggle="tooltip"]').tooltip('dispose');
        // Initialize tooltips
        $('[data-toggle="tooltip"]').tooltip({
          trigger: 'hover',
          placement: 'top',
          html: false
        });
      });
    };

    /**
     * Handles the refresh of the page
     * checks if the global filters are empty
     * calls the getSupplierTreeFamily
     */
    const handlePageRefresh = () => {
      treeCards.isGlobalFilterEmpty = globalFiltersStore.getFiltersApplied.filters.length === 0

      getSupplierTreeFamily();
    };

    // Watch for changes in tree data to reinitialize tooltips
    watch(() => computedTreeData.value, () => {
      initializeTooltips();
    }, { deep: true });

    /***
     * ON MOUNTED
     */
    onMounted(() => {
      treeCards.isGlobalFilterEmpty = globalFiltersStore.getFiltersApplied.filters.length === 0
      getSupplierTreeFamily()
      window.addEventListener('beforeunload', handlePageRefresh);
      initializeTooltips();
    })

    // Remove the listener when the component is about to be unmounted
    onBeforeUnmount(() => {
      window.removeEventListener('beforeunload', handlePageRefresh);
      // Clean up tooltips
      $('[data-toggle="tooltip"]').tooltip('dispose');
    });

    return {
      ...toRefs(treeData),
      ...toRefs(treeCards),
      computedTreeData,
      StringUtils,
      formatData,
      getCountry,
      getIconUrlForCompany,
      getIsSpendValue,
      goToOverview,
      imageErrors,
      isCursorPointerClass,
      isDefaultClass,
      isFilterMismatch,
      isGlobalFilterEmptyComputed,
      isPilotEntity,
      isPotentialSupplier,
      isPotentialSupplierFontColor,
      redirectToSpend,
      selected,
      onNodeExpand,
      showSuppliersHeader,
      showSpendHeader,
      toggleFilteredSpendsChange,
      toggleSelect,
      treeData,
      treeOrientation
    }
  }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/_colors.scss";
@import "src/resources/assets/styles/utils/_fontweight.scss";
@import "src/resources/assets/styles/utils/_borders.scss";
@import "src/resources/assets/styles/utils/_background.scss";

.card {
  padding: 0;
}

.tree-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
  row-gap: 4px;
}

.tree-card-grid .grid-cell {
  display: flex;
  align-items: baseline;
  min-width: 0;
  overflow: hidden;
  gap: 4px;
  max-width: 100%;
  pointer-events: auto;
}

// Ensure all direct children respect width constraints
.tree-card-grid .grid-cell > * {
  min-width: 0;
  overflow: hidden;
  flex: 0 1 auto;
  max-width: 100%;
  pointer-events: auto;
}

// All spans should have ellipsis
.tree-card-grid .grid-cell span {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  max-width: 100% !important;
  display: inline-block;
  pointer-events: auto;
}

// Bootstrap tooltips styles - ensure ellipsis works on tooltip-enabled elements
.tree-card-grid .grid-cell span[data-toggle="tooltip"] {
  display: inline-block !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  position: relative;
}

.tree-card-grid .grid-cell.span-2 {
  grid-column: 1 / span 2;
}

// Tooltip container styles (no longer needed but kept for reference)
// Bootstrap tooltips work directly on elements with data-toggle="tooltip"

// Company name ellipsis styles
.card-body .row {
  overflow: hidden;
  min-width: 0;
}

.company-name-wrapper {
  overflow: hidden !important;
  min-width: 0 !important;
  max-width: 100% !important;
  width: 100%;
}

.company-name-wrapper .company-name,
.company-name-wrapper span[data-toggle="tooltip"] {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  max-width: 100% !important;
  width: 100% !important;
  display: block !important;
  position: relative;
}


.card-data {
  justify-content: center;
}

.card-for-spend {
  min-height: 0px !important;
  min-width: 460px;
  max-width: 460px;
  margin-bottom: 0px !important;
  padding: 0 !important;

  .cursor-pointer * {
    cursor: pointer;
  }

  // Mirrors the `.tree-family-card.default` treatment below: the template already
  // puts `default`/`disabled` on this card body when the spend line is filtered
  // out, but without these rules only the click was disabled and the card still
  // read as active. Keep both blocks in sync.
  &.default {
    background: $color-gray-100;

    &:hover {
      box-shadow: none;
    }

    &.disabled {
      opacity: 0.5;
    }
  }
}

// Spend card wrapper for left border and content
.spend-card-wrapper {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 100px;
  position: relative;
}

// Left border with alias
.spend-alias-border {
  background-color: #f9fafb; // gray-50 - very light, almost white
  min-width: 40px;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  flex-shrink: 0;
}

// Rotated alias text
.spend-alias-text {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  color: #374151; // gray-700
}

// Adjust tree-card-grid for spend cards - maintain same padding as before
.card-for-spend .tree-card-grid {
  flex: 1;
  padding: 20px 20px 20px 20px; // Same padding as Bootstrap card-body default
  margin-left: 0;
  // 40% / 60% column split for spend cards
  grid-template-columns: 40% 60%;
}

// Excluded badge positioned on the right side of the card
.excluded-badge-wrapper {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.cursor_pointer * {
  cursor: pointer;
}

.cursor-pointer {
  cursor: pointer;

  * {
    cursor: pointer;
  }
}

.card.cursor-pointer.tree-family-card .row {
  cursor: pointer;
}

.card.cursor-pointer.tree-family-card .col-12 {
  cursor: pointer;
}

.no-available {
  background: #eee;
}


.circle {
  width: 40px;
  height: 40px;
  -moz-border-radius: 50%;
  -webkit-border-radius: 50%;
  border-radius: 50%;
  background: gray;
  display: flex;
  align-items: center;
  justify-content: center;


  :hover {
    color: white !important;
  }

  span {
    color: white;
  }
}

.tree-family-header {
  min-width: 460px;
  max-width: 460px;
  padding: 0 15px;
}

.tree-family-card {
  min-height: 150px;
  min-width: 460px;
  max-width: 460px;
  padding: 0;

  span {
    font-size: 16px !important;
  }

  &.active {
    background: #FFF;

    &.active-border {
      border: 1px solid $color-gray-300;
    }
  }

  &.shadow-none {
    box-shadow: none;
  }

  &.default {
    background: $color-gray-100;

    /* Remove box shadow on hover for .default state */
    &:hover {
      box-shadow: none;
    }

    &.default-border {
      border: none;
    }

    &.disabled {
      opacity: 0.5;
    }
  }
}

// *** Responsiveness ***

// *** XXL ***
@media (max-width: 2000px) {
  .tree-family-header {
    min-width: 400px;
    max-width: 400px;
    padding: 0 15px;
  }

  .tree-family-card {
    min-height: 150px;
    min-width: 400px;
    max-width: 400px;
    padding: 0;

    span {
      font-size: 14px !important;
    }
  }
}

// *** END XXL ***

// *** XL ***
@media (max-width: 1640px) {
  .tree-family-header {
    min-width: 350px;
    max-width: 350px;
    padding: 0 10px;
  }

  .tree-family-card {
    min-width: 350px;
    max-width: 350px;
  }

  .card-for-spend {
    min-width: 350px;
    max-width: 350px;
  }
}

// *** END XL ***

// *** L ***
@media (max-width: 1480px) {
  .tree-family-header {
    font-size: 14px !important;
    min-width: 350px;
    max-width: 350px;
    padding: 0 10px;
  }

  .tree-family-card {
    span {
      font-size: 12px !important;
    }
  }

  .card-for-spend {
    .spend-details {
      font-size: 14px;
    }
  }
}

// *** END L ***

// *** M ***
@media (max-width: 1366px) {
  .tree-family-header {
    min-width: 290px;
    max-width: 290px;
    padding: 0 10px;
  }

  .tree-family-card {
    min-width: 290px;
    max-width: 290px;

    span {
      font-size: 10px !important;
    }
  }

  .card-for-spend {
    min-width: 280px;
    max-width: 280px;

    .spend-details {
      font-size: 12px;
    }
  }
}

// *** END M ***

// *** S ***
@media (max-width: 1280px) {
  .card-for-spend {
    .spend-details {
      font-size: 10px;
    }
  }
}

// *** END S ***

// *** END Responsiveness ***

.spend-details {
  font-size: 14px;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  max-width: 100% !important;
  display: inline-block;
  pointer-events: auto;

  &.active {
    color: $color-gray-700;
  }

  &.potential {
    color: #fff;
  }

  &.default {
    color: $color-gray-500;
  }
}

.custom-position {
  position: relative;
  top: -70px;
}

.circle-border {
  border: 1px solid $color-gray-400;
}

.no-wrap {
  white-space: nowrap;
}

.skeleton-value {
  width: 30px;
}
</style>