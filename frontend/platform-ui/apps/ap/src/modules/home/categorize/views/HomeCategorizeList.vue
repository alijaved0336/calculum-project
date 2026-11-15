<template>
<CalculumFullScreen v-if="fullScreen" @closeFullScreen="close" :title="''">
  <template v-slot:fullScreenContent>
    <div class="col-12">
      <Lists :fullScreen="true"></Lists>
    </div>
  </template>
</CalculumFullScreen>
<Lists v-if="!fullScreen"> </Lists>
</template>

<script lang='ts'>

import { defineComponent } from 'vue'
import Lists from './Lists.vue';
import { CalculumFullScreen } from '@ada/design-system'

export default defineComponent({
  name: 'HomeCategorizeList',
  components: {
    Lists,
    CalculumFullScreen
  },
  props: {
    fullScreen: { type: Boolean, default: false }
  },
  emits: ['update:fullScreen'],
  setup( props, { emit } ) {

    function close() {
      emit('update:fullScreen')
    }


    return {      
      close
    }
  }
})
</script>
<style lang="scss" scoped>
.rp-15 {
  padding: 0px 15px;
  margin-left: 0;
}

.r-pl-15 {
  padding-left: 0;
}
</style>
