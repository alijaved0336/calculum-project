<template>
  <CalculumLoading v-if="(loadingModal)" :modal=true />
  <newGrid :key="keyGrid" :grid-data="list" :grid-columns="columns" :edit-list="true" :tab="tab"/>  
</template>
<script lang='ts'>

import { defineComponent, reactive, toRefs, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useHomeStore } from '@/stores/home'
import CalculumChildGrid from '@/modules/components/grid/CalculumChildGrid.vue'
import { CalculumLoading } from '@ada/design-system'
import targetVue from '../icons/IconTarget.vue'
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
  name: 'ParentGridAnalyze',
  components: {
    CalculumLoading,
    newGrid: CalculumChildGrid
  },
  props: {
    dataItem: { type: Object, required: true },
    selectedProgramId: { type: String, required: true },
    tab: { type: Number, required: false, default: 0 },
  },
  setup(props) {
    const globalFiltersStore = useGlobalFiltersStore()
    const homeStore = useHomeStore()
    const loadingModal = ref(false)
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const { isPilotAccount, useFeatureVirtualCard } = useUser()

    const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()


    const { usevCardGroupsEnabled } = useCompany()
    let setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(globalFiltersStore.getFiltersApplied)
    interface ParentGrid {
      keyGrid: number,
      columns: Array<any>,
      list: Array<any>,
      labelLevel: string,
      filters: {
        logic: any,
        filters: any,
      }
    }

    const data = reactive<ParentGrid>({
      keyGrid: new Date().getUTCMilliseconds(),
      columns: [],
      list: [],
      labelLevel: '',
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
    /**
     * Get list of columns titles
     * 
     * @returns {Array<any>}
     */
    async function getColumns() {
      let columnsSet = JSON.parse(JSON.stringify(homeStore.getHomeAnalyzeGridColumnsListParentsEdit))

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
      try {
        let queryString = getData(data.filters);

        loadingModal.value = true

        const response = await graphqlUtils.getCollectionData(queryString)
        const nodes = response.data.suppliers.edges.map((edge: any) => edge.node);
        const parsedData: Array<any> = []
        nodes.forEach(function (data: any) {
          const datas = Object.assign({}, data)

          datas.suppliersAmount = data.entityType === 'supplier' ? '-' : data.supplierCounts > 0 ? data.supplierCounts : '-'
          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness)
          );

          datas.level = 'suppliers'

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

          if (data.activeProgram && data.activeProgram !== null) {
            const programs = data.activeProgram.split(',')
            if (programs.length > 1) {
              datas.activeProgram = translate.t('tableStatus.multiple')
            }
          } else {
            datas.activeProgram = translate.t('tableStatus.notAssigned')
          }

          /** For multiple values */

          if (data.financings) {
            const splitFinancing = data.financings.split("|");
            if (splitFinancing.length > 1) {
              datas.financings = translate.t("tableStatus.multiple")
              datas.financingColors = "rgba(44,54,69,.1)"
            }
          }

          if (data.harmonizations) {
            const splitHarmonizations = data.harmonizations.split("|");
            if (splitHarmonizations.length > 1) {
              datas.harmonizations = translate.t("tableStatus.multiple")
              datas.harmColors = "rgba(44,54,69,.1)"
            }
          }
          parsedData.push(datas)
        })

        data.list = parsedData

        // Disable loading
        loadingModal.value = false
      } catch (error) {
        console.error('Data fetching failed:', error);

        // Disable loading
        loadingModal.value = false
      }
    }

    function getData(filter: any): string {
      const getEdges = graphqlUtils.getActiveColumns(data.columns, nodesEdges)
      const paginationString = `first: 500`;
      const collectionQuery = "collectionQueryProgramListSuppliers"
      const filterbySupplier = `parentUuid: "${props.dataItem.entityUuid}"`
      const graphqlQuery = `
        {
          suppliers: ${collectionQuery}(
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              ${filterbySupplier},
              ${paginationString}, 
              currencyRate: ${currencyRate},
              targetProgramUuid: "${props.selectedProgramId}",
              ${setGlobalFilter ? setGlobalFilter : ''} 
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
      loadingModal
    }
  }
})
</script>
