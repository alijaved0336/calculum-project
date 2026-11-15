<template>
<div class="change-requests-modern">
  <DenyRequestModal v-if="modalDenyRequestShowing" @confirm="handleConfirmDeny" @close="() => modalDenyRequestShowing = false"></DenyRequestModal>
  <MarkAsSolvedModal v-if="modalMarkAsSolvedShowing" @confirm="handleConfirmMarkAsSolved" @close="() => modalMarkAsSolvedShowing = false"></MarkAsSolvedModal>
  <DataChangeModal v-if="modalEditReqShowing" :currentObj="selectedObj" @update-grid-obj="updateSelectedRow" @close="() => modalEditReqShowing = false"></DataChangeModal>
  <CalculumDeleteModal v-if="modalDeleteConfirmShowing" @hide="() => modalDeleteConfirmShowing = false" @delete="deleteRow" :forDeleteDataChangeRow="true"></CalculumDeleteModal>
  <CalculumCloneModal v-if="modalCloneConfirmShowing" :forCloneRow="true" @hide="() => modalCloneConfirmShowing = false" @clone="cloneRow"></CalculumCloneModal>
  <section class="requests-header-compact">
    <div class="container-fluid">
      <div class="header-row">
        <div class="header-title">
          <h2 class="page-title">
            <svg class="icon-title" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>{{ $t('adminBackend.adminChangeRequest.title') }}
          </h2>
        </div>
        <div class="d-flex gap-2">
          <div class="header-search gap-2">
            <div class="search-bar-wrapper">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input class="search-input" type="text" v-model="searchQuery" :placeholder="$t('adminBackend.dataChange.search.placeholder') || 'Search requests...'" @input="onSearchInput"/>
              <button class="clear-search" v-if="searchQuery" @click="clearSearch">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="header-actions gap-2">
            <button class="btn-icon" @click="refetch" :disabled="loading" :class="{ 'loading': loading }" :title="$t('adminBackend.audit.actions.refresh') || 'Refresh'">
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
        <div class="filters-label">{{ $t('adminBackend.dataChange.filters.quickFilters') || 'Quick Filters' }}:</div>
        <div class="quick-filters">
          <button class="filter-btn" v-for="status in quickFilterStatuses" :key="status.value" :class="['filter-status-' + status.value.toLowerCase(), { active: filters.status === status.value }]" @click="toggleStatusFilter(status.value)"><span class="filter-label">{{ status.label }}</span></button>
        </div>
      </div>
    </div>
  </section>
  <section class="active-filters-section" v-if="hasActiveFilters">
    <div class="container-fluid">
      <div class="active-filters">
        <div class="filter-label">{{ $t('adminBackend.dataChange.filters.active') || 'Active Filters' }}:</div>
        <div class="filter-chips">
          <div class="chip" v-if="searchQuery" @click="clearSearch"><span>{{ $t('adminBackend.dataChange.filters.search') || 'Search' }}: "{{ searchQuery }}"</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
          <div class="chip" v-if="filters.status" @click="removeFilter('status')"><span>{{ $t('adminBackend.dataChange.filters.status') || 'Status' }}: {{ getStatusLabel(filters.status) }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
        </div>
        <button class="clear-all-btn" @click="clearAllFilters">{{ $t('adminBackend.dataChange.filters.clearAll') || 'Clear All' }}</button>
      </div>
    </div>
  </section>
  <section class="pagination-section pagination-top" v-if="!loading || changeRequests.length > 0">
    <div class="container-fluid">
      <div class="pagination-controls">
        <div class="pagination-info-row">
          <div class="results-info"><span class="results-label" v-if="!loading && totalCount > 0">{{ $t('adminBackend.dataChange.showing') || 'Showing' }} </span><strong class="results-count">{{ changeRequests.length }} </strong><span class="results-of">{{ $t('adminBackend.dataChange.of') || 'of' }} </span><strong class="results-total">{{ totalCount }} </strong><span class="results-text">{{ $t('adminBackend.dataChange.results') || 'results' }}</span></div>
          <div class="sort-control">
            <label class="sort-label">{{ $t('adminBackend.dataChange.sort.label') || 'Sort' }}:</label>
            <select class="sort-select" v-model="sortOrder" @change="onSortChange">
              <option value="desc">{{ $t('adminBackend.dataChange.sort.newest') || 'Newest First' }}</option>
              <option value="asc">{{ $t('adminBackend.dataChange.sort.oldest') || 'Oldest First' }}</option>
            </select>
          </div>
        </div>
        <div class="pagination-actions-row">
          <div class="page-size-control">
            <label class="page-size-label">{{ $t('adminBackend.dataChange.pagination.itemsPerPage') || 'Items per page' }}:</label>
            <select class="page-size-select" v-model.number="pagination.itemsPerPage" @change="onPageSizeChange">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
          <div class="page-navigation">
            <div class="page-indicator"><span class="page-text">{{ $t('adminBackend.dataChange.pagination.page') || 'Page' }} </span><strong>{{ currentPage }} </strong><span class="of-text">{{ $t('adminBackend.dataChange.of') || 'of' }} </span><strong>{{ totalPages }}</strong></div>
            <div class="nav-buttons">
              <button class="btn-nav" @click="goToPreviousPage" :disabled="!hasPreviousPage || loading" :title="$t('adminBackend.dataChange.pagination.previous') || 'Previous'">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"></path>
                </svg><span>{{ $t('adminBackend.dataChange.pagination.previous') || 'Previous' }}</span>
              </button>
              <button class="btn-nav" @click="goToNextPage" :disabled="!hasNextPage || loading" :title="$t('adminBackend.dataChange.pagination.next') || 'Next'"><span>{{ $t('adminBackend.dataChange.pagination.next') || 'Next' }}</span>
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
  <section class="timeline-section" v-if="!loading || changeRequests.length > 0">
    <div class="container-fluid">
      <div class="empty-state" v-if="changeRequests.length === 0">
        <div class="empty-icon">📋</div>
        <h3 class="empty-title">{{ $t('adminBackend.dataChange.emptyState.title') || 'No Change Requests Found' }}</h3>
        <p class="empty-message">{{ $t('adminBackend.dataChange.emptyState.message') || 'There are no change requests matching your filters.' }}</p>
        <button class="clear-all-btn" v-if="hasActiveFilters" @click="clearAllFilters">{{ $t('adminBackend.dataChange.filters.clearAll') || 'Clear All Filters' }}</button>
      </div>
      <div class="timeline-container" v-else>
        <div class="date-group" v-for="group in groupedRequests" :key="group.date" :class="{ collapsed: collapsedGroups.has(group.date) }">
          <div class="date-header" @click="toggleGroupCollapse(group.date)">
            <div class="date-header-content">
              <div class="chevron-icon" :class="{ rotated: !collapsedGroups.has(group.date) }">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"></path>
                </svg>
              </div><span class="date-label">{{ group.label }}</span><span class="date-count">({{ group.requests.length }})</span>
            </div>
          </div>
          <div class="timeline-line" v-if="!collapsedGroups.has(group.date)"></div>
          <div class="requests-list" v-if="!collapsedGroups.has(group.date)">
            <div class="request-card" v-for="request in group.requests" :key="request.id" :class="{ expanded: expandedRequestIds.has(request.id) }">
              <div class="card-border" :class="`border-${request.status.toLowerCase()}`"></div>
              <div class="card-content">
                <div class="card-header" @click="toggleExpand(request.id)">
                  <div class="header-info">
                    <div class="request-time">{{ formatTime(request.created) }}</div><span class="header-separator">|</span>
                    <div class="status-badge" :class="`status-${request.status.toLowerCase()}`">{{ getStatusLabel(request.status) }}</div><span class="header-separator">|</span>
                    <div class="header-meta"><span class="meta-item" v-if="request.createdBy">{{ getFullName(request.createdBy) }}</span><span class="meta-separator" v-if="request.createdBy && (request.entity?.company?.name || request.entity)">|</span><span class="meta-item" v-if="request.entity?.company?.name">{{ request.entity.company.name }}</span><span class="meta-separator" v-if="request.entity?.company?.name && request.entity">|</span><span class="meta-item" v-if="request.entity">{{ request.entity.name }}</span></div>
                  </div>
                  <div class="header-right">
                    <div class="expand-indicator">
                      <svg v-if="expandedRequestIds.has(request.id)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 15l-6-6-6 6"></path>
                      </svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9l6 6 6-6"></path>
                      </svg>
                    </div>
                  </div>
                </div>
                <div class="card-message-compact">{{ request.userMessage || '-' }}</div>
                <div class="card-expanded" v-if="expandedRequestIds.has(request.id)">
                  <div class="card-expanded-layout" :class="{ 'activities-collapsed': activitiesCollapsed.get(request.id) }">
                    <div class="card-main-content">
                      <div class="card-metadata-grid">
                        <div class="activities-expand-btn-wrapper" v-if="activitiesCollapsed.get(request.id)">
                          <button class="activities-expand-btn" @click="toggleActivitiesCollapse(request.id)" :title="$t('adminBackend.dataChange.activities.expand') || 'Expand Activities'">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg><span class="activities-badge" v-if="getActivitiesForRequest(request.id).length > 0">{{ getActivitiesForRequest(request.id).length }}</span>
                          </button>
                        </div>
                        <div class="metadata-column">
                          <div class="metadata-row">
                            <div class="metadata-label">{{ $t('adminBackend.dataChange.columns.status') || 'Status' }}:</div>
                            <div class="metadata-value">{{ getStatusLabel(request.status) }}</div>
                          </div>
                          <div class="metadata-row" v-if="request.changeType">
                            <div class="metadata-label">{{ $t('adminBackend.dataChange.columns.changeType') || 'Change Type' }}:</div>
                            <div class="metadata-value">{{ getChangeTypeLabel(request.changeType) }}</div>
                          </div>
                          <div class="metadata-row" v-if="request.createdBy">
                            <div class="metadata-label">{{ $t('adminBackend.dataChange.columns.requestedBy') || 'Requested By' }}:</div>
                            <div class="metadata-value">{{ getFullName(request.createdBy) }}</div>
                          </div>
                          <div class="metadata-row" v-if="request.createdBy?.email">
                            <div class="metadata-label">{{ $t('adminBackend.dataChange.columns.email') || 'Email' }}:</div>
                            <div class="metadata-value-with-copy">
                              <div class="metadata-value">{{ request.createdBy.email }}</div>
                              <button class="btn-copy-mini" @click.stop="copyToClipboard(request.createdBy.email, 'Email')">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div class="metadata-row" v-if="request.status === 'rejected' || request.status === 'solved'">
                            <div class="metadata-label">{{ $t('adminBackend.dataChange.columns.reviewedBy') || 'Reviewed By' }}:</div>
                            <div class="metadata-value">{{ request.reviewedBy ? getFullName(request.reviewedBy) : '-' }}</div>
                          </div>
                        </div>
                        <div class="metadata-column">
                          <div class="metadata-row" v-if="request.entity">
                            <div class="metadata-label">{{ $t('adminBackend.dataChange.columns.entity') || 'Entity' }}:</div>
                            <div class="metadata-value">{{ request.entity.name }}</div>
                          </div>
                          <div class="metadata-row" v-if="request.entity?.company?.name">
                            <div class="metadata-label">{{ $t('adminBackend.dataChange.columns.company') || 'Company' }}:</div>
                            <div class="metadata-value">{{ request.entity.company.name }}</div>
                          </div>
                          <div class="metadata-row" v-if="request.spendFileVersion">
                            <div class="metadata-label">{{ $t('adminBackend.dataChange.columns.spendFile') || 'Spend File' }}:</div>
                            <div class="metadata-value">{{ request.spendFileVersion.name }} ({{ request.spendFileVersion.version || '-' }})</div>
                          </div>
                          <div class="metadata-row" v-if="request.created">
                            <div class="metadata-label">{{ $t('adminBackend.dataChange.columns.created') || 'Created' }}:</div>
                            <div class="metadata-value">{{ formatDate(request.created) }}</div>
                          </div>
                          <div class="metadata-row" v-if="request.updated">
                            <div class="metadata-label">{{ $t('adminBackend.dataChange.columns.updated') || 'Updated' }}:</div>
                            <div class="metadata-value">{{ formatDate(request.updated) }}</div>
                          </div>
                        </div>
                      </div>
                      <div class="card-details" v-if="request.values && Object.keys(request.values).length > 0">
                        <div class="detail-row-full">
                          <div class="detail-label">{{ $t('adminBackend.dataChange.details.values') || 'Change Values' }}:</div>
                          <pre class="event-data">{{ JSON.stringify(request.values, null, 2) }}</pre>
                        </div>
                      </div>
                      <div class="card-resolution-message" v-if="request.resolutionMessage">
                        <div class="resolution-header">
                          <svg class="resolution-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <div class="resolution-label">{{ $t('adminBackend.dataChange.details.resolutionMessage') || 'Resolution Message' }}:</div>
                        </div>
                        <div class="resolution-content">{{ request.resolutionMessage }}</div>
                      </div>
                      <div class="card-actions">
                        <template v-if="request.status === 'pending'">
                          <button class="btn-action btn-danger" @click.stop="handleDenyRequest(parseRequest(request))" :title="$t('global.reject') || 'Reject'">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg><span>{{ $t('global.reject') || 'Reject' }}</span>
                          </button>
                          <button class="btn-action" @click.stop="handleApproveAndChange(parseRequest(request))" :title="$t('adminBackend.dataChange.approveAndChange') || 'Approve & Change'">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg><span>{{ $t('adminBackend.dataChange.approveAndChange') || 'Approve & Change' }}</span>
                          </button>
                          <button class="btn-action" @click.stop="handleOnlyMarkAsSolved(parseRequest(request))" :title="$t('adminBackend.dataChange.onlyMarkAsSolved') || 'Only mark as solved'">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg><span>{{ $t('adminBackend.dataChange.onlyMarkAsSolved') || 'Only mark as solved' }}</span>
                          </button>
                        </template>
                        <button class="btn-action" v-if="request.status === 'solved' && request.changeType && request.values" @click.stop="showModalEditReq(parseRequest(request))" :title="$t('adminBackend.dataChange.actions.edit') || 'Edit'">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg><span>{{ $t('adminBackend.dataChange.actions.edit') || 'Edit' }}</span>
                        </button>
                        <button class="btn-action" @click.stop="showModalConfirmClone(parseRequest(request))" :title="$t('adminBackend.dataChange.actions.clone') || 'Clone'">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                          </svg><span>{{ $t('adminBackend.dataChange.actions.clone') || 'Clone' }}</span>
                        </button>
                        <button class="btn-action btn-danger" v-if="request.status === 'pending'" @click.stop="showModalConfirmDelete(parseRequest(request))" :title="$t('adminBackend.dataChange.actions.delete') || 'Delete'">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg><span>{{ $t('adminBackend.dataChange.actions.delete') || 'Delete' }}</span>
                        </button>
                      </div>
                    </div>
                    <div class="card-activities-sidebar" v-show="!activitiesCollapsed.get(request.id)">
                      <ChangeRequestActivities :activities="getActivitiesForRequest(request.id)" :collapsed="activitiesCollapsed.get(request.id) ?? true" @toggle-collapse="toggleActivitiesCollapse(request.id)"></ChangeRequestActivities>
                      <AddChangeRequestActivity v-if="request.status === 'pending'" :changeRequestId="request.id" :loading="isCreatingActivity(request.id)" @submit="(data) => handleCreateActivity(request.id, data)" @cancel="() => {}"></AddChangeRequestActivity>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="pagination-section pagination-bottom" v-if="!loading || changeRequests.length > 0">
    <div class="container-fluid">
      <div class="pagination-controls">
        <div class="pagination-info-row">
          <div class="results-info"><span class="results-label" v-if="!loading && totalCount > 0">{{ $t('adminBackend.dataChange.showing') || 'Showing' }} </span><strong class="results-count">{{ changeRequests.length }} </strong><span class="results-of">{{ $t('adminBackend.dataChange.of') || 'of' }} </span><strong class="results-total">{{ totalCount }} </strong><span class="results-text">{{ $t('adminBackend.dataChange.results') || 'results' }}</span></div>
          <div class="sort-control">
            <label class="sort-label">{{ $t('adminBackend.dataChange.sort.label') || 'Sort' }}:</label>
            <select class="sort-select" v-model="sortOrder" @change="onSortChange">
              <option value="desc">{{ $t('adminBackend.dataChange.sort.newest') || 'Newest First' }}</option>
              <option value="asc">{{ $t('adminBackend.dataChange.sort.oldest') || 'Oldest First' }}</option>
            </select>
          </div>
        </div>
        <div class="pagination-actions-row">
          <div class="page-size-control">
            <label class="page-size-label">{{ $t('adminBackend.dataChange.pagination.itemsPerPage') || 'Items per page' }}:</label>
            <select class="page-size-select" v-model.number="pagination.itemsPerPage" @change="onPageSizeChange">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
          <div class="page-navigation">
            <div class="page-indicator"><span class="page-text">{{ $t('adminBackend.dataChange.pagination.page') || 'Page' }} </span><strong>{{ currentPage }} </strong><span class="of-text">{{ $t('adminBackend.dataChange.of') || 'of' }} </span><strong>{{ totalPages }}</strong></div>
            <div class="nav-buttons">
              <button class="btn-nav" @click="goToPreviousPage" :disabled="!hasPreviousPage || loading" :title="$t('adminBackend.dataChange.pagination.previous') || 'Previous'">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"></path>
                </svg><span>{{ $t('adminBackend.dataChange.pagination.previous') || 'Previous' }}</span>
              </button>
              <button class="btn-nav" @click="goToNextPage" :disabled="!hasNextPage || loading" :title="$t('adminBackend.dataChange.pagination.next') || 'Next'"><span>{{ $t('adminBackend.dataChange.pagination.next') || 'Next' }}</span>
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
import { defineComponent, ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useChangeRequests, formatChangeRequestDate, formatChangeRequestDateOnly, type ChangeRequest, type ChangeRequestFilters } from "@/composables/useChangeRequests";
import { useAdminBackendStore } from '@/stores/adminBackend';
import { removeIRI } from '@/utils';
import * as formatData from "@/utils/FormatData";
import * as Iso36166 from "@/utils/ISO3166-1";
import CalculumCloneModal from "@/modules/components/CalculumCloneModal.vue";
import CalculumDeleteModal from "@/modules/components/CalculumDeleteModal.vue";
import DataChangeModal from "@/modules/adminBackend/components/DataChangeModal.vue";
import MarkAsSolvedModal from "@/modules/adminBackend/components/MarkAsSolvedModal.vue";
import DenyRequestModal from "@/modules/adminBackend/components/DenyRequestModal.vue";
import ChangeRequestActivities from "@/modules/adminBackend/components/ChangeRequestActivities.vue";
import AddChangeRequestActivity from "@/modules/adminBackend/components/AddChangeRequestActivity.vue";
import { useToast } from "vue-toastification";

export default defineComponent({
  name: "AdminDataChange",
  components: {
    CalculumCloneModal,
    CalculumDeleteModal,
    DataChangeModal,
    MarkAsSolvedModal,
    DenyRequestModal,
    ChangeRequestActivities,
    AddChangeRequestActivity,
  },
  setup() {
    const adminBackendStore = useAdminBackendStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();

    // Set page title
    document.title = translate.t('adminBackend.adminChangeRequest.title');

    const changeTypes = {
      COUNTRY_CREDIT_RATING: 'COUNTRY_CREDIT_RATING',
      COMPANY_CREDIT_RATING: 'COMPANY_CREDIT_RATING',
      FUNDING_COST: 'FUNDING_COSTS',
      PEER_GROUP_AVERAGE: 'PEER_GROUP_AVG'
    };

    // State
    const searchQuery = ref("");
    const expandedRequestIds = ref<Set<string>>(new Set());
    const searchTimeout = ref<number | null>(null);
    const collapsedGroups = ref<Set<string>>(new Set());
    const sortOrder = ref<"asc" | "desc">("desc");
    const activitiesCollapsed = ref<Map<string, boolean>>(new Map()); // Per-card collapsed state, default: collapsed (true)

    // Filters state
    const filters = ref<ChangeRequestFilters>({});
    const pagination = ref({
      page: 1,
      itemsPerPage: 10
    });

    // Modals state
    const modalEditReqShowing = ref(false);
    const modalDeleteConfirmShowing = ref(false);
    const modalCloneConfirmShowing = ref(false);
    const modalMarkAsSolvedShowing = ref(false);
    const modalDenyRequestShowing = ref(false);
    const selectedObj = ref<any>({});
    const deleteObjTemp = ref<any>({});
    const cloneObjTemp = ref<any>({});
    const markAsSolvedObjTemp = ref<any>({});

    // Activities state
    const activitiesMap = ref<Map<string, any[]>>(new Map());
    const loadingActivities = ref<Map<string, boolean>>(new Map());
    const creatingActivity = ref<Map<string, boolean>>(new Map());

    // Use the composable
    const { changeRequests, paginationInfo, pageInfo, totalCount, loading, error, refetch, resetPagination, loadNextPage, loadPreviousPage, setFilterChangeProgrammatic } = useChangeRequests(
      filters,
      pagination,
      sortOrder
    );

    // Quick filter definitions
    const quickFilterStatuses = [
      { value: "pending", label: translate.t('global.pending') || 'Pending' },
      { value: "solved", label: translate.t('adminBackend.dataChange.solved') || 'Solved' },
      { value: "rejected", label: translate.t('global.rejected') || 'Rejected' }
    ];

    // Computed
    const hasActiveFilters = computed(() => {
      return !!(searchQuery.value || filters.value.status || filters.value.changeType || filters.value.search);
    });

    // Group requests by date
    const groupedRequests = computed(() => {
      const groups: { date: string; label: string; requests: ChangeRequest[] }[] = [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      changeRequests.value.forEach((request: ChangeRequest) => {
        const requestDate = new Date(request.created);
        const requestDateOnly = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());
        
        let dateLabel: string;
        if (requestDateOnly.getTime() === today.getTime()) {
          dateLabel = translate.t("adminBackend.dataChange.dates.today") || "Today";
        } else if (requestDateOnly.getTime() === yesterday.getTime()) {
          dateLabel = translate.t("adminBackend.dataChange.dates.yesterday") || "Yesterday";
        } else {
          dateLabel = formatChangeRequestDateOnly(request.created);
        }

        const dateKey = requestDateOnly.toISOString().split('T')[0];
        let group = groups.find(g => g.date === dateKey);
        
        if (!group) {
          group = { date: dateKey, label: dateLabel, requests: [] };
          groups.push(group);
        }
        
        group.requests.push(request);
      });

      return groups;
    });

    // Pagination computed properties
    const currentPage = computed(() => pagination.value.page);
    const totalPages = computed(() => Math.ceil(totalCount.value / pagination.value.itemsPerPage) || 1);
    const hasNextPage = computed(() => pageInfo.value.hasNextPage);
    const hasPreviousPage = computed(() => pagination.value.page > 1);

    // Helper functions
    const getStatusLabel = (status: string): string => {
      const statusMap: Record<string, string> = {
        'pending': translate.t('global.pending') || 'Pending',
        'solved': translate.t('adminBackend.dataChange.solved') || 'Solved',
        'rejected': translate.t('global.rejected') || 'Rejected'
      };
      return statusMap[status.toLowerCase()] || status;
    };

    const getChangeTypeLabel = (changeType: string): string => {
      const typeMap: Record<string, string> = {
        'COUNTRY_CREDIT_RATING': translate.t("global.countryCreditRating") || 'Country Credit Rating',
        'COMPANY_CREDIT_RATING': translate.t("global.companyCreditRating") || 'Company Credit Rating',
        'FUNDING_COSTS': translate.t("global.fundingCost") || 'Funding Cost',
        'PEER_GROUP_AVG': translate.t("global.peerGroupAverageStrategy") || 'Peer Group Average'
      };
      return typeMap[changeType] || changeType;
    };

    const getFullName = (user: any): string => {
      if (!user) return '-';
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      return `${firstName} ${lastName}`.trim() || '-';
    };

    // Parse request to match old format for modals
    const parseRequest = (request: ChangeRequest): any => {
      const parsed: any = {
        ...request,
        id: removeIRI(request['@id']),
        dateRequest: formatData.getISODate(request.created) ?? '-',
        user: getFullName(request.createdBy),
        email: request.createdBy?.email ?? "-",
        status: request.status ?? "pending",
        userMessage: request.userMessage ?? "-",
        resolutionMessage: request.resolutionMessage ?? "",
        cloned: request.cloned || false,
        values: request.values ?? {},
        oldValues: request.oldValues ?? [],
        superAdminCheckedRequest: request.reviewedBy ? 'Yes' : 'No'
      };

      if (request.entity) {
        parsed.entityName = request.entity.name ?? "-";
        parsed.entityDomain = request.entity.domain ?? "-";
        parsed.entityWhole = request.entity['@id'];
        parsed.entityId = removeIRI(request.entity['@id']) ?? "-";
        parsed.companyName = request.entity.company?.name ?? "-";
        parsed.countryCode = request.entity.country?.code;
        parsed.country = request.entity.country?.code ? Iso36166.getCountryName(request.entity.country.code) ?? "-" : "-";
      } else {
        parsed.entityName = "-";
        parsed.entityDomain = "-";
        parsed.entityWhole = "-";
        parsed.entityId = "-";
        parsed.companyName = "-";
        parsed.countryCode = "-";
        parsed.country = "-";
      }

      if (request.spendFileVersion) {
        parsed.spendFile = removeIRI(request.spendFileVersion['@id']) ?? "-";
        parsed.spendFileName = request.spendFileVersion.name 
          ? `${request.spendFileVersion.name} (${request.spendFileVersion.version ?? "-"})` 
          : "-";
        parsed.spendFileVersionWhole = request.spendFileVersion['@id'] ?? null;
      } else {
        parsed.spendFile = "-";
        parsed.spendFileName = "-";
        parsed.spendFileVersionWhole = null;
      }

      // Data change values
      if (request.changeType && request.values) {
        switch (request.changeType) {
          case changeTypes.COMPANY_CREDIT_RATING:
            parsed.dataChanged = `${translate.t("global.companyCreditRating")} : ${request.values.creditRating}`;
            break;
          case changeTypes.COUNTRY_CREDIT_RATING:
            parsed.dataChanged = `${translate.t("global.countryCreditRating")} : ${request.values.countryCode} : ${request.values.creditRating}`;
            break;
          case changeTypes.FUNDING_COST:
            parsed.dataChanged = `${translate.t("global.fundingCost")} : ${parseFloat(request.values.fundingCost) * 100} %`;
            break;
          case changeTypes.PEER_GROUP_AVERAGE:
            parsed.dataChanged = `${translate.t("global.peerGroupAverageStrategy")} : ${request.values.peerGroupAverageStrategy}`;
            break;
        }
      }

      return parsed;
    };

    // Clear activities cache when filters change
    const clearActivitiesCache = () => {
      activitiesMap.value.clear();
      loadingActivities.value.clear();
      creatingActivity.value.clear();
      // Collapse all expanded cards so activities reload when expanded again
      expandedRequestIds.value.clear();
    };

    // Methods
    const toggleStatusFilter = (status: string) => {
      // Mark filter change as programmatic to avoid double fetch from watch
      setFilterChangeProgrammatic();
      if (filters.value.status === status) {
        filters.value.status = undefined;
      } else {
        filters.value.status = status;
      }
      // Clear activities cache when filter changes
      clearActivitiesCache();
      // Reset pagination
      resetPagination();
      // Explicitly refetch since we're bypassing the watch
      refetch();
    };

    const removeFilter = (filterKey: keyof ChangeRequestFilters) => {
      // Mark filter change as programmatic to avoid double fetch from watch
      setFilterChangeProgrammatic();
      filters.value[filterKey] = undefined;
      // Clear activities cache when filter changes
      clearActivitiesCache();
      // Reset pagination
      resetPagination();
      // Explicitly refetch since we're bypassing the watch
      refetch();
    };

    const clearAllFilters = () => {
      // Mark filter change as programmatic to avoid double fetch from watch
      setFilterChangeProgrammatic();
      filters.value = {};
      searchQuery.value = "";
      // Clear activities cache when filters are cleared
      clearActivitiesCache();
      // Reset pagination
      resetPagination();
      // Explicitly refetch since we're bypassing the watch
      refetch();
    };

    const onSearchInput = () => {
      // Debounce search
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
      }
      
      searchTimeout.value = window.setTimeout(() => {
        // Mark filter change as programmatic to avoid double fetch from watch
        setFilterChangeProgrammatic();
        if (searchQuery.value && searchQuery.value.trim()) {
          filters.value.search = searchQuery.value.trim();
        } else {
          delete filters.value.search;
        }
        
        if (import.meta.env.DEV) console.log("Search query:", searchQuery.value, "Filter:", filters.value.search);
        // Clear activities cache when search changes
        clearActivitiesCache();
        resetPagination();
        // Explicitly refetch since we're bypassing the watch
        refetch();
      }, 500);
    };

    const clearSearch = () => {
      // Mark filter change as programmatic to avoid double fetch from watch
      setFilterChangeProgrammatic();
      searchQuery.value = "";
      delete filters.value.search;
      // Clear activities cache when search is cleared
      clearActivitiesCache();
      resetPagination();
      // Explicitly refetch since we're bypassing the watch
      refetch();
    };

    const toggleExpand = (requestId: string) => {
      const newSet = new Set(expandedRequestIds.value);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
        // Load activities when expanding
        loadActivitiesForRequest(requestId);
        // Initialize activities as collapsed for new expanded card
        if (!activitiesCollapsed.value.has(requestId)) {
          activitiesCollapsed.value.set(requestId, true);
        }
      }
      expandedRequestIds.value = newSet;
    };

    const toggleActivitiesCollapse = (requestId: string) => {
      const newMap = new Map(activitiesCollapsed.value);
      const currentState = newMap.get(requestId) ?? true; // Default to collapsed (true)
      newMap.set(requestId, !currentState);
      activitiesCollapsed.value = newMap;
    };

    // Load activities for a specific request
    const loadActivitiesForRequest = (requestId: string) => {
      // Check if activities are already loaded
      if (activitiesMap.value.has(requestId)) {
        return;
      }

      loadingActivities.value.set(requestId, true);
      
      adminBackendStore.getChangeRequestActivities({
        changeRequestId: requestId,
        callbackSuccess: (activities: any[]) => {
          activitiesMap.value.set(requestId, activities);
          loadingActivities.value.set(requestId, false);
        },
        callbackError: (error: any) => {
          if (import.meta.env.DEV) console.error('Error loading activities:', error);
          toast.error(translate.t('adminBackend.dataChange.activities.loadError') || 'Error loading activities');
          loadingActivities.value.set(requestId, false);
        }
      });
    };

    // Reload activities for a specific request (forces reload even if already loaded)
    const reloadActivitiesForRequest = (requestId: string) => {
      loadingActivities.value.set(requestId, true);
      
      adminBackendStore.getChangeRequestActivities({
        changeRequestId: requestId,
        callbackSuccess: (activities: any[]) => {
          activitiesMap.value.set(requestId, activities);
          loadingActivities.value.set(requestId, false);
        },
        callbackError: (error: any) => {
          if (import.meta.env.DEV) console.error('Error reloading activities:', error);
          loadingActivities.value.set(requestId, false);
        }
      });
    };

    // Create a new activity
    const handleCreateActivity = (requestId: string, activityData: { message: string; activityType: 'comment' | 'information_requested' }) => {
      creatingActivity.value.set(requestId, true);
      
      adminBackendStore.createChangeRequestActivity({
        changeRequestId: requestId,
        message: activityData.message,
        activityType: activityData.activityType,
        callbackSuccess: (newActivity: any) => {
          // Add the new activity to the activities list
          const currentActivities = activitiesMap.value.get(requestId) || [];
          activitiesMap.value.set(requestId, [newActivity, ...currentActivities]);
          creatingActivity.value.set(requestId, false);
          toast.success(translate.t('adminBackend.dataChange.activities.createSuccess') || 'Activity added successfully');
        },
        callbackError: (error: any) => {
          if (import.meta.env.DEV) console.error('Error creating activity:', error);
          const errorMessage = error?.response?.data?.message || error?.message || 'Error creating activity';
          toast.error(errorMessage);
          creatingActivity.value.set(requestId, false);
        }
      });
    };

    // Get activities for a request
    const getActivitiesForRequest = (requestId: string) => {
      // Try to get from activitiesMap first
      if (activitiesMap.value.has(requestId)) {
        return activitiesMap.value.get(requestId) || [];
      }
      
      // Try to get from the request object (if included in API response)
      const request = changeRequests.value.find(r => r.id === requestId);
      if (request?.activities) {
        activitiesMap.value.set(requestId, request.activities);
        return request.activities;
      }
      
      return [];
    };

    // Check if activities are loading for a request
    const isLoadingActivities = (requestId: string) => {
      return loadingActivities.value.get(requestId) || false;
    };

    // Check if creating activity for a request
    const isCreatingActivity = (requestId: string) => {
      return creatingActivity.value.get(requestId) || false;
    };

    const toggleGroupCollapse = (dateKey: string) => {
      if (collapsedGroups.value.has(dateKey)) {
        collapsedGroups.value.delete(dateKey);
      } else {
        collapsedGroups.value.add(dateKey);
      }
      collapsedGroups.value = new Set(collapsedGroups.value);
    };

    const copyToClipboard = (text: string | null, label: string) => {
      if (text) {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
      }
    };

    const goToNextPage = () => {
      if (hasNextPage.value && !loading.value) {
        loadNextPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const goToPreviousPage = () => {
      if (hasPreviousPage.value && !loading.value) {
        loadPreviousPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const onPageSizeChange = () => {
      pagination.value.page = 1;
      resetPagination();
      refetch();
      if (import.meta.env.DEV) console.log("Page size changed to:", pagination.value.itemsPerPage);
    };

    const onSortChange = () => {
      if (import.meta.env.DEV) console.log("Sort order changed:", sortOrder.value);
      resetPagination();
      refetch();
    };

    const formatDate = (dateString: string): string => {
      return formatChangeRequestDate(dateString);
    };

    const formatTime = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
      });
    };

    // Direct action handlers for pending requests
    const handleDenyRequest = (dataItem: any) => {
      selectedObj.value = dataItem;
      modalDenyRequestShowing.value = true;
    };

    const handleConfirmDeny = (rejectionMessage: string) => {
      modalDenyRequestShowing.value = false;
      const requestId = selectedObj.value.id;
      selectedObj.value.status = "rejected";
      const params = {
        changeRequestId: requestId,
        changeType: 'rejected',
        values: [],
        status: 'rejected',
        resolutionMessage: rejectionMessage,
        callbackSuccess: (response: any) => {
          updateSelectedRow(selectedObj.value, 'rejected', response.status, []);
          toast.success(translate.t('adminBackend.dataChange.deny.success') || "Data change request rejected successfully");
          refetch();
          // Reload activities after successful rejection
          if (expandedRequestIds.value.has(requestId)) {
            reloadActivitiesForRequest(requestId);
          }
        },
        callbackError: () => {
          toast.error(translate.t('adminBackend.dataChange.deny.error') || "Failed to reject data change request");
        }
      };
      adminBackendStore.updateDataChangeValues(params);
    };

    const handleApproveAndChange = (dataItem: any) => {
      selectedObj.value = dataItem;
      modalEditReqShowing.value = true;
    };

    const handleOnlyMarkAsSolved = (dataItem: any) => {
      selectedObj.value = dataItem;
      modalMarkAsSolvedShowing.value = true;
    };

    const handleConfirmMarkAsSolved = (resolutionMessage: string) => {
      modalMarkAsSolvedShowing.value = false;
      markAsSolvedObjTemp.value = selectedObj.value;
      markAsSolved(resolutionMessage);
    };

    const showModalConfirmDelete = (dataItem: any) => {
      deleteObjTemp.value = dataItem;
      modalDeleteConfirmShowing.value = true;
    };

    const showModalConfirmClone = (dataItem: any) => {
      cloneObjTemp.value = dataItem;
      modalCloneConfirmShowing.value = true;
    };

    const showModalMarkAsSolved = (dataItem: any) => {
      markAsSolvedObjTemp.value = dataItem;
      modalMarkAsSolvedShowing.value = true;
    };


    const showModalEditReq = (dataItem: any) => {
      selectedObj.value = dataItem;
      modalEditReqShowing.value = true;
    };

    const deleteRow = () => {
      const params = {
        uuid: deleteObjTemp.value["@id"],
        callbackSuccess: () => {
          modalDeleteConfirmShowing.value = false;
          toast.success("Data row deleted successfully");
          refetch();
        },
        callbackError: () => {
          modalDeleteConfirmShowing.value = false;
          toast.error("Data row deletion failed");
        },
      };
      adminBackendStore.deleteItemRequest(params);
    };

    const updateSelectedRow = (currentObj: any, changeType: string, newStatus: string, values: any) => {
      modalEditReqShowing.value = false;
      const requestId = currentObj.id;
      refetch();
      // Reload activities after successful update
      if (expandedRequestIds.value.has(requestId)) {
        reloadActivitiesForRequest(requestId);
      }
    };

    const cloneRow = () => {
      const params = {
        entity: cloneObjTemp.value.entityWhole,
        userMessage: cloneObjTemp.value.userMessage,
        spendFileVersion: cloneObjTemp.value.spendFileVersionWhole,
        cloned: true,
        callbackSuccess: (callbackSuccessData: any) => {
          toast.success("Data row cloned successfully");
          modalCloneConfirmShowing.value = false;
          refetch();
        },
        callbackError: () => {
          modalCloneConfirmShowing.value = false;
          toast.error("Data row cloning failed");
        },
      };
      adminBackendStore.cloneRowRecord(params);
    };

    const markAsSolved = (resolutionMessage?: string) => {
      const requestId = markAsSolvedObjTemp.value.id;
      const params = {
        changeRequestId: requestId,
        entity: markAsSolvedObjTemp.value.entityWhole,
        changeType: markAsSolvedObjTemp.value.changeType || null,
        values: markAsSolvedObjTemp.value.values || [],
        status: 'solved',
        resolutionMessage: resolutionMessage,
        callbackSuccess: (response: any) => {
          modalMarkAsSolvedShowing.value = false;
          toast.success(translate.t('adminBackend.dataChange.markAsSolvedSuccess') || 'Request marked as solved successfully');
          refetch();
          // Reload activities after successful status change
          if (expandedRequestIds.value.has(requestId)) {
            reloadActivitiesForRequest(requestId);
          }
        },
        callbackError: (error: any) => {
          modalMarkAsSolvedShowing.value = false;
          let errorMessage = translate.t('adminBackend.dataChange.markAsSolvedError') || 'Failed to mark as solved';
          if (error?.response?.status === 401) {
            errorMessage = translate.t('global.sessionExpired') || 'Session expired. Please log in again.';
          } else if (error?.response?.status === 403) {
            errorMessage = translate.t('global.insufficientPermissions') || 'Insufficient permissions to perform this action.';
          } else if (error?.response?.status === 404) {
            errorMessage = translate.t('global.requestNotFound') || 'Request not found.';
            refetch();
          }
          toast.error(errorMessage);
        },
      };
      adminBackendStore.updateDataChangeValues(params);
    };


    // Watch for errors
    watch(error, (newError) => {
      if (newError) {
        console.error('Error loading change requests:', newError);
        toast.error(translate.t("adminBackend.dataChange.error") || "Error loading change requests");
      }
    });

    return {
      // State
      searchQuery,
      expandedRequestIds,
      sortOrder,
      filters,
      pagination,
      collapsedGroups,
      activitiesCollapsed,
      quickFilterStatuses,
      modalEditReqShowing,
      modalDeleteConfirmShowing,
      modalCloneConfirmShowing,
      modalMarkAsSolvedShowing,
      modalDenyRequestShowing,
      selectedObj,
      deleteObjTemp,
      cloneObjTemp,
      markAsSolvedObjTemp,
      
      // Computed
      changeRequests,
      groupedRequests,
      paginationInfo,
      pageInfo,
      totalCount,
      loading,
      error,
      hasActiveFilters,
      currentPage,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      
      // Methods
      toggleStatusFilter,
      removeFilter,
      clearAllFilters,
      onSearchInput,
      clearSearch,
              toggleExpand,
              toggleActivitiesCollapse,
              toggleGroupCollapse,
              copyToClipboard,
      loadActivitiesForRequest,
      handleCreateActivity,
      getActivitiesForRequest,
      isLoadingActivities,
      isCreatingActivity,
      goToNextPage,
      goToPreviousPage,
      onPageSizeChange,
      onSortChange,
      formatDate,
      formatTime,
      getStatusLabel,
      getChangeTypeLabel,
      getFullName,
      parseRequest,
      refetch,
      showModalConfirmDelete,
      showModalConfirmClone,
      showModalMarkAsSolved,
      showModalEditReq,
      deleteRow,
      updateSelectedRow,
      cloneRow,
      markAsSolved,
      handleDenyRequest,
      handleConfirmDeny,
      handleApproveAndChange,
      handleOnlyMarkAsSolved,
      handleConfirmMarkAsSolved
    };
  }
});
</script>

