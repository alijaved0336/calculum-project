<template>
<div class="change-requests-modern">
  <section class="requests-header-compact">
    <div class="container-fluid">
      <div class="header-row">
        <div class="header-title">
          <h2 class="page-title">
            <svg class="icon-title" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>{{ $t('adminBackend.potentialSupplierRequest.title') }}
          </h2>
        </div>
        <div class="d-flex gap-2">
          <div class="header-search gap-2">
            <div class="company-filter-wrapper">
              <SearchableDropdown :model-value="selectedCompanyId || undefined" :items="companies" value-key="@id" label-key="name" :placeholder="$t('adminBackend.potentialSupplierRequest.filters.allCompanies')" :show-clear-option="true" :clear-label="$t('adminBackend.potentialSupplierRequest.filters.allCompanies')" @update:model-value="onCompanyChange"></SearchableDropdown>
            </div>
            <div class="spendfile-filter-wrapper">
              <SearchableDropdown :model-value="selectedSpendFileVersionId || undefined" :items="spendFileVersionItems" value-key="uuid" label-key="displayName" :placeholder="$t('adminBackend.potentialSupplierRequest.filters.allSpendFiles')" :disabled="loadingSpendFileVersions" :show-clear-option="true" :clear-label="$t('adminBackend.potentialSupplierRequest.filters.allSpendFiles')" @update:model-value="onSpendFileVersionChange"></SearchableDropdown>
            </div>
            <div class="search-bar-wrapper">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input class="search-input" type="text" v-model="searchQuery" :placeholder="$t('adminBackend.potentialSupplierRequest.search.placeholder')" @input="onSearchInput"/>
              <button class="clear-search" v-if="searchQuery" @click="clearSearch">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="header-actions gap-2">
            <button class="btn-icon" @click="exportToExcel" :title="$t('adminBackend.potentialSupplierRequest.export')">
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <button class="btn-icon" @click="refetch" :disabled="loading" :class="{ 'loading': loading }" :title="$t('adminBackend.potentialSupplierRequest.refresh')">
              <svg class="icon" :class="{ 'spinning': loading }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="quick-filters-section">
    <div class="container-fluid">
      <div class="filters-wrapper">
        <div class="filters-label">{{ $t('adminBackend.potentialSupplierRequest.filters.quickFilters') }}:</div>
        <div class="quick-filters">
          <button class="filter-btn" v-for="status in quickFilterStatuses" :key="status.value" :class="['filter-status-' + status.value, { active: filters.status === status.value }]" @click="toggleStatusFilter(status.value)"><span class="filter-label">{{ status.label }}</span></button>
        </div>
      </div>
    </div>
  </section>
  <section class="active-filters-section" v-if="hasActiveFilters">
    <div class="container-fluid">
      <div class="active-filters">
        <div class="filter-label">{{ $t('adminBackend.potentialSupplierRequest.filters.active') }}:</div>
        <div class="filter-chips">
          <div class="chip" v-if="searchQuery" @click="clearSearch"><span>{{ $t('adminBackend.potentialSupplierRequest.search.label') }}: "{{ searchQuery }}"</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
          <div class="chip" v-if="filters.status" @click="toggleStatusFilter(filters.status)"><span>{{ $t('adminBackend.potentialSupplierRequest.columns.status') }}: {{ getStatusLabel(filters.status) }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
          <div class="chip" v-if="filters.companyUuid" @click="clearCompanyFilter"><span>{{ $t('adminBackend.potentialSupplierRequest.filters.company') }}: {{ selectedCompanyName }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
          <div class="chip" v-if="filters.spendFileVersionUuid" @click="clearSpendFileVersionFilter"><span>{{ $t('adminBackend.potentialSupplierRequest.filters.spendFile') }}: {{ selectedSpendFileVersionName }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
        </div>
        <button class="clear-all-btn" @click="clearAllFilters">{{ $t('adminBackend.potentialSupplierRequest.filters.clearAll') }}</button>
      </div>
    </div>
  </section>
  <section class="pagination-section pagination-top" v-if="!loading || requests.length > 0">
    <div class="container-fluid">
      <div class="pagination-controls">
        <div class="pagination-info-row">
          <div class="results-info d-flex gap-2"><span class="results-label">{{ $t('adminBackend.potentialSupplierRequest.pagination.showing') }}</span><strong class="results-count"> {{ requests.length }}</strong><span class="results-of"> {{ $t('adminBackend.potentialSupplierRequest.pagination.of') }}</span><strong class="results-total"> {{ paginationInfo.totalCount }}</strong><span class="results-text"> {{ $t('adminBackend.potentialSupplierRequest.pagination.results') }}</span></div>
          <div class="sort-control">
            <label class="sort-label">{{ $t('adminBackend.potentialSupplierRequest.sort.label') }}:</label>
            <select class="sort-select" v-model="sortOrder" @change="onSortChange">
              <option value="desc">{{ $t('adminBackend.potentialSupplierRequest.sort.newest') }}</option>
              <option value="asc">{{ $t('adminBackend.potentialSupplierRequest.sort.oldest') }}</option>
            </select>
          </div>
        </div>
        <div class="pagination-actions-row">
          <div class="page-size-control">
            <label class="page-size-label">{{ $t('adminBackend.potentialSupplierRequest.pagination.itemsPerPage') }}:</label>
            <select class="page-size-select" v-model.number="pagination.itemsPerPage" @change="onPageSizeChange">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
          <div class="page-navigation">
            <div class="page-indicator"><span class="page-text">{{ $t('adminBackend.potentialSupplierRequest.pagination.page') }}</span><strong> {{ paginationInfo.currentPage }}</strong><span class="of-text"> {{ $t('adminBackend.potentialSupplierRequest.pagination.of') }}</span><strong> {{ paginationInfo.lastPage }}</strong></div>
            <div class="nav-buttons">
              <button class="btn-nav" @click="goToPreviousPage" :disabled="!pageInfo.hasPreviousPage || loading" :title="$t('adminBackend.potentialSupplierRequest.pagination.previous')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"></path>
                </svg><span>{{ $t('adminBackend.potentialSupplierRequest.pagination.previous') }}</span>
              </button>
              <button class="btn-nav" @click="goToNextPage" :disabled="!pageInfo.hasNextPage || loading" :title="$t('adminBackend.potentialSupplierRequest.pagination.next')"><span>{{ $t('adminBackend.potentialSupplierRequest.pagination.next') }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="table-section">
    <div class="container-fluid">
      <div class="loading-overlay" v-if="loading">
        <div class="loading-spinner">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"></path>
          </svg>
        </div>
      </div>
      <div class="empty-state" v-else-if="requests.length === 0">
        <div class="empty-icon">📋</div>
        <h3 class="empty-title">{{ $t('adminBackend.potentialSupplierRequest.emptyState.title') }}</h3>
        <p class="empty-message">{{ $t('adminBackend.potentialSupplierRequest.emptyState.message') }}</p>
        <button class="clear-all-btn" v-if="hasActiveFilters" @click="clearAllFilters">{{ $t('adminBackend.potentialSupplierRequest.filters.clearAll') }}</button>
      </div>
      <div class="table-wrapper" v-else>
        <table class="psr-table">
          <thead>
            <tr>
              <th class="col-supplier">{{ $t('adminBackend.potentialSupplierRequest.columns.supplierName') }}</th>
              <th class="col-company">{{ $t('adminBackend.potentialSupplierRequest.columns.companyName') }}</th>
              <th class="col-spendfile">{{ $t('adminBackend.potentialSupplierRequest.columns.spendFile') }}</th>
              <th class="col-country">{{ $t('adminBackend.potentialSupplierRequest.columns.country') }}</th>
              <th class="col-buyer">{{ $t('adminBackend.potentialSupplierRequest.columns.buyerEntity') }}</th>
              <th class="col-currency">{{ $t('adminBackend.potentialSupplierRequest.columns.currency') }}</th>
              <th class="col-currency">{{ $t('home.potentialSupplierRequest.form.paymentTerms') }}</th>
              <th class="col-currency">{{ $t('home.potentialSupplierRequest.form.estimatedAnnualSpend') }}</th>
              <th class="col-currency">{{ $t('adminBackend.potentialSupplierRequest.columns.commodity') }}</th>
              <th class="col-date">{{ $t('adminBackend.potentialSupplierRequest.columns.requestedDate') }}</th>
              <th class="col-status">{{ $t('adminBackend.potentialSupplierRequest.columns.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in requests" :key="row['@id']">
              <tr :class="{ 'row-expanded': expandedRowId === row['@id'] }" @click="toggleExpand(row['@id'])">
                <td class="col-supplier">
                  <div class="supplier-cell"><span class="supplier-name">{{ row.name }}</span></div>
                </td>
                <td class="col-company">{{ row.spendFileVersion.companyName || '-' }}</td>
                <td class="col-spendfile">
                  <div class="spendfile-cell"><span class="file-name">{{ row.spendFileVersion.name || '-' }}</span><span class="version-badge" v-if="row.spendFileVersion.version">v {{ row.spendFileVersion.version }}</span></div>
                </td>
                <td class="col-country">
                  <div class="country-cell"><span>{{ row.country.localizedName || '-' }}</span></div>
                </td>
                <td class="col-buyer">{{ row.buyer.name || '-' }}</td>
                <td class="col-currency">{{ row.currency.code || '-' }}</td>
                <td class="col-estimateAvgPaymentTerms text-center">{{ row.estimateAvgPaymentTerms || '-' }}</td>
                <td class="col-estimatedAnnualSpendVolume text-center">{{ row.estimatedAnnualSpendVolume ? StringUtils.formatBigNumbers(row.estimatedAnnualSpendVolume) : '-' }}</td>
                <td class="col-commodity">{{ row.commodity ? getCommoditiesInText(row.commodity) : '-' }}</td>
                <td class="col-date">{{ formatDate(row.created) }}</td>
                <td class="col-status"><span class="status-badge" :class="`status-${row.status}`">{{ getStatusLabel(row.status) }}</span></td>
              </tr>
              <tr class="detail-row" v-if="expandedRowId === row['@id']">
                <td colspan="11">
                  <div class="row-detail-panel">
                    <div class="detail-grid">
                      <div class="detail-field">
                        <div class="detail-label">{{ $t('adminBackend.potentialSupplierRequest.columns.companyName') }}</div>
                        <div class="detail-value">{{ row.spendFileVersion.companyName || '-' }}</div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-label">{{ $t('adminBackend.potentialSupplierRequest.columns.spendFile') }}</div>
                        <div class="detail-value"><span>{{ row.spendFileVersion.name || '-' }}</span><span class="version-badge" v-if="row.spendFileVersion.version"> v{{ row.spendFileVersion.version }}</span></div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-label">{{ $t('adminBackend.potentialSupplierRequest.columns.country') }}</div>
                        <div class="detail-value">{{ row.country.localizedName || '-' }}</div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-label">{{ $t('adminBackend.potentialSupplierRequest.columns.buyerEntity') }}</div>
                        <div class="detail-value">{{ row.buyer.name || '-' }}</div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-label">{{ $t('adminBackend.potentialSupplierRequest.columns.currency') }}</div>
                        <div class="detail-value">{{ row.currency.code || '-' }}</div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-label">{{ $t('home.potentialSupplierRequest.form.paymentTerms') }}</div>
                        <div class="detail-value">{{ row.estimateAvgPaymentTerms || '-' }}</div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-label">{{ $t('home.potentialSupplierRequest.form.estimatedAnnualSpend') }}</div>
                        <div class="detail-value">{{ row.estimatedAnnualSpendVolume ? StringUtils.formatBigNumbers(row.estimatedAnnualSpendVolume) : '-' }}</div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-label">{{ $t('adminBackend.potentialSupplierRequest.columns.commodity') }}</div>
                        <div class="detail-value">{{ row.commodity ? getCommoditiesInText(row.commodity) : '-' }}</div>
                      </div>
                      <div class="detail-field">
                        <div class="detail-label">{{ $t('adminBackend.potentialSupplierRequest.columns.requestedDate') }}</div>
                        <div class="detail-value">{{ formatDate(row.created) }}</div>
                      </div>
                    </div>
                    <div class="detail-actions" v-if="row.status === 'pending'">
                      <button class="btn-detail-reject" @click.stop="openRejectModal">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg><span>{{ $t('adminBackend.potentialSupplierRequest.bulkActions.reject') }}</span>
                      </button>
                      <button class="btn-detail-approve" @click.stop="openMarkAsSolvedModal">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg><span>{{ $t('adminBackend.potentialSupplierRequest.bulkActions.markAsSolved') }}</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </section>
  <PotentialSupplierMarkAsSolvedModal v-if="showMarkAsSolvedModal" :requests="selectedRequestsForModal" :loading="loadingMarkAsSolved" @confirm="handleConfirmMarkAsSolved" @close="showMarkAsSolvedModal = false"></PotentialSupplierMarkAsSolvedModal>
  <PotentialSupplierRejectModal v-if="showRejectModal" :requests="selectedRequestsForModal" :loading="loadingReject" @confirm="handleConfirmReject" @close="showRejectModal = false"></PotentialSupplierRejectModal>
  <section class="pagination-section pagination-bottom" v-if="!loading || requests.length > 0">
    <div class="container-fluid">
      <div class="pagination-controls">
        <div class="pagination-info-row">
          <div class="results-info d-flex gap-2"><span class="results-label">{{ $t('adminBackend.potentialSupplierRequest.pagination.showing') }}</span><strong class="results-count"> {{ requests.length }}</strong><span class="results-of"> {{ $t('adminBackend.potentialSupplierRequest.pagination.of') }}</span><strong class="results-total"> {{ paginationInfo.totalCount }}</strong><span class="results-text"> {{ $t('adminBackend.potentialSupplierRequest.pagination.results') }}</span></div>
          <div class="sort-control">
            <label class="sort-label">{{ $t('adminBackend.potentialSupplierRequest.sort.label') }}:</label>
            <select class="sort-select" v-model="sortOrder" @change="onSortChange">
              <option value="desc">{{ $t('adminBackend.potentialSupplierRequest.sort.newest') }}</option>
              <option value="asc">{{ $t('adminBackend.potentialSupplierRequest.sort.oldest') }}</option>
            </select>
          </div>
        </div>
        <div class="pagination-actions-row">
          <div class="page-size-control">
            <label class="page-size-label">{{ $t('adminBackend.potentialSupplierRequest.pagination.itemsPerPage') }}:</label>
            <select class="page-size-select" v-model.number="pagination.itemsPerPage" @change="onPageSizeChange">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
          <div class="page-navigation">
            <div class="page-indicator"><span class="page-text">{{ $t('adminBackend.potentialSupplierRequest.pagination.page') }}</span><strong> {{ paginationInfo.currentPage }}</strong><span class="of-text"> {{ $t('adminBackend.potentialSupplierRequest.pagination.of') }}</span><strong> {{ paginationInfo.lastPage }}</strong></div>
            <div class="nav-buttons">
              <button class="btn-nav" @click="goToPreviousPage" :disabled="!pageInfo.hasPreviousPage || loading" :title="$t('adminBackend.potentialSupplierRequest.pagination.previous')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"></path>
                </svg><span>{{ $t('adminBackend.potentialSupplierRequest.pagination.previous') }}</span>
              </button>
              <button class="btn-nav" @click="goToNextPage" :disabled="!pageInfo.hasNextPage || loading" :title="$t('adminBackend.potentialSupplierRequest.pagination.next')"><span>{{ $t('adminBackend.potentialSupplierRequest.pagination.next') }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import { useI18n } from 'vue-i18n'
import { getISODate } from '@/utils/FormatData'
import PotentialSupplierMarkAsSolvedModal from '@/modules/adminBackend/components/PotentialSupplierMarkAsSolvedModal.vue'
import PotentialSupplierRejectModal from '@/modules/adminBackend/components/PotentialSupplierRejectModal.vue'
import { SearchableDropdown } from '@ada/design-system'
import {
  usePotentialSupplierRequests,
  PotentialSupplierRequestFilters,
  PotentialSupplierRequestPagination
} from '@/modules/adminBackend/composables/usePotentialSupplierRequests'
import { useAdminBackendStore } from '@/stores/adminBackend'
import { useSpendFilesStore } from '@/stores/spendFiles'
import { SpendFile } from '@/types'
import { StringUtils } from "@/utils";

export default defineComponent({
  name: 'AdminDataPotentialRequests',
  components: { PotentialSupplierMarkAsSolvedModal, PotentialSupplierRejectModal, SearchableDropdown },
  setup() {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const toast = useToast()
    const adminStore = useAdminBackendStore()
    const spendFilesStore = useSpendFilesStore()

    const filters = ref<PotentialSupplierRequestFilters>({})
    const pagination = ref<PotentialSupplierRequestPagination>({ page: 1, itemsPerPage: 25 })
    const sortOrder = ref<'asc' | 'desc'>('desc')

    const {
      requests,
      loading,
      paginationInfo,
      pageInfo,
      refetch: doFetch,
      loadNextPage,
      loadPreviousPage,
      markAsSolved,
      rejectRequests,
      exportToExcel: composableExport
    } = usePotentialSupplierRequests(filters, pagination, sortOrder)

    const companies = computed(() => adminStore.getCompanies)
    const selectedCompanyId = ref('')
    const spendFileVersions = ref<SpendFile.SpendFileVersionByCompany[]>([])
    const selectedSpendFileVersionId = ref('')
    const loadingSpendFileVersions = ref(false)

    const spendFileVersionItems = computed(() =>
      spendFileVersions.value
        .filter(v => v.status === 'ready')
        .map(v => ({
          ...v,
          displayName: selectedCompanyId.value
            ? `${v.spendFileName} (v${v.version})`
            : `${v.companyName} — ${v.spendFileName} (v${v.version})`
        }))
    )

    const searchQuery = ref('')
    const expandedRowId = ref<string>('')
    const searchTimeout = ref<number | null>(null)
    const showMarkAsSolvedModal = ref(false)
    const loadingMarkAsSolved = ref(false)
    const showRejectModal = ref(false)
    const loadingReject = ref(false)

    
    requests.value = ([     
    ])


    const quickFilterStatuses = [
      { value: 'pending', label: translate.t('global.pending') || 'Pending' },
      { value: 'solved', label: translate.t('adminBackend.potentialSupplierRequest.status.solved') || 'Solved' },
      { value: 'rejected', label: translate.t('global.rejected') || 'Rejected' }
    ]

    const hasActiveFilters = computed(() =>
      !!(searchQuery.value || filters.value.status || filters.value.companyUuid || filters.value.spendFileVersionUuid)
    )

    const selectedRequestsForModal = computed(() => {
      if (!expandedRowId.value) return []
      const row = requests.value.find(r => r['@id'] === expandedRowId.value)
      return row ? [row] : []
    })

    function getStatusLabel(status: string): string {
      const map: Record<string, string> = {
        pending: translate.t('global.pending') || 'Pending',
        solved: translate.t('adminBackend.potentialSupplierRequest.status.solved') || 'Solved',
        rejected: translate.t('global.rejected') || 'Rejected'
      }
      return map[status?.toLowerCase()] || status
    }

    function getCommoditiesInText(commodities: Array<string>) {
      return commodities.join(', ')
    }

    function getFlagEmoji(countryCode: string): string {
      if (!countryCode || countryCode.length !== 2) return ''
      return [...countryCode.toUpperCase()].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
    }

    function getInitials(name: string): string {
      if (!name) return '?'
      const parts = name.trim().split(' ').filter(Boolean)
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
    }

    function formatDate(dateString: string): string {
      if (!dateString) return '-'
      return getISODate(dateString) ?? '-'
    }

    function toggleStatusFilter(status: string) {
      filters.value = { ...filters.value, status: filters.value.status === status ? undefined : status }
      clearSelection()
    }

    function loadSpendFileVersions() {
      loadingSpendFileVersions.value = true
      const onSuccess = (data: SpendFile.SpendFileVersionByCompany[]) => {
        spendFileVersions.value = data
        loadingSpendFileVersions.value = false
      }
      const onError = () => { loadingSpendFileVersions.value = false }

      if (selectedCompanyId.value) {
        const companyId = StringUtils.removeIRI(selectedCompanyId.value)
        spendFilesStore.spendFilesVersionsByCompanyAPIReadAll({ companyId, callbackSuccess: onSuccess, callbackError: onError })
      } else {
        spendFilesStore.spendFilesVersionsAPIReadAll({ callbackSuccess: onSuccess, callbackError: onError })
      }
    }

    function clearAllFilters() {
      searchQuery.value = ''
      selectedCompanyId.value = ''
      selectedSpendFileVersionId.value = ''
      filters.value = {}
      clearSelection()
    }

    function onCompanyChange(val: string) {
      selectedCompanyId.value = val
      selectedSpendFileVersionId.value = ''
      filters.value = { ...filters.value, companyUuid: val || undefined, spendFileVersionUuid: undefined }
      clearSelection()
      loadSpendFileVersions()
    }

    function clearCompanyFilter() {
      selectedCompanyId.value = ''
      filters.value = { ...filters.value, companyUuid: undefined }
      clearSelection()
      loadSpendFileVersions()
    }

    function onSpendFileVersionChange(val: string) {
      selectedSpendFileVersionId.value = val
      filters.value = { ...filters.value, spendFileVersionUuid: val || undefined }
      clearSelection()
    }

    function clearSpendFileVersionFilter() {
      selectedSpendFileVersionId.value = ''
      filters.value = { ...filters.value, spendFileVersionUuid: undefined }
      clearSelection()
    }

    const selectedCompanyName = computed(() =>
      companies.value.find(c => c['@id'] === selectedCompanyId.value)?.name ?? ''
    )

    const selectedSpendFileVersionName = computed(() =>
      spendFileVersionItems.value.find(v => v.uuid === selectedSpendFileVersionId.value)?.displayName ?? ''
    )

    function onSearchInput() {
      if (searchTimeout.value) clearTimeout(searchTimeout.value)
      searchTimeout.value = window.setTimeout(() => {
        filters.value = { ...filters.value, search: searchQuery.value.trim() || undefined }
        clearSelection()
      }, 400)
    }

    function clearSearch() {
      searchQuery.value = ''
      filters.value = { ...filters.value, search: undefined }
      clearSelection()
    }

    function onSortChange() {
      clearSelection()
    }

    function onPageSizeChange() {
      clearSelection()
    }

    function goToNextPage() {
      loadNextPage()
      clearSelection()
    }

    function goToPreviousPage() {
      loadPreviousPage()
      clearSelection()
    }

    function toggleExpand(id: string) {
      expandedRowId.value = expandedRowId.value === id ? '' : id
    }

    function clearSelection() {
      expandedRowId.value = ''
    }

    function openMarkAsSolvedModal() {
      showMarkAsSolvedModal.value = true
    }

    async function handleConfirmMarkAsSolved({ sendEmail, emailMessage, potentialIdMatch }: { sendEmail: boolean; emailMessage: string, potentialIdMatch: string }) {
      const ids = expandedRowId.value ? expandedRowId.value : ''
      loadingMarkAsSolved.value = true
      await nextTick()
      try {
        const ok = await markAsSolved(ids, sendEmail, emailMessage, potentialIdMatch)
        if (ok) {
          showMarkAsSolvedModal.value = false
          expandedRowId.value = ''
        }
      } catch (e) {
        console.error('handleConfirmMarkAsSolved error:', e)
        toast.error( translate.t('adminBackend.potentialSupplierRequest.modal.markAsSolved.errorSolved'))
      } finally {
        loadingMarkAsSolved.value = false
      }
    }

    function openRejectModal() {
      showRejectModal.value = true
    }

    async function handleConfirmReject({ sendEmail, rejectReason }: { sendEmail: boolean; rejectReason: string }) {
      const ids = expandedRowId.value ? expandedRowId.value : ''
      loadingReject.value = true
      await nextTick()
      try {
        const ok = await rejectRequests(ids, sendEmail, rejectReason)
        if (ok) {
          showRejectModal.value = false
          expandedRowId.value = ''
        }
      } catch (e) {
        console.error('handleConfirmReject error:', e)
        toast.error( translate.t('adminBackend.potentialSupplierRequest.modal.markAsSolved.errorRejecting'))
      } finally {
        loadingReject.value = false
      }
    }

    function exportToExcel() {
      composableExport()
    }

    function refetch() {
      doFetch()
    }

    onMounted(() => {
      document.title = translate.t('adminBackend.potentialSupplierRequest.title')
      loadSpendFileVersions()
    })

    return {
      searchQuery,
      filters,
      pagination,
      sortOrder,
      loading,
      requests,
      paginationInfo,
      pageInfo,
      expandedRowId,
      quickFilterStatuses,
      hasActiveFilters,
      companies,
      selectedCompanyId,
      selectedCompanyName,
      spendFileVersionItems,
      selectedSpendFileVersionId,
      selectedSpendFileVersionName,
      loadingSpendFileVersions,
      onSpendFileVersionChange,
      clearSpendFileVersionFilter,
      getStatusLabel,
      getCommoditiesInText,
      getFlagEmoji,
      getInitials,
      formatDate,
      toggleStatusFilter,
      clearAllFilters,
      onSearchInput,
      clearSearch,
      onCompanyChange,
      clearCompanyFilter,
      onSortChange,
      onPageSizeChange,
      goToNextPage,
      goToPreviousPage,
      toggleExpand,
      showMarkAsSolvedModal,
      loadingMarkAsSolved,
      showRejectModal,
      loadingReject,
      selectedRequestsForModal,
      openMarkAsSolvedModal,
      handleConfirmMarkAsSolved,
      openRejectModal,
      handleConfirmReject,
      exportToExcel,
      refetch,
      StringUtils
    }
  }
})
</script>

<style lang="scss" scoped>
@import '@/resources/assets/styles/variables/_colors.scss';

// ─── Header (mirrors .requests-header-compact) ────────────────────────────────

.header-search {
  display: flex;
  align-items: center;  
  flex: 1;
}

.company-filter-wrapper {
  flex-shrink: 0;
  width: 270px;
}

.spendfile-filter-wrapper {
  flex-shrink: 0;
  width: 300px;
}

// ─── Quick Filters ─────────────────────────────────────────────────────────────
.quick-filters-section {
  padding: 0.5rem 0;
  background: $color-card;
  border-bottom: 1px solid $color-border;

  .filters-wrapper {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .filters-label {
    font-weight: 600;
    color: $color-text-primary;
  }

  .quick-filters {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .filter-btn {
    background: $color-card;
    border: 2px solid $color-border;
    border-radius: 8px;
    padding: 0.2rem 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    color: $color-text-primary;
    position: relative;

    &.filter-status-pending::before,
    &.filter-status-solved::before,
    &.filter-status-rejected::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      border-radius: 2px;
      opacity: 0.7;
    }
    &.filter-status-pending::before  { background: $color-pending; }
    &.filter-status-solved::before   { background: $color-solved; }
    &.filter-status-rejected::before { background: $color-rejected; }

    &.filter-status-pending,
    &.filter-status-solved,
    &.filter-status-rejected {
      padding-left: 1.25rem;
    }

    &:hover {
      border-color: $color-primary;
      background: lighten($color-primary, 45%);
      &::before { opacity: 1; }
    }

    &.active {
      background: $color-primary;
      border-color: $color-primary;
      color: white;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba($color-primary, 0.2);
      &::before { opacity: 1; background: white; }
    }
  }
}



// ─── Detail Row Panel ──────────────────────────────────────────────────────────
.detail-row td {
  padding: 0;
  background: lighten($color-border, 12%);
  border-bottom: 2px solid $color-border;
}

.row-detail-panel {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: expandContent 0.2s ease-out;
}

@keyframes expandContent {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.5rem 1.5rem;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;

  .detail-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $color-text-secondary;
  }

  .detail-value {
    font-size: 0.9rem;
    color: $color-text-primary;
    font-weight: 500;
  }
}

.detail-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  border-top: 1px solid $color-border;
}

.btn-detail-reject,
.btn-detail-approve {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;

  svg { width: 16px; height: 16px; }
}

.btn-detail-reject {
  background: $color-card;
  color: $color-rejected;
  border-color: $color-rejected;
  &:hover { background: lighten($color-rejected, 42%); transform: translateY(-1px); }
}

.btn-detail-approve {
  background: $color-primary;
  color: white;
  border-color: $color-primary;
  &:hover { background: darken($color-primary, 8%); transform: translateY(-1px); }
}

// ─── Table Section ─────────────────────────────────────────────────────────────
.table-section {
  padding: 0.5rem 0;
}

.loading-overlay {
  display: flex;
  justify-content: center;
  padding: 3rem;
  .loading-spinner svg {
    width: 2rem;
    height: 2rem;
    animation: spin 1s linear infinite;
    color: $color-primary;
  }
}



.table-wrapper {
  background: $color-card;
  border: 1px solid $color-border;
  border-radius: 8px;
  overflow-x: auto;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.psr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;

  thead tr {
    background: lighten($color-border, 8%);
    border-bottom: 2px solid $color-border;
  }

  th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 13px;
    font-weight: 600;
    color: $color-text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  tbody tr {
    border-bottom: 1px solid lighten($color-border, 5%);
    cursor: pointer;
    transition: background 0.15s ease;
    &:last-child { border-bottom: none; }
    &:hover { background: lighten($color-border, 10%); }
    &.row-expanded {
      background: lighten($color-primary, 46%);
      box-shadow: inset 3px 0 0 $color-primary;
    }
  }

  td {
    padding: 0.75rem 1rem;
    color: $color-text-primary;
    vertical-align: middle;
  }

  .col-supplier { min-width: 180px; }
  .col-company  { min-width: 140px; }
  .col-spendfile{ min-width: 160px; }
  .col-country  { min-width: 120px; }
  .col-buyer    { min-width: 140px; }
  .col-currency { width: 90px; }
  .col-date     { min-width: 130px; white-space: nowrap; }
  .col-status   { width: 110px; }
}

.supplier-cell {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: linear-gradient(135deg, $color-primary 0%, darken($color-primary, 15%) 100%);
  color: white;
  font-size: 0.6875rem;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.supplier-name { font-weight: 500; }

.spendfile-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  .file-name { font-weight: 500; }
  .version-badge {
    padding: 0.125rem 0.5rem;
    background: #e8f0fe;
    border: 1px solid #b3c8f8;
    border-radius: 10px;
    font-size: 0.6875rem;
    font-weight: 700;
    color: #1a56db;
  }
}

.country-cell {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  .flag-emoji { font-size: 1.2rem; line-height: 1; }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;

  &.status-pending {
    background: lighten($color-pending, 40%);
    color: darken($color-pending, 20%);
  }
  &.status-solved {
    background: lighten($color-solved, 40%);
    color: $color-solved;
  }
  &.status-rejected {
    background: lighten($color-rejected, 40%);
    color: $color-rejected;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

</style>
