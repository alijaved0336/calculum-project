<template>
  <td>
    <div class="d-flex align-items-center justify-content-center">
      <div :class="rulesCount() ? 'circle_active' : 'circle_not_active'">
        <div :class="rulesCount() ? 'active' : ''"></div>
      </div>
    </div>
  </td>
</template>

<script lang="ts">
import { defineComponent } from '@vue/runtime-core'
import { reactive, toRefs, computed, onMounted, ref } from 'vue'
export default defineComponent({
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true }
  },
  setup(props) {
    function rulesCount() {
      if (props.dataItem.financingGroupsCount) {
        return true
      } else {
        return false
      }
    }
    return {
      rulesCount
    }
  }

})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";
.active {
  border-radius: 50%;
	width: 10px;
	height: 10px;
	background: red;
}

// Replace modern-gray-200
.circle_not_active {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	border: 1px solid $modern-gray-200;
	width: 20px;
	height: 20px;
	background: $basewhite;
}

// Remove basewhite variable and replace with color-white
.circle_active {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	border: 1px solid red;
	width: 20px;
	height: 20px;
	background: $basewhite;
}

</style>
