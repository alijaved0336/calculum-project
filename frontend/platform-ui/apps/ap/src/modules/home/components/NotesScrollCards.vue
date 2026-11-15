<template>
<div class="col-12 d-flex flex-column gap-2"><span class="text-xs font-medium text-gray-700">{{  noteData.entityNotification.name }}</span>
  <div class="card note-card shadow-none">
    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'"><span class="text-base font-semibold text-gray-600 shorter-name" :title="noteData.entityName">{{ noteData.entityName }}</span></Tooltip>
    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'"><span class="text-sm font-normal text-gray-500 shorter-name" :title="noteData.emailCreatedBy">{{  noteData.emailCreatedBy }}</span></Tooltip>
    <div class="note-message mt-2">
      <div class="bubble-inline note-content" :class="{ 'bubble-inline--html': contentHasHighlightSpans && !contentIsArray }"><span v-if="contentHasHighlightSpans && !contentIsArray" v-html="sanitizedContentHtml"></span>
        <template v-else>
          <template v-for="(seg, i) in contentSegments" :key="i"><span v-if="seg.type === 'text'">{{ seg.value }}</span><span class="mention-chip" v-else>{{ seg.value }}</span></template>
        </template>
      </div>
    </div><span class="text-xxs font-normal text-gray-400 text-capitalize">{{ formatData.convertDateToPlanformat(noteData.updated) }} ° {{  noteData.createdBy.firstName }} {{  noteData.createdBy.lastName }}</span>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent, reactive, toRefs, computed } from 'vue'
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { noteInterface  } from '@/types/homeView';
import type { PropType } from 'vue';
import * as formatData from "@/utils/FormatData";
import {
  isDisplayContentArray,
  contentToNormalizedSegments,
  contentHasHighlightSpans as contentHasHighlightSpansCheck,
  sanitizeMentionContent,
} from '@/utils/ContentEditableUtils';

export default defineComponent({
name: 'NotesScrollCards',
components: { Tooltip },
props: {
    noteData: { type: Object as PropType<noteInterface>, required: true },
},
setup( props ) {

    const commentContent = computed(() => props.noteData.commentContent ?? props.noteData.message ?? '');

    const contentIsArray = computed(() => isDisplayContentArray(commentContent.value));

    const contentSegments = computed(() => contentToNormalizedSegments(commentContent.value));

    const contentHasHighlightSpans = computed(() =>
      typeof commentContent.value === 'string' && contentHasHighlightSpansCheck(commentContent.value)
    );

    const sanitizedContentHtml = computed(() =>
      typeof commentContent.value === 'string' ? sanitizeMentionContent(commentContent.value) : ''
    );

    return {
        commentContent,
        contentIsArray,
        contentHasHighlightSpans,
        sanitizedContentHtml,
        contentSegments,
        ...toRefs(reactive({})),
        formatData,
    }
}
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";

.plan-summary-item-card-height {
    min-height: 120px;
    max-height: 120px;
}

.percentage-value {
    align-content: center;
}

.note-card {
    min-height: 84px;
}

.note-message {
    min-height: 42px;
    max-height: 42px;

    .bubble-inline.note-content {
        font-size: 13px;
        color: $color-gray-800;
        line-height: 1.5;
        word-break: break-word;

        .mention-chip,
        :deep(.highlight-mention) {
            color: $color-violet-700;
            font-weight: 600;
            background-color: $color-violet-100;
            padding: 2px 6px;
            border-radius: 999px;
        }
    }
}

.shorter-name {
    display: inline-block;
    width: 80%;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
}
</style>