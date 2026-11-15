import posthog from "posthog-js";

export const initPostHog = () => {
  posthog.init(import.meta.env.VITE_POSTHOG_PROJECT_ID, {
    api_host: import.meta.env.VITE_POSTHOG_API_HOST,
    defaults: "2025-05-24",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_persistence: false,
  });
  return posthog;
};
export const usePostHog = () => {
  return initPostHog();
};
