<template>
  <CalculumLoading v-if="(loadingModal)" :modal=true />
  <newGrid :gridData="list" :gridColumns="columns" :editList="false" :tab="tab" />
</template>
<script lang='ts'>

import { defineComponent, reactive, toRefs, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHomeStore } from '@/stores/home'
import { usePlanStore } from '@/stores/plan'
import CalculumChildGrid from '@/modules/components/grid/CalculumChildGrid.vue'
import { CalculumLoading } from '@ada/design-system'

export default defineComponent({
  name: 'ParentCFEdit',
  components: {
    CalculumLoading,
    newGrid: CalculumChildGrid
  },
  props: {
    dataItem: { type: Object, required: true },
    tab: { type: Number, required: false, default: 0 }
  },
  emits: ['send-status-filter'],
  setup(props, { emit }) {
    const homeStore = useHomeStore()
    const planStore = usePlanStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const loadingModal = ref(false)

    interface ParentsGrid {
      columns: Array<any>,
      list: Array<any>,
    }

    const data = reactive<ParentsGrid>({
      columns: getColumns(),
      list: []
    })

    onMounted(() => {
      getSpends()
    })

    function getColumns(): Array<any> {
              let columnsSet = homeStore.getPlanSummaryList
      const columns: Array<any> = []        
      columnsSet.forEach(function (config: any) {
        const newConfig = Object.assign({}, config)
        newConfig.hidden = false
        newConfig.footerCell = null

        if (newConfig.field === 'name'){
          newConfig.width = '230px'
          newConfig.title = translate.t('home.entityCard.results.phase')          
        }

        if (newConfig.field === 'startDate.date' || newConfig.field === 'endDate.date'){
          newConfig.width = '130px' 
        }

        

        columns.push(newConfig)
      })
      
      return columns
    }

    function getSpends() {
      

      const params = {
        planUuid: props.dataItem.uuid,        
        callbackSuccess: (callbackSuccessData: any) => {         
          data.list = callbackSuccessData          
        },
        callbackError: () => {
         
        }
      }      
      planStore.getPlansbySpendfileChilds(params)
    }    
  
    return {
      ...toRefs(data),    
      loadingModal,
    }

  }
})
</script>
