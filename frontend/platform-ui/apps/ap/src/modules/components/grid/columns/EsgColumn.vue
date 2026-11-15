<template>
    <td class="text-center">
        <span>
            <span v-if="('investVerteScore' in dataItem.spend.provider)">
                <span :style="'display: none;'">{{ dataItem.spend.provider.investVerteScore }}</span>
                {{ $t('home.entityCard.rating.esgClassification.c' + dataItem.spend.provider.investVerteScore) }}            
            </span>
            <span v-else>
                <span :style="'display: none;'">{{ dataItem.spend.provider.investVerteScore }}</span>
                {{ $t('home.entityCard.rating.esgClassification.c100') }} 
            </span> 
        </span>
    </td>
</template>

<script lang="ts">

import { defineComponent,  ref } from 'vue';
import { useI18n } from 'vue-i18n'

export default defineComponent({
    name: 'EsgColumn',
    props: {
         dataItem: { type: Object, required: true }
    },
    setup ( props) {
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
        return { }
    }
})
</script>

<style>

</style>