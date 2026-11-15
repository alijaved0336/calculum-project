<template>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.entityCard.reqDataChanges.title')" @close="$emit('close')">
  <template v-slot:modalContent>
    <p>{{ $t('home.entityCard.reqDataChanges.description') }}</p>
    <div class="row">
      <div class="col">
        <textarea type="text" v-model="userInput" :placeholder="$t('home.entityCard.reqDataChanges.placeholder')"></textarea>
      </div>
    </div>
    <div class="row">
      <div class="col"><span class="text-error" v-if="errorReqCannotBeEmptyShowing">{{ $t('home.entityCard.reqDataChanges.errorReqCannotBeEmpty') }}</span></div>
    </div>
    <div class="row">
      <div class="ml-auto pr-3">
        <CalculumMoreInfo :moreInfoText="parametersListShowing ? $t('home.entityCard.reqDataChanges.moreInfoTextHide') : $t('home.entityCard.reqDataChanges.moreInfoTextShow') " @moreInfoClicked="parametersListShowing = !parametersListShowing"></CalculumMoreInfo>
      </div>
    </div>
    <div class="row px-3 mb-4" v-if="parametersListShowing">
      <div class="col px-0 pt-1 border-top">
        <p class="text-gray-500" :class="parametersListShowing ? 'animate__animated animate__fadeIn' : ''">{{ $t('home.entityCard.reqDataChanges.parametersList') }}</p>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="$emit('close')" style="z-index: 1; width: fit-content"><span>{{$t('button.cancel')}} </span></button>
    <button class="btn btn-primary font-md" @click="sendReq" style="z-index: 1; width: fit-content"><span v-if="!loading">{{$t('button.send')}}</span><span class="spinner-border spinner-border-sm" v-else></span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive, onMounted, watch } from 'vue'
import { useEntityCardStore } from '@/stores/entityCard';
import { fontIcons } from '@/resources/assets/assets'
import { useI18n } from 'vue-i18n'
import CalculumMoreInfo from '@/modules/components/CalculumMoreInfo.vue'
import { useToast } from 'vue-toastification'
import 'animate.css';
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: "EntityCardReqChanges",
  components: {
    CalculumMoreInfo,
    CalculumModal
  },
  props: {
    supplierId: { type: String, required: true },
    spendFileVersion: { type: String, required: true }
  },
  emits: ["close"],
  setup(props, { emit }) {
    const entityCardStore = useEntityCardStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();
    onMounted(() => {
    });
    interface EntityCardReqChanges {
      userInput: string;
      supplierId: string;
      spendFileVersion: string;
      parametersListShowing: boolean;
      errorReqCannotBeEmptyShowing: boolean;
      loading: boolean;
    }

    const data = reactive<EntityCardReqChanges>({
      userInput: "",
      supplierId: props.supplierId,
      spendFileVersion: props.spendFileVersion,
      parametersListShowing: false,
      errorReqCannotBeEmptyShowing: false,
      loading: false
    });

    /**
     * Send request to change data
     */
    const sendReq = () => {      
      if (data.userInput.length <= 0) {
        data.errorReqCannotBeEmptyShowing = true;

        return;
      }
      data.loading = true;

      const params = {
        companyId: props.supplierId,
        userMessage: data.userInput,
        spendFileVersion: props.spendFileVersion,
        callbackSuccess: (response: any) => {
          data.loading = false;
          data.userInput = "";      
          toast.success(translate.t("home.entityCard.reqDataChanges.reqWasSaved"));

          emit("close");
        },
        callbackError: () => {
          data.loading = false;
          toast.error(translate.t("home.entityCard.reqDataChanges.reqWasNotSaved"));
        }
      };
      entityCardStore.postReqDataChanges(params);
      
    };

    /**
     * Watchers
     */

    // Hide error message when user starts typing
    watch(() => data.userInput, () => {
      data.errorReqCannotBeEmptyShowing = false;
    })

    return {
      ...toRefs(data),
      sendReq,
      props,
      fontIcons
    };
  }
})
</script>

<style lang="scss" scoped>
@import 'src/resources/assets/styles/variables/_colors.scss';

// ? - Replace this with the new class
.text-error {
  color: $color-error-500;
}

// ? - Replace this with the new class
.text-gray-500 {
  color: $color-gray-500;
}



th.text-capitalize.bg-light.th-left {
  width: 75% !important;
}

.icon-svg {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

textarea {
  border-radius: 10px;
  min-height: 120px;
  padding: 1em;
  width: 100%;
}

span.userName {
  font-weight: 600;
}

.user_note_card,
.card {
  min-height: 100px !important;
  padding: 0;
}

.userIcon {
  width: 2em;
}

.card.user_note_card {
  flex: 1;
}

.notes_overflow_container {
  margin-top: 1em;
  padding-right: 1em;
  width: 100%;
  height: 550px;
  overflow-y: auto;
}

.close-icon {
  position: absolute;
  right: 20px;
  z-index: 20;
}
</style>
