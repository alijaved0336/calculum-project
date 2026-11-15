# IaNegotiation Integration Guide

`IaNegotiation.vue` is the mount point for the external IA assistant widget inside the Entity Card modal. This document explains the props it receives and the lifecycle hooks you should implement to load, pause, resume, and unload the assistant correctly.

## Where it lives

- Component: `apps/ap/src/modules/home/entityCard/components/IaNegotiation.vue`
- Rendered by: `ActivityPanelWrapper.vue`, as one of two tabs ("Activity" / "Assistant") inside the Entity Card side panel.
- Mount target: the widget should be mounted into `<div id="ia-negotiation-container">` (the component's only template element).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `entityId` | `string \| null` | `null` | The id (`companyId`) of the currently selected supplier/parent entity. |
| `entityName` | `string \| null` | `null` | Display name of the entity. |
| `entityLevel` | `'supplier' \| 'parent' \| 'potential-supplier' \| 'potential-parent' \| null` | `null` | Type of entity currently loaded. |
| `spendfileVersion` | `string \| null` | `null` | Active spend file version, for scoping data queries. |
| `tenantId` | `string \| null` | `null` | Tenant id, for scoping the assistant session. |

All props default to `null` rather than an empty string, so your integration code can distinguish "no value provided yet" (`null`) from "an empty value was explicitly passed" (`''`).

These props can change while the component is alive (e.g. the user switches to a different supplier without closing the modal). If your widget needs to react to that, watch the prop directly (e.g. `watch(() => props.entityId, ...)`) instead of relying on the lifecycle hooks below, which are about mount/visibility, not data changes.

## Lifecycle hooks

There are three integration points, implemented as plain functions in `setup()`. Replace the `// TODO` comment and `console.log` inside each with your actual integration code.

### 1. `foo()` — load / unload the assistant

Call your **initialization** logic when the component is first created, and your **teardown** logic (kill the widget, close sockets, clear timers) inside `foo()`.

`foo()` runs **exactly once** per component instance, in any of these cases:

- The whole Entity Card modal is closed (regardless of whether the Assistant tab was visible or hidden at the time).
- The user switches to a different entity/supplier while the modal stays open (this forces the main tab content to remount, and `IaNegotiation` gets torn down and recreated with the new entity).
- The Activity side panel itself is destroyed for a reason other than the two above.

It will **not** run when the user merely switches between the "Activity" and "Assistant" tabs, or hides/shows the side panel — see the pause/resume hooks below for that.

```ts
function foo() {
  // TODO: unload/kill the assistant widget here
}
```

A guard (`hasExited`) already ensures `foo()` cannot fire twice for the same instance, even though the underlying store signal that triggers it can be dispatched more than once during a single close action.

### 2. `pauseAssistant()` / `resumeAssistant()` — visibility changes

The "Activity" and "Assistant" tabs are wrapped in a Vue `<KeepAlive>` (in `ActivityPanelWrapper.vue`), so switching tabs does **not** destroy `IaNegotiation` — it deactivates it, preserving its state (DOM, in-memory data, open connections, etc.).

- `pauseAssistant()` runs when the user switches **away** from the Assistant tab.
- `resumeAssistant()` runs when the user switches **back** to the Assistant tab (this also runs once right after the component is first created).

Use these to pause/resume anything expensive while the widget isn't visible (e.g. stop polling, mute audio/video, pause a live connection) without fully unloading the assistant.

```ts
function pauseAssistant() {
  // TODO: pause the assistant while its tab is hidden
}

function resumeAssistant() {
  // TODO: resume the assistant when its tab becomes visible again
}
```

## Why this works this way (for context, not required reading)

This component sits behind two structural fixes that make the hooks above fire reliably:

1. **`<KeepAlive>` in `ActivityPanelWrapper.vue`** — without it, switching tabs would destroy and recreate `IaNegotiation` every time, calling `foo()` (exit) on every tab switch instead of `pauseAssistant()`/`resumeAssistant()`.
2. **`v-show` (not `v-if`) on `<ActivityPanelWrapper>` in `EntityCardOverview.vue`** — without it, closing the side panel would destroy `IaNegotiation` outright. If that happened while the panel was later reopened and closed again before the modal itself closed, `foo()` could end up never firing at modal-close time (nothing left alive to notify).

The actual "the modal is closing, tell the assistant to exit" signal is a plain, synchronous callback registry on the entity card store (`onAssistantExit` / `triggerAssistantExit` in `src/stores/entityCard.ts`), **not** a reactive `ref` + `watch`. This is intentional: a reactive watcher would race against the same Vue render cycle that unmounts the component, and could lose that race. A direct callback call is always synchronous and can't be pre-empted by an unrelated re-render.

If you ever need to trigger the exit signal from a new code path, call `entityCardStore.triggerAssistantExit()` — every currently-mounted `IaNegotiation` instance will have its exit callback invoked immediately.
