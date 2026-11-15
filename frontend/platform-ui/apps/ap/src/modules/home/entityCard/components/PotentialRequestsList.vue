<template>
<CalculumGrid :gridData="dataGrid" :gridColumns="defaultColumns" :allowExportExcel="false" :hideColumnSelector="true" :childrenColumns="false" :showToolbar="false" :selectable="false"> </CalculumGrid>
</template>

<script lang="ts">

import { defineComponent, reactive, toRefs} from 'vue';
import CalculumGrid from "@/modules/components/grid/CalculumGrid.vue";
import { entitypotentialREquestColumns } from "../data/graphqlColums"

export default defineComponent({
    name: "PotentialRequestList",
    components: {
        CalculumGrid
    },
    props: {
        potentialRequests: { type: Object, required: true}
    },
    setup(props: any) {

        interface DataInterface {
            dataGrid: any,
            defaultColumns: Array<any>,
        }

        const data = reactive<DataInterface>({
            dataGrid: props.potentialRequests,
            defaultColumns: entitypotentialREquestColumns
        })

        return {
            ...toRefs(data)
        }
    }

})
</script>