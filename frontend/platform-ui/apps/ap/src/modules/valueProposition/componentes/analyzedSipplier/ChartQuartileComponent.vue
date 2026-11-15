<template>
<div class="row">
  <div class="col-md-12 card-chart-standard">
    <EntityTermsChartLine :active="false" :bar-size="size" :chartName="obj.key" :barColor="setColor" :title="title" :tooltip-text="$t('home.entityCard.strategies.' + obj.key + 'Tooltip')" :used-strategy="true" :value="obj.terms" :data="obj" :from-v-p="true"></EntityTermsChartLine>
  </div>
</div>
<div class="row">
  <div class="col-md-12 below-chart" :class="obj.terms ? '' : 'mt-2'">
    <template v-for="(detail, detailKey) in obj.details" :key="detailKey">
      <div class="info-button mr-4 mb-2" :title="titleShow(detailKey)" :class="calculationMethodShow(detailKey)"><i class="fa-solid fa-check text-white text-xxs" aria-hidden="true" v-if="obj.calculationMethod === detailKey"></i><span class="text-sm font-normal" :class="calculationMethodShowText(detailKey)">{{ extraDetailShow(detailKey) }}</span><span class="text-sm font-bold text-capitalize" :class="calculationMethodShowText(detailKey)">{{ detail ?? $t("global.notAvailable") }}</span></div>
    </template>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs } from 'vue'
import {
    ObjectUtils,
    PaymentTermsStrategiesUtils,
} from "@/utils";
import { useI18n } from "vue-i18n";
import { useEntityCardStore } from "@/stores/entityCard";
import EntityTermsChartLine from '@/modules/home/entityCard/components/opportunity/EntityTermsChartLine.vue';
import IconCheckCircleFill2 from "@/resources/assets/images/icons/IconCheckCircleFill2.vue";
export default defineComponent({
    name: "ChartQuartileComponent",
    components: {
        EntityTermsChartLine,
        IconCheckCircleFill2
    },
    props: {
        objData: { type: Object, required: true }
    },
    setup(props) {
        const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' });
        const entityCardStore = useEntityCardStore();
        function setBarSize(size: number) {
            const newSize = (size * 100) / 180;
            return newSize > 100 ? 100 : newSize;
        }
        function getTitle(strategyKey: string) {
            if (strategyKey !== 'currentTerms') {
                return t('home.entityCard.strategies.' + strategyKey)

            } else {

                if (entityCardStore.getSelectedEntity.companyTypeForTheme === "potential-supplier" || entityCardStore.getSelectedEntity.companyTypeForTheme === "potential-parent") {
                    return t('home.entityCard.strategies.estimatedTerms')
                }

                return t('global.averageDaysPaid')
            }
        }
        const data = reactive({
            obj: ObjectUtils.cloneDeep(props.objData.value)
        })
        const moreData = reactive({
            color: undefined,
            size: setBarSize(data.obj.terms),
            setColor: PaymentTermsStrategiesUtils.getColorByStrategyKey(data.obj.key),
            title: getTitle(data.obj.key),
            usedStrategy: data.obj.usedStrategy,
        })
        const titleShow = (detailKey: number) => {
            return t(`global.${detailKey}Tooltip`) ? t(`global.${detailKey}Tooltip`) : ''
        }
        const extraDetailShow = (detailKey: number) => {
            return t('home.entityCard.strategies.extra.details.' + detailKey)
        }
        const calculationMethodShow = (detailKey: number) => {
            return data.obj.calculationMethod === detailKey ? 'bg-gray-500' : ''
        }
        const calculationMethodShowText = (detailKey: number) => {
            return data.obj.calculationMethod === detailKey ? 'text-white-0' : 'text-gray-500'
        }
        return {
            ...toRefs(data),
            ...toRefs(moreData),
            titleShow,
            extraDetailShow,
            calculationMethodShow,
            calculationMethodShowText, PaymentTermsStrategiesUtils
        }
    }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/utils/_borders.scss";

.card-chart-standard {
    padding: 0px 27px 0px 20px !important;
}

.below-chart {
    padding-left: 55px !important;
    display: flex;
    // justify-content: flex-end;
    align-items: baseline;
}
.info-button {
  display: flex;
  padding: 2px 6px;
  align-items: center;
  gap: 10px;
  border-radius: 4px;
  background: $color-gray-100;
}
</style>