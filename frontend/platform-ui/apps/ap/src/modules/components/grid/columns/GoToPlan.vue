<template>
  <td>
       <div class="text-left cursor-pointer" @click="gotoPlan">
           {{ dataItem.name !== "" && dataItem.name !== null ? dataItem.name : dataItem.number === 10000 ? 'Rest' : 'Phase ' + dataItem.number }}
       </div>
   </td>
</template>


<script lang="ts">
import * as Routing from '@/services/router/Routing'
import { useRouter } from 'vue-router';
import { StringUtils } from '@/utils';
import { defineComponent } from 'vue';

export default defineComponent({
 name: 'GoToPlan',
 props: {
   dataItem: { type: Object, required: true }
 },
 setup (props: { dataItem: any }) {
  const router = useRouter();
   
   function gotoPlan() {      


    if (props.dataItem.phaseUUID){
      router.push({
        name: Routing.home.plan.homeHomePlanV2,        
        query: {
          planId: StringUtils.removeIRI(props.dataItem.uuid),
          phaseIdList: props.dataItem.phaseUUID
        }
      });

    } else {

      router.push({
        name: Routing.home.plan.homeHomePlanV2,        
        query: {
          planId: StringUtils.removeIRI(props.dataItem.uuid)
        }
      });

    }
   }

   return {
    gotoPlan
   }
   }
 })
</script>

<style lang="scss" scoped>

</style>
