import { defineStore } from "pinia";
import { secureStorage } from "@/services/pinia/index";

/** Returns true when the given ISO date string (or timestamp) is more than one calendar month in the past */
function userIsOlderThanOneMonth(dateOrTimestamp: string | number): boolean {
  const date = new Date(dateOrTimestamp);
  const now = new Date();
  const oneMonthAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    now.getDate(),
  );
  return date < oneMonthAgo;
}

/**
 * Returns true when dateStr represents a real interaction in the current calendar month.
 * Epoch ("1970-01-01T00:00:00+00:00") and empty string are backend sentinels for
 * "never interacted" and must not be treated as a disqualifying date.
 */
function isCurrentMonth(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (d.getTime() === 0) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

export const useFeedbackSurveyStore = defineStore(
  "feedbackSurvey",
  () => {
    /**
     * Check whether a user is eligible to see the feedback modal.
     *
     * Conditions (all must be true):
     * 1. Account age > 1 calendar month:
     *    - Uses `createdAt` from the session if provided.
     *    - Falls back to `firstSeenTimestamp` stored in this record.
     * 2. No interaction recorded for the current calendar month:
     *    - Server-side `lastFeedbackSurveyAt` is the authoritative source.
     *    - Falls back to the locally stored `lastInteractionMonth` (covers
     *      in-session interactions before the recording endpoint is available).
     */
    function isEligible(
      createdAt?: string | null,
      lastFeedbackSurveyAt?: string | null,
    ): boolean {
      
      // --- Condition 1: account age ---
      // Treat epoch ("1970-01-01T00:00:00+00:00") as a null sentinel, same as missing value.
      const validCreatedAt = createdAt        
      const ageSource: string | number =
        validCreatedAt ?? "1970-01-01T00:00:00+00:00"

      if (!userIsOlderThanOneMonth(ageSource)) {
        return false;
      }

      // --- Condition 2: monthly frequency (server state takes precedence) ---
      if (lastFeedbackSurveyAt && isCurrentMonth(lastFeedbackSurveyAt)) {
        return false;
      }

      return true;
    }

    
    return {      
      isEligible    
    };
  },
  {
    persist: {
      storage: secureStorage,
      key: "ada-feedbackSurvey"      
    },
  },
);
