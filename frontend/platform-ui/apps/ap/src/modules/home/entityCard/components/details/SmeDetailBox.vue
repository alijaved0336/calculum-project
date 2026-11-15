<template>
<template v-if="smeFeatureEnabled">
  <div class="row" :id="isSME ? 'sme-card-details-sme' : 'sme-card-details-not-sme'">
    <div class="col-12 mb-6">
      <DetailBox :title="(smeTitleValue || '').toLocaleUpperCase()" :value="''"></DetailBox>
    </div>
    <div class="col-12 mb-6">
      <div class="d-flex gap-3 align-items-start">
        <SmeBadge class="sme-badge-icon large" v-if="isSME"></SmeBadge>
        <SmeBadgeExcluded class="sme-badge-icon large" v-else></SmeBadgeExcluded>
        <div class="d-flex flex-column">
          <DetailBox :title="$t('home.entityCard.companyDetails.general.source')" :value="''" :isTooltip="true"></DetailBox><span class="font-bold text-gray-600">{{ classificationCase.name }}</span><span class="text-gray-500 text-md mt-2">{{ classificationCase.description }}</span>
        </div>
      </div>
    </div>
    <div class="col-12">
      <SmeClassificationCase :description="classificationCase.description" :limits="classificationCase.limits"></SmeClassificationCase>
    </div>
  </div>
  <button class="btn-text d-flex text-sm text-capitalize text-gray-500 show-details-btn" v-if="hasCardContent" @click="$emit('show-modal-sme-details')"><span>{{ $t('home.entityCard.showDetails') }}</span>
    <InformationCircleSvg class="mr-0 icon-svg fill-current my-auto"></InformationCircleSvg>
  </button>
</template>
<template v-else>
  <div class="row">
    <div class="col-12 mb-6">
      <DetailBox :title="$t('home.entityCard.companyDetails.general.smeCardTitle').toLocaleUpperCase()" :value="''"></DetailBox>
    </div>
    <div class="col-12">
      <div class="d-flex align-items-center justify-content-center flex-grow-1">
        <div class="d-flex gap-3 align-items-center">
          <SmeBadgeTeaser class="sme-badge-icon large"></SmeBadgeTeaser><span>{{ $t('home.entityCard.companyDetails.general.smeNotEnabled') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import SmeBadge from "@/resources/assets/images/icons/smeBadge.vue";
import SmeBadgeExcluded from "@/resources/assets/images/icons/SmeBadgeExcluded.vue";
import SmeBadgeTeaser from "@/resources/assets/images/icons/smeBadgeTeaser.vue";
import InformationCircleSvg from "@/resources/assets/images/icons/svg/nav/InformationCircleSvg.vue";
import useSMEFeature from "@/composables/useSMEFeature";
import { useI18n } from "vue-i18n";
import DetailBox from '@/modules/home/entityCard/components/details/DetailBox.vue';
import SmeClassificationCase from '@/modules/home/entityCard/components/details/SmeClassificationCase.vue';

export default defineComponent({
    name: 'SmeDetailBox',
    components: {
    SmeBadge,
    SmeBadgeExcluded,
    SmeBadgeTeaser,
    InformationCircleSvg,
    DetailBox,
    SmeClassificationCase
  },
  props: {
    isSME: { type: Boolean, required: false, default: false },
    smeSource: { type: String, required: false, default: "" },
  },
  emits: ["show-modal-sme-details"],
  setup(props) {
    const { featureSMEEnabled } = useSMEFeature();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    /** checks if user has featureSME enabled */
    const smeFeatureEnabled = computed(() => {
      return featureSMEEnabled.value;
    });

    const smeTitleValue = computed(() => {
      return props.isSME ? translate.t(`home.entityCard.companyDetails.general.smeCardTitle`) : translate.t(`home.entityCard.companyDetails.general.notSmeCardTitle`)
    });

    const smeSourceValue = computed(() => {
      return props.smeSource ? translate.t(`home.entityCard.companyDetails.sources.${props.smeSource}.name`) : ''
    });

    /**
     * returns isSME
     */
    const smeRelatedIsSme = computed(() => {
      return props.isSME;
    });

    /**
     * returns smeSource ( for now , default, europe)
     */
    const smeRelatedSmeSource = computed(() => {
      return props.smeSource;
    });

    const classificationCaseBaseKey = computed(() => {
      const useNotSmeDefault =
        smeFeatureEnabled.value &&
        !smeRelatedIsSme.value &&
        (smeRelatedSmeSource.value === null || smeRelatedSmeSource.value === '');
      return useNotSmeDefault
        ? 'home.entityCard.companyDetails.sources.notSME'
        : `home.entityCard.companyDetails.sources.${smeRelatedSmeSource.value || 'default'}`;
    });

    const classificationCase = computed(() => {
      const baseKey = classificationCaseBaseKey.value;
      const name = translate.t(`${baseKey}.name`);
      const description = translate.t(`${baseKey}.cardDescription`);
      const limits = translate.tm(`${baseKey}.cardLimits`) as Array<{ label: string; value: string }> | undefined;
      return {
        name: typeof name === 'string' ? name : '',
        description: typeof description === 'string' ? description : '',
        limits: Array.isArray(limits) ? limits : [],
      };
    });

    const hasCardContent = computed(() => {
      const baseKey = classificationCaseBaseKey.value;
      const card = translate.t(`${baseKey}.card`);
      return typeof card === 'string' && card.trim() !== '';
    });

    return {
      classificationCase,
      hasCardContent,
      smeFeatureEnabled,
      smeRelatedIsSme,
      smeRelatedSmeSource,
      smeTitleValue,
      smeSourceValue,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.icon-svg {
  height: 15px;
}

.show-details-btn {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
}
</style>