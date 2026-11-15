<template>
  <CalculumLoading v-if="(loadingModal)" :modal=true />
  <newGrid :key="keyGrid" :grid-data="list" :grid-columns="columns" :tab="tab" />
</template>
<script lang='ts'>

import { defineComponent, reactive, toRefs, watch, ref, onMounted } from 'vue'
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
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import { useAppStore } from '@/stores/app'

export default defineComponent({
  name: 'SupplierGridDetails',
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

    let currencyRate: number = useAppStore().getCurrencyAmount;
    let setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(globalFiltersStore.getFiltersApplied)

    const { user } = useUser();
    // *** Program ***
    const { programSelectedId } = useProgram();

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

    onMounted(async () => {
      data.columns = await getColumns()
      data.keyGrid++
      await fetchData()
    })


    async function getColumns() {
      let columnsSet = JSON.parse(JSON.stringify(homeStore.getHomeCategorizeGridColumnsSuppliers))

      const spendAlias = columnsSet.findIndex(
        (x: any) => x.field === "spendAlias"
      );
      if (spendAlias > -1) {
        columnsSet[spendAlias].cell = ''
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
        const nodes = response.data.suppliers.edges.map((edge: any) => edge.node);
        const parsedData: Array<any> = []
        nodes.forEach(function (data: any) {
          const datas = Object.assign({}, data)
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
          parsedData.push(datas)
        })
        data.list = parsedData

        loadingModal.value = false
      }
      catch (error) {
        console.error('Data fetching failed:', error);

        loadingModal.value = false
      }
    }


    function getData(filter: any): string {
      const getCategorizeEdges = graphqlUtils.getActiveColumns(data.columns, categorizeEdges)
      const paginationString = `first: 500`;
      const collectionQuery = "collectionQueryAnalyzeListSpends"
      const filterbySupplier = `entityUuid: "${props.dataItem.entityUuid}"`
      const graphqlQuery = `
        {
          suppliers: ${collectionQuery}(
              targetProgramUuid: "${programSelectedId.value ? programSelectedId.value : user.value?.activeProgramDefaultId !== undefined ? user.value?.activeProgramDefaultId : ''}",
              ${filterbySupplier},
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
      loadingModal
    }
  }
})
</script>