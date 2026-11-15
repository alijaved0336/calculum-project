<template>
  <CalculumLoading v-if="(loadingModal)" :modal=true />
  <newGrid :key="keyGrid" :grid-data="list" :grid-columns="columns" :tab="tab" />
</template>
<script lang='ts'>
/**
 * Categorize
 */

import { defineComponent, reactive, toRefs, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useHomeStore } from '@/stores/home'
import CalculumChildGrid from '@/modules/components/grid/CalculumChildGrid.vue'
import { CalculumLoading } from '@ada/design-system'
import * as graphqlUtils from '@/utils/graphqlUtils'
import { categorizeEdges } from '@/modules/home/categorize/data/categorizeEdges';
import * as formatData from '@/utils/FormatData'
import useProgram from '@/modules/home/analyze/composables/useProgram';
import useUser from '@/services/user/composables/useUser';
import useSpendFile from "@/composables/useSpendFile";
import * as kendoChartRelated from '@/utils/kendoChartRelated'
import useCompany from "@/composables/useCompany"
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import { useAppStore } from '@/stores/app'


export default defineComponent({
  name: 'ParentChildGridDetails',
  components: {
    CalculumLoading,
    newGrid: CalculumChildGrid
  },
  props: {
    dataItem: { type: Object, required: true },
    tab: { type: Number, required: false, default: 0 }
  },
  setup(props) {
    const globalFiltersStore = useGlobalFiltersStore()
    const homeStore = useHomeStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const loadingModal = ref(false)


    const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()

    const {
      spendFileVersionActiveId
    } = useSpendFile()

    const { usevCardGroupsEnabled } = useCompany()

    let currencyRate: number = useAppStore().getCurrencyAmount;
    let setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(globalFiltersStore.getFiltersApplied)

    const { user, isPilotAccount, useFeatureVirtualCard } = useUser();
    // *** Program ***
    const { programSelectedId } = useProgram();

    interface ParentGrid {
      keyGrid: number,
      columns: Array<any>,
      list: Array<any>,
      filters: {
        logic: any,
        filters: any,
      }
    }

    const data = reactive<ParentGrid>({
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
                "field": "parentUuid",
                "operator": "eq",
                "value": props.dataItem.entityUuid
              }
            ]
          }
        ]
      }
    })

    onMounted(async () => {
      data.columns = await getColumns()
      data.keyGrid++
      await fetchData()
    })

    /**
     * Get list of columns titles
     * 
     * @returns {Array<any>}
     */

    async function getColumns() {
      let columnsSet = JSON.parse(JSON.stringify(homeStore.getHomeCategorizeGridColumnsParents))

      const supplierCounts = columnsSet.findIndex(
        (x: any) => x.field === "supplierCounts"
      );
      if (supplierCounts > -1) {
        columnsSet[supplierCounts].title = translate.t("home.analyze.table.numberOfSpends")
        columnsSet[supplierCounts].field = "spendCounts"
        columnsSet[supplierCounts].cell = "spendCountCell"
      }

      const entityName = columnsSet.findIndex(
        (x: any) => x.field === "entityName"
      );
      if (entityName > -1) {
        columnsSet[entityName].title = translate.t("home.analyze.table.supplierName")
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
        const nodes = response.data.parents.edges.map((edge: any) => edge.node);
        const parsedData: Array<any> = []

        nodes.forEach(function (data: any) {
          const datas = Object.assign({}, data)
          datas.spendsAmount = data.spendCounts
          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness)
          );
          datas.entityWomanOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityWomanOwnedBusiness)
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

          /** For multiple values */
          if (data.agreedDateOfChange) {
            let splitDate = data.agreedDateOfChange.split(',')
            if (splitDate.length > 1) {
              datas.agreedDateOfChange = translate.t('tableStatus.multiple')
            }
          }
          if (data.nextReviewDate) {
            let splitDate = data.nextReviewDate.split(',')
            if (splitDate.length > 1) {
              datas.nextReviewDate = translate.t('tableStatus.multiple')
            }
          }

          parsedData.push(datas)
        })

        data.list = parsedData

        // Disable loading
        loadingModal.value = false
      }
      // 
      catch (error) {
        // Disable loading
        loadingModal.value = false

        console.error('** Error in fetchData:', error);
      }
    }

    function getData(filter: any): string {
      const getCategorizeEdges = graphqlUtils.getActiveColumns(data.columns, categorizeEdges)
      const paginationString = `first: 500`;
      const collectionQuery = "collectionQueryAnalyzeListSuppliers"
      const filterbyParent = `parentUuid: "${props.dataItem.entityUuid}"`
      const graphqlQuery = `
        {
          parents: ${collectionQuery}(
              targetProgramUuid: "${programSelectedId.value ? programSelectedId.value : user.value?.activeProgramDefaultId !== undefined ? user.value?.activeProgramDefaultId : ''}",
              ${filterbyParent},
              ${paginationString},
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              currencyRate: ${currencyRate},
              ${setGlobalFilter ? setGlobalFilter : ''} 
            ) {
            totalCount            
            edges {
              cursor
              node {
                ${getCategorizeEdges}
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