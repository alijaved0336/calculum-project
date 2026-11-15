<template>
<CalculumModal :size="'sm'" :showClose="true" :title="'Select content to add:'" :capitalizeTitle="false" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row w-100">
      <div class="col-12">
        <div class="mb-4" v-for="content in contentTypesSorted" :key="content.id">
          <div class="d-flex flex-column component-selector-options"><span class="text-2xl cursor-pointer truncate-title font-bold">{{ content.label }}</span>
            <ul class="d-flex flex-column component-selector-options-child">
              <li v-for="option in content.children" :key="option.type"><span class="text-lg cursor-pointer truncate-title color-hover" @click="sendAction(option)">{{ option.title }}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { CalculumLoading } from '@ada/design-system'
import { CatalogType, ContentTypes } from "../types";
export default defineComponent({
    name: 'CatalogContentSelector',
    components: { CalculumModal, CalculumLoading },
    props: {
        show: { type: Boolean, default: false },
        sectionId: { type: String, default: '' },
        contentTypes: { type: Array<CatalogType>, default: [] },
    },
    emits: ['close', 'add-content'],
    setup(props, { emit }) {
        const showOptions = computed(() => props.show)
        const sendAction = (option: ContentTypes) => {
            emit('add-content', option.type)
        }
        const contentTypesSorted = computed(() => {
            return props.contentTypes.map(item => ({
                ...item,
                children: [...item.children].sort((a, b) => a.title.localeCompare(b.title))
            }))
        })

        return {
            showOptions, sendAction,contentTypesSorted
        }
    }
});
</script>
<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";

.component-selector-container {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.2);
    z-index: 98;
}


.component-selector {
    position: absolute;
    top: 0;
    left: auto;
    background-color: white;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 20%;
    z-index: 99;
    height: 100vh;
    box-shadow: 0px 0px 10px 0px rgba(34, 60, 80, 0.2);

    a {
        color: #000;
        font-size: 0.75rem !important;
        line-height: 1rem;
        font-weight: 400;
    }
}


.component-selector-title {
    padding: 12px 12px;
    border-bottom: 1px solid #d1d1d1;
}

.component-selector-options {
    padding: 0px 12px;
    gap: 8px;
}

.component-selector-options-child {
    padding: 0px 12px;
    // gap: 8px;
}
.color-hover:hover{
    color: $color-primary-600;
}
</style>