<style lang="scss" scoped>
@import '@/resources/assets/styles/variables/_colors.scss';


// Quick Filters Section
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
    
    &.filter-status-pending::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-pending;
      border-radius: 2px;
      opacity: 0.7;
    }
    
    &.filter-status-solved::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-solved;
      border-radius: 2px;
      opacity: 0.7;
    }
    
    &.filter-status-rejected::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-rejected;
      border-radius: 2px;
      opacity: 0.7;
    }
    
    &.filter-status-pending,
    &.filter-status-solved,
    &.filter-status-rejected {
      padding-left: 1.25rem;
    }
    
    &:hover {
      border-color: $color-primary;
      background: lighten($color-primary, 45%);
      
      &::before {
        opacity: 1;
      }
    }
    
    &.active {
      background: $color-primary;
      border-color: $color-primary;
      color: white;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba($color-primary, 0.2);
      
      &::before {
        opacity: 1;
        background: white;
      }
    }
  }
}


// Timeline Section
.timeline-section {
  padding: 0.5rem 0;
  
  .timeline-container {
    max-width: 100%;
    width: 100%;
  }
  
  .date-group {
    position: relative;
  }
  
  .date-header {
    cursor: pointer;
    user-select: none;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    transition: all 0.2s ease;
    
    &:hover {
      background: lighten($color-border, 10%);
    }
    
    .date-header-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .chevron-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
      color: $color-text-secondary;
      flex-shrink: 0;
      
      svg {
        width: 20px;
        height: 20px;
      }
      
      &.rotated {
        transform: rotate(90deg);
      }
    }
    
    .date-label {
      font-size: 20px;
      font-weight: 700;
      color: $color-text-primary;
    }
    
    .date-count {
      color: $color-text-secondary;
      font-weight: 500;
    }
  }
  
  .timeline-line {
    position: absolute;
    left: 0;
    top: 60px;
    bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, $color-border, transparent);
  }
  
  .requests-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-left: 1.5rem;
  }
}

