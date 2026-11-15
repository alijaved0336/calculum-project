<template>
<span class="tag-name" v-if="programTarget != ''" :class="programTarget">{{$t('home.analyze.'+programTarget)}}</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'CalculumTypeProgram',
  components: { },
  props: {
    programTarget: { type: String, required: true }
  },
  setup(props) {
    return {
    }
  }
})
</script>
<style lang="scss" scoped>
  @import "src/resources/assets/styles/variables/colors";
  span.tag-name {
    margin: 0px auto;
    border-radius: 20px;
    padding: 5px 30px;
    font-weight: 500 !important;

  }  
  span.tag-name.cashFlow {
    background: $color-green-200;
    color: $color-green-800;
    &:hover{
      background-color: $color-green-200 !important;
      color: $color-green-800 !important;
    }
  }
  span.tag-name.harmonization {
    background: $color-orange-100;
    color: $color-orange-700;
    &:hover{
      background: $color-orange-200 !important;
      color: $color-orange-700 !important;
    }
  }
</style>
