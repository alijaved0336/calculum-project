<template>
<CustomerCardTabSkeleton v-if="loading" :rows="skeletonRows" />

<NoDataAvailable
  v-else-if="notFound"
  :title="t('arCustomerCard.notFound')"
/>

<NoDataAvailable
  v-else-if="loadError"
  :title="t('arEntityCard.corporateTree.loadError')"
/>

<div v-else-if="rootNode" class="corporate-tree-canvas">
  <div v-if="tree?.truncated" class="alert alert-warning py-2 mb-2" role="alert">
    {{ t('arEntityCard.corporateTree.truncated') }}
  </div>
  <div v-if="tree?.partial" class="alert alert-warning py-2 mb-2" role="alert">
    {{ t('arEntityCard.corporateTree.cyclesDetected', { count: tree?.cycles.length ?? 0 }) }}
  </div>

  <div class="corporate-tree-headers d-flex justify-content-center">
    <span class="corporate-tree-header corporate-tree-header--company">{{ t('arOpportunity.list.tabs.parents') }}</span>
    <span v-if="showBuyersHeader" class="corporate-tree-header corporate-tree-header--company">{{ t('arOpportunity.list.tabs.buyers') }}</span>
    <span v-if="showSubsidiariesHeader" class="corporate-tree-header corporate-tree-header--sales-line">{{ t('arOpportunity.list.tabs.saleLines') }}</span>
  </div>

  <div class="corporate-tree-tree">
    <BlocksTree
      :data="rootNode"
      :props="blocksTreeProps"
      horizontal
      collapsable
      @node-click="onNodeClick"
      @node-expand="onNodeExpand"
    >
      <template #node="{ data }: { data: CorporateTreeDisplayNode }">
        <ContentBox
          v-if="data.kind === 'company'"
          class="corporate-tree-node"
          :class="{ 'corporate-tree-node--current': data.isRequestedBuyer }"
        >
          <ContentBoxBody>
            <div class="fw-semibold text-truncate" :title="data.companyName ?? notAvailable">
              {{ data.companyName ?? notAvailable }}
            </div>
            <div v-if="data.role === 'Parent' || data.role === 'Counterparty'" class="d-flex justify-content-center mt-2">
              <CorporateTreeNodeLogo :logo-url="data.logoUrl ?? null" :name="data.companyName" />
            </div>
            <div v-if="data.role === 'Parent' || data.role === 'Counterparty'" class="corporate-tree-node-metrics mt-2">
              <div>
                <span class="text-sm font-normal me-1 text-gray-500">{{ t('arCustomerCard.corporateTree.node.volume') }}:</span>
                <span class="text-sm font-semibold text-gray-700">{{ formatMoneyCompact(data.volume, currenciesStore.selectedCurrencySymbol) }}</span>
              </div>
              <div>
                <span class="text-sm font-normal me-1 text-gray-500">{{ t('arCustomerCard.corporateTree.node.cashFlow') }}:</span>
                <span class="text-sm font-semibold text-gray-700">{{ formatMoneyCompact(data.cashFlow, currenciesStore.selectedCurrencySymbol) }}</span>
              </div>
              <div>
                <span class="text-sm font-normal me-1 text-gray-500">{{ t('arCustomerCard.corporateTree.node.paymentTerms') }}:</span>
                <span class="text-sm font-semibold text-gray-700">{{ formatDays(data.paymentTerms) }}</span>
              </div>
              <div>
                <span class="text-sm font-normal me-1 text-gray-500">{{ t('arCustomerCard.corporateTree.node.country') }}:</span>
                <span class="text-sm font-semibold text-gray-700">{{ data.country ?? notAvailable }}</span>
              </div>
              <div>
                <span class="text-sm font-normal me-1 text-gray-500">{{ t('arCustomerCard.corporateTree.node.paymentTermsOpportunity') }}:</span>
                <span class="text-sm font-semibold text-gray-700">{{ formatDays(data.paymentTermsOpportunity) }}</span>
              </div>
            </div>
            <div v-if="data.role === 'Counterparty' && data.salesLinesTruncated" class="small text-warning mt-1">
              {{ t('arCustomerCard.corporateTree.salesLinesTruncated') }}
            </div>
          </ContentBoxBody>
        </ContentBox>

        <ContentBox v-else-if="data.kind === 'salesLine'" class="corporate-tree-node corporate-tree-node--sales-line">
          <ContentBoxBody class="d-flex gap-2">
            <div class="corporate-tree-sales-line-label">
              {{ t('arCustomerCard.corporateTree.node.spend', { n: data.spendNumber }) }}
            </div>
            <div class="corporate-tree-node-metrics flex-grow-1">
              <div>
                <span class="text-sm font-normal me-1 text-gray-500">{{ t('arCustomerCard.corporateTree.node.volume') }}:</span>
                <span class="text-sm font-semibold text-gray-700">{{ formatMoneyCompact(data.saleLine.volume, currenciesStore.selectedCurrencySymbol) }}</span>
              </div>
              <div>
                <span class="text-sm font-normal me-1 text-gray-500">{{ t('arCustomerCard.corporateTree.node.cashFlow') }}:</span>
                <span class="text-sm font-semibold text-gray-700">{{ formatMoneyCompact(data.saleLine.cashFlow, currenciesStore.selectedCurrencySymbol) }}</span>
              </div>
              <div>
                <span class="text-sm font-normal me-1 text-gray-500">{{ t('arCustomerCard.corporateTree.node.paymentTerms') }}:</span>
                <span class="text-sm font-semibold text-gray-700">{{ formatDays(data.saleLine.paymentTerms) }}</span>
              </div>
              <div class="text-truncate" :title="data.saleLine.supplierName ?? notAvailable">
                <span class="text-sm font-normal me-1 text-gray-500">{{ t('arCustomerCard.corporateTree.node.buyingEntity') }}:</span>
                <span class="text-sm font-semibold text-gray-700">{{ data.saleLine.supplierName ?? notAvailable }}</span>
              </div>
              <div>
                <span class="text-sm font-normal me-1 text-gray-500">{{ t('arCustomerCard.corporateTree.node.paymentTermsOpportunity') }}:</span>
                <span class="text-sm font-semibold text-gray-700">{{ formatDays(data.saleLine.paymentTermsOpportunity) }}</span>
              </div>
              <div class="text-truncate" :title="data.saleLine.commodity ?? notAvailable">
                <span class="text-sm font-normal me-1 text-gray-500">{{ t('arCustomerCard.corporateTree.node.commodity') }}:</span>
                <span class="text-sm font-semibold text-gray-700">{{ data.saleLine.commodity ?? notAvailable }}</span>
              </div>
            </div>
          </ContentBoxBody>
        </ContentBox>

        <ContentBox v-else-if="data.kind === 'salesLinesGroup'" class="corporate-tree-node corporate-tree-node--sales-lines-group">
          <ContentBoxBody class="d-flex align-items-center justify-content-center">
            <span class="fw-semibold text-center">{{ t('arCustomerCard.corporateTree.salesLinesGroup', { count: data.children.length }) }}</span>
          </ContentBoxBody>
        </ContentBox>

        <ContentBox v-else class="corporate-tree-node corporate-tree-node--no-parent">
          <NoDataAvailable :title="t('arCustomerCard.corporateTree.noParent')" />
        </ContentBox>
      </template>
    </BlocksTree>
  </div>
