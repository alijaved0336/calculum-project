<template>
<div class="row">
  <div class="col-lg-12 d-flex flex-column justify-content-center align-items-center text-center"><span class="text-gray-700 text-2xl cursor-pointer truncate-title font-semibold mb-6">{{ $t('global.matchRate') }}</span>
    <h2 class="font-weight-bold card-text-content mb-0">{{ dataReceived.valueData }}</h2>
    <p>{{ dataReceived.text }}  </p>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { DataRecieved } from '../types';

export default defineComponent({
  name: 'InfoBoxComponent',
  props: {
    dataReceived: {
      type: Object as PropType<DataRecieved>,
      required: true,
    }
  },
});
</script>

<style scoped lang="scss">
.card-body {
  display: flex;
  // flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
}
.card-text-content {
    color: #bf3bf3;
    font-size: 2.5rem;
}
</style>