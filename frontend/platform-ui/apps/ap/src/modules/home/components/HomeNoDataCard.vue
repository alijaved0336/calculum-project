<template>
<div class="col-12 col-sm-12 col-xl-6">
  <div class="card card__side-fixed">
    <div class="card__header">
      <div class="h6">{{ title }}</div>
      <div class="card__body show-scroll">
        <div class="void">{{ $t('home.dashboard.cards.noData') }}</div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
export default {
  name: 'HomeNoDataCard',
  props: {
    title: {type: String, default: ''}
  }
}
</script>
