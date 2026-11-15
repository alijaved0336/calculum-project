<template>
<div class="initial-letters-wrapper d-flex align-items-center gap-2"><span class="text-sm text-uppercase font-weight-bold text-as-logo-circle">{{ initialLetters }}</span>
  <Tooltip :anchor-element="'target'" :position="'top'" :open-delay="300"><span class="font-weight-bold text-truncate-ellipsis" :title="text">{{ text }}</span></Tooltip>
</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { getInitialLetters } from "@/modules/components/utils/organizeValues";
import { Tooltip } from "@progress/kendo-vue-tooltip";
export default defineComponent({
    name: 'InitialLettersText',
    components: { Tooltip },
    props: {
        text: {
            type: String,
            required: true
        },
        maxWords: {
            type: Number,
            required: false,
            default: 2
        },
        uppercase: {
            type: Boolean,
            required: false,
            default: true
        }
    },

    setup (props) {
        const initialLetters = computed(() => getInitialLetters(props.text, { maxWords: props.maxWords, uppercase: props.uppercase }));

        return { initialLetters }
    }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
.text-as-logo-circle {
  min-width: 30px;
  max-width: 30px;
  height: 30px;
  -moz-border-radius: 50%;
  -webkit-border-radius: 50%;
  border-radius: 20%;
  background: $color-gray-300;
  border-width: 3px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.cursor {
    cursor: pointer;
  }
}

.initial-letters-wrapper {
  min-width: 0;
  overflow: hidden;
  width: 100%;
  :deep(> div) {
    min-width: 0;
    overflow: hidden;
    flex: 1;
    display: flex;
    align-items: center;
  }
}
.text-truncate-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}
</style>