<template>
<td class="text-center"> <span v-if="dataItem.status === 'canceled'">{{ '-' }}</span>
  <div class="actions-by-invitations d-flex flex-column" v-else>
    <div class="d-flex gap-2 actions-invitations text-center">
      <CalculumLoading v-if="loading" :modal="true">       </CalculumLoading>
      <iconEllipsisVertical class="custom_cursor_pointer three-dots-icon my-auto ellipsis-icon-manage-team" :id="`myid-${myId}`" ref="button" @click="() => showOptions = !showOptions "></iconEllipsisVertical>
      <Popup class="custom-pop-up" :anchor="'button'" :show="showOptions" body="">
        <div class="d-flex flex-column custom-paddings-container">
          <div class="d-flex align-items-center custom-padding custom_cursor_pointer">
            <div class="d-flex flex-column gap-2">
              <div class="d-flex gap-1 cursor-pointer" @click="copyToClipboard">               <i class="fa-solid fa-copy cursor-pointer mr-2" aria-hidden="true" :title="$t('global.copyLink')"></i><span>{{ $t('global.copyLink') }}</span></div>
              <div class="d-flex gap-1 cursor-pointer" @click="deleteInvitation">               <i class="fa-solid fa-ban cursor-pointer mr-2" aria-hidden="true" :title="$t('global.deleteAccess')"></i><span>{{ $t('global.deleteAccess') }}                </span></div>
              <div class="d-flex gap-1 cursor-pointer" @click="resetVpPassword">               <i class="fa-solid fa-key cursor-pointer mr-2" aria-hidden="true" :title="$t('global.resetPassword')"></i><span>{{ $t('global.resetPassword') }}</span></div>
            </div>
          </div>
        </div>
      </Popup>
    </div>
  </div>
</td>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted } from 'vue'
import { useToast } from "vue-toastification";
import OpenURL from '@/modules/components/OpenURL.vue';
import { StringUtils } from '@/utils';
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { CalculumLoading } from '@ada/design-system'
import { Popup } from '@progress/kendo-vue-popup';
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import { useI18n } from 'vue-i18n';
import { useSpendFilesStore } from '@/stores/spendFiles'

export default defineComponent({
  name: 'ActionsByInvitations',
  components: {
  OpenURL,
  Tooltip,
  CalculumLoading,
  Popup,
  iconEllipsisVertical
  },
  props: {
    dataItem: { type: Object, required: true },   
  },
  emits: ["refresh-invitations"],
  setup (props, { emit }) {

    const toast = useToast();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const loading = ref(false)
    const showOptions = ref(false)
    const myId = ref(StringUtils.removeIRI( props.dataItem['@id'] )) 

    const spendFilesStore = useSpendFilesStore()
    const fullUrl = computed(() => {
        return `${window.location.origin}/value-proposition/${StringUtils.removeIRI(props.dataItem.valueProposition['@id'])}?invitation_id=${ StringUtils.removeIRI(props.dataItem['@id'])}`;
     });

     function openUrl() {
        window.open(fullUrl.value, '_blank')
     }

    function menuPopup(e: any) {
      if (e.target.closest(`#myid-${myId.value}`) || e.target.closest(`#custom-menu-options-${myId.value}`)) {
        return;
      }
      if (e.target.closest(`#custom-menu-options-${myId.value}`) !== null) {
        showOptions.value = true
      }
      if (e.target.closest(`#custom-menu-options-${myId.value}`) === null) {
        showOptions.value = false
      }
    }

    onMounted(() => {
      document.body.addEventListener('click', menuPopup)
    })

    onUnmounted(() => {
      document.body.removeEventListener('click', menuPopup)
    })

    function deleteInvitation() {    
      loading.value = true
      const params = {
          uuid: StringUtils.removeIRI(props.dataItem['@id']),
          callbackSuccess: () => {
            loading.value = false
            toast.success(translate.t('valueProposition.invitationCanceledSuccess'));
            emit("refresh-invitations");
          },
          callbackError: () => {
            loading.value = false
            toast.success(translate.t('valueProposition.invitationCanceledError'));
            emit("refresh-invitations");
              
          },
      };
      spendFilesStore.deleteValuePropositionInvitation(params);
    }
    
    function resetVpPassword() {    
      loading.value = true
        const params = {
            uuid: props.dataItem['@id'],
            callbackSuccess: () => {
              loading.value = false
              toast.success(translate.t('valueProposition.passwordResetSuccess'));
              emit("refresh-invitations");
            },
            callbackError: () => {
              loading.value = false
              toast.error(translate.t('valueProposition.passwordResetError'));
              emit("refresh-invitations");
                
            },
        };
        spendFilesStore.resetVpInvitationPassword(params);
    }

    function copyToClipboard() {
      navigator.clipboard.writeText(fullUrl.value)
          .then(() => {
            toast.success("Link copied in clipboard");
          })
          .catch(err => console.error("Error :", err));
    }

    return {
        fullUrl,
        copyToClipboard,
        openUrl,
        deleteInvitation,
        loading,
        resetVpPassword,
        showOptions,
        myId
    }
  }
})
</script>

<style lang="scss" scoped>

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

.d-flex.gap-1.cursor-pointer {
    align-items: center;
}


.actions-by-invitations {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.actions-invitations {
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
}

.url-text {
  width: 80%;
}


.copy-message {
    font-size: 14px;
    color: #000000;
    margin-top: 5px;    
    display: none;
    transition: opacity 0.3s ease-in-out;

  &-show {
    display: block;
    opacity: 1;
  }

}




</style>
