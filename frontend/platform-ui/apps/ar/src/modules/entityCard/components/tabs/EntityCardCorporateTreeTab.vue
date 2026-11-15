<template>
  <CalculumLoadingAr v-if="loading" />
  <NoDataAvailable v-else-if="loadError" :title="t('arEntityCard.corporateTree.loadError')" />
  <div v-else-if="rootNode">
    <div v-if="tree?.truncated" class="alert alert-warning py-2 mb-2" role="alert">
      {{ t('arEntityCard.corporateTree.truncated') }}
    </div>
    <div v-if="tree?.partial" class="alert alert-warning py-2 mb-2" role="alert">
      {{ t('arEntityCard.corporateTree.cyclesDetected', { count: tree?.cycles.length ?? 0 }) }}
    </div>

    <div class="corporate-tree-canvas">
      <BlocksTree
        :data="rootNode"
        :props="blocksTreeProps"
        collapsable
        @node-click="onNodeClick"
      >
        <template #node="{ data }: { data: CorporateTreeUiNode }">
          <div
            class="card corporate-tree-node"
            :class="{ 'corporate-tree-node--current': data.isRequestedBuyer }"
          >
            <div class="card-body p-2">
              <div class="fw-semibold text-truncate" :title="data.companyName ?? notAvailable">
                {{ data.companyName ?? notAvailable }}
              </div>
              <div class="d-flex align-items-center flex-wrap gap-1 mt-1">
                <span class="badge text-bg-light">
                  {{ t(`arMatch.roles.${roleLabelKey(data.role)}`, data.role) }}
                </span>
                <span v-if="data.isRequestedBuyer" class="badge text-bg-primary">
                  {{ t('arEntityCard.corporateTree.currentBuyer') }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </BlocksTree>
    </div>
  </div>
  <NoDataAvailable v-else :title="t('arEntityCard.corporateTree.loadError')" />
</template>

<script setup lang="ts">
/**
 * UC-UI-08: the buyer's parent/subsidiary group structure as a navigable map, with the current
 * buyer highlighted (this component's own node slot, `data.isRequestedBuyer`). Opening another
 * node opens that node's own Entity Card (`onNodeClick`), landing back on this same tab.
 *
 * Follows the Opportunity tab's own pattern (UC-UI-07): `versionId`/`buyerId` as props, a load
 * guarded by `useLoadToken` against overlapping requests, loading/error states via the shared
 * `CalculumLoadingAr`/`NoDataAvailable` components.
 *
 * Rendering: `vue3-blocks-tree`, already a monorepo dependency (apps/ap's own Entity Card
 * corporate-tree screen, `TreeCards.vue`) rather than a new one - a small (no runtime
 * dependencies beyond Vue itself), already-approved hierarchy renderer that takes a single nested
 * `children` tree and a scoped `#node` slot, which is exactly this tab's shape. Imported locally
 * (not registered as a global plugin the way apps/ap's `main.ts` does) so this tab owns its own
 * dependency and a unit test can mount it without bootstrapping the whole app.
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalculumLoadingAr, NoDataAvailable } from '@ada/design-system'
import BlocksTree from 'vue3-blocks-tree'
import 'vue3-blocks-tree/dist/vue3-blocks-tree.css'
import { fetchCorporateTree, type CorporateTreeResponse } from '@/api'
import { useLoadToken } from '@/composables/useLoadToken'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { buildCorporateTree, type CorporateTreeUiNode } from '@/modules/match/utils/corporateTree'
import { roleLabelKey } from '@/modules/match/utils/partyRole'
import { openEntityCard } from '../../EntityCardRouting'

const props = defineProps<{ versionId: number; buyerId: number }>()
const { t } = useI18n({ useScope: 'global' })

const loading = ref(true)
const loadError = ref(false)
const tree = ref<CorporateTreeResponse | null>(null)

const notAvailable = computed(() => t('arMatch.progress.notAvailable'))

/** vue3-blocks-tree's field-name config: our DTO already spells `children` the way the library
 * expects, so only the label/key fields need naming. */
const blocksTreeProps = { label: 'companyName', expand: 'expand', children: 'children', key: 'id' }

const rootNode = computed(() => (tree.value ? buildCorporateTree(tree.value) : null))

/** node-click fires only for a click on the node's own label content (the `#node` slot), never
 * for the separate expand/collapse toggle vue3-blocks-tree renders alongside it - so this never
 * fights with expanding a branch. */
function onNodeClick(_event: Event, data: CorporateTreeUiNode) {
  if (data.isRequestedBuyer) {
    // Already on this node's own card; nothing to open.
    return
  }
  openEntityCard(props.versionId, data.id, 'corporate-tree')
}

const { start, isStale } = useLoadToken()
const currenciesStore = useArCurrenciesStore()

async function load() {
  const token = start()
  loading.value = true
  loadError.value = false
  tree.value = null

  try {
    const result = await fetchCorporateTree(props.versionId, props.buyerId, currenciesStore.currency)
    if (isStale(token)) {
      return
    }
    tree.value = result
  } catch {
    if (isStale(token)) {
      return
    }
    loadError.value = true
  } finally {
    if (!isStale(token)) {
      loading.value = false
    }
  }
}

watch(() => [props.versionId, props.buyerId], load, { immediate: true })
</script>

<style scoped>
.corporate-tree-canvas {
  overflow-x: auto;
  padding-block: 0.5rem;
}

.corporate-tree-node {
  min-width: 160px;
  max-width: 220px;
  cursor: pointer;
}

.corporate-tree-node--current {
  border-color: var(--bs-primary, #0d6efd);
  border-width: 2px;
}
</style>
