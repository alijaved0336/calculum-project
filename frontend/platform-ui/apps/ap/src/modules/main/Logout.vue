<template>
<CalculumLoading :modal="true"></CalculumLoading>
</template>
<script lang="ts">
import { onMounted, defineComponent } from 'vue';
import { CalculumLoading } from '@ada/design-system'
import useFirebase from "@/composables/firebase/useFirebase";
import * as Routing from '@/services/router/Routing'
import { useUserStore } from '@/stores/user'
import { useSubscribeStore } from '@/stores/subscribe'

export default defineComponent({
  name: 'Logout',
  components: { CalculumLoading },
  setup() {
    const userStore = useUserStore()

    const { logoutFirebase } = useFirebase();
    const subscribeStore = useSubscribeStore();

    onMounted(async () => {
      await logoutFirebase()
      subscribeStore.setAllowActionsInModules(true)
      userStore.logOut()                
      Routing.openMain()
    })

    return {}
  }
})
</script>