</div>

<NoDataAvailable v-else :title="t('arEntityCard.corporateTree.loadError')" />
</template>

<script setup lang="ts">
/**
 * CustomerCardView's Corporate Tree tab (UC-UI-06) - the buyer's parent/subsidiary group
 * structure as a navigable map, same `BlocksTree`/node card/truncated-cycles-detected warnings/
 * cycle-safe `buildCorporateTree` walk (shared from `@/modules/match/utils/corporateTree`) as
 * `entityCard`'s own UC-UI-08 `EntityCardCorporateTreeTab`, but NOT that component reused
 * directly: this tab's own `{ versionId, buyerId }` prop contract is a pair of route-id strings
 * (every `CustomerCardView` tab's shape), not `EntityCardCorporateTreeTab`'s numeric props;
 * clicking another node here re-targets THIS modal (`useCustomerCardModalStore`), not
 * `openEntityCard` - opening the `entityCard` module's own separate screen from inside the
 * Customer Card modal would leave the caller's own screen for an unrelated feature instead of
 * just showing that node's Customer Card; and `BlocksTree` renders `horizontal` here (AP's own
 * `entityCard/components/TreeCards.vue` reference for this screen's interaction), left-to-right
 * with each node's own expand/collapse toggle to its right, rather than `EntityCardCorporateTreeTab`'s
 * top-down vertical layout.
 *
 * Was a placeholder ("Corporate tree view is not available on this screen yet.") until UC-API-08's
 * corporate-tree endpoint - already live for `entityCard`'s own tab off the numeric
 * `/api/sale-file-versions/{versionId}/buyers/{buyerId}/corporate-tree` route - was confirmed to
 * serve this screen's buyers too, off its own uuid-scoped
 * `/api/buyers/{versionUuid}/{buyerId}/corporate-tree` route instead (`useBuyerCorporateTree`
 * reads `versionUuid` off `useContextStore()`, the same source `useBuyerCompanyDetails` already
 * reads for this modal's Company Details tab, rather than this component's own `versionId` prop -
 * that prop stays only for `onNodeClick`'s `modal.open`, unrelated to the fetch).
 *
 * Reuses `arEntityCard.corporateTree.*` (design-system's shared locale bundle) rather than a
 * duplicate `arCustomerCard.corporateTree.*` copy of the same generic, feature-agnostic strings
 * (a load error, two data-quality warnings) - both namespaces already live in that one shared
 * bundle regardless of which AR module reads them, so this is an in-app reuse, not the cross-app
 * coupling reusing one of AP's own namespaces would be. The three column headers reuse
 * `arOpportunity.list.tabs.*` ("Parents"/"Buyers"/"Sale Lines") for the same reason, rather than
 * this tab's own now-removed `arCustomerCard.corporateTree.columns.*` copy - `OverviewList.vue`'s
 * own level tabs already say exactly this. The current-buyer role/badge row
 * `EntityCardCorporateTreeTab` still renders off that same bundle's `currentBuyer` string was
 * dropped from this tab's own cards - the border highlight (`corporate-tree-node--current`) alone
 * marks it here.
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ContentBox, ContentBoxBody, NoDataAvailable } from '@ada/design-system'
import BlocksTree from 'vue3-blocks-tree'
import 'vue3-blocks-tree/dist/vue3-blocks-tree.css'
import type { BuyerCorporateTreeNodeDto, BuyerCorporateTreeSalesLineDto } from '@/api'
import type { CustomerCardIdentity } from '@/stores/customerCardModal'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { buildCorporateTree, type CorporateTreeUiNode } from '@/modules/match/utils/corporateTree'
import { formatMoneyCompact } from '@/utils/moneyFormatting'
import { parsePositiveRouteId } from '@/modules/match/utils/routeId'
import { useBuyerCorporateTree } from '../../composables/useBuyerCorporateTree'
import { useOpenCustomerCard } from '../../composables/useOpenCustomerCard'
import CustomerCardTabSkeleton, { type CustomerCardSkeletonCard } from './CustomerCardTabSkeleton.vue'
import CorporateTreeNodeLogo from './CorporateTreeNodeLogo.vue'

type BuyerCorporateTreeUiNode = CorporateTreeUiNode<BuyerCorporateTreeNodeDto>

/** A node actually drawn in this tab's tree: either one of the response's own companies, or - a
 * Counterparty's own `salesLines`, surfaced as that company's own children so each sales line can
 * be collapsed/expanded exactly like any other node (vue3-blocks-tree's expand toggle already
 * works off any node with a non-empty `children`, so no separate widget is needed for this).
 * `id` is negative (`-saleLineId`) - sale line ids and company ids come from different tables and
 * are not mutually exclusive, so a positive id could collide with a real company id in
 * `collapsedNodeIds`/`buyerAncestorIds` (both keyed by plain node id across the whole tree). */
