<template>
<div class="sidebar-show">
  <MenuAdmin />
  <main class="main-content">
    <NavbarAdmin />
    <router-view />
  </main>
</div>
</template>

<script lang='ts'>
import MenuAdmin from '@/modules/adminBackend/components/MenuAdmin.vue'
import NavbarAdmin from '@/modules/adminBackend/components/NavbarAdmin.vue'
import  { useGlobalInactivityLogout } from "@/composables/useGlobalInactivityLogout";


export default {
  name: 'AdminBackend' ,
  components: {
    MenuAdmin,
    NavbarAdmin
  },
  setup() {
    useGlobalInactivityLogout()

    return {}
  }
}
</script>

<style lang="scss" scoped>
main.main-content {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
