# Overview List Loading Fix — Infinite Skeleton Bug

## Problem

When a user clicked the **List** tab in the Match Overview page while the initial
`data-match/info` API call was still in flight, the grid skeleton in `OverviewList.vue`
would display indefinitely and never transition to the grid.

## Root Cause Chain

Three independent issues stacked on top of each other:

### 1. Race condition — OverviewList mounted before its data was ready

`OverviewList` is used in two places:

- Directly as a tab inside `HomeOverview.vue`
- Embedded inside `OverviewCharts.vue` (shown once `isLoading = false`)

`OverviewCharts.vue` fires the `/api/data-match/info/{uuid}` REST call
(`matchDataAPIReadAll`) in its `setup()` body. Every subsequent GraphQL query in
`OverviewList` depends on the data returned by this call being committed server-side.
If `OverviewList` mounted before the info call completed, the GraphQL queries would
either return wrong data or stall the server.

### 2. KeepAlive kept a zombie OverviewCharts alive — dual Apollo conflict (primary bug)

`HomeOverview.vue` wrapped its `<component :is="currentTab">` in `<KeepAlive>`.
Vue 3's `KeepAlive` **deactivates** (not destroys) components when they leave the slot.
A deactivated component remains in memory with all its watchers still running.

The critical sequence when clicking **List** tab while the info call is in flight:

1. `currentTab` switches to `'OverviewList'` → `v-if` becomes `false` → KeepAlive
   **deactivates** OverviewCharts (keeps it in its internal cache, does not destroy it).
2. The info API call completes → `isLoading.value = false` inside the still-alive
   deactivated OverviewCharts.
3. Vue's reactivity evaluates the `v-else` on the embedded `<OverviewList>` in
   OverviewCharts → the embedded OverviewList **mounts** inside the deactivated
   (hidden) OverviewCharts.
4. The embedded OverviewList calls `fetchData()` → fires an Apollo GraphQL query
   with AbortController A.
5. Simultaneously, the direct-tab OverviewList (rendered by the HomeOverview gate)
   also calls `fetchData()` → fires the same Apollo GraphQL query with
   AbortController B.
6. **Apollo Client deduplicates identical queries** — only one network request is
   sent. Both components share a single in-flight Observable tied to signal A.
7. When the embedded OverviewList's AbortController A fires (e.g., triggered by its
   `itemSelectedInCharts` deep watch calling `apolloClientResetStore()`), the shared
   fetch is cancelled.
8. The direct-tab OverviewList receives `AbortError` → the `catch` block in
   `fetchData()` sees `error.name === 'AbortError'` and **returns early** without
   setting `loadList = false`.
9. No further `fetchData()` call is triggered for the direct-tab instance →
   `loadList` stays `true` forever → infinite skeleton.

**Why KeepAlive was providing no benefit:** `componentKey++` is called on every tab
switch (in `changeTab()` and `changeTabOverview()`). With an always-incrementing key,
KeepAlive never reactivates a cached component — every mount is a fresh instance.
KeepAlive was accumulating dead deactivated entries without ever reusing one.

### 3. `callTotalData()` could hang indefinitely (secondary bug)

Inside `fetchData()` in `OverviewList.vue`, after the GraphQL data arrived:

```ts
data.dataList = parsedData
await callTotalData()   // ← could hang forever
data.loadList = false   // ← never reached if callTotalData hangs
```

`callTotalData()` → `fetchTotal()` → `HomeAPI.getUniqueData()` — a bare `axios.post`
with no timeout and no AbortController signal. If the summary endpoint was slow or
temporarily unresponsive, the `await` would never resolve and `loadList` would stay
`true`.

## Changes Made

### `apps/ap/src/modules/home/overview/views/HomeOverview.vue`

**1. Removed `<KeepAlive>` wrapper** (root-cause fix)

```html
<!-- BEFORE -->
<KeepAlive>
  <component :is="currentTab" :key="componentKey" ... />
</KeepAlive>

<!-- AFTER -->
<component :is="currentTab" :key="componentKey" ... />
```

Without KeepAlive, OverviewCharts is **destroyed** when the user switches to the List
tab. Its embedded OverviewList is destroyed with it. No zombie instance can mount
later and conflict with the direct-tab OverviewList's Apollo query.

