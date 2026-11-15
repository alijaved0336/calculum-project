<template>
<nav class="menu">
  <ul class="menu__progressive ml-auto options-undefined">
    <li class="menu__item" :class="option === 1 ? 'active' : option > 1 ? 'finished'  : '' "><span class="menu__position"></span><span class="menu__link">{{ $t('home.plan.programToPlan1.parametersOfYourPlan') }}</span></li>
    <li class="menu__item" :class="option === 2 ? 'active' : option > 2 ? 'finished'  : '' "><span class="menu__position"></span><span class="menu__link">{{ $t('home.plan.programToPlan1.configureYourPhases') }}</span></li>
  </ul>
</nav>
</template>

<script lang="ts">
export default {
  name: 'PlanTimeline',
  props: {
    option: { type: Number, required: true },
    total_options: { type: Number, required: true },
  }
}
</script>

<style lang="scss" scoped>
//   .menu__progressive {
//     /*display: flex;*/

//     .menu__link {
//       display: flex;
//       flex-direction: column;
//     }
//   }

//   .card .menu__progressive {
//     margin-top: 25px;
//     margin-bottom: 50px;
//     margin-left: auto;
//     margin-right: auto;
// }


</style>
  