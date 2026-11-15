<template>
<nav class="menu">
  <ul class="menu__progressive ml-auto" v-if="useFeature9BoxesFinancing">
    <li class="menu__item" :class="[setPositionByFeature === 1 ? 'active' : '', setPositionByFeature > 1 ? 'finished' : '']"><span class="menu__position"></span><span class="menu__link">{{ $t('home.analyze.analyzeProgramTimeline.generalSettings') }}</span></li>
    <li class="menu__item" :class="[setPositionByFeature === 2 ? 'active' : '', setPositionByFeature > 2 ? 'finished' : '']"><span class="menu__position"></span><span class="menu__link">
        <div>{{ $t('home.analyze.analyzeProgramTimeline.setUpYour') }}</div>
        <div>{{ $t('home.analyze.analyzeProgramTimeline.financingGroups') }}</div></span></li>
    <li class="menu__item" :class="[setPositionByFeature === 3 ? 'active' : '', setPositionByFeature > 3 ? 'finished' : '']" v-if="typeProgram === 'cashFlow'"><span class="menu__position"></span><span class="menu__link">
        <div>{{ $t('home.analyze.analyzeProgramTimeline.setUpYour') }}</div>
        <div>{{ $t('home.analyze.analyzeProgramTimeline.harmonizationGroups') }}    </div></span></li>
  </ul>
  <ul class="menu__progressive ml-auto" v-else>
    <li class="menu__item" :class="[setPositionByFeature === 1 ? 'active' : '', setPositionByFeature > 1 ? 'finished' : '']"><span class="menu__position"></span><span class="menu__link">{{ $t('home.analyze.analyzeProgramTimeline.generalSettings') }}    </span></li>
    <li class="menu__item" :class="[setPositionByFeature === 2 ? 'active' : '', setPositionByFeature > 2 ? 'finished' : '']" v-if="typeProgram === 'cashFlow'"><span class="menu__position"></span><span class="menu__link">
        <div>{{ $t('home.analyze.analyzeProgramTimeline.setUpYour') }}</div>
        <div>{{ $t('home.analyze.analyzeProgramTimeline.harmonizationGroups') }}    </div></span></li>
  </ul>
</nav>
</template>

<script lang="ts">

import { computed, defineComponent } from "vue";
import useUser from "@/services/user/composables/useUser";


export default defineComponent({
  name: 'AnalyzeProgramTimeline',
  props: {
    position: { type: Number, required: true, default: 1 },
    typeProgram: { type: String, required: false, default: '' }    
  },
  setup( props: any ) {
    const { useFeature9BoxesFinancing } = useUser();

    const setPositionByFeature = computed(() => {
      return props.position;
    });


    return {
      useFeature9BoxesFinancing,
      setPositionByFeature
    }
  }
})
</script>

<style lang="scss" scoped>
  .menu__progressive {
    /*display: flex;*/

    .menu__link {
      display: flex;
      flex-direction: column;
    }
  }

  .card .menu__progressive {
    margin-top: 25px;
    margin-bottom: 50px;
    margin-left: auto;
    margin-right: auto;
}


</style>
