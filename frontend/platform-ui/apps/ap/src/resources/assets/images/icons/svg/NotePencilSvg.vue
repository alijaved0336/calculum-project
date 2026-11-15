<template>
  <svg width="24" height="22" viewBox="0 0 24 22" id="home-nav-icon" xmlns="http://www.w3.org/2000/svg" >
<path :style="getColor()" d="M23.415.578a2.048,2.048,0,0,0-2.828,0L19.526,1.639a.5.5,0,0,0,0,.707l2.121,2.121a.5.5,0,0,0,.707,0l1.061-1.061A2,2,0,0,0,23.415.578Z"/><path d="M11.359,10.514l2.121,2.121a.5.5,0,0,0,.707,0l6.364-6.364a.5.5,0,0,0,0-.708L18.429,3.441a.516.516,0,0,0-.707,0L11.359,9.807A.5.5,0,0,0,11.359,10.514Z"/><path d="M10.349,11.235a.506.506,0,0,0-.364.3L8.773,14.57a.5.5,0,0,0,.111.539.529.529,0,0,0,.539.111l3.03-1.212a.5.5,0,0,0,.168-.818L10.8,11.372A.5.5,0,0,0,10.349,11.235Z" />
</svg>

</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'HomeSvg',
  props: {
    colorSvg: { type: String, required: false }
  },
  setup(props) {
    function getColor() {
      return 'fill: ' + props.colorSvg
    }
    return {
      props,
      getColor
    }
  }
})
</script>
