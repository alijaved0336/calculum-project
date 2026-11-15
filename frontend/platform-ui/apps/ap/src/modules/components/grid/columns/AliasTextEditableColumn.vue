<template>
  <td>
    <div class="text-left">
      <span style="display: none">{{ dataItem.alias }}</span>
      <input class="form-control change-alias" v-model="alias" @change="changeAlias" type="text"/>
    </div>
  </td>
</template>

<script lang='ts'>
import { useToast } from "vue-toastification";
import { defineComponent, reactive, ref, watch } from 'vue'
import { useI18n } from "vue-i18n";
import { useCategorizeStore } from '@/stores/categorize'

export default defineComponent({
  name: 'AliasTextEditableColumnTemplate',
  inject: {
    kendoIntlService: { default: null }
  },
  props: {
    dataItem: {
      type: Object,
      required: true
    },
    field: {
      type: String,
      required: true
    }
  },
  emits: ['update-row-data'],
  setup(props, { emit }) {
    const categorizeStore = useCategorizeStore()
    const alias = ref(props.dataItem.spendAlias)
    const lastalias = ref(props.dataItem.spendAlias)
    const toast = useToast()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    watch(props, () => {
      alias.value = props.dataItem.spendAlias 
      lastalias.value = props.dataItem.spendAlias 
    })

    function changeAlias(event: any) {
      event.preventDefault()
      const params = reactive({
        spendUuid: props.dataItem.uuid,
        alias: alias.value,
        callbackSuccess: (callbackSuccessData: any) => {
          emit('update-row-data', callbackSuccessData, 'alias')
          toast.success('The Spend\'s alias was updated successfully');
        },
        callbackError: (callbackFailData: any) => {
          alias.value = lastalias.value
          toast.error(callbackFailData.error.message);
        }
      })
      categorizeStore.updateSpendAlias(params)
    }

    return {
      alias,
      changeAlias
    }
  }
})

</script>

<style lang="scss" scoped>

@import "src/resources/assets/styles/variables/colors";

input.form-control.change-alias  {
  border: none;  
  background-color: transparent;
}

input.form-control.change-alias:hover {
  border: 1px solid black;
  padding: 5px 10px;
  background-color: white;
}

input.form-control.change-alias:focus {
  border: 1px solid black;
  padding: 5px 10px;
  background-color: white;
}

</style>