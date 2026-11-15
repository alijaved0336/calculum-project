<template>
<CalculumLoading v-if="loadingSomeData" :modal="true"></CalculumLoading>
<CalculumModal v-if="showExpirationDate" :size="'md'" :showClose="true" :title="'Set new expiration date'" @close="showExpirationDate = false">
  <template v-slot:modalContent>
    <div class="form-group">
      <label for="newExpirationDate">
        <input class="form-control" id="newExpirationDate" type="date" name="newExpirationDate" v-model="newExpirationDate" :min="today"/><span>* {{ 'Expiration Date' }}</span>
      </label>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="showExpirationDate = false" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }} </span></button>
    <button class="btn btn-primary font-md" id="save-expiration-date" @click="setNewExpirationDateValueProposition" style="z-index: 1; width: fit-content"> <span>{{ $t('global.continue') }}</span></button>
  </template>
</CalculumModal>
<CalculumModal v-if="showAlertStatus" :size="'md'" :showClose="true" :title="''" @close="showAlertStatus = false">
  <template v-slot:modalContent>
    <p>{{ 'You are trying to share a Value Proposition in Private mode. It can only be accessed by invitations in Public mode.' }}</p>
    <p>{{ 'Do you want to change it to Public mode before sharing it?' }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="showAlertStatus = false" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancelSwitchVPStatus') }} </span></button>
    <button class="btn btn-primary font-md" @click="setStatusforValueProposition(true)" style="z-index: 1; width: fit-content"> <span>{{ $t('global.continueSwitchVPStatus') }}        </span></button>
  </template>
</CalculumModal>
<CalculumModal v-if="showModalConfirm" :size="'md'" :showClose="true" :title="'Confirm Action'" @close="showModalConfirm = false">
  <template v-slot:modalContent>
    <p>{{ 'Are you sure to continue with the selected action?' }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="closeModalNReset" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }} </span></button>
    <button class="btn btn-primary font-md" @click="continueAction" style="z-index: 1; width: fit-content"> <span>{{ $t('global.continue') }}</span></button>
  </template>
</CalculumModal>
<CalculumModal v-if="showModalConfirmClone" :size="'md'" :showClose="true" :title="'Confirm Action'" @close="showModalConfirmClone = false">
  <template v-slot:modalContent>
    <p>{{ $t('global.confirmcloneVP') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="showModalConfirmClone = false" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }} </span></button>
    <button class="btn btn-primary font-md" id="save-clone" @click="cloneValueProposition" style="z-index: 1; width: fit-content"> <span>{{ $t('global.continue') }}       </span></button>
  </template>
</CalculumModal>
<CalculumModal v-if="showModalConfirmDelete" :size="'md'" :showClose="true" :title="'Confirm Action'" @close="showModalConfirmDelete = false">
  <template v-slot:modalContent>
    <p>{{ $t('global.confirmdeleteVP') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="showModalConfirmDelete = false" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }} </span></button>
    <button class="btn btn-primary font-md" id="save-delete" @click="deleteValueProposition" style="z-index: 1; width: fit-content"> <span>{{ $t('global.continue') }}        </span></button>
  </template>
</CalculumModal>
<CalculumModal v-if="showModalActivityTracking" :size="'xl'" :customHeight="'75vh'" :showClose="true" :title="`${dataItem.valuePropositionName} activity`" @close="showModalActivityTracking = false">
  <template v-slot:modalContent>
    <iframe title="Activity Tracking Dashboard" width="100%" :height="iframeHeight" allowfullscreen="allowfullscreen" :src="dataItem.analyticPostHogDashBoardUrl"></iframe>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => showModalActivityTracking = false" style="z-index: 1; width: fit-content"> <span>{{ $t('button.close') }}   </span></button>
  </template>
</CalculumModal>
<td class="text-center" v-if="!behavior"><span v-if="!blockOptions">{{ '-' }}</span>
  <iconEllipsisVertical class="custom_cursor_pointer three-dots-icon my-auto ellipsis-icon-manage-team" :id="`myid-${myId}`" ref="button" @click="() => showOptions = !showOptions" v-if="blockOptions"></iconEllipsisVertical>
  <Popup class="custom-pop-up" :anchor="'button'" :show="showOptions" body="">
    <div class="d-flex flex-column custom-paddings-container">
      <div class="d-flex align-items-center custom-padding custom_cursor_pointer">
        <div class="d-flex flex-column gap-2">
          <div class="d-flex gap-1 cursor-pointer" @click="viewValueProposition()"><i class="fa-solid fa-eye mr-2" aria-hidden="true"></i><span>{{ 'View' }}</span></div>
          <div class="d-flex gap-1 cursor-pointer" @click="vaidateVPstatusBeforeShare()"><i class="fa-solid fa-share mr-2" aria-hidden="true"></i><span>{{ 'Share with' }}</span></div>
          <div class="d-flex gap-1 cursor-pointer" @click="showModalConfirmClone = true"><i class="fa-solid fa-clone mr-2" aria-hidden="true"></i><span>{{ 'Clone' }}</span></div>
          <div class="d-flex gap-1 cursor-pointer" @click="showModalConfirmDelete = true">
            <iconTrash class="icon mr-2"></iconTrash><span>{{ 'Delete' }}          </span>
          </div>
          <div class="d-flex gap-1 cursor-pointer" @click="showExpirationDate = true"><i class="fa-regular fa-calendar-days mr-2" aria-hidden="true"></i><span>{{ 'Expiration Date' }}        </span></div>
          <div class="d-flex gap-1 cursor-pointer" @click="setStatusforValueProposition()"><i class="fa-solid fa-lock mr-2" v-if="dataItem.isPublic" aria-hidden="true"></i><span v-if="dataItem.isPublic">{{ $t('global.switchToPrivateMode') }}            </span><i class="fa-solid fa-lock-open mr-2" v-if="!dataItem.isPublic" aria-hidden="true"></i><span v-if="!dataItem.isPublic">{{ $t('global.switchToPublicMode') }}</span></div>
          <div class="d-flex gap-1 cursor-pointer" v-if="userIsSuperAdmin" @click="updateActivityDashboard"><i class="fa-solid fa-chart-area mr-2" aria-hidden="true"></i><span>{{ 'Activity' }}</span></div>
        </div>
      </div>
    </div>
  </Popup>
