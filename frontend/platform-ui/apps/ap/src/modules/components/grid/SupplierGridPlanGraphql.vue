<template>
  <CalculumLoading v-if="(loadingModal)" :modal=true />
  <newGrid :key="keyGrid" :grid-data="list" :grid-columns="columns" :tab="tab" :level-of-grid="'supplier'" :child-grid-expanded="true"  />  
</template>
<script lang='ts'>
import { defineComponent, reactive, toRefs, watch, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useHomeStore } from '@/stores/home'
import CalculumChildGrid from '@/modules/components/grid/CalculumChildGrid.vue'
import { CalculumLoading } from '@ada/design-system'
import * as graphqlUtils from '@/utils/graphqlUtils'
import { nodesEdges } from '@/modules/home/analyze/data/nodesEdges';
import * as formatData from '@/utils/FormatData'
import useSpendFile from "@/composables/useSpendFile";
import useUser from '@/services/user/composables/useUser';
import * as kendoChartRelated from '@/utils/kendoChartRelated'
import useCompany from "@/composables/useCompany"
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import { useAppStore } from '@/stores/app'


export default defineComponent({
  name: 'SupplierGridPlanGraphql',
  components: {
    CalculumLoading,
    newGrid: CalculumChildGrid
  },
  props: {
    dataItem: { type: Object, required: true },
    planId: { type: String, required: true },
    phaseId: { type: String, required: true },
    overviewPlanList: { type: Boolean, required: true },
    tab: { type: Number, required: false, default: 0 }
  },
  setup(props) {
    const globalFiltersStore = useGlobalFiltersStore()
    const homeStore = useHomeStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const { isPilotAccount, useFeatureVirtualCard } = useUser()

    const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()


    const { usevCardGroupsEnabled } = useCompany()
    const loadingModal = ref(false)
    let setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(globalFiltersStore.getFiltersApplied)
    interface SupplierGrid {
      keyGrid: number,
      columns: Array<any>,
      list: Array<any>,
      filters: {
        logic: any,
        filters: any,
      }
    }
    const data = reactive<SupplierGrid>({
      keyGrid: new Date().getUTCMilliseconds(),
      columns: [],
      list: [],
      filters: {
        logic: 'and',
        filters: [
          {
            "logic": "and",
            "filters": [
              {
                "field": "entityUuid",
                "operator": "eq",
                "value": props.dataItem.entityUuid
              }
            ]
          }
        ]
      }
    })

    const {
      spendFileVersionActiveId
    } = useSpendFile()

    let currencyRate: number = useAppStore().getCurrencyAmount;

    onMounted(async () => {
      data.columns = await getColumns()
      data.keyGrid++
      await fetchData()
    })


    async function getColumns() {
      let columnsSet = JSON.parse(JSON.stringify(homeStore.getHomePlanPhaseColumnOrderSuppliersCF))

      const supplierCounts = columnsSet.findIndex(
        (x: any) => x.field === "spendCounts"
      );
      if (supplierCounts > -1) {
        columnsSet[supplierCounts].title = translate.t("home.analyze.table.spendAlias")
        columnsSet[supplierCounts].field = "spendAlias"
        columnsSet[supplierCounts].cell = 'textTemplate'
      }

      if (isPilotAccount()) {
        const parentName = columnsSet.findIndex(
          (x: any) => x.field === "parentName"
        )
        if (parentName > -1) {
          columnsSet[parentName].cell = 'restrictModalEntitySupplier'
        }
      }

      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        columnsSet = kendoChartRelated.showVCardColumnsRelated(columnsSet);
      } else {
        columnsSet = kendoChartRelated.removeVCardColumnsRelated(columnsSet);
      }

      /** Credit Rating Related */
      columnsSet = creditRatingColumnsDisplayBasedOnCreditRatingFeature(columnsSet)


      return columnsSet
    }
    async function fetchData() {
      let queryString = getData(data.filters);
      loadingModal.value = true
      try {
        const response = await graphqlUtils.getCollectionData(queryString)
        const nodes = response.data.spends.edges.map((edge: any) => edge.node);
        const parsedData: Array<any> = []
        nodes.forEach(function (data: any) {
          const datas = Object.assign({}, data)
          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness)
          );

          datas.entityWomanOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityWomanOwnedBusiness)
          );

          datas.entityVeteranOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityVeteranOwnedBusiness)
          );
          datas.isVCardApplied = translate.t(
            formatData.getYesOrNo(data.isVCardApplied)
          );
          const validateESG = [0, 1, 2, 3, 4, 100]
          let value = 0
          if (validateESG.includes(parseInt(data.entityInvestVerteScore))) {
            value = parseInt(data.entityInvestVerteScore)
          } else {
            value = 404
          }
          datas.entityInvestVerteScore = translate.t('home.entityCard.rating.esgClassification.c' + value)
          datas.entityRegulatoryTermsStrategyModality = data.entityRegulatoryTermsStrategyModality ? formatData.getStrategyModalityValue(data.entityRegulatoryTermsStrategyModality) : '-'
          datas.isActive = !!data.activeProgram
          datas.activeProgram = data.activeProgram ? data.activeProgram : translate.t('tableStatus.notAssigned')

          if (data.phases) {
            if (data.phases === '10000') {
              datas.phases = translate.t("global.rest")
            } else {
              const splitPhases = data.phases.split(',')
              if (splitPhases.length > 1) {
                datas.phases = translate.t("tableStatus.multiple")
              }
            }
          }

          if (data.activeProgram && data.activeProgram !== null) {
            const programs = data.activeProgram.split(',')
            if (programs.length > 1) {
              datas.activeProgram = translate.t('tableStatus.multiple')
            }
          } else {
            datas.activeProgram = translate.t('tableStatus.notAssigned')
          }
          parsedData.push(datas)
        })

        data.list = parsedData

        loadingModal.value = false
      } catch (error) {
        console.error('Data fetching failed:', error);

        loadingModal.value = false
      }
    }

    function getData(filter: any): string {
      const getEdges = graphqlUtils.getActiveColumns(data.columns, nodesEdges)
      const paginationString = `first: 500`;
      const collectionQuery = "collectionQueryProgramListSpends"
      const listAction = props.overviewPlanList ? "browse" : props.phaseId ? "edit" : "add"

      const filterbySupplier = `entityUuid: "${props.dataItem.entityUuid}"`
      const graphqlQuery = `
        {
          spends: ${collectionQuery}(
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              ${filterbySupplier},
              ${paginationString},               
              currencyRate: ${currencyRate},
              targetPlanUuid: "${props.planId}",
              targetPhaseUuid: "${'all'}",
              ${setGlobalFilter ? setGlobalFilter : ''} 
              action: "${listAction}"
            ) {
            totalCount
            edges {
              cursor
              node {
                ${getEdges}
              }
            }
          }
        }
      `;
      return graphqlQuery;
    }

    return {
      ...toRefs(data),
      kendoChartRelated,
      loadingModal,
    }
  }
})
</script>
