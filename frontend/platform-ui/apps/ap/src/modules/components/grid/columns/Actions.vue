<template>
  <td>
    <div  class="d-flex align-items-center">
    <div v-if="forUiGroupGrid && isSuperAdmin" class="icon_container">
      <Tooltip  :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <iconPlusCircle class="icons"  :title="$t('global.editCompanies')" @click="editCompanies(dataItem)"></iconPlusCircle>
      </Tooltip>
    </div>
    <div v-if="forUiGroupGrid && isSuperAdmin" class="divider mr-1 ml-1"></div>
    <div class="icon_container">
        <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'">
            <CalculumEditIcon class="icons" v-if="isSuperAdmin" :title="$t('common.edit')" @click="editUiGroup(dataItem)">{{$t('common.edit')}}</CalculumEditIcon>
            <CalculumEditIcon class="icons" v-else-if="userIsAdmin > 0 || userFullName === dataItem.createdBy.firstName + ' ' + dataItem.createdBy.lastName " :title="$t('common.edit')" @click="editTemplate(dataItem)">{{$t('common.edit')}}</CalculumEditIcon>
            <CalculumEditIcon class="icons disabled" v-else @click="showErrorMessageNoty" :title="$t('common.permissionRequired')">{{$t('common.edit')}}</CalculumEditIcon>
        </Tooltip>
    </div>
    <div class="icon_container">
        <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'">
            <iconTrash class="icons delete-icon" v-if="isSuperAdmin" :title="$t('common.delete')" @click="deleteTemplate(dataItem)">{{$t('common.delete')}}</iconTrash>
            <iconTrash class="icons delete-icon" v-else-if="userIsAdmin > 0 || userFullName === dataItem.createdBy.firstName + ' ' + dataItem.createdBy.lastName" @click="deleteTemplate(dataItem)" :title="$t('common.delete')">{{$t('common.delete')}}</iconTrash>
            <iconTrash class="icons disabled" v-else @click="showErrorMessageNoty" :title="$t('common.permissionRequired')">{{$t('common.delete')}}</iconTrash>
        </Tooltip>
    </div>
</div>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import iconPlusCircle from '@/resources/assets/images/icons/iconPlusCircle.vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import CalculumEditIcon from '@/modules/components/icons/IconEdit.vue'
import { useUser } from '@/composables';
import { StringUtils, isNullOrUndefined } from '@/utils'

export default defineComponent({
  name: 'ActionsColumn',
  components: {
    iconTrash,
    Tooltip,
    iconPlusCircle,
    CalculumEditIcon
  },
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
    isSuperAdmin: { type: Boolean, required: false, default: false },
    forUiGroupGrid: { type: Boolean, required: false, default: false }
  },
  emits: ['edit', 'delete', 'error-noty', 'edit-companies', 'edit-ui-group'],
  setup(props, { emit }) {
    const { user, userSessionRoles } = useUser()

    let userFullName = "";

    if (!isNullOrUndefined(user.value) &&
      !StringUtils.isNullUndefinedOrEmpty(user.value.firstName) &&
      !StringUtils.isNullUndefinedOrEmpty(user.value.lastName)) {
      userFullName = user.value.firstName + ' ' + user.value.lastName;      
    }

    let userIsAdmin = 0

    if (!props.isSuperAdmin) {
      if (isNullOrUndefined(user.value)) {
        return;
      }

      userIsAdmin = userSessionRoles.value.findIndex((x:any) => x === 'ROLE_COMPANY_ADMIN')
    }

    function editCompanies(dataItem: any) {
      emit('edit-companies', dataItem)
    }
    function editUiGroup(dataItem: any) {
      emit('edit-ui-group', dataItem)
    }
    function editTemplate(dataItem: any) {
      emit('edit', dataItem)
    }
    function deleteTemplate(dataItem: any) {
      emit('delete', dataItem)
    }

    function showErrorMessageNoty() {
      emit('error-noty')
    }
    return {
      editCompanies,
      editUiGroup,
      showErrorMessageNoty,
      editTemplate,
      deleteTemplate,
      userFullName,
      userIsAdmin
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

  .divider {
  height: 41px;
  width: 1px;
  border-right: 1px solid $modern-gray-200;
  }

  .disabled{
    opacity: 0.3;
  }

  .icon_container{
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: transparent;
    width: 30px;
    height: 30px;
    padding: 5px;
    transition: background 0.3s ease-in;
    &:hover{
      background: $basewhite;
    }
  }
  .icons{
    width: 20px;
    height: 20px;
  }


</style>