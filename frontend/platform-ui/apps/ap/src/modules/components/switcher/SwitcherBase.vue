<template>
<div class="switcher">
  <label>
    <input type="checkbox" :checked="checked" @change="onChange"/>
    <div class="switch-track"></div>
    <div class="circle"></div>
  </label>
</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "SwitcherBase",
  props: {
    checked: { type: Boolean, required: false, default: true },
  },
  emits: ["update:checked"],
  setup(_, { emit }) {
    const onChange = (event: Event): void => {
      const target = event.target as HTMLInputElement;
      emit("update:checked", target.checked);
    };

    return {
      onChange,
    };
  },
});

</script>

<style lang="scss" scoped>
.switcher{
  width: 70px;
  min-width: 70px;
  height: 34px;
  border-radius: 100vmax;
  overflow: hidden;


  label{
    display: flex;
    position: relative;
    width: 100%;
    height: 100%;
    cursor: pointer;

  }
  input{
    position: absolute;
    left: -5rem;
  }
  input:checked + .switch-track{
    background-color: #5266eb;
  }
  input:checked + .switch-track + .circle{
    left: 39px;
  }
  /* Named away from the generic "overlay" token the global bootstrap-overrides
     stylesheet targets for calculum-ui's teleported modals (see CalculumModalIdle.vue). */
  .switch-track{
    display: flex;
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    background-color: #ccc;
    transition: all 0.3s ease;
    pointer-events: none;
  }
  .circle{
    width: 28px;
    height: 28px;
    position: absolute;
    left: 3px;
    top: 3px;
    transition: all 0.3s ease;
    background-color: #fff;
    border-radius: 100vmax;
    pointer-events: none;
  }
}
</style>
