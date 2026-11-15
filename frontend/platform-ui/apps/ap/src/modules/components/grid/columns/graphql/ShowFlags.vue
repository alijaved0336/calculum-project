<template>
  <td>
      <div class="text-left">
        <Tooltip :open-delay='100' :anchor-element="'target'">
          <span class='ellipsis_custom_flags' :style="'float: left; margin-left: 2px; text-transform: capitalize;'" :title="getCountry()"> {{ getCountry() }} </span>                   
          <img v-if="showFlag.value" :src="getFlag()" alt="dataItem.countryName" :style="'width: 2.2rem; float: right; margin-right: 2px;'"/>          
        </Tooltip>
      </div>
   </td>
</template>

<script lang="ts">
import { getNestedValue } from '@progress/kendo-vue-grid'
import { defineComponent, reactive } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'

export default defineComponent({
 name: 'ShowFlags',
 components: { Tooltip },
 props: {
   forCompareAddCompanies: {type: Boolean, required: false},
   dataItem: { type: Object, required: true },
   field: { type: String, required: true }
 },
 setup ( props ) {
   
  const showFlag = reactive({
      value: true
    })

   function getFlag () {
    if (props.field === 'entityCountryName'){
      return getNestedValue('entityFlagUrl', props.dataItem)
    } else {
      if (getNestedValue('buyerFlagUrl', props.dataItem) === null){
        showFlag.value = false  
      }      
      
      const getValues = getNestedValue('buyerFlagUrl', props.dataItem)

      if (typeof getValues === 'string' && getValues.split(',').length > 1) {
        return null
      }

      return getValues
    }    
   }

   function getCountry() {    
    return getNestedValue(props.field, props.dataItem)       
   }

   return {
     getFlag,
     getCountry,   
     showFlag
   }
 }
})
</script>