interface CompanyDisplayNode extends BuyerCorporateTreeNodeDto {
  kind: 'company'
  expand: boolean
  children: CorporateTreeDisplayNode[]
}

interface SalesLineDisplayNode {
  kind: 'salesLine'
  id: number
  companyName: string | null
  expand: boolean
  children: never[]
  saleLine: BuyerCorporateTreeSalesLineDto
  /** This line's 1-based position in its own node's `salesLines` array - the reference mock's
   * "Sale N" label reads straight off array order, not off any field of the line itself. Taken
   * from its position in the (already `MAX_RENDERED_SALES_LINES`-capped) slice, which preserves
   * the original array's order, so it still numbers 1..50 in that order even when the response
   * itself carries more than 50 and `salesLinesTruncated` is true. */
  spendNumber: number
}

/** Wraps a company node's own `salesLines` when that same node ALSO has real company children
 * (subsidiaries from `edges`) - vue3-blocks-tree exposes exactly one `expand` toggle per node, so a
 * `CompanyDisplayNode` carrying both kinds of children can't show its subsidiaries while
 * independently collapsing its own sales lines under that single toggle. Nesting the sales lines
 * one level deeper, under this node's own separate toggle, is what makes `toDisplayNode`'s
 * `salesLinesStartExpanded` rule (see its own doc) apply per-Counterparty even when that
 * Counterparty also has subsidiaries - without this, "only the current counterparty's sales lines
 * are expanded by default" would only hold for a Counterparty with no subsidiaries of its own. Not
 * used when a node's sales lines are its ONLY children - there both kinds already share nothing to
 * conflict over, so they stay direct children exactly as before. */
interface SalesLinesGroupDisplayNode {
  kind: 'salesLinesGroup'
  id: number
  expand: boolean
  children: SalesLineDisplayNode[]
}

/** Stands in for the "Buyer Ultimate Parents" column when the response has no Parent-role node at
 * all (the requested buyer IS the tree's own root) - UC-API-08 simply omits a parent it has none
 * of, rather than sending an empty placeholder of its own, so without this the always-shown
 * header (see its own doc) would sit above nothing. A single synthetic node wrapping the real
 * root as its one child, rather than a separate element positioned alongside the tree: rendered
 * through the same `BlocksTree` data/connector layout as every real node, it lines up with the
 * Parents column exactly the way a real Parent-role node would, with no separate alignment math
 * to keep in sync with `.corporate-tree-header--company`'s own width. */
