import App from "./App.vue";

import { createApp } from "vue";
import { CalculumApp, SupportBotWidget, NegotiationAgentSetupWidget, SupportAgentSetupWidget, SetupWidget, onUnauthorized } from "calculum-ui";
import "calculum-ui/style.css";
// Must load after calculum-ui/style.css — overrides its :root accent/brand custom
// properties with AP's own purple/blue brand (same :root specificity, last one wins).
import "@/resources/assets/styles/utils/_calculum-ui-theme.scss";
// Vue-Toastification
import "vue-toastification/dist/index.css";
import "vue3-blocks-tree/dist/vue3-blocks-tree.css";
import "vue3-tel-input/dist/vue3-tel-input.css";
import "@ada/design-system/styles/tokens.css";
import { messages, defaultLocale } from "@ada/design-system/locales/index";
import VueBlocksTree from "vue3-blocks-tree";
// Services
// Translations
import i18n from "@/utils/translation";

import { devTool } from "@/services/devTools";
// Routing
import router from "@/services/router/index";
import HomeFooter from "@/modules/components/HomeFooter.vue";
// GraphQL Client - Apollo Composable
import VueShepherdPlugin from "vue-shepherd";
import Toast from "vue-toastification";
import * as Sentry from "@sentry/vue";
import MemoryMonitorPlugin from "@/plugins/memoryMonitorPlugin";
import pinia, { testSecureLS, debugPiniaStorage } from "@/services/pinia/index";
import { DefaultApolloClient } from "@vue/apollo-composable";
import { apolloClient } from "./services/graphql/apolloClient";
import VueTelInput from "vue3-tel-input";
import "bootstrap";
import $ from "jquery";
import { authWarningState } from "@/utils/authWarningState";
onUnauthorized(() => {
  void authWarningState.handleUnauthorized();
});

// List of known non-error rejection values that should be silently ignored
// - 'Timeout': reCAPTCHA timeout
// - 'Script error.': Generic external script errors
// - 'Network Error': Transient network issues
// - 'Object Not Found Matching Id': Browser extensions (LastPass, Dashlane, etc.)
const KNOWN_NON_ERROR_REJECTIONS = [
  "Timeout",
  "Script error.",
  "Network Error",
  "Object Not Found Matching Id",
];

function isKnownNonErrorRejection(reason: unknown): reason is string {
  return (
    typeof reason === "string" &&
    KNOWN_NON_ERROR_REJECTIONS.some((known) => reason.includes(known))
  );
}

// Log breadcrumb to Sentry for observability (won't trigger alerts but provides context)
function reportSuppressedRejection(reason: string) {
  if (import.meta.env.VITE_ALLOW_SENTRY === "true") {
    Sentry.addBreadcrumb({
      category: "suppressed-rejection",
      message: `Suppressed known non-error rejection: ${reason}`,
      level: "warning",
      data: {
        reason,
        matchedPattern: KNOWN_NON_ERROR_REJECTIONS.find((known) =>
          reason.includes(known),
        ),
      },
    });
  }
  if (import.meta.env.DEV)
    console.warn("Suppressed non-error promise rejection:", reason);
}

// Report to Sentry as warning for monitoring non-Error rejections
function reportNonErrorRejection(reason: unknown) {
  const reasonType = reason === null ? "null" : typeof reason;
  const reasonString =
    typeof reason === "object" ? JSON.stringify(reason) : String(reason);

  if (import.meta.env.VITE_ALLOW_SENTRY === "true") {
    Sentry.captureMessage(
      `Non-Error promise rejection (${reasonType}): ${reasonString}`,
      "warning",
    );
  }
  if (import.meta.env.DEV)
    console.warn("Non-Error promise rejection captured:", reason);
}

globalThis.addEventListener(
  "unhandledrejection",
  (event: PromiseRejectionEvent) => {
    const reason = event.reason;

    if (isKnownNonErrorRejection(reason)) {
      reportSuppressedRejection(reason);
      event.preventDefault();
      return;
    }

    if (reason && !(reason instanceof Error)) {
      reportNonErrorRejection(reason);
    }
  },
);

const defaultoptions = {
  nodeName: "yourNodeName",
  treeName: "blocks-tree",
};

const app = createApp(App);

// Registered globally so <CalculumLayout>'s footer slot (in design-system)
// can resolve it by name in AP, without every view importing it directly.
app.component("AppFooter", HomeFooter);
app.component("CalculumApp", CalculumApp);
app.component("SupportBotWidget", SupportBotWidget);
app.component("NegotiationAgentSetupWidget", NegotiationAgentSetupWidget);
app.component("SupportAgentSetupWidget", SupportAgentSetupWidget);
app.component("SetupWidget", SetupWidget);

// Configure Apollo Composable
app.provide(DefaultApolloClient, apolloClient);

(globalThis as any).$ = $;

// Add SecureLS test functions to global scope for debugging
if (import.meta.env.DEV) {
  (globalThis as any).testSecureLS = testSecureLS;
  (globalThis as any).debugPiniaStorage = debugPiniaStorage;
  console.log(
    "🔧 Debug functions available: testSecureLS(), debugPiniaStorage()",
  );
}

// Used for popover component

if (import.meta.env.VITE_ALLOW_SENTRY === "true") {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: process.env.RELEASE_VERSION,
    integrations: [
      Sentry.browserTracingIntegration({ router }), // 🚀 Routing SPA
    ],
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

app
  .use(VueTelInput)
  .use(devTool)
  .use(i18n)
  .use(pinia) // Pinia
  .use(router)
  .use(VueBlocksTree, defaultoptions)
  .use(VueShepherdPlugin)
  .use(Toast, {
    containerClassName: "vt-shifted",
    shareAppContext: app,
  })
  .use(MemoryMonitorPlugin, {
    enabled: true,
    intervalMs: 30000,
    autoStart: true,
  })
  .mount("#app")