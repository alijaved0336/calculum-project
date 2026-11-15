<template>
<NineBoxCard
  :badge="data.realBoxNumber"
  :rows="rows"
  :accent="accentKey"
  :selected="data.isBoxSelected"
  :clickable="isClickable"
  :muted="isMuted"
  :tall="typeOf9Boxes === 'vcard'"
  @click="clickOnBox"
></NineBoxCard>
</template>

<script lang="ts">
import { computed, defineComponent, getCurrentInstance, inject, reactive, onMounted } from 'vue'
import { NineBoxCard, type NineBoxCardAccent, type NineBoxCardRow } from '@ada/design-system'
import { getNumberWithDecimals } from '@/utils/FormatData'
import { StringUtils } from '@/utils';
import { useAnalyzeStore } from '@/stores/analyze';

export default defineComponent({
  name: 'NineBoxesBox',
  components: { NineBoxCard },
  props: {
    selectedLevelType: { type: String, required: false, default: 'spend' },
    boxNumber: { type: String, required: true },
    boxGroup: { type: String, required: true },
    /**
     * e.g.
     *
     * "box1": {
          "spends": 23,
          "suppliers": 11,
          "parents": 3,
          "buyers": 1,
          "volume": 230000,
          "cashFlow": 450000,
          "discounts": 343434
        },
      */
    boxInfo: { type: Object, required: true },
    boxTitle: { type: String, required: true },
    typeOf9Boxes: { type: String, required: true },
  },
  emits: ['selected-boxes'],
  setup(props, { emit }) {
    // `$t` off the instance proxy, not `useI18n()`: this stays a global-property read
    // (same mechanism the original template's `$t(...)` calls used), so it keeps
    // working under tests/setup.ts's `$t` mock without requiring a real i18n plugin
    // install, exactly like before this component started building its rows in script.
    const instance = getCurrentInstance()
    const t = (key: string): string => (instance?.proxy as { $t?: (key: string) => string } | null)?.$t?.(key) ?? key
    const analyzeStore = useAnalyzeStore();
    const fromValuePropositionLowHangingFruits=inject('fromValuePropositionLowHangingFruits',false)

    interface Data {
      isBoxSelected: boolean,
      realBoxNumber: number
    }

    const data = reactive<Data>({
      isBoxSelected: false,
      realBoxNumber: Number(Number(props.boxNumber))
    })

    /**
     * Card visuals (badge/rows/accent/selected/clickable/muted) render through the
     * shared `NineBoxCard` (@ada/design-system) so this looks the same in AP and AR —
     * see that component's own doc comment for the exact per-accent color spec ported
     * from this file's original `<style>`. Everything below (selection, formatting,
     * click dispatch to the store) is unchanged from before that port.
     */

    /** AP's own read-only "Value Proposition" usage disables the click entirely
     * (see `clickOnBox`); a box with zero volume never has anything to select either
     * — both cases disable hover/cursor via `clickable`, only the zero-volume one also
     * dims the card via `muted`. */
    const isMuted = computed(() => props.boxInfo.volume === 0)
    const isClickable = computed(() => !fromValuePropositionLowHangingFruits && props.boxInfo.volume !== 0)

    /** `boxGroup` arrives as AP's own `box-group-color-*` class name (see
     * NineBoxes.vue's `boxGroupMap`/`boxGroupMapFinancing`/`boxGroupMapVcard`) — strip
     * the prefix to get a `NineBoxCardAccent`. */
    const accentKey = computed<NineBoxCardAccent>(() => props.boxGroup.replace('box-group-color-', '') as NineBoxCardAccent)

    const formatDataForNineBoxes = (value: number) => {
      if (value){
        return StringUtils.formatBigNumbers(value, { maximumFractionDigits: 1, lang: "en-US" })

      } else {
        return "-";
      }
    }

    const getNumberWithDecimalsValue = (value: number, decimals: number) => {
      if (value){
        return getNumberWithDecimals(value, decimals)

      } else {
        return "-";
      }
    }

    /**
     * Format big numbers. Set number of decimals to 1.
     * Returns a value or '-' for a section of nine box card
     */
    const boxInfoFormatted = computed(() => {

      //use typeOf9Boxes to set the type of return


      if (props.typeOf9Boxes === 'cashFlow'){
        return {
          cashFlow: props.boxInfo.cashFlow ? formatDataForNineBoxes(props.boxInfo.cashFlow) : "-",
          discounts: props.boxInfo.discounts ? formatDataForNineBoxes(props.boxInfo.discounts) : "-",
          parents: props.boxInfo.parents ?  getNumberWithDecimalsValue(props.boxInfo.parents, 0) : "-",
          spends: props.boxInfo.spends ? getNumberWithDecimalsValue(props.boxInfo.spends, 0) : "-",
          suppliers: props.boxInfo.suppliers ? getNumberWithDecimalsValue(props.boxInfo.suppliers, 0) : "-",
          volume: props.boxInfo.volume ? formatDataForNineBoxes(props.boxInfo.volume) : "-"
        }

      }

      else if (props.typeOf9Boxes === 'financing' ){
        return {
          cashFlow: props.boxInfo.potentialSCFRevenue ? formatDataForNineBoxes(props.boxInfo.potentialSCFRevenue) : "-",
          discounts: props.boxInfo.discounts ? formatDataForNineBoxes(props.boxInfo.discounts) : "-",
          parents: props.boxInfo.parents ?  getNumberWithDecimalsValue(props.boxInfo.parents, 0) : "-",
          spends: props.boxInfo.spends ? getNumberWithDecimalsValue(props.boxInfo.spends, 0) : "-",
          suppliers: props.boxInfo.suppliers ? getNumberWithDecimalsValue(props.boxInfo.suppliers, 0) : "-",
          volume: props.boxInfo.volume ? formatDataForNineBoxes(props.boxInfo.volume) : "-"
        }

      }

      else if (props.typeOf9Boxes === 'scf9Box'){
        return {
          cashFlow: props.boxInfo.cashFlow ? formatDataForNineBoxes(props.boxInfo.cashFlow) : "-",
          discounts: props.boxInfo.discounts ? formatDataForNineBoxes(props.boxInfo.discounts) : "-",
          parents: props.boxInfo.parents ?  getNumberWithDecimalsValue(props.boxInfo.parents, 0) : "-",
          spends: props.boxInfo.spends ? getNumberWithDecimalsValue(props.boxInfo.spends, 0) : "-",
          suppliers: props.boxInfo.suppliers ? getNumberWithDecimalsValue(props.boxInfo.suppliers, 0) : "-",
          volume: props.boxInfo.volume ? formatDataForNineBoxes(props.boxInfo.volume) : "-"
        }

      }


      //* vCard
      else {
        return {
          cashFlow: props.boxInfo.cashFlow ? formatDataForNineBoxes(props.boxInfo.cashFlow) : "-",
          discounts: props.boxInfo.discounts ? formatDataForNineBoxes(props.boxInfo.discounts) : "-",
          parents: props.boxInfo.parents ?  getNumberWithDecimalsValue(props.boxInfo.parents, 0) : "-",
          spends: props.boxInfo.spends ? getNumberWithDecimalsValue(props.boxInfo.spends, 0) : "-",
          suppliers: props.boxInfo.suppliers ? getNumberWithDecimalsValue(props.boxInfo.suppliers, 0) : "-",
          volume: props.boxInfo.volume ? formatDataForNineBoxes(props.boxInfo.volume) : "-",
          rebate: props.boxInfo.rebateCashFlow ? StringUtils.formatBigNumbers(props.boxInfo.rebateCashFlow, { maximumFractionDigits: 1, lang: "en-US" }) : "-"

        }

      }


    })

    /**
     * The card's label/value rows, in the exact order the original hand-rolled
     * template rendered them: headline (this box's own `boxTitle`), vCard's extra
     * rebate row, spend volume, then whichever single level-conditional row
     * (parents/suppliers/spends) applies.
     */
    const rows = computed<NineBoxCardRow[]>(() => {
      const formatted = boxInfoFormatted.value as Record<string, string>
      const result: NineBoxCardRow[] = [
        { label: props.boxTitle, value: formatted.cashFlow },
      ]

      if (props.typeOf9Boxes === 'vcard') {
        result.push({ label: t('global.rebate'), value: formatted.rebate })
      }

      result.push({
        label: t('home.analyze.spendVolume'),
        value: formatted.volume,
      })

      if (props.selectedLevelType === 'parent') {
        result.push({ label: t('global.parents'), value: formatted.parents })
      } else if (props.selectedLevelType === 'supplier') {
        result.push({
          label: t('home.analyze.list.suppliers'),
          value: formatted.suppliers,
        })
      } else if (props.selectedLevelType === 'spend') {
        result.push({
          label: t('global.spends'),
          value: formatted.spends,
        })
      }

      return result
    })


    /**
     * Methods
     */

    /**
     * Toggle the box selection
     */
    function clickOnBox() {
      if (!fromValuePropositionLowHangingFruits) {
        switch (props.typeOf9Boxes) {
          case 'cashFlow':
            clickOnBoxCF()
            break;
          case 'financing':
            clickOnBoxFinancing()
            break;
          case 'scf9Box':
            clickOnBoxSCF()
            break;
          case 'vcard':
            clickOnBoxVcard()
            break;
          default:
            break;
        }
      }


    }


    function clickOnBoxVcard() {

      try {
        // Check if the box can be selected
        if (props.boxInfo.volume === 0) {
          return false
        }

        // Get the current selected boxes
        let selectedBoxes: Array<any> = analyzeStore.getNineBoxesSelectedBoxesVcard
        data.isBoxSelected = !data.isBoxSelected

        // Check if the clicked box is already selected
        if (selectedBoxes.includes(Number(Number(props.boxNumber)))) {
          // Then remove it from the array of selected boxes
          selectedBoxes = selectedBoxes.filter((box) => box !== Number(Number(props.boxNumber)))
        } else {
          // Add the selected box to the array of selected boxes
          selectedBoxes = [...selectedBoxes, Number(Number(props.boxNumber))]
        }
        // Send to the store the updated array of selected boxes
        analyzeStore.setNineBoxesSelectedBoxesVcard(selectedBoxes)
        //emit to Papa
        emit('selected-boxes')

        //}

      } catch (error) {
        if (import.meta.env.DEV) console.error('Error on clickOnBox: ', error)
      }

    }

    function clickOnBoxFinancing() {
      try {
        // Check if the box can be selected
        if (props.boxInfo.volume === 0) {
          return false
        }

        // Get the current selected boxes
        let selectedBoxes: Array<any> = analyzeStore.getNineBoxesSelectedBoxesFinancing
        data.isBoxSelected = !data.isBoxSelected

        // Check if the clicked box is already selected
        if (selectedBoxes.includes(Number(Number(props.boxNumber)))) {
          // Then remove it from the array of selected boxes
          selectedBoxes = selectedBoxes.filter((box) => box !== Number(Number(props.boxNumber)))
        } else {
          // Add the selected box to the array of selected boxes
          selectedBoxes = [...selectedBoxes, Number(Number(props.boxNumber))]
        }
        // Send to the store the updated array of selected boxes
        analyzeStore.setNineBoxesSelectedBoxesFinancing(selectedBoxes)
        //emit to Papa
        emit('selected-boxes')

        //}

      } catch (error) {
        if (import.meta.env.DEV) console.error('Error on clickOnBox: ', error)
      }
    }

    function clickOnBoxSCF() {
      try {
        // Check if the box can be selected
        if (props.boxInfo.volume === 0) {
          return false
        }

        // Get the current selected boxes
        let selectedBoxes: Array<any> = analyzeStore.getNineBoxesSelectedBoxesFinancingSCF
        data.isBoxSelected = !data.isBoxSelected

        // Check if the clicked box is already selected
        if (selectedBoxes.includes(Number(Number(props.boxNumber)))) {
          // Then remove it from the array of selected boxes
          selectedBoxes = selectedBoxes.filter((box) => box !== Number(Number(props.boxNumber)))
        } else {
          // Add the selected box to the array of selected boxes
          selectedBoxes = [...selectedBoxes, Number(Number(props.boxNumber))]
        }
        // Send to the store the updated array of selected boxes
        analyzeStore.setNineBoxesSelectedBoxesFinancingSCF(selectedBoxes)
        //emit to Papa
        emit('selected-boxes')

        //}

      } catch (error) {
        if (import.meta.env.DEV) console.error('Error on clickOnBox: ', error)
      }
    }

    function clickOnBoxCF() {
      try {
        // Check if the box can be selected
        if (props.boxInfo.volume === 0) {
          return false
        }

        // Get the current selected boxes
        let selectedBoxes: Array<any> = analyzeStore.getNineBoxesSelectedBoxes
        data.isBoxSelected = !data.isBoxSelected

        // Check if the clicked box is already selected
        if (selectedBoxes.includes(Number(Number(props.boxNumber)))) {
          // Then remove it from the array of selected boxes
          selectedBoxes = selectedBoxes.filter((box) => box !== Number(Number(props.boxNumber)))
        } else {
          // Add the selected box to the array of selected boxes
          selectedBoxes = [...selectedBoxes, Number(Number(props.boxNumber))]
        }
        // Send to the store the updated array of selected boxes
        analyzeStore.setNineBoxesSelectedBoxes(selectedBoxes)
        //emit to Papa
        emit('selected-boxes')

        //}

      } catch (error) {
        if (import.meta.env.DEV) console.error('Error on clickOnBox: ', error)
      }
    }

    /**
     * onMounted
     */

    onMounted(() => {
      // Check if the box is already selected
      data.isBoxSelected = props.boxInfo.selected
    })

    return {
      data,
      rows,
      accentKey,
      isClickable,
      isMuted,
      boxInfoFormatted,
      clickOnBox,
      getNumberWithDecimals,
    }
  }
})
</script>