interface NoParentDisplayNode {
  kind: 'noParent'
  id: number
  expand: boolean
  children: CorporateTreeDisplayNode[]
}

/** `0`, not another negative number: `SalesLineDisplayNode` ids already claim the whole negative
 * range (`-saleLineId`, and `saleLineId` can be as low as 1), so any negative sentinel here risks
 * colliding with a real sales line's own id. Company ids and sale line ids are both database
 * primary keys, never `0`, so it is the one value guaranteed free across the whole tree - there is
 * only ever one of these per tree, so a single fixed sentinel is enough; `collapsedNodeIds`/
 * `buyerAncestorIds` key everything by plain node id across the whole tree. */
const NO_PARENT_NODE_ID = 0

/** Sentinel id space for `SalesLinesGroupDisplayNode` - the owning company's own id, offset well
 * past any real company id or sale line id (both plain database primary keys), so a group node
 * never collides with either across `collapsedNodeIds`/`buyerAncestorIds` (both keyed by plain node
 * id across the whole tree). Negative, matching `SalesLineDisplayNode`'s own convention of keeping
 * every non-real-company id out of the positive range real company ids occupy. */
const SALES_LINES_GROUP_ID_OFFSET = 1_000_000_000

type CorporateTreeDisplayNode = CompanyDisplayNode | SalesLineDisplayNode | SalesLinesGroupDisplayNode | NoParentDisplayNode

/** UC-API-08's own cap on `salesLines` is enforced server-side (`salesLinesTruncated` reports
 * whether more than this many exist) - `slice` here is a defensive mirror of that cap, the same
 * posture `buildCorporateTree`'s own `visited` set already takes against a response that violated
 * ITS OWN contract, rather than trusting the array itself to never exceed it. */
const MAX_RENDERED_SALES_LINES = 50

function toDisplayNode(node: BuyerCorporateTreeUiNode): CompanyDisplayNode {
  const companyChildren: CorporateTreeDisplayNode[] = node.children.map(toDisplayNode)
  const salesLineChildren: SalesLineDisplayNode[] = []
  if (node.role === 'Counterparty') {
    node.salesLines.slice(0, MAX_RENDERED_SALES_LINES).forEach((saleLine, index) => {
      salesLineChildren.push({
        kind: 'salesLine',
        id: -saleLine.saleLineId,
        companyName: saleLine.supplierName,
        expand: true,
        children: [],
        saleLine,
        spendNumber: index + 1,
      })
    })
  }

  // A Counterparty's own sales lines start expanded only when IT is the buyer this Customer Card
  // is actually open on - every other Counterparty in the tree (an ancestor Parent's
  // OTHER subsidiary, a sibling, a further descendant) starts with its own sales lines collapsed,
  // even though its own toggle still opens them on click. Without this, a Parent-role buyer with
  // several Counterparty children - or a Counterparty with further Counterparty descendants of its
  // own - would dump every one of their sales lines on screen at once instead of just the one the
  // user actually opened this card for.
  const salesLinesStartExpanded = node.isRequestedBuyer

  let children: CorporateTreeDisplayNode[]
  if (companyChildren.length > 0 && salesLineChildren.length > 0) {
    // This node has BOTH real subsidiaries and its own sales lines - see
    // `SalesLinesGroupDisplayNode`'s own doc for why the sales lines move under their own toggle
    // here instead of staying direct children like the simpler cases below.
    children = [...companyChildren, {
      kind: 'salesLinesGroup',
      id: -(SALES_LINES_GROUP_ID_OFFSET + node.id),
      expand: salesLinesStartExpanded,
      children: salesLineChildren,
    }]
  } else {
    children = [...companyChildren, ...salesLineChildren]
  }

  return {
    ...node,
    kind: 'company',
    // A node with real subsidiaries always starts expanded to show them - its own sales lines, if
    // any, are the `salesLinesGroup` case above and no longer share this toggle. A node whose sales
    // lines are its ONLY children (no subsidiaries) defers entirely to `salesLinesStartExpanded`; a
    // node with neither defaults to expanded too, matching every other childless node (irrelevant
    // either way - it has nothing to show or hide).
    expand: companyChildren.length > 0 || salesLineChildren.length === 0 || salesLinesStartExpanded,
    children,
  }
}

/** Ids of every node `toDisplayNode` itself started collapsed (see its own `expand` doc) - walked
 * back out of the built tree, rather than tracked during the build, so `collapsedNodeIds` (below)
 * can be reset to exactly this set on every fresh tree without `toDisplayNode` needing a second,
 * side-channel way to report it. */
function collectDefaultCollapsedIds(node: CorporateTreeDisplayNode, ids: Set<number> = new Set()): Set<number> {
  if ((node.kind === 'company' || node.kind === 'salesLinesGroup') && !node.expand) {
    ids.add(node.id)
  }
  for (const child of node.children) {
    collectDefaultCollapsedIds(child, ids)
  }
  return ids
}

