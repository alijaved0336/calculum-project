<template>
<CalculumLoading :modal="true"></CalculumLoading>
</template>
<script lang="ts">
import { onMounted, defineComponent } from 'vue';
import { CalculumLoading } from '@ada/design-system'
import { useUserStore } from '@/stores/user'
import useFirebase from "@/composables/firebase/useFirebase"
import * as Routing from '@/services/router/Routing'

export default defineComponent({
  name: 'ReLogin',
  components: { CalculumLoading },
  setup() {
    const userStore = useUserStore()
    const { logoutFirebase } = useFirebase()

    onMounted(async () => {
      await logoutFirebase()
      userStore.logOut()
      Routing.openMain()
    })

    return {}
  }
})
</script>
