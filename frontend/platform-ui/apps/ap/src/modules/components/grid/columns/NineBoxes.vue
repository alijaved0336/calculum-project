<template>
<td class="text-center custom-font-weight">
  <Skeleton class="skeletons-bg" v-if="programInrecalculation" :shape="'text'" :style="{ width: '100%', height: '25px' }"></Skeleton>
  <Tooltip :open-delay="50" :anchor-element="'target'" :position="'bottom'" v-else>
    <div class="d-flex align-items-center gap-2 w-75 mx-auto" v-if="getBoxNumber() === '0' || getBoxNumber() === 'null' || getBoxNumber() === 'undefined'"><span class="w-100">{{ '-' }}    </span></div>
    <div class="d-flex align-items-center box-badges gap-2 w-75 mx-auto" v-else :title="getBoxTitle()">
      <BoxImage :boxType="getBoxType()" :boxId="getBoxNumber()" :title="getBoxTitle()" :tool-tip-text="getBoxTooltip()"></BoxImage><span>{{ getBoxText() }}</span>
    </div>
  </Tooltip>
</td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Skeleton } from '@progress/kendo-vue-indicators';
import BoxImage from "@/modules/home/entityCard/components/BoxImage.vue";
import { useI18n } from 'vue-i18n';
import { Tooltip } from "@progress/kendo-vue-tooltip";
export default defineComponent({
  name: "NineBoxes",
  components: {
    BoxImage,
    Skeleton,
    Tooltip,
  },
  props: {
     dataItem: { type: Object, required: true },
     typeOf9Boxes: { type: String, required: true },
     programInrecalculation: { type: Boolean, required: false, default: false }
  },  
  setup(props) { 

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' }) 

    function getBoxNumber() {

      switch(props.typeOf9Boxes) {
        case 'financing':
          return String(props.dataItem.financialBox)

        case 'scf9Box':
          return String(props.dataItem.scfBox)

        case 'cashFlow':
          return String(props.dataItem.box)

        case 'vcard':
          return String(props.dataItem.vCardBox)
      }
      // return props.typeOf9Boxes === 'financing' ? String(props.dataItem.financialBox) : String(props.dataItem.box)
    }

    function getBoxType() {
      return props.typeOf9Boxes
    }

    function getBoxTitle() {

      switch(props.typeOf9Boxes) {
        case 'financing':
          return translate.t('global.boxes.financing') + " " + getBoxNumber()

        case 'cashFlow':
          return translate.t('global.boxes.cashFlow') + " " + getBoxNumber()

        case 'scf9Box':
          return translate.t('global.boxes.scf9Box') + " " + getBoxNumber()

        case 'vcard':
          return translate.t('global.boxes.vcard') + " " + getBoxNumber()
      }


      // return props.typeOf9Boxes === 'financing' ?  translate.t('global.boxes.financing') + " " + getBoxNumber() : translate.t('global.boxes.cashFlow') + " " + getBoxNumber()
    }

    function getBoxTooltip() {

      switch(props.typeOf9Boxes) {
        case 'financing':
          return `${translate.t('global.boxes.financing')} ${props.dataItem.financialBox}`

        case 'scf9Box':
          return `${translate.t('global.boxes.scf9Box')} ${props.dataItem.scfBox}`

        case 'cashFlow':
          return `${translate.t('global.boxes.cashFlow')} ${props.dataItem.box}`

        case 'vcard':
          return `${translate.t('global.boxes.cashFlow')} ${props.dataItem.vCardBox}`
      }


      // return props.typeOf9Boxes === 'financing' ? `${translate.t('global.boxes.financing')} ${props.dataItem.financialBox}` : `${translate.t('global.boxes.cashFlow')} ${props.dataItem.box}`
    }

    function getBoxText() {

      switch(props.typeOf9Boxes) {
        case 'financing':
          return translate.t('global.box') + " " + props.dataItem.financialBox

        case 'scf9Box':
          return translate.t('global.box') + " " + props.dataItem.scfBox 

        case 'cashFlow':
          return translate.t('global.box') + " " + props.dataItem.box

        case 'vcard':
          return translate.t('global.box') + " " + props.dataItem.vCardBox
      }


      // let numberBox = props.dataItem.box ?? props.dataItem.financialBox
      // return translate.t('global.box') + " " + numberBox
    }

    return {
      getBoxNumber,
      getBoxText,
      getBoxTitle,
      getBoxTooltip,
      getBoxType,
    }
  },
})
</script>

<style lang="scss" scoped>

</style>
