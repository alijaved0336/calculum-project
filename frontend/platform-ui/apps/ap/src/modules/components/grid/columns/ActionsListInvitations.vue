<template>
<CalculumLoading v-if="loadingSomeData" :modal="true"></CalculumLoading>
<CalculumModal v-if="showModalConfirm" :size="'md'" :showClose="true" :title="'Confirm Action'" @close="showModalConfirm = false">
  <template v-slot:modalContent>
    <p>{{ 'Are you sure to continue with the selected action?' }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="closeModalNReset" style="z-index: 1; width: fit-content"> <span>{{$t('button.cancel')}} </span></button>
    <button class="btn btn-primary font-md" @click="continueAction" style="z-index: 1; width: fit-content"> <span>{{ $t('global.continue') }}</span></button>
  </template>
</CalculumModal>
<td>
  <iconEllipsisVertical class="custom_cursor_pointer three-dots-icon my-auto ellipsis-icon-manage-team" :id="`myid-${myId}`" ref="button" @click="() => showOptions = !showOptions " v-if="blockOptions"></iconEllipsisVertical>
  <Popup class="custom-pop-up" :anchor="'button'" :show="showOptions" body="">
    <div class="d-flex flex-column custom-paddings-container">
      <div class="d-flex align-items-center custom-padding custom_cursor_pointer" :title="$t('global.edit')">
        <div class="d-flex flex-column">
          <div class="d-flex gap-2 cursor-pointer" @click="showConfirModalAction('resend')">
            <iconSendOrInvite class="icon mr-2"></iconSendOrInvite><span>{{ $t('adminBackend.options.resendInvitation') }}</span>
          </div>
          <div class="d-flex gap-2 cursor-pointer" @click="showConfirModalAction('cancel')">
            <iconTrash class="icon mr-2"></iconTrash><span>{{ $t('adminBackend.options.cancelInvitation') }}</span>
          </div>
        </div>
      </div>
    </div>
  </Popup>
</td>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { CalculumLoading } from '@ada/design-system'
import CalculumEditIcon from '@/modules/components/icons/IconEdit.vue'
import CalculumDeleteIcon from '@/modules/components/CalculumDeleteIcon.vue'
import CalculumManageTeamsIcon from '@/modules/components/CalculumManageTeamsIcon.vue'
import { useAdminBackendStore } from '@/stores/adminBackend'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import { Popup } from '@progress/kendo-vue-popup';
import iconSendOrInvite from '@/resources/assets/images/icons/iconSendOrInvite.vue'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import { StringUtils } from "@/utils";
import { useToast } from 'vue-toastification'


export default defineComponent({
  name: 'ActionsListInvitations',
  components: {
    CalculumLoading,
    CalculumEditIcon,
    CalculumDeleteIcon,
    CalculumManageTeamsIcon,
    CalculumModal,
    iconEllipsisVertical,
    Popup,
    iconSendOrInvite,
    iconTrash
  },
  props: {
    dataItem: { type: Object, required: true },   
  },
  emits: ['refresh-invitations'],
  setup(props, { emit }) {
    const adminBackendStore = useAdminBackendStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const toast = useToast()
 
    interface DataInterface {
      showModal: boolean,
      myId: number,
      showOptions: boolean,
      showModalConfirm: boolean,
      actionType: string,
      loadingSomeData: boolean
    
    }

    const data = reactive<DataInterface>({
      showModal: false,
      myId: props.dataItem.invitationToken,
      showOptions: false,
      showModalConfirm: false,
      actionType: '',
      loadingSomeData: false
    })

    //** api calls */

    function continueAction() {
      data.loadingSomeData = true
      data.showModalConfirm = false
        
      const params = {
          uuid: StringUtils.removeIRI( props.dataItem['@id'] ),
          actionType: data.actionType,

          callbackSuccess: (response: any) => {
            toast.success(response);
            data.loadingSomeData = false
            emit("refresh-invitations");

          },
          callbackError: () => {
              data.loadingSomeData = false
              toast.error(translate.t('error.server500'));
              emit("refresh-invitations");
          }
      }

      adminBackendStore.getInvitationsActions(params)
    }



    function menuPopup(e: any) {
      if (e.target.closest(`#myid-${data.myId}`) || e.target.closest(`#custom-menu-options-${data.myId}`)) {
        return;
      }
      if (e.target.closest(`#custom-menu-options-${data.myId}`) !== null) {
        data.showOptions = true
      }
      if (e.target.closest(`#custom-menu-options-${data.myId}`) === null) {
        data.showOptions = false
      }

    }

    onMounted(() => {
      document.body.addEventListener('click', menuPopup)
    })

    onUnmounted(() => {
      document.body.removeEventListener('click', menuPopup)
    })


    function showConfirModalAction(action: string) {
      data.actionType = action
      data.showModalConfirm = true
    }

    function closeModalNReset() {
      data.actionType = ''
      data.showModalConfirm = false
    }
    
   
    const blockOptions = computed (() => {

      return props.dataItem.status === 'active'

    })


    return {
      ...toRefs(data),
      showConfirModalAction,
      closeModalNReset,
      continueAction,
      blockOptions
    }
  }
})
</script>

<style lang="scss" scoped>
  @import "src/resources/assets/styles/variables/_colors.scss"; 

.custom-pop-up {
  width: 200px !important;
}

.custom-paddings-container {
  padding: .875em;
}

.custom-padding {
  padding: .25em;
  gap: 10px;
}

.disabled {
  opacity: 0.4;
}

.icon {
  width: auto;
  height: 18px !important;
  color: black;
}

.no-pointer {
  cursor: default;
}
</style>