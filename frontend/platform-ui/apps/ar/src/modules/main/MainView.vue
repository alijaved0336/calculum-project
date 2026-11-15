<template>
  <CalculumLoadingAr :modal="true" />
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import { useSession } from '@ada/auth'
import CalculumLoadingAr from '@ada/design-system/components/CalculumLoadingAr.vue'
import { openOpportunity } from '@/modules/opportunity/OpportunityRouting'

export default defineComponent({
  name: 'MainView',
  components: {
    CalculumLoadingAr,
  },
  setup() {
    const { isAuthenticated, fetchSession } = useSession()

    onMounted(async () => {
      if (!isAuthenticated.value) {
        await fetchSession()
      }
      openOpportunity()
    })
  },
})
</script>