const props = defineProps<{ versionId: string; buyerId: string }>()
const { t } = useI18n({ useScope: 'global' })
const currenciesStore = useArCurrenciesStore()

const { loading, notFound, loadError, tree } = useBuyerCorporateTree(() => props.buyerId)

const skeletonRows: CustomerCardSkeletonCard[][] = [[{ col: 'col-12', lines: 5, title: false }]]

const notAvailable = computed(() => t('arCustomerCard.notAvailable'))

/** Payment terms are always a whole number of days on this node/sales-line shape (`paymentTerms`/
 * `paymentTermsOpportunity`) - `Xd` past the raw number, per the reference mock, `notAvailable`
 * when the backend has none (an opportunity term not yet computed, for instance). */
function formatDays(value: number | null): string {
  return value === null ? notAvailable.value : `${value}d`
}

/** vue3-blocks-tree's field-name config: our DTO already spells `children` the way the library
 * expects, so only the label/key fields need naming. */
const blocksTreeProps = { label: 'companyName', expand: 'expand', children: 'children', key: 'id' }

const rootNode = computed<CorporateTreeDisplayNode | null>(() => {
  const built = tree.value ? buildCorporateTree(tree.value) : null
  if (!built) {
    return null
  }
  const companyRoot = toDisplayNode(built)
  if (companyRoot.role === 'Parent') {
    // The tree's own root already occupies the Parents column on its own merit - true whether
    // it's a separate ancestor above the buyer OR the requested buyer itself sitting at the top of
    // its own group (its `role` is "Parent" precisely because it has subsidiaries below it and
    // none above) - NOT `!companyRoot.isRequestedBuyer`, which this used to check: that flag says
    // nothing about whether a parent exists, only about which node the route asked for, and wrongly
    // triggered the placeholder below whenever the buyer itself happened to be the group's own
    // ultimate parent.
    return companyRoot
  }
  // The tree's own root has no Parent-role node above it in the response at all (its own role is
  // Self/Counterparty, not Parent). Wraps the real tree in a placeholder "no parent" node instead
  // of leaving the always-shown Parents column with nothing beneath it.
  return {
    kind: 'noParent',
    id: NO_PARENT_NODE_ID,
    expand: true,
    children: [companyRoot],
  }
})

/** "Parents" has no live gate of its own: its header always renders (`corporate-tree-headers` in
 * the template), empty column and all, when the requested buyer turns out to have none - the
 * alternative (hiding it) would read as "this buyer never has parents" rather than "this buyer
 * happens not to have one". "Sales Lines" is the opposite: see `showSubsidiariesHeader` below. */

/** Ids of every node currently collapsed - either its own toggle clicked shut (`onNodeExpand`
 * below) or `toDisplayNode`'s own default (a sales-lines-only node - see its own doc). Reset to
 * exactly that default set, not emptied, on every fresh `rootNode` (a new fetch or a malformed
 * response): emptying it here would desync it from what vue3-blocks-tree itself actually rendered
 * collapsed (each node's own `expanded` ref inits straight off its `data.expand`, independently of
 * this set), which is what `showSubsidiariesHeader` etc. below read this set FOR - a requested
 * buyer who is themselves a sales-lines-only Counterparty would otherwise show "Sales Lines" as
 * visible while the tree itself renders it collapsed underneath. */
const collapsedNodeIds = ref<Set<number>>(new Set())
watch(rootNode, (root) => {
  collapsedNodeIds.value = root ? collectDefaultCollapsedIds(root) : new Set()
}, { immediate: true })

function onNodeExpand(_event: Event, data: CorporateTreeDisplayNode, context: { isExpanded: () => boolean }) {
  const next = new Set(collapsedNodeIds.value)
  if (context.isExpanded()) {
    next.delete(data.id)
  } else {
    next.add(data.id)
  }
  collapsedNodeIds.value = next
}

/** Node ids on the path from the root down to (but excluding) the requested buyer - collapsing
 * any one of them removes the buyer's own card, and everything below it, from the rendered tree.
 * Empty when the buyer has no ancestors (it IS the root). */
const buyerAncestorIds = computed<number[]>(() => {
  const root = rootNode.value
  if (!root) {
    return []
  }
  const path: number[] = []
  function walk(node: CorporateTreeDisplayNode): boolean {
    if (node.kind === 'company' && node.isRequestedBuyer) {
      return true
    }
    path.push(node.id)
    for (const child of node.children) {
      if (walk(child)) {
        return true
      }
    }
    path.pop()
    return false
  }
  walk(root)
  return path
})

/** The buyer's own card is on screen right now - true whenever every ancestor between it and the
 * root is still expanded (vacuously true when it has no ancestors at all). */
const isBuyerVisible = computed(() => buyerAncestorIds.value.every((id) => !collapsedNodeIds.value.has(id)))

