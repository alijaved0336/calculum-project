<template>
  <Navbar />
  <div class="main-container">
    <section class="page-contents">
        <CalculumLoadingAr v-if="!isSessionValidated" block />
        <template v-else>
          <SidebarUser />
          <section class="page-main-contents">
            <RouterView />
          </section>
        </template>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { RouterView } from 'vue-router'
import CalculumLoadingAr from '@ada/design-system/components/CalculumLoadingAr.vue'
import Navbar from '@/components/layout/Navbar.vue'
import SidebarUser from '@/components/layout/SidebarUser.vue'
import { useLayoutStore } from '@/stores/layout'

export default defineComponent({
  name: 'LayoutView',
  components: {
    CalculumLoadingAr,
    RouterView,
    Navbar,
    SidebarUser

  },
  setup() {
    const layoutStore = useLayoutStore()

    return {
      isSessionValidated: computed(() => layoutStore.isSessionValidated),
    }
  },
})
</script>