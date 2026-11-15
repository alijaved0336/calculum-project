<template>
<redCFbox01 v-if="boxType === 'financing' && boxId === '1'" :title="toolTipText"></redCFbox01>
<redCFbox02 v-if="boxType === 'financing' && boxId === '2'" :title="toolTipText"></redCFbox02>
<redCFbox03 v-if="boxType === 'financing' && boxId === '3'" :title="toolTipText"></redCFbox03>
<redCFbox04 v-if="boxType === 'financing' && boxId === '4'" :title="toolTipText"></redCFbox04>
<redCFbox05 v-if="boxType === 'financing' && boxId === '5'" :title="toolTipText"></redCFbox05>
<redCFbox06 v-if="boxType === 'financing' && boxId === '6'" :title="toolTipText"></redCFbox06>
<redCFbox07 v-if="boxType === 'financing' && boxId === '7'" :title="toolTipText"></redCFbox07>
<redCFbox08 v-if="boxType === 'financing' && boxId === '8'" :title="toolTipText"></redCFbox08>
<redCFbox09 v-if="boxType === 'financing' && boxId === '9'" :title="toolTipText"></redCFbox09>
<redCFbox01 v-if="boxType === 'scf9Box' && boxId === '1'" :title="toolTipText"></redCFbox01>
<redCFbox02 v-if="boxType === 'scf9Box' && boxId === '2'" :title="toolTipText"></redCFbox02>
<redCFbox03 v-if="boxType === 'scf9Box' && boxId === '3'" :title="toolTipText"></redCFbox03>
<redCFbox04 v-if="boxType === 'scf9Box' && boxId === '4'" :title="toolTipText"></redCFbox04>
<redCFbox05 v-if="boxType === 'scf9Box' && boxId === '5'" :title="toolTipText"></redCFbox05>
<redCFbox06 v-if="boxType === 'scf9Box' && boxId === '6'" :title="toolTipText"></redCFbox06>
<redCFbox07 v-if="boxType === 'scf9Box' && boxId === '7'" :title="toolTipText"></redCFbox07>
<redCFbox08 v-if="boxType === 'scf9Box' && boxId === '8'" :title="toolTipText"></redCFbox08>
<redCFbox09 v-if="boxType === 'scf9Box' && boxId === '9'" :title="toolTipText"></redCFbox09>
<vcardbox01 v-if="boxType === 'vcard' && boxId === '1'" :title="toolTipText"></vcardbox01>
<vcardbox02 v-if="boxType === 'vcard' && boxId === '2'" :title="toolTipText"></vcardbox02>
<vcardbox03 v-if="boxType === 'vcard' && boxId === '3'" :title="toolTipText"></vcardbox03>
<vcardbox04 v-if="boxType === 'vcard' && boxId === '4'" :title="toolTipText"></vcardbox04>
<vcardbox05 v-if="boxType === 'vcard' && boxId === '5'" :title="toolTipText"></vcardbox05>
<vcardbox06 v-if="boxType === 'vcard' && boxId === '6'" :title="toolTipText"></vcardbox06>
<vcardbox07 v-if="boxType === 'vcard' && boxId === '7'" :title="toolTipText"></vcardbox07>
<vcardbox08 v-if="boxType === 'vcard' && boxId === '8'" :title="toolTipText"></vcardbox08>
<vcardbox09 v-if="boxType === 'vcard' && boxId === '9'" :title="toolTipText"></vcardbox09>
<blueFinancingbox01 v-if="boxType === 'cashFlow' && boxId === '1'" :title="toolTipText"></blueFinancingbox01>
<blueFinancingbox02 v-if="boxType === 'cashFlow' && boxId === '2'" :title="toolTipText"></blueFinancingbox02>
<blueFinancingbox03 v-if="boxType === 'cashFlow' && boxId === '3'" :title="toolTipText"></blueFinancingbox03>
<blueFinancingbox04 v-if="boxType === 'cashFlow' && boxId === '4'" :title="toolTipText"></blueFinancingbox04>
<blueFinancingbox05 v-if="boxType === 'cashFlow' && boxId === '5'" :title="toolTipText"></blueFinancingbox05>
<blueFinancingbox06 v-if="boxType === 'cashFlow' && boxId === '6'" :title="toolTipText"></blueFinancingbox06>
<blueFinancingbox07 v-if="boxType === 'cashFlow' && boxId === '7'" :title="toolTipText"></blueFinancingbox07>
<blueFinancingbox08 v-if="boxType === 'cashFlow' && boxId === '8'" :title="toolTipText"></blueFinancingbox08>
<blueFinancingbox09 v-if="boxType === 'cashFlow' && boxId === '9'" :title="toolTipText"></blueFinancingbox09>
</template>