/** "Buyer Entities" tracks what's ACTUALLY on screen, not just what the response contains -
 * collapsing an ancestor above the buyer hides the buyer's own card, taking this header down
 * with it. */
const showBuyersHeader = computed(() => isBuyerVisible.value)

/** True as soon as ANY sales line ANYWHERE in the tree is actually visible on screen right now -
 * not tied to the requested buyer specifically the way `showBuyersHeader` is, since a Counterparty
 * carrying sales lines can appear anywhere in the tree (an ancestor's other subsidiary, a sibling,
 * the buyer itself...). A `SalesLineDisplayNode` has no `expand` of its own (always a leaf) - it
 * counts as visible exactly when every ancestor above it, all the way to the root, is expanded,
 * which `ancestorsVisible` already tracks by the time recursion reaches it: whether that line sits
 * directly under its own Counterparty (the common case) or one level deeper under a
 * `SalesLinesGroupDisplayNode` (a Counterparty that also has subsidiaries - see that type's own
 * doc), both toggles it passed through on the way down already folded into this same flag. */
function hasVisibleExpandedSalesLines(node: CorporateTreeDisplayNode, ancestorsVisible: boolean): boolean {
  if (node.kind === 'salesLine') {
    return ancestorsVisible
  }
  const isExpanded = !collapsedNodeIds.value.has(node.id)
  return node.children.some((child) => hasVisibleExpandedSalesLines(child, ancestorsVisible && isExpanded))
}

const showSubsidiariesHeader = computed(() => (rootNode.value ? hasVisibleExpandedSalesLines(rootNode.value, true) : false))

const { openCustomerCard } = useOpenCustomerCard()

/** Builds the `initialBuyer` seed `customerCardModal.open` needs to show that node's own header
 * (`CustomerCardHeader`) immediately, the same way `BuyersView.openBuyer` seeds it from a roster
 * row already on hand - `onNodeClick` has no such row, only this node's own `companyDetails`
 * (UC-API-08's embedded enrichment profile), so it maps that instead of leaving `initialBuyer`
 * unset and the header blank until something else happens to populate one.
 *
 * `CustomerCardIdentity` (`BuyerCardRow`) and `companyDetails` (`BuyerCompanyDetailsResponse`) are
 * two independently-shaped DTOs from different endpoints, not the same shape under two names - a
 * few fields have no honest source here (`forecastVolume`, `creditLimit`, both payment-terms
 * averages, `isPilot`) and are left at their "unknown" default rather than guessed at, and
 * `negotiationStatusCode` is dropped rather than coerced (`BuyerCardRow`'s is numeric,
 * `companyDetails`'s is a string code - not the same value under a type mismatch). None of these
 * are read by `CustomerCardHeader` today (only `name`/`originalName`/`role`/`country`/
 * `countryFlagUrl` are), but every field still has to be present to satisfy `BuyerCardRow`'s type. */
function toCustomerCardIdentity(data: CompanyDisplayNode): CustomerCardIdentity {
  const details = data.companyDetails
  return {
    id: data.id,
    role: data.role,
    resolution: data.resolution,
    lifecycle: details?.lifecycle ?? '',
    name: details?.companyName ?? data.companyName,
    originalName: details?.originalName ?? null,
    url: details?.url ?? null,
    volume: data.volume,
    forecastVolume: null,
    negotiationStatus: details?.negotiationStatus ?? null,
    negotiationStatusCode: null,
    parentId: details?.parentId ?? null,
    parentName: details?.parentName ?? null,
    saleLineCount: data.salesLines.length,
    salesLines: data.salesLines,
    // `details.countryName` (e.g. "Sweden"), not this node's own `country` (a 3-letter code like
    // "CZE") - `BuyerCardRow.country` is rendered as-is (`BuyerCard.vue`'s "Country: {value}"), so
    // a code there would read wrong next to every other roster-seeded card.
    country: details?.countryName ?? null,
    industry: details?.industryName ?? null,
    isSme: details?.isSme ?? null,
    smeSource: details?.smeSource ?? null,
    isPilot: false,
    creditLimit: null,
    creditRating: details?.creditRating ?? null,
    actualPaymentTermsAvg: null,
    contractualPaymentTermsWithCashDiscountsAvg: null,
    contractualPaymentTermsWithoutCashDiscountsAvg: null,
    countryFlagUrl: details?.countryFlagUrl ?? null,
    logoUrl: data.logoUrl ?? null,
  }
}

/** node-click fires only for a click on the node's own label content (the `#node` slot), never
 * for the separate expand/collapse toggle vue3-blocks-tree renders alongside it - so this never
 * fights with expanding a branch. */
