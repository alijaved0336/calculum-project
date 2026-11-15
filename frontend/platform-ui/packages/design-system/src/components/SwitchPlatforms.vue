<template>
  <div class="switch W-100 mb-2" @click="$emit('action:change-platform')">
    <div class="switch-track">
      <div class="switch-thumb" :class="{ right: currentPlatform === 'ap' }">
        {{ currentPlatform }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SwitchPlatforms',
  props: {
    currentPlatform: { type: String, default: 'ap' }
  },
  emits: ['action:change-platform']  
})


</script>

<style scoped>
.switch {
  display: inline-flex;
  cursor: pointer;
  width: 85%;

  * {
    cursor: pointer;
  }


}

.switch-track {
  width: 100%;
  height: 30px;
  background: #f2f4f7;
  border-radius: 16px;  
  position: relative;
}

.switch-thumb {
  width: 50%;
  height: 100%;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #ffffff;
  background: #5b86c5;
  position: absolute;
  left: 4px;
  top: 1px;
  bottom: 4px;
  transition: all 0.3s ease;
  text-transform: uppercase;
}

.switch-thumb.right {
  left: calc(50%);
  background: #75A3EC;
}
</style>