// Request Card
.request-card {
  background: $color-card;
  border: 1px solid $color-border;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }
  
  &.expanded {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
  
  .card-border {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    
    &.border-pending {
      background: $color-pending;
    }
    
    &.border-solved {
      background: $color-solved;
    }
    
    &.border-rejected {
      background: $color-rejected;
    }
  }
  
  .card-content {
    padding: 0.6rem;
    padding-left: 0.9rem;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
    
    * {
      cursor: pointer;
    }
  }
  
  .header-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    flex: 1;
  }
  
  .header-separator {
    color: $color-border;
    font-weight: 300;
    margin: 0 0.25rem;
  }
  
  .header-meta {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: $color-text-secondary;
    
    .meta-item {
      font-weight: 500;
    }
    
    .meta-separator {
      color: $color-border;
    }
  }
  
  .header-right {
    flex-shrink: 0;
  }
  
  .request-time {
    font-weight: 600;
    color: $color-text-primary;
    font-family: monospace;
  }
  
  .status-badge {
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
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
  
  .expand-indicator {
    color: $color-text-secondary;
    display: flex;
    align-items: center;
    justify-content: center;
    
    svg {
      width: 16px;
      height: 16px;
      transition: transform 0.2s ease;
    }
  }
  
  .card-message-compact {
    color: $color-text-primary;
    line-height: 1.4;
    margin-top: 0.4rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .card-expanded {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid $color-border;
    animation: expandContent 0.3s ease-out;
    
    .card-expanded-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 1.5rem;
      align-items: stretch;
      position: relative;
      
      &.activities-collapsed {
        grid-template-columns: 1fr;
      }
      
      @media (max-width: 1200px) {
        grid-template-columns: 1fr;
        
        .card-activities-sidebar {
          order: -1;
        }
      }
    }
    
    .card-main-content {
      min-width: 0; // Prevents overflow
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    
    .card-activities-sidebar {
      position: sticky;
      top: 1rem;
      max-height: calc(100vh - 2rem);
      background: white;
      border: 1px solid $color-border;
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      min-height: 0;
      
      // Custom scrollbar
      &::-webkit-scrollbar {
        width: 6px;
      }
      
      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      
      &::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
        
        &:hover {
          background: #a8a8a8;
        }
      }
    }
    
    .activities-expand-btn-wrapper {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 10;
    }
    
    .activities-expand-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 1px solid $color-border;
      border-radius: 6px;
      background: white;
      color: #667085;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      
      svg {
        width: 16px;
        height: 16px;
      }
      
      .activities-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        background: #3b82f6;
        color: white;
        border-radius: 9px;
        font-weight: 600;
        line-height: 1;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        z-index: 11;
      }
      
      &:hover {
        background: #f9fafb;
        color: #3b82f6;
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }
      
      &:active {
        transform: translateY(0);
      }
    }
  }
  
  @keyframes expandContent {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .card-metadata-grid {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem 1.5rem;
    margin-bottom: 0.5rem;
    padding: 0.6rem;
    background: lighten($color-bg, 2%);
    border-radius: 6px;
  }
  
  .metadata-column {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  
  .metadata-row {
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
    
    .metadata-label {
      font-weight: 600;
      color: $color-text-secondary;
      min-width: 95px;
      flex-shrink: 0;
    }
    
    .metadata-value {
      color: $color-text-primary;
      word-break: break-word;
    }
    
    .metadata-value-with-copy {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex: 1;
    }
  }
  
  .btn-copy-mini {
    background: transparent;
    color: $color-text-secondary;
    border: 1px solid $color-border;
    border-radius: 3px;
    padding: 0.2rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    svg {
      width: 14px;
      height: 14px;
    }
    
    &:hover {
      background: lighten($color-primary, 45%);
      border-color: $color-primary;
      color: $color-primary;
    }
  }
  
  .card-resolution-message {
    margin-top: 0.75rem;
    padding: 0.875rem;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-radius: 8px;
    border-left: 4px solid #3b82f6;
    animation: slideIn 0.3s ease-out;
    
    .resolution-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      
      .resolution-icon {
        width: 18px;
        height: 18px;
        color: #3b82f6;
        flex-shrink: 0;
      }
      
      .resolution-label {
        font-weight: 700;
        color: #1d2939;
      }
    }
    
    .resolution-content {
      color: #1d2939;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .card-details {
    margin-top: 0.5rem;
  }
  
  .detail-row-full {
    margin-bottom: 0.75rem;
    padding: 0.6rem;
    background: lighten($color-bg, 2%);
    border-radius: 6px;
    
    .detail-label {
      font-weight: 600;
      color: $color-text-secondary;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 0.4rem;
    }
    
    .event-data {
      background: #1e1e1e;
      color: #d4d4d4;
      border: 1px solid $color-border;
      border-radius: 4px;
      padding: 0.6rem;
      font-family: 'Courier New', monospace;
      max-height: 300px;
      overflow-y: auto;
      margin: 0;
      line-height: 1.4;
    }
  }
  
  .card-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: auto;
    padding-top: 0.75rem;
    flex-shrink: 0;
    border-top: 1px solid $color-border;
  }
  
  .btn-action {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    background: white;
    border: 1px solid $color-border;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    color: $color-text-primary;
    
    svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
    
    &:hover {
      border-color: $color-primary;
      background: lighten($color-primary, 45%);
      color: $color-primary;
      transform: translateY(-1px);
    }
    
    &.btn-danger {
      &:hover {
        border-color: $color-rejected;
        background: lighten($color-rejected, 40%);
        color: $color-rejected;
      }
    }
  }
}



// Responsive
@media (max-width: 992px) {
  .requests-header-compact {
    .header-row {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
    
    .header-search {
      max-width: 100%;
    }
  }
  
  .request-card {
    .card-metadata-grid {
      grid-template-columns: 1fr;
    }
  }
  
  .pagination-section {
    .pagination-info-row,
    .pagination-actions-row {
      flex-direction: column;
      align-items: stretch;
    }
  }
}
</style>
