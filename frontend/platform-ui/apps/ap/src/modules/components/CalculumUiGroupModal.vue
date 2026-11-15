<template>
<CalculumModal :size="'md'" :showClose="true" @close="close" :title="$t('global.confirmEdit')" v-if="isUiCompanyModalShowing">
  <template v-slot:modalContent>
    <p class="modal_msg">{{$t('adminBackend.uiGroupsAdmin.editCompaniesMsg')}}<span class="font-weight-bold ui-group-current">'{{uiGroup.name}}' :</span></p>
    <p class="my-2">{{showCompanies()}}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="close" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" @click="saveCompanies" style="z-index: 1; width: fit-content;"> <span>{{ $t('global.submit') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { fontIcons } from '@/resources/assets/assets'
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: 'CalculumUiGroupModal',
  props: {
    isUiCompanyModalShowing: { type: Boolean, required: true },
    uiGroup: { type: Object, required: true },
    uiGroupModalSelectedCompanies: { type: Array, required: false }
  },
  components: { CalculumModal },
  emits: ['hide', 'save-companies'],
  setup(props, { emit }) {
    function close() {
      emit('hide')
    }

    function saveCompanies() {
      const companiesVals = props.uiGroupModalSelectedCompanies?.map((item: any) => ({
        uuid: item.uuid,
        name: item.name
      })) ?? []

      emit('save-companies', props.uiGroup, companiesVals)
    }

    function showCompanies() {
      let companies = ' '

      props.uiGroupModalSelectedCompanies?.forEach(function (company: any) {
        companies += company.name + ','
      })

      companies = companies.substring(0, companies.length - 1)

      return companies
    }

    return {
      close,
      saveCompanies,
      showCompanies,
      fontIcons
    }
  }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/_colors.scss";

// ? - Check styles
.companies-container {
  width: 100%;
  height: 154px;
  overflow-y: auto;
}

// ? - Use utility classes
.gray_border {
  border-radius: 8px;
  border: 5px solid $color-gray-200;
}

.divider-between-msg-and-companies {
  padding-top: 0.5em;
}

.custom-top-margin-title {
  margin-top: 0.75em
}

.custom-bottom-margin-title {
  margin-top: 0.5em
}

.custom-top-margin {
  margin-top: 1.5em;
}

.custom-bottom-margin {
  margin-bottom: 1.5em;
}

.custom-left-margin {
  margin-left: 1.5em;
}

.custom-right-margin {
  margin-right: 1.5em;
}

.custom-left-padding {
  padding-left: 1.5em;
}

.custom-right-padding {
  padding-right: 1.5em;
}

.custom-top-padding {
  padding-top: 1.5em;
}

.custom-bottom-padding {
  padding-bottom: 1.5em;
}
</style>
