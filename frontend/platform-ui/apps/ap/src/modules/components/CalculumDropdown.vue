<template>
<div class="calculum-dropdown" :class="{ 'dropdown-to-end': justityToEnd }">
  <div class="calculum-dropdown-box" v-if="adminUserOptions">
    <slot name="dropdown-custom"></slot>
  </div>
  <div v-if="customOpenButton">
    <slot name="dropdown-custom-open-button"></slot>
  </div><a class="link_sec" v-else-if="!customOpenButton && !forCompare" @click="openContent" :class="[buttonHeight64 ? 'btn-h-64' : '', upperCase ? 'text-capitalize' : 'sorting-class']">{{ title }}</a><span class="options-text options-span" id="options-custom-compare" v-else-if="forCompare" :class="showContent ? 'active-mode custom_cursor_pointer' : 'custom_cursor_pointer' " @click="openContent">{{title}}
    <iconEllipsisVertical class="three-dots-icon my-auto"></iconEllipsisVertical></span><a class="link_sec" v-else @click="openContent" :class="[buttonHeight64 ? 'btn-h-64' : '', upperCase ? 'text-capitalize' : 'sorting-class']">{{ title }}</a>
  <div class="calculum-dropdown-aux-background" v-if="showContent" @click="closeContent"></div>
  <div class="calculum-dropdown-content" v-if="showContent && !forCompare" :class="[position === 'right' ? 'calculum-dropdown-content-right' : 'calculum-dropdown-content-left', scrollBoolean === true ? 'show-scroll' : '']">
    <slot name="dropdown-content"></slot>
  </div>
  <div class="calculum-dropdown-content-custom" v-if="showContent && forCompare" :class="[position === 'right' ? 'calculum-dropdown-content-right' : 'calculum-dropdown-content-left', scrollBoolean === true ? 'show-scroll' : '']">
    <slot name="dropdown-content"></slot>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'

export default defineComponent({
  name: 'CalculumDropdown',
  components: {
    iconEllipsisVertical
  },
  props: {
    forCompare: {type: Boolean, required: false},
    title: { type: String, required: true },
    state: { type: Boolean, required: true },
    buttonHeight64: { type: Boolean, required: false, default: false },
    customOpenButton: { type: Boolean, required: false, default: false },
    position: { type: String, required: false, default: 'left' },
    scrollBoolean: { type: Boolean, required: false, default: false },
    upperCase: { type: Boolean, default: true },
    adminUserOptions: {type : Boolean, required: false},
    justityToEnd: { type: Boolean, required: false, default: false }
  },
  emits: ['changeDropdownState'],
  setup(props, { emit }) {
    const showContent = ref(props.state)
  
    watch(() => props.state, (newValue) => {
      showContent.value = newValue
    })

    function closeContent() {
      showContent.value = false
      emit('changeDropdownState', showContent.value)
    }

    function openContent() {
      showContent.value = true
      emit('changeDropdownState', showContent.value)
    }

    return {
      closeContent,
      openContent,
      showContent
    }
  }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";


.options-span {
  &:hover{
    color: $color-primary-500 !important;  
  }
}

.active-mode{
  color: $color-primary-500 !important;
}


@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translate3d(0, -100%, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}


.calculum-dropdown-box{
    width: 200px;
    height: 200px;
    border-radius: 8px;
    display: flex;
    z-index: 9999;
    flex-direction: column; 
    position: relative;
    top: -60%;
    left: 80px;   
  }

.calculum-dropdown {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: baseline;
  .calculum-dropdown-content-custom {
    animation-name: fadeInDown;
    animation-duration:0.3s;
    background: white;
    border-radius: 5px;
    padding: 10px;
    position: absolute;
    top: 100%;
    border: 1px solid #ABAFB5;
    z-index: 97;
    &-right { right: 0; }
    &-left { left: 0; }
  }
  
  .calculum-dropdown-content {
    animation-name: fadeInDown;
    animation-duration:0.3s;
    width: auto;
    background: white;
    border-radius: 5px;
    padding: 10px;
    position: absolute;
    top: 100%;
    border: 1px solid #ABAFB5;
    z-index: 97;
    &-right { right: 0; }
    &-left { left: 0; }
  }
}

.calculum-dropdown.dropdown-to-end {
    justify-content: end;
}

.calculum-dropdown-aux-background {
  background: rgba(0,0,0,0);
  width: 100%;
  height: 100%;
  position: fixed;
  z-index: 96;
  overflow-y: hidden;
  overflow-x: hidden;
  top: 0;
  left: 0;
}

.show-scroll {
  position: relative;
  padding-bottom: 400px;
  overflow-y: scroll;
  overflow-x: hidden;
  height:210px;
}

.sorting-class {
    text-transform: capitalize;
    border: none !important;
    font-size: 1rem !important;
    font-weight: 500;
}
</style>