**2. Added a loading gate for the direct-tab OverviewList**

The direct-tab OverviewList is blocked from mounting until the info call completes:

```html
<component
  v-if="currentTab !== 'OverviewList' || !isMatchInfoLoading"
  :is="currentTab"
  ...
/>
<GridSkeleton v-if="currentTab === 'OverviewList' && isMatchInfoLoading" />
```

This shows a `GridSkeleton` while the info call is in flight and only mounts
`OverviewList` once `isMatchInfoLoading` is `false`.

### `apps/ap/src/stores/overview.ts`

**3. Added `isMatchInfoLoading` state to coordinate the gate**

```ts
const isMatchInfoLoading = ref(true)
const getIsMatchInfoLoading = computed(() => isMatchInfoLoading.value)
function setIsMatchInfoLoading(value: boolean) {
  isMatchInfoLoading.value = value
}
```

Added to `paths` exclusion in the `persist` config so this flag is never restored
from localStorage (it must always start fresh).

### `apps/ap/src/modules/home/overview/components/OverviewCharts.vue`

**4. Set and clear `isMatchInfoLoading` around the info API call**

`matchDataAPIReadAll()` now updates the shared store flag:

```ts
async function matchDataAPIReadAll(params) {
  try {
    isLoading.value = true
    overviewStore.setIsMatchInfoLoading(true)   // ← gate closes

    const result = await new Promise((resolve, reject) => {
      overviewStore.matchDataAPIReadAll({ ...params, callbackSuccess: resolve, callbackError: reject })
    })

    data.value = result
    isLoading.value = false
    overviewStore.setIsMatchInfoLoading(false)  // ← gate opens
  } catch (error) {
    isLoading.value = false
    overviewStore.setIsMatchInfoLoading(false)  // ← gate opens on error too
  }
}
```

### `apps/ap/src/modules/home/overview/components/OverviewList.vue`

**5. Fire-and-forget `callTotalData()` (secondary fix)**

```ts
// BEFORE
data.dataList = parsedData
await callTotalData()
data.loadList = false

// AFTER
data.dataList = parsedData
data.loadList = false
void callTotalData()
```

`loadList` becomes `false` as soon as GraphQL data is ready. The summary (footer
totals) loads asynchronously. `TotalsFooterColumn.vue` already handles the loading
state via its `loadingData` prop — footer cells show a skeleton until the data
arrives.

**6. Replaced `CalculumLoading` with `GridSkeleton`**

```html
<!-- BEFORE -->
<CalculumLoading v-if="loadList" block="block" />

<!-- AFTER -->
<GridSkeleton v-if="loadList" />
```

`GridSkeleton` renders a 12×10 grid of `Skeleton` rectangles that match the grid
layout, giving a more accurate visual preview of the incoming content.

## Key Concepts

### Apollo query deduplication

Apollo Client deduplicates concurrent requests for the **exact same query + variables**
into a single network fetch. Both subscribers share one `Observable`. If the first
subscriber's `AbortController` signal fires, the shared fetch is cancelled and **both**
subscribers receive `AbortError`. This means a component that the developer considers
"hidden" (KeepAlive-deactivated) can silently kill a query in an active component.

### KeepAlive deactivation vs destruction

| Scenario | Component state | Watchers | Async functions |
|---|---|---|---|
| `v-if = false` (no KeepAlive) | Destroyed | Stopped | Continue running |
| `v-if = false` (inside KeepAlive) | Deactivated | **Still running** | Continue running |
| `v-if = true` again (KeepAlive, same key) | Reactivated | Still running | — |

KeepAlive only saves the component from destruction. Watchers and reactive side
effects keep firing even while the component is invisible. This is the intended Vue
behaviour, but it can produce unexpected conflicts when two instances of the same
component access a shared global resource (like the Apollo Client).

### AbortError early-return pattern in `fetchData()`

```ts
catch (error: any) {
  if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return
  data.loadList = false
}
```

The early return exists so that when `fetchData()` #1 is legitimately aborted by
`fetchData()` #2 (new request starting), `loadList` is not set to `false` prematurely —
`fetchData()` #2 owns the loading state. The assumption is that **only** an intentional
new `fetchData()` call will abort the current one. The dual-OverviewList scenario
violated this assumption by aborting the request from an entirely different component
instance.
