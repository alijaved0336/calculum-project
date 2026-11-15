<template>
  <td v-if="showOnlyEditAndDelete" class="custom-class-for-grid-manage-team text-right" role="gridcell">
    <div :id="`custom-menu-options-${myId}`">
      <iconEllipsisVertical :id="`myid-${myId}`" ref="button" class="custom_cursor_pointer three-dots-icon my-auto ellipsis-icon-manage-team" @click="() => showOptions = !showOptions " />
      
      <Popup :anchor="'button'" :show="showOptions" :popup-class="'manage-team-popup-settings'" class="custom-pop-up">
        <div class="d-flex flex-column custom-paddings-container">
          <Tooltip v-if="dataItem.enabled && isAdmin" :open-delay='100' :anchor-element="'target'" :position="'top'">
            <div :title="$t('global.edit')" class="d-flex align-items-center custom-padding custom_cursor_pointer"
              @click="editUser(dataItem)">
              <iconPencil class="icon edit-action " />
              <span>{{ $t('global.edit') }}</span>
            </div>
          </Tooltip>

          <Tooltip v-else :open-delay='100' :anchor-element="'target'" :position="'top'">
            <div class="d-flex align-items-center custom-padding">
              <iconPencil class="disabled icon no-pointer edit-action " />
              <span class="disabled">{{ $t('global.edit') }}</span>
            </div>
          </Tooltip>

          <Tooltip v-if="isAdmin" :open-delay='100' :anchor-element="'target'" :position="'top'">
            <div :title="$t('global.delete')" class="d-flex align-items-center custom-padding custom_cursor_pointer"
              @click="deleteUser(dataItem)">
              <iconTrash class="icon delete-action" />
              <span class="custom_cursor_pointer">{{ $t('global.delete') }}</span>
            </div>
          </Tooltip>

          <Tooltip v-else :open-delay='100' :anchor-element="'target'" :position="'top'">
            <div class="d-flex align-items-center custom-padding">
              <iconTrash class="disabled icon no-pointer delete-action" />
              <span class="disabled">{{ $t('global.delete') }}</span>
            </div>
          </Tooltip>

        </div>

      </Popup>
    </div>
  </td>
  <td v-else class="custom-class-for-grid-manage-team text-right" role="gridcell">
    <div :id="`custom-menu-options-${myId}`">
      <iconEllipsisVertical :id="`myid-${myId}`" ref="button" class="custom_cursor_pointer three-dots-icon my-auto ellipsis-icon-manage-team" @click="() => showOptions = !showOptions " />
      
      <Popup :anchor="'button'" :show="showOptions" :popup-class="'manage-team-popup-settings'" class="custom-pop-up">
        <div class="d-flex flex-column custom-paddings-container">
          <template v-if="!globalManageValue">
            <Tooltip v-if="dataItem.enabled && isAdmin && !globalManageValue" :open-delay='100' :anchor-element="'target'" :position="'top'">
              <div :title="$t('global.edit')" class="d-flex align-items-center custom-padding custom_cursor_pointer"
                @click="editUser(dataItem)">
                <iconPencil class="icon edit-action " />
                <span>{{ $t('global.edit') }}</span>
              </div>
            </Tooltip>

            <Tooltip v-else :open-delay='100' :anchor-element="'target'" :position="'top'">
              <div class="d-flex align-items-center custom-padding">
                <iconPencil class="disabled icon no-pointer edit-action " />
                <span class="disabled">{{ $t('global.edit') }}</span>
              </div>
            </Tooltip>
          </template>

          <Tooltip v-if="isAdmin && !StringUtils.isNullUndefinedOrEmpty(dataItem.companyUuid)" :open-delay='100' :anchor-element="'target'" :position="'top'">
            <div :title="$t('global.delete')" class="d-flex align-items-center custom-padding custom_cursor_pointer"
              @click="deleteUser(dataItem)">
              <iconTrash class="icon delete-action" />
              <span class="custom_cursor_pointer">{{ $t('global.delete') }}</span>
            </div>
          </Tooltip>

          <Tooltip v-else :open-delay='100' :anchor-element="'target'" :position="'top'">
            <div class="d-flex align-items-center custom-padding">
              <iconTrash class="disabled icon no-pointer delete-action" />
              <span class="disabled">{{ $t('global.delete') }}</span>
            </div>
          </Tooltip>

          <Tooltip v-if="((!dataItem.enabled && isAdmin && dataItem.email !== user?.email) || (globalManageValue && dataItem.email !== user?.email)) && !StringUtils.isNullUndefinedOrEmpty(dataItem.companyUuid)" class="d-flex align-items-center" :open-delay='100'
            :anchor-element="'target'" :position="'top'">
            <div :title="$t('adminBackend.options.grantAccess')"
              class="d-flex align-items-center custom-padding custom_cursor_pointer" @click="grantAccess(dataItem)">
              <iconGrantAccess class="icon grant-access-action " />
              <span class="custom_cursor_pointer">{{ $t('adminBackend.options.grantAccess') }}</span>
            </div>
          </Tooltip>

          <Tooltip v-else :open-delay='100' :anchor-element="'target'" :position="'top'">
            <div class="d-flex align-items-center custom-padding">
              <iconGrantAccess class="disabled icon no_pointer grant-access-action"
                :title="$t('adminBackend.options.grantAccess')" />
              <span class="disabled">{{ $t('adminBackend.options.grantAccess') }}</span>
            </div>
          </Tooltip>

          <Tooltip v-if="(dataItem.enabled && isAdmin && dataItem.email !== user?.email) || (globalManageValue && dataItem.email !== user?.email) && !StringUtils.isNullUndefinedOrEmpty(dataItem.companyUuid)" :open-delay='100' :anchor-element="'target'" :position="'top'">
            <div :title="$t('adminBackend.options.revokeAccess')"
              class="d-flex align-items-center custom-padding custom_cursor_pointer" @click="revokeAccess(dataItem)">
              <iconRevokeAccess class="icon revoke-access-action " />
              <span class="custom_cursor_pointer">{{ $t('adminBackend.options.revokeAccess') }}</span>
            </div>
          </Tooltip>

          <Tooltip v-else :open-delay='100' :anchor-element="'target'" :position="'top'">
            <div class="d-flex align-items-center custom-padding">
              <iconRevokeAccess :title="$t('adminBackend.options.revokeAccess')"
                class="disabled icon no-pointer revoke-access-action " />
              <span class="disabled">{{ $t('adminBackend.options.revokeAccess') }}</span>
            </div>
          </Tooltip>

          <Tooltip v-if="isSuperAdmin && dataItem.enabled && dataItem.azureId !== null && dataItem.azureId !== undefined" :open-delay='100' :anchor-element="'target'" :position="'top'">
            <div :title="$t('adminBackend.options.resetIdentiyProvider')"
              class="d-flex align-items-center custom-padding custom_cursor_pointer" @click="resetIdentiyProvider(dataItem)">
              <iconIdentityProvider class="icon reset-identity-provider-action " />
              <span class="custom_cursor_pointer">{{ $t('adminBackend.options.resetIdentiyProvider') }}</span>
            </div>
          </Tooltip>

          <template v-if="!isNullOrUndefined(user) && user['@id'] !== dataItem['@id'] && !globalManageValue && !StringUtils.isNullUndefinedOrEmpty(dataItem.companyUuid)">
            <Tooltip v-if="isAdmin" class="d-flex align-items-center" :open-delay='100' :anchor-element="'target'"
              :position="'top'">
              <div :title="$t('adminBackend.options.resendInvitation')"
                class="d-flex align-items-center custom-padding custom_cursor_pointer"
                @click="resendInvitation(dataItem)">
                <iconSendOrInvite class="icon" />
                <span>{{ $t('adminBackend.options.resendInvitation') }}</span>
              </div>
            </Tooltip>

            <Tooltip v-else class="d-flex align-items-center" :open-delay='100' :anchor-element="'target'"
              :position="'top'">
              <div class="d-flex align-items-center custom-padding">
                <iconSendOrInvite :title="$t('adminBackend.options.resendInvitation')"
                  class="disabled icon invite-action" />
                <span class="disabled">{{ $t('adminBackend.options.resendInvitation') }}</span>
              </div>
            </Tooltip>
          </template>
          
          <template v-if="isSuperAdmin">
            <Tooltip :open-delay='100' :anchor-element="'target'" :position="'top'">
              <div class="d-flex align-items-center custom-padding custom_cursor_pointer" @click="invalidateToken(dataItem)">
                <iconRevokeAccess 
                  :title="$t('adminBackend.options.invalidateToken')"                
                  class="icon invalidate-token-acess"                 
                />
                <span>{{ $t('adminBackend.options.invalidateToken') }}</span>
              </div>
            </Tooltip>
          </template>

          <template v-if="isSuperAdmin && dataItem.invitationLink">
            <Tooltip class="d-flex align-items-center" :open-delay='100' :anchor-element="'target'"
              :position="'top'">
              <div :title="$t('adminBackend.options.copyInvitationLink')"
                class="d-flex align-items-center custom-padding custom_cursor_pointer"
                @click="copyInvitation(dataItem)">
                <iconCopy class="icon" />
                <span>{{ $t('adminBackend.options.copyInvitationLink') }}</span>
              </div>
            </Tooltip>
          </template>
        </div>
      </Popup>
    </div>
  </td>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, onMounted, onUnmounted } from 'vue'