</td>
<td v-if="behavior && launchByName === false">
  <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
    <div class="d-flex gap-1 cursor-pointer text-center w-100 options-details" v-if="blockOptions" @click="vaidateVPstatusBeforeShare()" :title="tooltipActiveInvitations"><span :title="tooltipActiveInvitations">{{ `${dataItem.activeSharedInvitations}` }}    </span></div>
    <div class="d-flex gap-1 cursor-pointer text-center w-100 options-details" v-else><span class="w-100 text-center">{{ '-' }}</span></div>
  </Tooltip>
</td>
<td v-if="behavior && launchByName === true">
  <Tooltip class="ellipsis_custom pointer pt-3 cur" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
    <div class="ellipsis_custom pointer pt-3 cursor-pointer" @click="viewValueProposition()">
      <p class="pt-3 ml-2 ellipsis_custom custom-td-cell-for-grid cursor-pointer" :style="'text-transform: capitalize; text-align: left;'">{{ getText }}</p>
    </div>
  </Tooltip>
</td>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { CalculumLoading } from '@ada/design-system'
import CalculumEditIcon from '@/modules/components/icons/IconEdit.vue'
import CalculumDeleteIcon from '@/modules/components/CalculumDeleteIcon.vue'
import CalculumManageTeamsIcon from '@/modules/components/CalculumManageTeamsIcon.vue'
import { useAdminBackendStore } from '@/stores/adminBackend'
import { useSpendFilesStore } from '@/stores/spendFiles'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import { Popup } from '@progress/kendo-vue-popup';
import iconSendOrInvite from '@/resources/assets/images/icons/iconSendOrInvite.vue'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import { StringUtils, isNullOrUndefined } from "@/utils";
import { useToast } from "vue-toastification";
import { getNestedValue } from '@progress/kendo-vue-grid';
import PieChartComponent from '@/modules/valueProposition/componentes/PieChartComponent.vue';
import { useUser } from '@/composables';
import { useValuePropositionStore } from '@/stores/valueProposition'

