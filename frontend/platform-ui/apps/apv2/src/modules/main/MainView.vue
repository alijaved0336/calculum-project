<template>
  <CalculumLoading :modal="true" />
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import { useSession } from '@ada/auth'
import CalculumLoading from '@ada/design-system/components/CalculumLoading.vue'
import { openHome } from '@/modules/home/HomeRouting'

export default defineComponent({
  name: 'MainView',
  components: { CalculumLoading },
  setup() {
    const { isAuthenticated, fetchSession } = useSession()

    onMounted(async () => {
      if (!isAuthenticated.value) {
        await fetchSession()
      }
      openHome()
    })
  },
})
</script>
