<template>
  <td v-if="dataItem.logoPath?.length > 0" class="text-center" >
    <img :src="logo" class="d-flex align-items-center justify-content-center"  alt="Company Logo" />
  </td>
  <td v-else class="text-center" >
    <span class="first-letter">{{companyNameFirstLetter}}</span>
  </td>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { getMediaUrl } from '@/services/media/mediaActions'
import useCompany from "@/composables/useCompany";

export default defineComponent({
  name: 'LogoUiGroup',
  props: {
    dataItem: { type: Object, required: true }
  },
  setup(props) {
    const { companyActive } = useCompany()
    const companyNameFirstLetter = companyActive.value ? companyActive.value.name.charAt(0) : ''
    const logo = computed(() => {
      return getMediaUrl(props.dataItem.logoPath)
    })
    return {
      companyNameFirstLetter,
      logo
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";
img {
    object-fit: contain;
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }
.circle{
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.first-letter{
  background: $color-gray-300;
  padding: .3em .7em .3em .7em;
  border-radius: 50%;
  height: 30px;
  width: 30px;
}

.gray-background{
  background: $color-gray-300;
}
</style>