import { Popup } from '@progress/kendo-vue-popup';
import { removeIRI, isNullOrUndefined } from '@/utils'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useI18n } from 'vue-i18n'
import { useToast } from "vue-toastification";
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import iconGrantAccess from '@/resources/assets/images/icons/iconGrantAccess.vue'
import iconPencil from '@/resources/assets/images/icons/iconPencil.vue'
import iconRevokeAccess from '@/resources/assets/images/icons/iconRevokeAccess.vue'
import iconIdentityProvider from '@/resources/assets/images/icons/iconIdentityProvider.vue'
import iconSendOrInvite from '@/resources/assets/images/icons/iconSendOrInvite.vue'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import iconCopy from '@/resources/assets/images/icons/iconCopy.vue'
import { useUser } from '@/composables';
import { StringUtils } from '@/utils';

export default defineComponent({
  name: 'AdminUserActions',
  components: {
    Popup,
    iconEllipsisVertical,
    iconGrantAccess,
    iconPencil,
    iconRevokeAccess,
    iconSendOrInvite,
    iconIdentityProvider,
    iconTrash,
    iconCopy,
    Tooltip
  },
  props: {
    dataItem: { type: Object, required: true },
    forSuperAdminValue: { type: Boolean, required: false },
    forCompanyAdminValue: { type: Boolean, required: false },
    showOnlyEditAndDelete: { type: Boolean, required: false },
    globalManageValue: { type: Boolean, required: false, default: false },
  },
  emits: ['edit-user', 'delete-user', 'toggle-options', 'revoke-access', 'resend-invitation', 'grant-access', 'reset-identity-provider','invalidate-token'],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const toast = useToast()

    const { user } = useUser();
    
    interface Actions {
      isAdmin: boolean,
      isSuperAdmin: boolean
      myId: string,
      showOptions: boolean
    }

    const dataActions = reactive<Actions>({
      isAdmin: false,
      isSuperAdmin: false,
      myId: '',
      showOptions: false,
    })
    
    /**
     * checks if user clicke on the button to show the menu
     * if user clicks outside the menu , the menu hides
     * @param e event
     */
    function menuPopup(e: any) {
      if (e.target.closest(`#myid-${dataActions.myId}`) || e.target.closest(`#custom-menu-options-${dataActions.myId}`)) {
        return;
      }
      if (e.target.closest(`#custom-menu-options-${dataActions.myId}`) !== null) {
        dataActions.showOptions = true
      }
      if (e.target.closest(`#custom-menu-options-${dataActions.myId}`) === null) {
        dataActions.showOptions = false
      }

    }

    function imagesError(item: { letter: boolean }) {
      item.letter = true
    }

    /**
     * checks if user is super admin
     */
    function superAdmin() {
      if (user.value) {
        return user.value.isSuperAdmin
      }

      return false;
    }

    
    /**
     * 
     * checks if user is admin
     */
    function admin() {
      const adminType = props.forSuperAdminValue ? 'ROLE_ADMIN' : 'ROLE_COMPANY_ADMIN'

      if (props.forCompanyAdminValue) {
        if (user.value && user.value.roles) {
          const arrayRoles = Object.values(user.value.roles);

          const role = arrayRoles.find((x: any) => x === adminType)
          return role ? true : false
        } else {
          return false
        }
      } else {
        return true
      }
    }

    /**
     * grant access to the seleced user
     */
    function grantAccess(userObj: any) {
      dataActions.showOptions = false
      emit('grant-access', userObj, false)
    }
    function letterOfDomain(name: string) {
      return name.substring(0, 1)
    }
    /**
     * @param useObj
     * edit the user
     */
    function editUser(userObj: any) {
      dataActions.showOptions = false
      emit('edit-user', true, userObj,)
    }
    /**
     * delete user
     * @param userObj 
     */
    function deleteUser(userObj: any) {
      dataActions.showOptions = false
      emit('delete-user', userObj)      
    }
    /**
     * revoke access
     * @param userObj 
     */
    function revokeAccess(userObj: any) {
      dataActions.showOptions = false
      emit('revoke-access', userObj, true)
    }
    /**
     * revoke access
     * @param userObj 
     */
     function resetIdentiyProvider(userObj: any) {
      dataActions.showOptions = false
      emit('reset-identity-provider', userObj)
    }
    /**
     * resend invitation to the selected user
     * @param userObj 
     */
    function resendInvitation(userObj: any) {
      dataActions.showOptions = false
      if (import.meta.env.DEV) console.log("** invalidate-token")
      emit('resend-invitation', userObj)
    }

    function invalidateToken(userObj: any) {
      dataActions.showOptions = false
      emit('invalidate-token', userObj)
    }


    /**
     * copy invitation link to the selected user
     * @param userObj 
     */
     async function copyInvitation(userObj: any) {
      dataActions.showOptions = false
      try {
        await navigator.clipboard.writeText(userObj.invitationLink);
        toast.success(translate.t('adminBackend.options.invitationLinkCopied'));
      } catch (error) {
        if (import.meta.env.DEV) console.error("Failed to copy text:", error);
      }
    }

    /**
     * onMounted
     */
    onMounted(() => {
      dataActions.myId = props.showOnlyEditAndDelete ? props.dataItem['id'] : removeIRI(props.dataItem['@id'])
      dataActions.isAdmin = admin()
      dataActions.isSuperAdmin = superAdmin()

      document.body.addEventListener('click', menuPopup)
    })

    /**
     * onUnmounted
     */
    onUnmounted(() => {
      document.body.removeEventListener('click', menuPopup)
    })

    return {
      ...toRefs(dataActions),
      admin,
      deleteUser,
      editUser,
      grantAccess,
      imagesError,
      letterOfDomain,
      menuPopup,
      resendInvitation,
      revokeAccess,
      resetIdentiyProvider,
      copyInvitation,
      user,
      isNullOrUndefined,
      invalidateToken,
      StringUtils
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

