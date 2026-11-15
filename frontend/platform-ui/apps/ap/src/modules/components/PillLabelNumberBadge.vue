<template>

<div class="d-flex rounded-xl truncate cursor-pointer main-pill-container" :class="[labelClasses, {'has-hover': hasHoverStyle}]"  data-testid="pill-badge-with-dropdown" @click="isDisplayingDropdown = !isDisplayingDropdown" >
  
    <Tooltip         
          :open-delay="100"
          :anchor-element="'target'"
          :position="'top'"
        >
        <span :title="label"  style="max-width: 20ch" :data-testid="hasDropdown ? 'pill-badge-current-status' : 'pill-badge-current-status-no-dropdown'">
          {{ label }} 
        </span>  
    </Tooltip>
  <div v-if="hasDropdown" class="chevron-container">
    <CalculumChevronDown v-if="!isDisplayingDropdown && !someStatusIsAgreed" data-testid="chevron-down" @click.stop="isDisplayingDropdown = !isDisplayingDropdown" /> 
    <CalculumChevronUp v-if="isDisplayingDropdown && !someStatusIsAgreed" data-testid="chevron-up" @click.stop="isDisplayingDropdown = !isDisplayingDropdown" />     
  </div>
</div>

<div v-if="isDisplayingDropdown && !someStatusIsAgreed" id="dropdown-for-pill-badge" class="show d-flex flex-column justify-content-center dropdown gap-2" :class="{'custom-dropdown-position': customDropdownPosition}">

  <span class="text-sm font-semibold no-hover">{{ 'Change status to:' }}</span>
  <hr class="w-100 mb-2">
  
  <span v-if="!isOnhold && !someStatusIsAgreed" class="hover-span" @click=" launchChangeStatus('onHold')">{{ $t('home.manageModule.onHold') }}</span>    
  
  <!-- If the spend does not belong to a plan -->
  <span v-if="!validateBelongToAplan && negotiationStatus === 'onHold'" class="hover-span" @click="launchChangeStatus('analyzed')">{{ 'Analyzed' }}</span>
  <span v-if="!validateBelongToAplan && negotiationStatus === 'analyzed'" class="hover-span" @click="launchChangeStatus('contacted')">{{ $t('global.contacted') }}</span>  
  <span v-if="!validateBelongToAplan && negotiationStatus === 'contacted'" class="hover-span" @click="launchChangeStatus('analyzed')">{{ $t('global.removeFromContacted') }}</span>

  <!-- If the spend belongs to a plan -->  

  <span v-if="validateBelongToAplan && negotiationStatus === 'onHold'" class="hover-span" @click="$launchChangeStatus('analyzed')">{{ 'Analyzed' }}</span>
  <span v-if="validateBelongToAplan && negotiationStatus === 'planned'" class="hover-span" @click="launchChangeStatus('contacted')">{{ $t('global.contacted') }}</span>  
  <span v-if="validateBelongToAplan && negotiationStatus === 'contacted' && modulePlanIsAvailable" class="hover-span" @click="launchChangeStatus('planned')">{{ $t('global.removeFromContacted') }}</span>
  <span v-if="!someStatusIsAgreed && showAgreedOptionInSpendLevel" class="hover-span" @click="launchChangeStatus('agreed')">{{ $t('global.agreed') }}</span>

</div>

  


</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref } from "vue";
import { StringUtils } from "@/utils";
import * as clickOutsideRelated from "@/utils/clickOutsideRelated";
import CalculumChevronDown from '@/modules/components/CalculumChevronDown.vue';
import CalculumChevronUp from '@/modules/components/CalculumChevronUp.vue';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useModulePlan } from "@/composables";
export default defineComponent({
  name: "PillLabelNumberBadge",
  components: { CalculumChevronDown, CalculumChevronUp, Tooltip },
  props: {
    label: {
      type: String,
      default: ""
    },
    labelClasses: {
      type: String,
      default: ""
    },
    hasDropdown: {
      type: Boolean,
      default: false
    },
    hasHoverStyle: {
      type: Boolean,
      default: false
    },
    validateBelongToAplan: {
      type: Boolean,
      default: false
    },
    customDropdownPosition: {
      type: Boolean,
      default: false
    },    
    negotiationStatus: {
      type: String,
      default: null
    },
    showAgreedOptionInSpendLevel: {
      type: Boolean,
      default: false
    }
  },
  emits: ["toggle-contacted"],
  setup(props, { emit }) {
    const isDisplayingDropdown = ref(false)
    const {
      modulePlanIsAvailable,
    } = useModulePlan();
    onMounted(() => {
      document.addEventListener('click', handleClick)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClick)
    })

    function handleClick(e: any) {
      const clickedInside = clickOutsideRelated.menuPopup(e, '.pill-badge-with-dropdown', '#dropdown-for-pill-badge')
      if (clickedInside !== undefined) {
        if (clickedInside) {
          // isDisplayingDropdown.value = true
        } else {
          isDisplayingDropdown.value = false
        }
      }
    }

    function launchChangeStatus(status: string) {
      isDisplayingDropdown.value = false
      emit('toggle-contacted',status)
    }

     
    const someStatusIsAgreed = computed(() => {
      return props.negotiationStatus === 'agreed' || props.negotiationStatus === 'agreedExtended'
    })

    const isOnhold = computed(() => {
      return props.negotiationStatus === 'onHold'
    })

    return {
      isDisplayingDropdown,      
      StringUtils,
      modulePlanIsAvailable,
      isOnhold,
      someStatusIsAgreed,
      launchChangeStatus
    }
  }
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 5px); /* Position below the span with a small gap */
  width: 170px; /* Set fixed width */
  background-color: white;
  border: 1px solid #ccc;
  z-index: 1000; /* Ensure it appears above other content */
  display: none;
}

.custom-dropdown-position {
  left: 0;
}

.dropdown.show {
  display: block;
  padding: 1em;
  border-radius: 8px;
  span:hover {
    cursor: pointer;
  }
}
.color-white {  
  fill: white;
}

.rotate-180 {
  transform: rotate(180deg);
}

.icon-svg {
  max-width: 14px;
}

.bg-teal-500{
  &.has-hover {
    &:hover{
    background-color: $color-teal-700 !important;
    }
  }
  
}

.bg-bluelight-500{
  &.has-hover {
    &:hover{
      background-color: $color-bluelight-700 !important;
    }  
  }
  
}

.bg-graycool-500{
  &.has-hover {
    &:hover{
    background-color: $color-coolgray-700 !important;
  }
  }
  
}

.bg-violet-200{
  &.has-hover {
    &:hover{
      background-color: $color-violet-300 !important;
    }  
  }
}


.bg-violet-600{
  &.has-hover {
    &:hover{
      background-color: $color-violet-600 !important;
    }  
  }
}


.bg-warning-500{
  &.has-hover {
    &:hover{
      background-color: $color-warning-500 !important;
    }  
  }
}

.label-container:focus, .label-container:active {
    &.has-hover {
      border: 1px solid $color-primary-300 !important;
      box-shadow: 0px 0px 0px 4px #FFDFE4, 0px 1px 2px 0px rgba(16, 24, 40, 0.05);
    }
    
  
}

.label-container-default,  .label-container{
  border: 1px solid transparent;
}

.label-container-default:focus, .label-container-default:active {
  &.has-hover {
    border: 1px solid $color-primary-300 !important;
    box-shadow: 0px 0px 0px 4px #FFDFE4, 0px 1px 2px 0px rgba(16, 24, 40, 0.05);
  
  }
  
}

.hover-span{
  &:hover {
    color: $color-primary-500
  }
}



</style>