<template>
    <manageOverviewHero v-if="hero === 'manageTeaser'" />
    <manageEmailNegotiationHero v-if="hero === 'emailNegotiations'" />
    <nineBoxesFinancingHero v-if="hero === 'nineBoxesFinancing'" />
    <entityCardCalculatorHero v-if="hero === 'entityCardCalculator'" />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import manageEmailNegotiationHero from "@/resources/assets/images/teaser/manage/manageEmailNegotiationHero.vue";
import manageOverviewHero from "@/resources/assets/images/teaser/manage/manageOverviewHero.vue";
import nineBoxesFinancingHero from '@/resources/assets/images/teaser/nineBoxes/nineBoxesFinancingHero.vue';
import entityCardCalculatorHero from '@/resources/assets/images/teaser/entityCard/entityCardCalculatorHero.vue';

export default defineComponent({
    name: 'HeroImage',
    components : {
        manageEmailNegotiationHero,
        manageOverviewHero,
        nineBoxesFinancingHero,
        entityCardCalculatorHero
    },
    props: {
        hero: { type: String, required: true }
    },
    setup() {
        
    },
})
</script>