export default defineComponent({
  name: 'ActionsValuePropositions',
  components: {
    CalculumLoading,
    CalculumEditIcon,
    CalculumDeleteIcon,
    CalculumManageTeamsIcon,
    CalculumModal,
    iconEllipsisVertical,
    Popup,
    iconSendOrInvite,
    iconTrash,
    Tooltip,
    PieChartComponent
  },
  props: {
    dataItem: { type: Object, required: true },
    behavior: { type: Boolean, required: false, default: false },
    launchByName: { type: Boolean, required: false, default: false },
    field: { type: String, required: true },
  },
  emits: ['refresh-invitations', 'launch-share-modal'],
  setup(props, { emit }) {
    const adminBackendStore = useAdminBackendStore()
    const spendFilesStore = useSpendFilesStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const toast = useToast()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const { userIsSuperAdmin } = useUser()
    const valuePropositionStore = useValuePropositionStore();

    const iframeHeight = ref(400)

    const calculateIframeHeight = () => {
      const modalContent = document.querySelector('.calculum-modal-content-custom') as HTMLElement
      if (modalContent) {
        const modalHeight = modalContent.offsetHeight
        const padding = 180
        const availableHeight = modalHeight - padding
        iframeHeight.value = Math.max(400, availableHeight)
      }
    }

    const getText = computed(() => {

      const getValue = getNestedValue(props.field, props.dataItem)
      if (isNullOrUndefined(getValue)) {
        return "-"
      } else {


        if (getValue === 'null') {
          return '-'
        }

        return getValue
      }

    })

    interface DataInterface {
      showModal: boolean,
      myId: string,
      showOptions: boolean,
      showModalConfirm: boolean,
      actionType: string,
      loadingSomeData: boolean,
      showModalConfirmClone: boolean,
      showModalConfirmDelete: boolean,
      showModalActivityTracking: boolean,
      showExpirationDate: boolean,
      newExpirationDate: string,
      showAlertStatus: boolean
    }

    const data = reactive<DataInterface>({
      showModal: false,
      myId: StringUtils.removeIRI(props.dataItem['@id']),
      showOptions: false,
      showModalConfirm: false,
      actionType: '',
      loadingSomeData: false,
      showModalConfirmClone: false,
      showModalConfirmDelete: false,
      showModalActivityTracking: false,
      showExpirationDate: false,
      newExpirationDate: today,
      showAlertStatus: false,
    })

    watch(() => data.showModalActivityTracking, (newValue) => {
      if (newValue) {        
        setTimeout(() => {
          calculateIframeHeight()
        }, 100)
      }
    })

    //** api calls */

    function continueAction() {
      data.loadingSomeData = true
      data.showModalConfirm = false

      const params = {
        uuid: StringUtils.removeIRI(props.dataItem['@id']),
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


    const blockOptions = computed(() => {
      return props.dataItem.status === 'active'
    })



    /** Value propositions */
    function cloneValueProposition() {    
      data.showModalConfirmClone = false 
      data.loadingSomeData = true       
        const params = {
            uuid: props.dataItem['@id'],
            callbackSuccess: (callbackSuccessData: any) => {                                    
              data.loadingSomeData = false              
              emit("refresh-invitations");
            },
            callbackError: () => {
              data.loadingSomeData = false
              emit("refresh-invitations");
                
            },
        };
        spendFilesStore.cloneValueProposition(params);
    }


     function deleteValueProposition() {    
      data.showModalConfirmDelete = false 
      data.loadingSomeData = true       
        const params = {
            uuid: props.dataItem['@id'],
            callbackSuccess: (callbackSuccessData: any) => {                                    
              data.loadingSomeData = false              
              emit("refresh-invitations");
            },
            callbackError: () => {
              data.loadingSomeData = false
              emit("refresh-invitations");
                
            },
        };
        spendFilesStore.deleteValueProposition(params);
    }


    function setNewExpirationDateValueProposition() {

      if (data.newExpirationDate < today) {
        toast.error('The new expiration date must be equal or greater than today');
        return;
      }
      data.showExpirationDate = false 
      data.loadingSomeData = true       
        const params = {
            uuid: props.dataItem['@id'],
            expirationDays: data.newExpirationDate,
            callbackSuccess: (callbackSuccessData: any) => {                                    
              data.loadingSomeData = false              
              emit("refresh-invitations");
            },
            callbackError: () => {
              data.loadingSomeData = false
              emit("refresh-invitations");
                
            },
        };
        spendFilesStore.setNewExpirationDateValueProposition(params);
    }


      function setStatusforValueProposition(launchShareModal: boolean = false) {
        data.showAlertStatus = false
        data.showExpirationDate = false 
        data.loadingSomeData = true       
          const params = {
              uuid: props.dataItem['@id'],
              isPublic: !props.dataItem.isPublic,
              callbackSuccess: () => {
                data.loadingSomeData = false              
                emit("refresh-invitations");                

                if (launchShareModal) {
                  emit('launch-share-modal',props.dataItem['@id'])
                }
              },
              callbackError: () => {
                data.loadingSomeData = false
                emit("refresh-invitations");
                  
              },
          };
          spendFilesStore.setStatusforValueProposition(params);
    }


    function viewValueProposition() {
      const vpId = StringUtils.removeIRI(props.dataItem['@id'])
      const url = `/home/value-proposition-internal/${vpId}`
      window.open(url, '_blank')
    }


    function vaidateVPstatusBeforeShare() {
      if (props.dataItem.isPublic === true) {
        emit('launch-share-modal', props.dataItem['@id'])
      } else {
        data.showAlertStatus = true
      }
    }


    function updateActivityDashboard() {
      data.loadingSomeData = true
      
      const params = {
          value_proposition_id: props.dataItem['@id'],
          callbackSuccess: (callBackSucess: any) => {              
              data.loadingSomeData = false
              data.showModalActivityTracking = true
              
          }, callbackError: () => {
              data.loadingSomeData = false
              data.showModalActivityTracking = true              
          }
      }
      valuePropositionStore.updateActivityDashboard(params)
  }


    const tooltipActiveInvitations = computed(() => {
      return ` Active Invitations: ${props.dataItem.activeSharedInvitations}`
    })


    return {
      ...toRefs(data),
      showConfirModalAction,
      closeModalNReset,
      continueAction,
      blockOptions,
      viewValueProposition,
      cloneValueProposition,
      deleteValueProposition,
      setNewExpirationDateValueProposition,
      tooltipActiveInvitations,
      today,
      getText,
      setStatusforValueProposition,
      vaidateVPstatusBeforeShare,
      userIsSuperAdmin,
      iframeHeight,
      updateActivityDashboard
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

.d-flex.gap-1.cursor-pointer {
  align-items: center;
}

.options-details {
  justify-content: center;
}

.chart-container {
  background-color: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 0.9rem;
  line-height: 1.6;
  min-height: 550px;
}
</style>