function onNodeClick(_event: Event, data: CorporateTreeDisplayNode) {
  if (data.kind !== 'company' || data.isRequestedBuyer) {
    // A sales line has no Customer Card of its own to open; the requested buyer's own node is
    // already on this card.
    return
  }
  const versionId = parsePositiveRouteId(props.versionId)
  if (versionId === undefined) {
    return
  }
  // Re-targeting the modal to another node is opening that node's card - it counts as a visit too.
  openCustomerCard(versionId, data.id, { initialBuyer: toCustomerCardIdentity(data) })
}
</script>

<style scoped>
.corporate-tree-headers {
  gap: 20px;
  /* vue3-blocks-tree gives even the root node its own 20px left padding in horizontal mode (no
     root-specific override) - matched here so this row's first header starts at the same x
     position as the tree's own root card below it. */
  padding-left: 20px;
}

.corporate-tree-header {
  text-align: center;
  font-weight: 600;
  color: var(--color-text-2);
}

/* Each header's own width matches the card width of the column it sits above (`.corporate-tree-node`
   for Parents/Buyers, `.corporate-tree-node--sales-line` for Sales Lines) - `.corporate-tree-headers`'s
   own `gap`/`padding-left` already mirrors vue3-blocks-tree's own per-generation connector offset
   (see that class's own doc), so matching widths here is the only piece left to center each label
   over its actual column instead of over a generic, differently-sized placeholder. */
.corporate-tree-header--company {
  min-width: 340px;
  max-width: 340px;
}

.corporate-tree-header--sales-line {
  /* Matches `.corporate-tree-node--sales-line`'s own 450px (see its own doc for why that width) -
     a stale 380px here (left over from before that card widened) put this header's own centered
     column at a different midpoint than the tree's real one, visibly shifting every header
     (Parents/Buyers/Sales Lines all share one centered flex row - see `.corporate-tree-headers`)
     rather than just this one. */
  min-width: 450px;
  max-width: 450px;
}

.corporate-tree-canvas {
  /* The whole tab's own surface, top to bottom - covers the truncated/cycles-detected alerts and
     the Parents/Buyers/Sales Lines header row too, not just the tree below them, so the white
     background and full width/height reach every part of this tab rather than only wrapping
     whatever cards `.corporate-tree-tree` (below) currently renders. Column, not row: a plain
     `display: flex` here (this class's own layout before it grew to cover the alerts/headers too)
     would otherwise lay the alerts/headers/tree out side by side instead of stacked. */
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #fff;
  padding-block: 0.5rem;
}

.corporate-tree-tree {
  /* `overflow-x: auto` alone would still compute `overflow-y` to `auto` too (an unset overflow-y
     next to a non-`visible` overflow-x resolves that way per the CSS Overflow spec) - spelled out
     explicitly so that isn't a side effect to rediscover later. */
  overflow: auto;
  display: flex;
  /* Centers the tree within the remaining space below the alerts/headers - via the tree's OWN
     `margin: auto` (below), not `justify-content`/`align-items: center` here. Centering through
     flex alignment pushes an item BIGGER than its container into negative start-offset territory on
     the centered axis, which a scroll container can never scroll back to - on a small screen (more
     siblings stacked per generation than fit the viewport, in a horizontal tree) that silently
     clipped the tree's own first generation above the reachable scroll range. `margin: auto`
     collapses to `0` instead of negative once the item no longer fits, which keeps its start edge
     flush with this container's own - reachable by scroll in both directions - while still
     centering it whenever it's smaller than the available space. `flex: 1` stays commented out (see
     `.corporate-tree-canvas`'s own column layout) for the same reason it always was: claiming the
     remaining space here is cosmetic only, not needed for this fix. */
  /* flex: 1; */
}

/* `.org-tree-container` - NOT `.org-tree` (one level further in, and so not itself a flex item of
   `.corporate-tree-tree` above - margin: auto there centered it only within `.org-tree-container`'s
   own box, which has no extra space of its own to give since it shrink-wraps `.org-tree`, so it had
   no visible effect at all) - is `BlocksTree`'s actual outermost rendered element, and so the
   flex item `.corporate-tree-tree`'s own `margin: auto` fix (see that class's own doc) needs to
   center. */
:deep(.org-tree-container) {
  margin: auto;
}

/* vue3-blocks-tree wraps every node's own slot content in its own `.org-tree-node-label-inner`
   (its own bundled CSS: `padding: 10px 15px`) - on top of `ContentBoxBody`'s own 1rem padding,
   doubling the inset around every card. `:deep()` is required rather than a plain selector: that
   wrapper is rendered by `BlocksTree` itself, not this component's own template, so plain scoped
   CSS (which only matches elements carrying THIS component's own `data-v-*` attribute) would never
   match it - `:deep()` keeps the attribute on the ANCESTOR side of the selector instead, letting it
   still reach an unscoped descendant. Zeroing it here only affects nodes rendered by THIS
   component's own `BlocksTree` instance; `EntityCardCorporateTreeTab.vue`'s separate tree keeps the
   library's default padding. */
:deep(.org-tree-node-label-inner) {
  padding: 0;
}

