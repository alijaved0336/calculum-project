<template>
    <td class="text-center">
        <span v-if="('womanOwnedBusiness' in dataItem.spend.provider)">
            <span :style="'display: none;'">{{ dataItem.spend.provider.womanOwnedBusiness }}</span>
            {{ dataItem.spend.provider.womanOwnedBusiness ? "Yes" : "No" }}            
        </span>
        <span v-else>
             <span :style="'display: none;'">{{ dataItem.spend.provider.womanOwnedBusiness }}</span>
             -
        </span>
    </td>
</template>

<script lang="ts">

import { defineComponent } from 'vue';

export default defineComponent({
    name: 'WomanColumn',
    props: {
         dataItem: { type: Object, required: true }
    }
})
</script>