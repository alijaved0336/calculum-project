<template>
<button class="btn p-0 bg-white text-capitalize font-md text-gray-500" @click="$emit('moreInfoClicked')"> <span class="icon-information mr-1">
    <iconInformation> </iconInformation></span><span>{{ moreInfoText }}</span></button>
</template>
<script lang="ts">
import { defineComponent, toRefs, reactive, onMounted } from 'vue'
import iconInformation from '@/resources/assets/images/icons/iconInformation.vue'

export default defineComponent({
  name: "CalculumMoreInfo",
  components: {
    iconInformation
  },
  props: {
    moreInfoText: { type: String, required: false, default: "Show Details" }
  },
  emits: ["moreInfoClicked"],
  setup(props, emits) {
    onMounted(() => {
    });
    interface CalculumMoreInfo {
    }
    const data = reactive<CalculumMoreInfo>({
    });
    return {
      ...toRefs(data)
    }
  }
})
</script>
<style lang="scss" scoped>
@import '@/resources/assets/styles/variables/_colors.scss';

.text-gray-500 {
  color: $color-gray-500;
}

button {
  .icon-information {
    width: 16px
  }
}
</style>