.corporate-tree-node {
  min-width: 340px;
  max-width: 340px;
  cursor: pointer;
}

.corporate-tree-node--current {
  border-color: var(--bs-primary, #0d6efd) !important;
  border-width: 2px !important;
}

.corporate-tree-node-metrics {
  /* Shared by both the Parent/Counterparty card (5 items: Volume/Cash Flow, PT/Country,
     PT Opp./blank) and the sales-line card (6 items, filling the grid exactly: Volume/Cash Flow,
     PT/Buying Entity, PT Opp./Commodity) - two columns filled row-major (the default
     `grid-auto-flow`) reproduces each reference mock's own layout straight from that item order,
     with no explicit row/column placement needed. Label/value typography lives on their own
     `<span>`s (Tailwind utility classes, per the reference mocks) rather than here.
     `text-align: left` overrides vue3-blocks-tree's own
     `.org-tree-node-label-inner { text-align: center }` (an ancestor of this grid), which would
     otherwise center every value/label pair instead of lining them up left like the mocks. */
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 12px;
  text-align: left;
  min-width: 0;
  /* Reaches into `ContentBoxBody`'s own 1rem right padding (an `@ada/design-system` component
     shared with AP, not something to change there) rather than leaving that inset unused on this
     grid's own right edge - the same "cancel this shared component's own padding locally" move
     `.corporate-tree-sales-line-label` already makes on the left/top/bottom (see its own doc), just
     mirrored onto the one edge this grid always borders in BOTH cards it's used in: the
     Parent/Counterparty card's `ContentBoxBody` directly, and the sales-line card's flex row
     (`corporate-tree-sales-line-label`'s bled left edge is the other border there). Left is left
     alone: in the sales-line card, a negative left margin here would instead pull the grid under
     that same label. */
  margin-right: -1rem;
}

.corporate-tree-sales-line-label {
  /* The reference mock's "Sale N" side tab - flush against the card's own left/top/bottom edges
     (negative margin cancels `ContentBoxBody`'s 1rem padding on those three sides) rather than a
     separate element layered on top of it, so it always matches the card's own height without
     extra positioning math. `writing-mode` rotates the text a quarter turn; the added
     `rotate(180deg)` reads it bottom-to-top, the usual orientation for a left-edge vertical label
     (as opposed to `vertical-rl` alone, which reads top-to-bottom). */
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin: -1rem 0 -1rem -1rem;
  padding: 0 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-2);
  background: var(--bg-surface-subtle-2);
  border-right: 1px solid var(--border-color-default);
}

.corporate-tree-node--sales-line {
  /* Visually a "detail" leaf under its own Counterparty node, not another company - a dashed
     border distinguishes it from the company cards around it at a glance, without needing its own
     column header the way Parents/Buyers/Subsidiaries do. Wider than `.corporate-tree-node`'s own
     340px despite holding the same 2-column metrics grid: the "Sale N" side label (plus the gap
     beside it) eats into the same width, and Buying Entity/Commodity's values run longer than
     Country's - too narrow left every one of those wrapping or ellipsizing mid-label instead of
     showing its value. `cursor: default` overrides `.corporate-tree-node`'s own pointer:
     `onNodeClick` is a no-op here (a sales line has no Customer Card of its own to open), and it's
     always a childless leaf, so it never gets vue3-blocks-tree's own expand toggle either. */
  min-width: 450px;
  max-width: 450px;
  border-style: dashed !important;
  cursor: default;
}

.corporate-tree-node--sales-lines-group {
  /* A Counterparty that also has subsidiary company children gets this small toggle-only card as
     ITS sales lines' own parent (see `SalesLinesGroupDisplayNode`'s own doc for why) instead of
     rendering every sale line as one more sibling company card - a narrow pill rather than
     `.corporate-tree-node`'s own 340px, since it holds nothing but this one line of text and
     sitting at full card width would leave most of it empty. `cursor: default` overrides
     `.corporate-tree-node`'s own pointer: `onNodeClick` is a no-op for any non-`company` node. */
  min-width: 160px;
  max-width: 160px;
  min-height: 60px;
  cursor: default;
}

.corporate-tree-node--no-parent {
  /* Same 340px width as a real Parent-role card (`.corporate-tree-node`'s own default), so it
     lines up with `.corporate-tree-header--company` exactly like one would. `NoDataAvailable` sits
     directly in `ContentBox`'s own default slot here, deliberately skipping `ContentBoxBody` (used
     by every other card) - `ContentBoxBody`'s own white surface would otherwise cover the muted
     `--bg-surface-subtle-2` fill the reference mock shows across the whole card, not just its
     `header`/`footer` gutter. `cursor: default` overrides `.corporate-tree-node`'s own pointer:
     `onNodeClick` is a no-op for any non-`company` node, and there is nothing here to open. */
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  padding: 1rem;
  cursor: default;
}
</style>
