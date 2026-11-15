# Unhandled Promise Rejections Handler Improvement

## Context
PR #11124 - The ADA Build Service identified areas for improvement in the unhandled promise rejection handling in `main.ts`.

## Issues Identified in Review

1. **Logging/Monitoring**: Suppressed events are not sent to any monitoring service
2. **Logging Library**: Uses `if (DEBUG)` instead of a logging system with levels
3. **Type Checking**: Type checking is basic
4. **Reporting Mechanism**: Events are not reported to Sentry

## Changes Checklist

- [x] Add Sentry breadcrumb for suppressed rejections (observability)
- [x] Add Sentry capture for non-Error rejections as warning
- [x] Maintain DEBUG logging for local development
- [x] Document the types of rejections handled

## Implementation

### Modified File
- `src/main.ts`

### Changes Made
1. Added `Sentry.addBreadcrumb()` when a known rejection is suppressed
2. Added `Sentry.captureMessage()` with 'warning' level for non-Error rejections
3. Maintained conditional logging with DEBUG for development

### Notes
- Sentry breadcrumbs do not generate alerts but are recorded for context in future errors
- captureMessage with 'warning' level allows monitoring without flooding critical error alerts
