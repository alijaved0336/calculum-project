# Reset Feedback Survey (Admin Action) — Design

**Date:** 2026-07-21
**Branches:** `feature/reset-feedback-survey` (Front-End and Back-End)

## Problem

The monthly feedback survey modal (story 14936) shows to a user based on two columns
on the `user` table: `last_feedback_survey_at` and `last_feedback_survey_response`
(`'accept'` / `'decline'`). Once a user answers or declines, there is no way for an
admin to make the modal appear again. We want an admin action that resets a user's
feedback state so the survey becomes eligible again.

## Solution

Reset = set both `lastFeedbackSurveyAt` and `lastFeedbackSurveyResponse` to `null`.
The frontend eligibility check (`stores/feedbackSurvey.ts`) treats the server
`lastFeedbackSurveyAt` as authoritative, so a null value makes the user eligible again.

### Back-End

New endpoint in `src/Controller/AdminUserB2CController.php`, mirroring
`forcePasswordReset`:

- `POST /api/admin/user/{userUuid}/reset-feedback-survey`
- Loads the user with `findUserOrFail`; 404 if not found.
- Sets `lastFeedbackSurveyAt = null` and `lastFeedbackSurveyResponse = null`, flushes.
- Returns `JsonResponse` with `{ uuid, lastFeedbackSurveyAt: null, lastFeedbackSurveyResponse: null }`.
- Security: inherited from the class-level guard (`ROLE_ADMIN` or `ROLE_SALES`).
  No new security code.

### Front-End

In the admin module (`apps/ap/src/modules/adminBackend`):

- `composables/useUserDrawer.ts`: new wrapper `resetFeedbackSurvey(userUuid)` →
  `POST /api/admin/user/{uuid}/reset-feedback-survey` (mirrors `forcePasswordReset`).
- `components/drawer/DrawerTabProfile.vue`: new "Feedback survey" section that shows
  the current state — last response date and answer (`accept`/`decline`), or
  "Never answered" — plus a **Reset** button with a confirmation dialog and loading
  state (same pattern as `DrawerTabDangerZone.vue`).
- On success, update the drawer's local user object so the section reflects the reset
  without reloading.
- Errors surface through the drawer's existing notification pattern.

## Known limitation (documented, not solved)

The user's browser persists a local fallback (`lastInteractionMonth` in
`secureStorage`, key `ada-feedbackSurvey`). If the user interacted this calendar
month in that browser, the modal stays suppressed there until next month even after
a server reset. A fresh browser/session shows the modal immediately. The confirmation
dialog text mentions this so admins are aware.

## Testing

- Back-End: controller test asserting the endpoint nulls both fields and returns 200,
  following the existing test pattern for `AdminUserB2CController` if one exists.
- Front-End: rely on existing patterns; manual verification of the drawer section.
