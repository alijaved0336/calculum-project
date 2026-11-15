<template>
<div class="audit-emails-modern">
  <section class="emails-header-compact">
    <div class="container-fluid">
      <div class="header-row">
        <div class="header-title">
          <h2 class="page-title">
            <svg class="icon-title" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>{{ $t('adminBackend.audit.emails.title') }}
          </h2>
        </div>
        <div class="header-search">
          <div class="search-bar-wrapper">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input class="search-input" type="text" v-model="searchQuery" :placeholder="$t('adminBackend.audit.emails.search.placeholder')" @input="onSearchInput"/>
            <button class="clear-search" v-if="searchQuery" @click="clearSearch">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-icon" @click="refresh" :disabled="loading" :title="$t('adminBackend.audit.actions.refresh')">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>
  <section class="quick-filters-section">
    <div class="container-fluid">
      <div class="filters-wrapper">
        <div class="filters-header" @click="toggleQuickFilters">
          <div class="filters-label">{{ $t('adminBackend.audit.filters.quickFilters') }}:</div>
          <button class="collapse-btn" :class="{ collapsed: !quickFiltersExpanded }" :title="quickFiltersExpanded ? $t('adminBackend.audit.filters.collapse') : $t('adminBackend.audit.filters.expand')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
        <transition name="slide-fade">
          <div class="quick-filters" v-if="quickFiltersExpanded">
            <div class="filter-group">
              <div class="filter-group-label">{{ $t('adminBackend.audit.emails.columns.status') }}:</div>
              <div class="filter-group-buttons">
                <button class="filter-btn" v-for="status in quickFilterStatuses" :key="status.value" :class="['filter-status-' + status.value, { active: filters.status === status.value }]" @click="toggleStatusFilter(status.value)"><span class="filter-label">{{ status.label }}</span></button>
              </div>
            </div>
            <div class="divider"></div>
            <div class="filter-group">
              <div class="filter-group-label">{{ $t('adminBackend.audit.filters.dateRange') }}:</div>
              <div class="filter-group-buttons date-inputs">
                <input class="date-input" type="date" v-model="filters.sentAfter" :placeholder="$t('adminBackend.audit.emails.filters.dateFrom')"/><span class="date-separator">-</span>
                <input class="date-input" type="date" v-model="filters.sentBefore" :placeholder="$t('adminBackend.audit.emails.filters.dateTo')"/>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </section>
  <section class="active-filters-section" v-if="hasActiveFilters">
    <div class="container-fluid">
      <div class="active-filters">
        <div class="filter-label">{{ $t('adminBackend.audit.filters.active') }}:</div>
        <div class="filter-chips">
          <div class="chip" v-if="filters.status" @click="removeFilter('status')"><span>{{ $t('adminBackend.audit.emails.columns.status') }}: {{ $t('adminBackend.audit.emails.statuses.' + filters.status) }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
          <div class="chip" v-if="searchQuery" @click="clearSearch"><span>{{ $t('adminBackend.audit.emails.search.placeholder') }}: {{ searchQuery }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
          <div class="chip" v-if="filters.sentAfter" @click="removeFilter('sentAfter')"><span>{{ $t('adminBackend.audit.emails.filters.dateFrom') }}: {{ filters.sentAfter }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
          <div class="chip" v-if="filters.sentBefore" @click="removeFilter('sentBefore')"><span>{{ $t('adminBackend.audit.emails.filters.dateTo') }}: {{ filters.sentBefore }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
        </div>
        <button class="clear-all-btn" @click="clearAllFilters">{{ $t('adminBackend.audit.filters.clearAll') }}</button>
      </div>
    </div>
  </section>
  <div class="loading-container" v-if="loading && emails.length === 0">
    <div class="spinner"></div><span>{{ $t('adminBackend.audit.loading') }}</span>
  </div>
  <section class="pagination-section pagination-top" v-if="!loading || emails.length > 0">
    <div class="container-fluid">
      <div class="pagination-controls">
        <div class="pagination-info-row">
          <div class="results-info"><span class="results-label" v-if="!loading && totalItems > 0">{{ $t('adminBackend.audit.showing') }}</span><strong class="results-count">{{ paginationStart }}-{{ paginationEnd }}</strong><span class="results-of">{{ $t('adminBackend.audit.of') }}</span><strong class="results-total">{{ totalItems }}</strong><span class="results-text">{{ $t('adminBackend.audit.results') }}</span></div>
          <div class="sort-control">
            <label class="sort-label">{{ $t('adminBackend.audit.sort.label') }}:</label>
            <select class="sort-select" v-model="sortOrder" @change="onSortChange">
              <option value="desc">{{ $t('adminBackend.audit.sort.newest') }}</option>
              <option value="asc">{{ $t('adminBackend.audit.sort.oldest') }}</option>
            </select>
          </div>
        </div>
        <div class="pagination-actions-row">
          <div class="page-navigation">
            <div class="page-indicator"><span class="page-text">{{ $t('adminBackend.audit.pagination.page') }}</span><strong>{{ currentPage }}</strong><span class="of-text">{{ $t('adminBackend.audit.of') }}</span><strong>{{ totalPages }}</strong></div>
            <div class="nav-buttons">
              <button class="btn-nav" @click="previousPage" :disabled="!hasPreviousPage || loading" :title="$t('adminBackend.audit.pagination.previous')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"></path>
                </svg><span>{{ $t('adminBackend.audit.pagination.previous') }}</span>
              </button>
              <button class="btn-nav" @click="nextPage" :disabled="!hasNextPage || loading" :title="$t('adminBackend.audit.pagination.next')"><span>{{ $t('adminBackend.audit.pagination.next') }}</span>
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
  <div class="error-state" v-if="error && emails.length === 0">
    <div class="container-fluid">
      <div class="empty-state">
        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3 class="empty-title">{{ $t('adminBackend.audit.emails.error') }}</h3>
        <button class="clear-all-btn" @click="refresh">{{ $t('adminBackend.audit.actions.refresh') }}</button>
      </div>
    </div>
  </div>
  <section class="table-section" v-if="!loading || emails.length > 0">
    <div class="container-fluid">
      <div class="empty-state" v-if="emails.length === 0 && !error">
        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
        <h3 class="empty-title">{{ $t('adminBackend.audit.emails.emptyState.title') }}</h3>
        <p class="empty-message">{{ $t('adminBackend.audit.emails.emptyState.message') }}</p>
        <button class="clear-all-btn" v-if="hasActiveFilters" @click="clearAllFilters">{{ $t('adminBackend.audit.filters.clearAll') }}</button>
      </div>
      <div class="table-responsive" v-else>
        <table class="emails-table">
          <thead>
            <tr>
              <th class="sortable" @click="setOrder('created')">{{ $t('adminBackend.audit.emails.columns.date') }}<span class="sort-indicator" v-if="orderField === 'created'">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path v-if="orderDir === 'asc'" d="M18 15l-6-6-6 6"></path>
                    <path v-else d="M6 9l6 6 6-6"></path>
                  </svg></span></th>
              <th>{{ $t('adminBackend.audit.emails.columns.status') }}</th>
              <th class="sortable" @click="setOrder('targetEmail')">{{ $t('adminBackend.audit.emails.columns.recipient') }}<span class="sort-indicator" v-if="orderField === 'targetEmail'">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path v-if="orderDir === 'asc'" d="M18 15l-6-6-6 6"></path>
                    <path v-else d="M6 9l6 6 6-6"></path>
                  </svg></span></th>
              <th class="sortable" @click="setOrder('subject')">{{ $t('adminBackend.audit.emails.columns.subject') }}<span class="sort-indicator" v-if="orderField === 'subject'">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path v-if="orderDir === 'asc'" d="M18 15l-6-6-6 6"></path>
                    <path v-else d="M6 9l6 6 6-6"></path>
                  </svg></span></th>
              <th>{{ $t('adminBackend.audit.emails.columns.cc') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="email in emails" :key="email.id">
              <tr class="email-row" :class="{ 'row-expanded': expandedEmailId === email.id }" @click="togglePreview(email)">
                <td class="col-date">{{ formatDate(email.created) }}</td>
                <td class="col-status"><span class="status-badge" :class="'status-' + email.status">{{ $t('adminBackend.audit.emails.statuses.' + email.status) }}</span></td>
                <td class="col-recipient">{{ email.targetEmail || '-' }}</td>
                <td class="col-subject">{{ email.subject || '-' }}</td>
                <td class="col-cc">{{ formatCc(email.cc) }}</td>
              </tr>
              <tr class="preview-row" v-if="expandedEmailId === email.id">
                <td :colspan="5">
                  <div class="email-preview">
                    <div class="preview-header">
                      <h4 class="preview-title">{{ $t('adminBackend.audit.emails.preview.title') }}</h4>
                      <button class="preview-close" @click.stop="closePreview">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                    <div class="preview-loading" v-if="previewLoading">
                      <div class="spinner"></div><span>{{ $t('adminBackend.audit.emails.preview.loading') }}</span>
                    </div>
                    <div class="preview-sensitive" v-else-if="email.sensitive">
                      <svg class="sensitive-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0110 0v4"></path>
                      </svg>
                      <p class="sensitive-message">{{ $t('adminBackend.audit.emails.preview.sensitiveMessage') }}</p>
                    </div>
                    <div class="preview-body" v-else-if="previewContent">
                      <iframe class="preview-iframe" title="Email Preview" v-if="previewIsHtml" :srcdoc="previewContent" sandbox="" referrerpolicy="no-referrer"></iframe>
                      <pre class="preview-text" v-else>{{ previewContent }}</pre>
                    </div>
                    <div class="preview-body" v-else>
                      <p class="preview-empty">-</p>
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
  <section class="pagination-section pagination-bottom" v-if="!loading || emails.length > 0">
    <div class="container-fluid">
      <div class="pagination-controls">
        <div class="pagination-info-row">
          <div class="results-info"><span class="results-label" v-if="!loading && totalItems > 0">{{ $t('adminBackend.audit.showing') }}</span><strong class="results-count">{{ paginationStart }}-{{ paginationEnd }}</strong><span class="results-of">{{ $t('adminBackend.audit.of') }}</span><strong class="results-total">{{ totalItems }}</strong><span class="results-text">{{ $t('adminBackend.audit.results') }}</span></div>
          <div class="sort-control">
            <label class="sort-label">{{ $t('adminBackend.audit.sort.label') }}:</label>
            <select class="sort-select" v-model="sortOrder" @change="onSortChange">
              <option value="desc">{{ $t('adminBackend.audit.sort.newest') }}</option>
              <option value="asc">{{ $t('adminBackend.audit.sort.oldest') }}</option>
            </select>
          </div>
        </div>
        <div class="pagination-actions-row">
          <div class="page-navigation">
            <div class="page-indicator"><span class="page-text">{{ $t('adminBackend.audit.pagination.page') }}</span><strong>{{ currentPage }}</strong><span class="of-text">{{ $t('adminBackend.audit.of') }}</span><strong>{{ totalPages }}</strong></div>
            <div class="nav-buttons">
              <button class="btn-nav" @click="previousPage" :disabled="!hasPreviousPage || loading" :title="$t('adminBackend.audit.pagination.previous')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"></path>
                </svg><span>{{ $t('adminBackend.audit.pagination.previous') }}</span>
              </button>
              <button class="btn-nav" @click="nextPage" :disabled="!hasNextPage || loading" :title="$t('adminBackend.audit.pagination.next')"><span>{{ $t('adminBackend.audit.pagination.next') }}</span>
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
import { defineComponent, reactive, ref, computed, toRef } from "vue";
import { useI18n } from "vue-i18n";
import { useAuditEmails, formatEmailDate, AuditEmailsFiltersState } from "@/composables/useAuditEmails";
import { getAuditEmail, AuditEmail } from "@/modules/adminBackend/api/auditEmails";

export default defineComponent({
  name: "AuditEmails",
  setup() {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    // State
    const searchQuery = ref("");
    const searchTimeout = ref<number | null>(null);
    const quickFiltersExpanded = ref(false);
    const sortOrder = ref<"asc" | "desc">("desc");

    const filters = reactive<AuditEmailsFiltersState>({
      search: '',
      sentAfter: '',
      sentBefore: '',
      status: '',
    });

    const filtersRef = toRef(() => filters);

    const {
      emails,
      loading,
      error,
      totalItems,
      currentPage,
      totalPages,
      itemsPerPage,
      hasNextPage,
      hasPreviousPage,
      orderField,
      orderDir,
      nextPage,
      previousPage,
      setOrder,
      refresh,
    } = useAuditEmails(filtersRef);

    // Preview state
    const expandedEmailId = ref<string | null>(null);
    const previewContent = ref<string | null>(null);
    const previewIsHtml = ref(false);
    const previewLoading = ref(false);

    // Quick filter definitions
    const quickFilterStatuses = [
      { value: "sent", label: t("adminBackend.audit.emails.statuses.sent") },
      { value: "queued", label: t("adminBackend.audit.emails.statuses.queued") },
      { value: "failed", label: t("adminBackend.audit.emails.statuses.failed") },
      { value: "skipped", label: t("adminBackend.audit.emails.statuses.skipped") },
    ];

    // Computed
    const hasActiveFilters = computed(() => {
      return !!(filters.status || searchQuery.value || filters.sentAfter || filters.sentBefore);
    });

    const paginationStart = computed(() => {
      if (totalItems.value === 0) return 0;
      return (currentPage.value - 1) * itemsPerPage + 1;
    });

    const paginationEnd = computed(() => {
      return Math.min(currentPage.value * itemsPerPage, totalItems.value);
    });

    // Methods
    function onSearchInput() {
      if (searchTimeout.value) clearTimeout(searchTimeout.value);
      searchTimeout.value = window.setTimeout(() => {
        filters.search = searchQuery.value;
      }, 400);
    }

    function clearSearch() {
      searchQuery.value = "";
      filters.search = "";
    }

    function toggleQuickFilters() {
      quickFiltersExpanded.value = !quickFiltersExpanded.value;
    }

    function toggleStatusFilter(status: string) {
      if (filters.status === status) {
        filters.status = '';
      } else {
        filters.status = status;
      }
    }

    function onSortChange() {
      setOrder('created');
      if (orderDir.value !== sortOrder.value) {
        setOrder('created');
      }
    }

    function removeFilter(key: string) {
      if (key === 'status') filters.status = '';
      if (key === 'sentAfter') filters.sentAfter = '';
      if (key === 'sentBefore') filters.sentBefore = '';
    }

    function clearAllFilters() {
      filters.status = '';
      filters.sentAfter = '';
      filters.sentBefore = '';
      clearSearch();
    }

    function formatDate(dateString: string | null): string {
      return formatEmailDate(dateString);
    }

    function formatCc(cc: string[] | null): string {
      if (!cc || cc.length === 0) return '-';
      return cc.join(', ');
    }

    async function togglePreview(email: AuditEmail) {
      if (expandedEmailId.value === email.id) {
        closePreview();
        return;
      }

      expandedEmailId.value = email.id;
      previewContent.value = null;
      previewIsHtml.value = false;

      if (email.sensitive) {
        // No need to fetch body for sensitive emails
        return;
      }

      previewLoading.value = true;
      try {
        const response = await getAuditEmail(email.id);
        if (response.success && response.data) {
          previewContent.value = response.data.bodyContent || null;
          previewIsHtml.value = response.data.isHtml || false;
        }
      } catch (e) {
        previewContent.value = null;
      } finally {
        previewLoading.value = false;
      }
    }

    function closePreview() {
      expandedEmailId.value = null;
      previewContent.value = null;
      previewIsHtml.value = false;
    }

    return {
      // State
      searchQuery,
      quickFiltersExpanded,
      sortOrder,
      filters,
      quickFilterStatuses,

      // Computed
      emails,
      loading,
      error,
      totalItems,
      currentPage,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      hasActiveFilters,
      orderField,
      orderDir,
      paginationStart,
      paginationEnd,

      // Preview
      expandedEmailId,
      previewContent,
      previewIsHtml,
      previewLoading,
      togglePreview,
      closePreview,

      // Methods
      onSearchInput,
      clearSearch,
      toggleQuickFilters,
      toggleStatusFilter,
      onSortChange,
      removeFilter,
      clearAllFilters,
      nextPage,
      previousPage,
      setOrder,
      refresh,
      formatDate,
      formatCc,
    };
  }
});
</script>

<style lang="scss" scoped>
// Color Variables (matching AuditLogs)
$color-primary: #ff2c4f;
$color-bg: #f8f9fa;
$color-card: #ffffff;
$color-border: #e0e0e0;
$color-text-primary: #212529;
$color-text-secondary: #6c757d;

$color-sent: #28a745;
$color-queued: #ffc107;
$color-failed: #dc3545;
$color-skipped: #6c757d;

// Layout
.audit-emails-modern {
  background: $color-bg;
  min-height: 100vh;
  padding-bottom: 2rem;
  font-size: 1rem;
}

// Compact Header (matching AuditLogs .logs-header-compact)
.emails-header-compact {
  background: white;
  border-bottom: 1px solid $color-border;
  padding: 0.5rem 0;

  .header-row {
    display: flex;
    align-items: center;
    gap: 2rem;
    justify-content: space-between;
  }

  .header-title {
    flex-shrink: 0;

    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: $color-text-primary;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      white-space: nowrap;

      .icon-title {
        width: 28px;
        height: 28px;
        color: $color-primary;
        flex-shrink: 0;
      }
    }
  }

  .header-search {
    flex: 1;
    max-width: 600px;

    .search-bar-wrapper {
      position: relative;
      width: 100%;

      .search-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        color: $color-text-secondary;
        pointer-events: none;
        z-index: 1;
      }

      .search-input {
        width: 100%;
        padding: 0.75rem 2.5rem 0.75rem 3rem;
        border: 2px solid $color-border;
        border-radius: 10px;
        transition: all 0.2s ease;

        &:focus {
          outline: none;
          border-color: $color-primary;
          box-shadow: 0 0 0 3px rgba($color-primary, 0.1);
        }

        &::placeholder {
          color: $color-text-secondary;
        }
      }

      .clear-search {
        position: absolute;
        right: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        background: $color-text-secondary;
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 1;
        padding: 4px;

        svg {
          width: 14px;
          height: 14px;
          stroke-width: 2.5;
        }

        &:hover {
          background: $color-text-primary;
        }
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .btn-icon {
    background: white;
    border: 1px solid $color-border;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    .icon,
    svg {
      width: 20px;
      height: 20px;
      color: $color-text-primary;
      flex-shrink: 0;
    }

    &:hover:not(:disabled) {
      border-color: $color-primary;
      background: lighten($color-primary, 45%);
      transform: translateY(-1px);

      .icon,
      svg {
        color: $color-primary;
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

// Quick Filters Section (matching AuditLogs)
.quick-filters-section {
  padding: 0.5rem 0;
  background: white;
  border-bottom: 1px solid $color-border;

  .filters-wrapper {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .filters-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    user-select: none;
    padding: 0.5rem;
    transition: background-color 0.2s ease;
    border-radius: 6px;
    margin: -0.5rem;

    &:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }
  }

  .filters-label {
    font-weight: 600;
    color: $color-text-primary;
  }

  .collapse-btn {
    background: transparent;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $color-text-secondary;
    transition: all 0.2s ease;
    border-radius: 4px;

    svg {
      width: 18px;
      height: 18px;
      transition: transform 0.2s ease;
    }

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: $color-text-primary;
    }

    &.collapsed {
      svg {
        transform: rotate(-90deg);
      }
    }
  }

  .quick-filters {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .filter-group-label {
    font-weight: 600;
    color: $color-text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  .filter-group-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .filter-btn {
    background: white;
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

    // Color indicators for status filters
    &.filter-status-sent::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-sent;
      border-radius: 2px;
      opacity: 0.7;
    }

    &.filter-status-queued::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-queued;
      border-radius: 2px;
      opacity: 0.7;
    }

    &.filter-status-failed::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-failed;
      border-radius: 2px;
      opacity: 0.7;
    }

    &.filter-status-skipped::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-skipped;
      border-radius: 2px;
      opacity: 0.7;
    }

    &.filter-status-sent,
    &.filter-status-queued,
    &.filter-status-failed,
    &.filter-status-skipped {
      padding-left: 1.25rem;
    }

    .filter-label {
    }

    &:hover {
      border-color: darken($color-border, 15%);
      background: $color-bg;
    }

    &.active {
      border-color: $color-primary;
      background: rgba($color-primary, 0.05);
      color: $color-primary;
      font-weight: 600;
    }
  }

  .divider {
    width: 1px;
    height: 24px;
    background: $color-border;
    flex-shrink: 0;
  }

  .date-inputs {
    gap: 0.5rem;
  }

  .date-input {
    border: 2px solid $color-border;
    border-radius: 8px;
    padding: 0.2rem 0.6rem;
    color: $color-text-primary;
    background: white;
    outline: none;
    transition: all 0.2s ease;

    &:focus {
      border-color: $color-primary;
      box-shadow: 0 0 0 3px rgba($color-primary, 0.1);
    }
  }

  .date-separator {
    color: $color-text-secondary;
  }
}

// Slide transition
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

// Active Filters (Chips) — matching AuditLogs
.active-filters-section {
  padding: 0.5rem 0;
  background: white;
  border-bottom: 1px solid $color-border;

  .active-filters {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .filter-label {
    font-weight: 600;
    color: $color-text-secondary;
    white-space: nowrap;
  }

  .filter-chips {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .chip {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba($color-primary, 0.08);
    color: $color-primary;
    border: 1px solid rgba($color-primary, 0.2);
    border-radius: 16px;
    padding: 0.2rem 0.6rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    .chip-close {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    &:hover {
      background: rgba($color-primary, 0.15);
      border-color: $color-primary;
    }
  }

  .clear-all-btn {
    background: none;
    border: 1px solid $color-border;
    border-radius: 6px;
    padding: 0.2rem 0.75rem;
    color: $color-text-secondary;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: $color-failed;
      color: $color-failed;
    }
  }
}

// Loading
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem;
  color: $color-text-secondary;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid $color-border;
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// Pagination (matching AuditLogs)
.pagination-section {
  padding: 0.75rem 0;
  background: white;
  border-bottom: 1px solid $color-border;

  &.pagination-bottom {
    border-bottom: none;
    border-top: 1px solid $color-border;
  }

  .pagination-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .pagination-info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .results-info {
    color: $color-text-secondary;
    display: flex;
    align-items: center;
    gap: 0.25rem;

    strong {
      color: $color-text-primary;
    }
  }

  .sort-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sort-label {
    color: $color-text-secondary;
    font-weight: 500;
  }

  .sort-select {
    border: 1px solid $color-border;
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    color: $color-text-primary;
    background: white;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: $color-primary;
    }
  }

  .pagination-actions-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
  }

  .page-navigation {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .page-indicator {
    color: $color-text-secondary;
    display: flex;
    align-items: center;
    gap: 0.25rem;

    strong {
      color: $color-text-primary;
    }
  }

  .nav-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn-nav {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: white;
    border: 1px solid $color-border;
    border-radius: 6px;
    padding: 0.35rem 0.75rem;
    color: $color-text-primary;
    cursor: pointer;
    transition: all 0.2s ease;

    svg {
      width: 16px;
      height: 16px;
    }

    &:hover:not(:disabled) {
      border-color: $color-primary;
      color: $color-primary;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

// Empty state
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: $color-text-secondary;

  .empty-icon {
    width: 64px;
    height: 64px;
    margin-bottom: 1rem;
    opacity: 0.4;
  }

  .empty-title {
    font-size: 18px;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: 0.5rem;
  }

  .empty-message {
    margin-bottom: 1rem;
  }
}

// Error state
.error-state {
  padding: 1rem 0;
}

// Table Section
.table-section {
  padding: 0;
}

.table-responsive {
  overflow-x: auto;
}

.emails-table {
  width: 100%;
  border-collapse: collapse;
  background: white;

  thead {
    border-bottom: 2px solid $color-border;

    th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      color: $color-text-secondary;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      background: $color-bg;

      &.sortable {
        cursor: pointer;
        user-select: none;

        &:hover {
          color: $color-primary;
        }
      }
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid lighten($color-border, 5%);
      transition: background-color 0.15s;

      &:hover {
        background: rgba($color-primary, 0.02);
      }

      &:last-child {
        border-bottom: none;
      }
    }

    td {
      padding: 0.7rem 1rem;
      color: $color-text-primary;
      vertical-align: middle;
    }
  }
}

.sort-indicator {
  display: inline-flex;
  margin-left: 0.3rem;
  vertical-align: middle;

  svg {
    width: 14px;
    height: 14px;
  }
}

.col-date {
  white-space: nowrap;
  color: $color-text-secondary;
}

.col-status {
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 12px;
  font-weight: 600;
  text-transform: capitalize;

  &.status-sent {
    background: rgba($color-sent, 0.1);
    color: darken($color-sent, 10%);
  }

  &.status-queued {
    background: rgba($color-queued, 0.15);
    color: darken($color-queued, 25%);
  }

  &.status-failed {
    background: rgba($color-failed, 0.1);
    color: darken($color-failed, 5%);
  }

  &.status-skipped {
    background: rgba($color-skipped, 0.1);
    color: darken($color-skipped, 5%);
  }
}

.col-recipient {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-subject {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-cc {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $color-text-secondary;
}

// Clickable email rows
.email-row {
  cursor: pointer;

  &.row-expanded {
    background: rgba($color-primary, 0.03);
  }
}

// Preview row
.preview-row {
  td {
    padding: 0 !important;
    border-bottom: 2px solid $color-border;
  }
}

.email-preview {
  padding: 1rem 1.5rem;
  background: #fafbfc;
  border-top: 1px solid $color-border;

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .preview-title {
    font-weight: 600;
    color: $color-text-primary;
    margin: 0;
  }

  .preview-close {
    background: none;
    border: 1px solid $color-border;
    border-radius: 6px;
    padding: 0.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $color-text-secondary;
    transition: all 0.2s ease;

    svg {
      width: 16px;
      height: 16px;
    }

    &:hover {
      border-color: $color-failed;
      color: $color-failed;
    }
  }
}

.preview-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  color: $color-text-secondary;
}

.preview-sensitive {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  background: rgba($color-queued, 0.08);
  border: 1px solid rgba($color-queued, 0.2);
  border-radius: 8px;

  .sensitive-icon {
    width: 24px;
    height: 24px;
    color: darken($color-queued, 15%);
    flex-shrink: 0;
  }

  .sensitive-message {
    color: darken($color-queued, 25%);
    margin: 0;
  }
}

.preview-body {
  border: 1px solid $color-border;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.preview-iframe {
  width: 100%;
  min-height: 300px;
  border: none;
  display: block;
}

.preview-text {
  padding: 1rem;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: $color-text-primary;
  max-height: 400px;
  overflow-y: auto;
}

.preview-empty {
  padding: 1rem;
  color: $color-text-secondary;
  margin: 0;
}

</style>
