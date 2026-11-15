<template>
<div class="item-container term_group_title"><span>{{ $t("home.entityCard.negotiation.termGroup") }}</span></div>
<div class="item-container" v-for="groupV in groupsVcard" :key="groupV.vCardName">
  <button class="buttons_group_item" :style="setStyleBtn(groupV.color)" @click="callStoreMenuAction(option,true,false,{param:'grid-add-vgroup', param1: groupV['id']})">{{ groupV.vCardName }}</button>
</div>
<div class="d-flex align-items-center justify-content-between item-container"><span class="remove_group_main cursor-pointer" @click="callStoreMenuAction(option,true,true,{'param':'grid-add-group', 'param1': null, 'param2':'vCard', 'param3': null})">{{ $t("home.entityCard.negotiation.removeGroup") }}</span>
  <iconTrash class="trash_icon"></iconTrash>
</div>
</template>

<script lang="ts">
import { PropType, computed, defineComponent } from "vue";
import { ActionFromEditProgram } from "@/modules/components/types";
import { useHomeStore } from "@/stores/home";
import * as formatData from '@/utils/FormatData'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
export default defineComponent({
  name: "VcardAction",
  components: {
    iconTrash,
  },
  props: {
    option: {
      type: String as PropType<ActionFromEditProgram>,
      required: true,
    },
    itemContainerClass: {
      type: String,
      required: false,
      default: "item-container",
    },
    removeGroupMainClass: {
      type: String,
      required: false,
      default: "remove_group_main",
    },
    trashIconClass: {
      type: String,
      required: false,
      default: "trash_icon",
    },
  },
  emits: ["call-action"],
  setup(props, { emit }) {
    const homeStore = useHomeStore();
    const callStoreMenuAction = (
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      removeGroup: boolean,
      payload: any,
    ) => {
      const newPayload={...payload,removeGroup}
      emit("call-action", keyId, isEmit, newPayload);
    };
    const groupsVcard = computed(() => {
      return homeStore.getVCardGroups.length > 0 ? homeStore.getVCardGroups : [];
    });
    const setStyleBtn=(color: string) => {
      return {
        '--color': formatData.colorText(color),
        'color': formatData.colorText(color),
        'background': color,
      }
    }
    return {
      callStoreMenuAction,
      groupsVcard,
      setStyleBtn,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";

.item-container {
  padding: 10px 14px;
  border-radius: 8px;

  span {
    font-size: 14px;
  }
}
.remove_group_main {
  background: transparent !important;
  color: $color-gray-400;
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
}
.term_group_title {
  background: transparent !important;
  color: $color-gray-700;
  font-style: normal;
  font-weight: 500;
  font-size: 16px;
}
.trash_icon {
  color: $color-gray-700;
  width: 18px;
  height: 18px;
  margin-left: 10px;
}
</style>
