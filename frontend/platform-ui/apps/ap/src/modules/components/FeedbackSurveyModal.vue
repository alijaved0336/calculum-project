<template>
  <div v-if="isVisible" class="feedback-survey-widget" />
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useFeedbackSurveyStore } from "@/stores/feedbackSurvey";
import useUser from "@/services/user/composables/useUser";
import { patchFeedbackSurveyResponse } from "@/services/user/api";

declare global {
  interface Window {
    VIDEOASK_EMBED_CONFIG?: Record<string, unknown>;
  }
}

const VIDEOASK_SCRIPT_ID = "videoask-embed-script";
const VIDEOASK_SCRIPT_SRC = "https://www.videoask.com/embed/embed.js";
const VIDEOASK_CONFIG = {
  kind: "widget",
  url: "https://www.videoask.com/fcpjgc8ki",
  options: {
    widgetType: "VideoThumbnailSmall",
    text: "Take a Quick Survey",
    backgroundColor: "#001037",
    position: "bottom-right",
    dismissible: true,
    videoPosition: "center center",
  },
};

const TESTING_MODE = false;
const SESSION_DELAY_MS = TESTING_MODE ? 2000 : 3 * 60 * 1000
const WIDGET_AUTO_CLOSE_DELAY_MS = 1000;

// VideoAsk sends no postMessage event when the floating button is dismissed
// (confirmed empirically); the button is simply removed from the DOM. Its
// exact class carries a build-generated hash suffix (e.g.
// "videoask-embed__button--SgLKO"), so match on the stable prefix.
const VIDEOASK_WIDGET_BUTTON_CLASS = "videoask-embed__button";

function isVideoAskWidgetButton(node: Node): boolean {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).className.includes(VIDEOASK_WIDGET_BUTTON_CLASS)
  );
}

// Confirmed empirically: VideoAsk posts one message with this exact type when
// the user finishes the survey (after the last "videoask_question_submitted").
const VIDEOASK_SUBMITTED_TYPE = "videoask_submitted";

function isVideoAskSubmittedMessage(event: MessageEvent): boolean {
  return (
    event.origin.includes("videoask") &&
    event.data?.type === VIDEOASK_SUBMITTED_TYPE
  );
}

export default defineComponent({
  name: "FeedbackSurveyModal",
  setup() {
    const isVisible = ref(false);
    const feedbackStore = useFeedbackSurveyStore();
    const { user, userIri } = useUser();

    let timer: ReturnType<typeof setTimeout> | null = null;
    let widgetDismissObserver: MutationObserver | null = null;

    function injectVideoAskWidget(): void {
      if (document.getElementById(VIDEOASK_SCRIPT_ID)) return;

      window.VIDEOASK_EMBED_CONFIG = VIDEOASK_CONFIG;

      const script = document.createElement("script");
      script.id = VIDEOASK_SCRIPT_ID;
      script.src = VIDEOASK_SCRIPT_SRC;
      document.body.appendChild(script);

      widgetDismissObserver = new MutationObserver(handleBodyMutations);
      widgetDismissObserver.observe(document.body, { childList: true });

      window.addEventListener("message", handleVideoAskMessage);
    }

    async function recordWidgetShown(
      response: "accept" | "decline"
    ): Promise<void> {
      if (!userIri.value) return;

      const now = new Date().toISOString();
      // "accept" is the only backend-recognized response value; the widget has
      // no decline action, so it's reused here to mean "widget was shown".
      await patchFeedbackSurveyResponse(userIri.value, response);
      if (user.value) {
        user.value = {
          ...user.value,
          lastFeedbackSurveyAt: now,
          lastFeedbackSurveyResponse: response,
        };
      }
    }
 
  function closeVideoAskWidget(): void {
    // Disconnect first so this programmatic removal isn't misreported as a
    // user-initiated dismissal by handleBodyMutations (which would otherwise
    // record a "decline" for a survey the user actually completed).
    widgetDismissObserver?.disconnect();
    document.querySelector(`[class*="${VIDEOASK_WIDGET_BUTTON_CLASS}"]`)?.remove();
  }

  function handleVideoAskMessage(event: MessageEvent): void {
    if (!isVideoAskSubmittedMessage(event)) return;
    recordWidgetShown('accept');
    if (import.meta.env.DEV) console.warn("[FeedbackSurveyModal] User completed the VideoAsk survey");
    setTimeout(closeVideoAskWidget, WIDGET_AUTO_CLOSE_DELAY_MS);
  }


    function handleBodyMutations(mutations: MutationRecord[]): void {
      for (const mutation of mutations) {
        mutation.removedNodes.forEach((node) => {
          if (isVideoAskWidgetButton(node)) {
            recordWidgetShown('decline');
            if (import.meta.env.DEV) console.warn(
              "[FeedbackSurveyModal] VideoAsk widget was hidden/dismissed by the user",
            );
          }
        });
      }
    }

    function checkEligibility(): void {
      if (!user.value || !userIri.value) return;      
      if (user.value.activeCompany?.uiGroup) return;

      if (!TESTING_MODE) {
        const createdAt = user.value.created ?? null;
        const lastFeedbackSurveyAt = user.value.lastFeedbackSurveyAt ?? null;
        if (
          !feedbackStore.isEligible(
            createdAt,
            lastFeedbackSurveyAt,
          )
        )
          return;
      }

      isVisible.value = true;
    }

    watch(isVisible, (visible) => {
      if (!visible) return;
      injectVideoAskWidget();
    });

    onMounted(() => {      
      timer = setTimeout(checkEligibility, SESSION_DELAY_MS);
    });

    onBeforeUnmount(() => {
      if (timer !== null) clearTimeout(timer);
      widgetDismissObserver?.disconnect();
      window.removeEventListener("message", handleVideoAskMessage);
    });

    return { isVisible };
  },
});
</script>
