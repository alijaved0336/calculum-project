<template>
<CalculumModal
  v-if="modal.isOpen"
  :width="`${modal.widthPercent}%`"
  @close="modal.close()"
>
  <CustomerCardView
    v-if="modal.versionId !== null && modal.buyerId !== null"
    :version-id="String(modal.versionId)"
    :buyer-id="String(modal.buyerId)"
    :initial-buyer="modal.initialBuyer ?? undefined"
  />
</CalculumModal>
</template>

<script setup lang="ts">
/**
 * Mounted once at the app root (`App.vue`), alongside `<RouterView>` rather than inside it, so a
 * screen can open the Customer Card without leaving its own route - the same relationship AP's
 * `ModalEntity`/`HomeBackend.vue` have, and its own `EntityCardOverview` is the direct precedent
 * for reusing the SAME view component both as a route and as this modal's content, rather than
 * building a second copy of its layout/fields/tabs.
 *
 * The overlay/close-button/stacking shell itself is `CalculumModal` (`@/components/`), not
 * hand-rolled here - see that component's own doc for why it exists and how it keeps a modal
 * opened from inside this one (e.g. a future "show details" dialog on one of this card's tabs)
 * rendering on top of it rather than fighting it for z-index. `width` rides `modal.widthPercent`
 * (`useCustomerCardModalStore`'s own state) rather than one of `CalculumModal`'s own `size`
 * presets: it has exactly one instance, mounted once here with no per-caller template slot to pass
 * a prop through - a caller elsewhere in the app sets it via `open(versionId, buyerId,
 * { widthPercent })` instead, alongside the ids it already passes. `initialBuyer` rides the same
 * store field, forwarded straight through as a prop - see `CustomerCardView`'s own doc for what
 * it's for.
 *
 * `CustomerCardView` itself is untouched: its own "Back to Companies" button still calls
 * `MatchRouting.backOrOpenMatch`, exactly as it does when reached by direct navigation - a rare
 * path here (nothing routes here today; every current caller stays on its own screen and closes
 * this modal instead), left as-is rather than special-cased, matching `EntityCardOverview`'s own
 * unclosed edge for the same situation.
 *
 * Loaded via `defineAsyncComponent`, not a static import: `CustomerCardView` pulls in
 * `MatchRouting.ts`, which imports `@/router` - and `@/router` itself pulls `CustomerCardView`
 * back in through `MatchRoutes.ts`. That cycle already existed and was harmless as long as
 * `@/router` was always the one and only entry point into it; mounted at the app root, this
 * component is evaluated before the router's own module does, and a second entry point into the
 * same cycle loses the initialization race ("Cannot access 'match' before initialization" from
 * `MatchRoutes.ts`, reading `MatchRouting`'s exports before that module finishes evaluating). A
 * dynamic import defers pulling in that whole chain until the modal actually opens, well after
 * the app and its router have both finished bootstrapping.
 */
import { defineAsyncComponent } from 'vue'
import CalculumModal from '@/components/CalculumModal.vue'
import { useCustomerCardModalStore } from '@/stores/customerCardModal'

const CustomerCardView = defineAsyncComponent(() => import('@/modules/match/views/CustomerCardView.vue'))

const modal = useCustomerCardModalStore()
</script>
