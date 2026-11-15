<template>
<div class="idle-overlay" @click="close()">
  <div class="overlay-content" @click="close()">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <div class="p-3">
            <p>{{ $t('components.calculumModalIdle.minutesLeft') }}</p>
            <p>{{ time }} {{ $t('components.calculumModalIdle.secondsLeft') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { ref, defineComponent } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'

export default defineComponent({
  name: 'CalculumModalIdle',
  setup() {
    const userStore = useUserStore()
    const appStore = useAppStore()
    const time = ref(10)

    function logOut() {
      userStore.logOut()
    }

    let timerId = setInterval(() => {
      time.value--
      if (time.value === 0) {
        clearInterval(timerId)
        appStore.setIsIdle(false)
        logOut()
      }
    }, 1000)

    function close() {
      clearInterval(timerId)
      appStore.setIsIdle(false)
    }

    return {
      time,
      timerId,
      logOut,
      close
    }
  }
})
</script>

<style lang="scss" scoped>
/* Named away from the generic "overlay"/"modal" tokens the global bootstrap-overrides
   stylesheet targets for calculum-ui's teleported-to-body modals — those selectors can't
   be scoped by ancestor container since Teleport moves that DOM out of any container, so
   this component avoids the collision on its own side instead. */
.idle-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 97;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  width: 500px;
  box-shadow: 1px 2px 4px rgba(153, 155, 168, 0.12);
  border-radius: 4px;
}
.modal__title {
  color: #38404f;
}
</style>