<script lang="ts">
import redCFbox01 from "@/resources/assets/images/9boxes/red-CF-box-01.vue";
import redCFbox02 from "@/resources/assets/images/9boxes/red-CF-box-02.vue";
import redCFbox03 from "@/resources/assets/images/9boxes/red-CF-box-03.vue";
import redCFbox04 from "@/resources/assets/images/9boxes/red-CF-box-04.vue";
import redCFbox05 from "@/resources/assets/images/9boxes/red-CF-box-05.vue";
import redCFbox06 from "@/resources/assets/images/9boxes/red-CF-box-06.vue";
import redCFbox07 from "@/resources/assets/images/9boxes/red-CF-box-07.vue";
import redCFbox08 from "@/resources/assets/images/9boxes/red-CF-box-08.vue";
import redCFbox09 from "@/resources/assets/images/9boxes/red-CF-box-09.vue";

import blueFinancingbox01 from "@/resources/assets/images/9boxes/blue-Financing-box-01.vue";
import blueFinancingbox02 from "@/resources/assets/images/9boxes/blue-Financing-box-02.vue";
import blueFinancingbox03 from "@/resources/assets/images/9boxes/blue-Financing-box-03.vue";
import blueFinancingbox04 from "@/resources/assets/images/9boxes/blue-Financing-box-04.vue";
import blueFinancingbox05 from "@/resources/assets/images/9boxes/blue-Financing-box-05.vue";
import blueFinancingbox06 from "@/resources/assets/images/9boxes/blue-Financing-box-06.vue";
import blueFinancingbox07 from "@/resources/assets/images/9boxes/blue-Financing-box-07.vue";
import blueFinancingbox08 from "@/resources/assets/images/9boxes/blue-Financing-box-08.vue";
import blueFinancingbox09 from "@/resources/assets/images/9boxes/blue-Financing-box-09.vue";

import vcardbox01 from "@/resources/assets/images/9boxes/vcard-box01.vue";
import vcardbox02 from "@/resources/assets/images/9boxes/vcard-box02.vue";
import vcardbox03 from "@/resources/assets/images/9boxes/vcard-box03.vue";
import vcardbox04 from "@/resources/assets/images/9boxes/vcard-box04.vue";
import vcardbox05 from "@/resources/assets/images/9boxes/vcard-box05.vue";
import vcardbox06 from "@/resources/assets/images/9boxes/vcard-box06.vue";
import vcardbox07 from "@/resources/assets/images/9boxes/vcard-box07.vue";
import vcardbox08 from "@/resources/assets/images/9boxes/vcard-box08.vue";
import vcardbox09 from "@/resources/assets/images/9boxes/vcard-box09.vue";

import { defineComponent } from 'vue'

export default defineComponent({
    name: "BoxImage",
    components: {
        redCFbox01, redCFbox02, redCFbox03, redCFbox04, redCFbox05, redCFbox06, redCFbox07, redCFbox08, redCFbox09,
        blueFinancingbox01, blueFinancingbox02, blueFinancingbox03, blueFinancingbox04, blueFinancingbox05, blueFinancingbox06, blueFinancingbox07, blueFinancingbox08, blueFinancingbox09,
        vcardbox01, vcardbox02, vcardbox03, vcardbox04, vcardbox05, vcardbox06, vcardbox07 ,vcardbox08, vcardbox09
    },
    props: {
        boxType: {type: String, required: true, default: "cashFlow"},
        boxId: {type: String, required: true, default: "1"},
        toolTipText: {type: String, required: true, default: ""}
    },
    setup(props) {
      
    },
})
</script>
