<template>
  <td class="text-left">
    <div class="d-flex text-left align-items-center">
      <img v-if="!dataItem.letter && !StringUtils.isNullUndefinedOrEmpty(dataItem.logo)" :src="dataItem.logo" @error="imagesError(dataItem)" style="width: 35px; margin-right: 10px;" alt="company-img"/>
      <div v-else class="activity-avatar mr-2" :style="{ backgroundColor: avatarColor }">
        <span>{{ initials }}</span>
      </div>
      <span>{{ displayName }}</span>
    </div>
  </td>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { StringUtils } from '@/utils'
import { getAvatarColor, getInitials } from '@/utils/ContentEditableUtils'

export default defineComponent({
  name: 'AdminUsername',
  components: { Tooltip },
  props: {
    dataItem: { type: Object, required: true }
  },
  setup(props) {
    function imagesError(item: { letter: boolean }) {
      item.letter = true
    }

    const email = computed(() => props.dataItem.userEmail || props.dataItem.email || '')

    const initials = computed(() => {
      const fullName = (props.dataItem.userFullName || `${props.dataItem.userFirstName || props.dataItem.firstName || ''} ${props.dataItem.userLastName || props.dataItem.lastName || ''}`).trim()
      return getInitials(fullName, email.value)
    })

    const avatarColor = computed(() => {
      const lastName = props.dataItem.userLastName || props.dataItem.lastName || ''
      return getAvatarColor(lastName, email.value)
    })

    const displayName = computed(() => {
      const fullName = (props.dataItem.userFullName || `${props.dataItem.userFirstName || props.dataItem.firstName || ''} ${props.dataItem.userLastName || props.dataItem.lastName || ''}`).trim()
      return fullName || email.value
    })

    return {
      initials,
      avatarColor,
      displayName,
      imagesError,
      StringUtils
    }
  }
})
</script>

<style lang="scss" scoped>
  span {
    font-size: 14px;
  }

.activity-avatar {
  flex-shrink: 0;
  min-width: 36px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  padding: 0;

  span {
    color: white;
    font-size: 13px;
    line-height: 1;
  }
}
</style>
