<template>
<div class="audit-logs-modern">
  <section class="logs-header-compact">
    <div class="container-fluid">
      <div class="header-row">
        <div class="header-title">
          <h2 class="page-title">
            <svg class="icon-title" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
            </svg>{{ $t('adminBackend.audit.title') }}
          </h2>
        </div>
        <div class="header-search">
          <div class="search-bar-wrapper">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input class="search-input" type="text" v-model="searchQuery" :placeholder="$t('adminBackend.audit.search.placeholder')" @input="onSearchInput"/>
            <button class="clear-search" v-if="searchQuery" @click="clearSearch">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-icon" @click="() => refetch()" :disabled="loading" :title="$t('adminBackend.audit.actions.refresh')">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"></path>
            </svg>
          </button>
          <button class="btn-icon" @click="handleExport" :title="$t('adminBackend.audit.actions.export')">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
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
              <div class="filter-group-label">{{ $t('adminBackend.audit.filters.level') }}:</div>
              <div class="filter-group-buttons">
                <button class="filter-btn" v-for="level in quickFilterLevels" :key="level.value" :class="['filter-level-' + level.value.toLowerCase(), { active: filters.level === level.value }]" @click="toggleLevelFilter(level.value)"><span class="filter-label">{{ level.label }}</span></button>
              </div>
            </div>
            <div class="divider"></div>
            <div class="filter-group">
              <div class="filter-group-label">{{ $t('adminBackend.audit.filters.type') }}:</div>
              <div class="filter-group-buttons">
                <button class="filter-btn" v-for="type in quickFilterTypes" :key="type.value" :class="['filter-type-' + type.value.toLowerCase(), { active: filters.auditType === type.value }]" @click="toggleTypeFilter(type.value)"><span class="filter-label">{{ type.label }}</span></button>
              </div>
            </div>
            <div class="divider"></div>
            <div class="filter-group">
              <div class="filter-group-label">{{ $t('adminBackend.audit.filters.source') }}:</div>
              <div class="filter-group-buttons">
                <button class="filter-btn" v-for="source in quickFilterSources" :key="source.value" :class="['filter-source-' + source.value.toLowerCase(), { active: filters.source === source.value }]" @click="toggleSourceFilter(source.value)"><span class="filter-label">{{ source.label }}</span></button>
              </div>
            </div>
            <div class="divider"></div>
            <div class="filter-group">
              <div class="filter-group-label">{{ $t('adminBackend.audit.filters.context') }}:</div>
              <div class="filter-group-buttons">
                <button class="filter-btn" v-for="context in quickFilterContexts" :key="context.value" :class="['filter-context-' + context.value.toLowerCase(), { active: filters.context === context.value }]" @click="toggleContextFilter(context.value)"><span class="filter-label">{{ context.label }}</span></button>
              </div>
            </div>
            <div class="divider"></div>
            <div class="filter-group">
              <div class="filter-group-label">{{ $t('adminBackend.audit.filters.outcome') }}:</div>
              <div class="filter-group-buttons">
                <button class="filter-btn" v-for="outcome in quickFilterOutcomes" :key="outcome.value" :class="['filter-outcome-' + outcome.value.toLowerCase(), { active: filters.outcome === outcome.value }]" @click="toggleOutcomeFilter(outcome.value)"><span class="filter-label">{{ outcome.label }}</span></button>
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
          <div class="chip" v-if="filters.level" @click="removeFilter('level')"><span>{{ $t('adminBackend.audit.filters.level') }}: {{ filters.level }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
          <div class="chip" v-if="filters.auditType" @click="removeFilter('auditType')"><span>{{ $t('adminBackend.audit.filters.type') }}: {{ filters.auditType }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
          <div class="chip" v-if="filters.source" @click="removeFilter('source')"><span>{{ $t('adminBackend.audit.filters.source') }}: {{ filters.source }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
          <div class="chip" v-if="filters.context" @click="removeFilter('context')"><span>{{ $t('adminBackend.audit.filters.context') }}: {{ filters.context }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
          <div class="chip" v-if="filters.outcome" @click="removeFilter('outcome')"><span>{{ $t('adminBackend.audit.filters.outcome') }}: {{ filters.outcome }}</span>
            <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </div>
        </div>
        <button class="clear-all-btn" @click="clearAllFilters">{{ $t('adminBackend.audit.filters.clearAll') }}</button>
      </div>
    </div>
  </section>
  <div class="loading-container" v-if="loading && auditLogs.length === 0">
    <CalculumLoading :modal="true"></CalculumLoading>
  </div>
  <section class="pagination-section pagination-top" v-if="!loading || auditLogs.length > 0">
    <div class="container-fluid">
      <div class="pagination-controls">
        <div class="pagination-info-row">
          <div class="results-info"><span class="results-label" v-if="!loading && totalCount > 0">{{ $t('adminBackend.audit.showing') }} </span><strong class="results-count">{{ auditLogs.length }} </strong><span class="results-of">{{ $t('adminBackend.audit.of') }} </span><strong class="results-total">{{ totalCount }} </strong><span class="results-text">{{ $t('adminBackend.audit.results') }}</span></div>
          <div class="sort-control">
            <label class="sort-label">{{ $t('adminBackend.audit.sort.label') }}:</label>
            <select class="sort-select" v-model="sortOrder" @change="onSortChange">
              <option value="desc">{{ $t('adminBackend.audit.sort.newest') }}</option>
              <option value="asc">{{ $t('adminBackend.audit.sort.oldest') }}</option>
            </select>
          </div>
        </div>
        <div class="pagination-actions-row">
          <div class="page-size-control">
            <label class="page-size-label">{{ $t('adminBackend.audit.pagination.itemsPerPage') }}:</label>
            <select class="page-size-select" v-model.number="pagination.itemsPerPage" @change="onPageSizeChange">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
          <div class="page-navigation">
            <div class="page-indicator"><span class="page-text">{{ $t('adminBackend.audit.pagination.page') }} </span><strong>{{ currentPage }} </strong><span class="of-text">{{ $t('adminBackend.audit.of') }} </span><strong>{{ totalPages }}</strong></div>
            <div class="nav-buttons">
              <button class="btn-nav" @click="goToPreviousPage" :disabled="!hasPreviousPage || loading" :title="$t('adminBackend.audit.pagination.previous')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"></path>
                </svg><span>{{ $t('adminBackend.audit.pagination.previous') }}</span>
              </button>
              <button class="btn-nav" @click="goToNextPage" :disabled="!hasNextPage || loading" :title="$t('adminBackend.audit.pagination.next')"><span>{{ $t('adminBackend.audit.pagination.next') }}</span>
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
  <section class="timeline-section" v-if="!loading || auditLogs.length > 0">
    <div class="container-fluid">
      <div class="empty-state" v-if="auditLogs.length === 0">
        <div class="empty-icon">📋</div>
        <h3 class="empty-title">{{ $t('adminBackend.audit.emptyState.title') }}</h3>
        <p class="empty-message">{{ $t('adminBackend.audit.emptyState.message') }}</p>
        <button class="clear-all-btn" v-if="hasActiveFilters" @click="clearAllFilters">{{ $t('adminBackend.audit.filters.clearAll') }}</button>
      </div>
      <div class="timeline-container" v-else>
        <div class="date-group" v-for="group in groupedLogs" :key="group.date" :class="{ collapsed: collapsedGroups.has(group.date) }">
          <div class="date-header" @click="toggleGroupCollapse(group.date)">
            <div class="date-header-content">
              <div class="chevron-icon" :class="{ rotated: !collapsedGroups.has(group.date) }">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"></path>
                </svg>
              </div><span class="date-label">{{ group.label }}</span><span class="date-count">({{ group.logs.length }})</span>
            </div>
          </div>
          <div class="timeline-line" v-if="!collapsedGroups.has(group.date)"></div>
          <div class="logs-list" v-if="!collapsedGroups.has(group.date)">
            <div class="log-card" v-for="log in group.logs" :key="log.id" :class="{ expanded: expandedLogIds.has(log.id) }">
              <div class="card-border" :class="`border-${log.level.toLowerCase()}`"></div>
              <div class="card-content">
                <div class="card-header" @click="toggleExpand(log.id)">
                  <div class="header-info">
                    <div class="log-time">{{ formatTime(log.createdAt) }}</div><span class="header-separator">|</span>
                    <div class="outcome-badge" :class="`outcome-${log.outcome.toLowerCase()}`">{{ log.outcome }}</div><span class="header-separator">|</span>
                    <div class="header-meta"><span class="meta-item">{{ log.auditType }}</span><span class="meta-separator">|</span><span class="meta-item">{{ log.source }}</span></div>
                    <template v-if="log.userEmail"><span class="header-separator">|</span>
                      <div class="header-user">{{ log.userEmail }}</div>
                    </template>
                    <template v-if="log.companyName"><span class="header-separator">|</span>
                      <div class="header-company">{{ log.companyName }}</div>
                    </template>
                  </div>
                  <div class="header-right">
                    <div class="expand-indicator">
                      <svg v-if="expandedLogIds.has(log.id)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 15l-6-6-6 6"></path>
                      </svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9l6 6 6-6"></path>
                      </svg>
                    </div>
                  </div>
                </div>
                <div class="card-message-compact">{{ log.message }}</div>
                <div class="card-expanded" v-if="expandedLogIds.has(log.id)">
                  <div class="expanded-level">
                    <div class="level-badge" :class="`badge-${log.level.toLowerCase()}`"><span class="badge-text">{{ log.level }}</span></div>
                  </div>
                  <div class="card-metadata-grid">
                    <div class="metadata-column">
                      <div class="metadata-row">
                        <div class="metadata-label">{{ $t('adminBackend.audit.columns.type') }}:</div>
                        <div class="metadata-value">{{ log.auditType }}</div>
                      </div>
                      <div class="metadata-row">
                        <div class="metadata-label">{{ $t('adminBackend.audit.columns.source') }}:</div>
                        <div class="metadata-value">{{ log.source }}</div>
                      </div>
                      <div class="metadata-row" v-if="log.entityType">
                        <div class="metadata-label">Entity Type:</div>
                        <div class="metadata-value">{{ log.entityType }}</div>
                      </div>
                      <div class="metadata-row" v-if="log.ipAddress">
                        <div class="metadata-label">{{ $t('adminBackend.audit.columns.ipAddress') }}:</div>
                        <div class="metadata-value">{{ log.ipAddress }}</div>
                      </div>
                      <div class="metadata-row uuid-row" v-if="log.userEmail">
                        <div class="metadata-label">User Email:</div>
                        <div class="metadata-value-with-copy">
                          <div class="metadata-value">{{ log.userEmail }}</div>
                          <button class="btn-copy-mini" @click.stop="copyToClipboard(log.userEmail, 'User Email')">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div class="metadata-row uuid-row" v-if="log.userUuid">
                        <div class="metadata-label">User UUID:</div>
                        <div class="metadata-value-with-copy">
                          <div class="metadata-value monospace-sm">{{ log.userUuid }}</div>
                          <button class="btn-copy-mini" @click.stop="copyToClipboard(log.userUuid, 'User UUID')">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="metadata-column">
                      <div class="metadata-row">
                        <div class="metadata-label">{{ $t('adminBackend.audit.columns.context') }}:</div>
                        <div class="metadata-value">{{ log.context }}</div>
                      </div>
                      <div class="metadata-row">
                        <div class="metadata-label">{{ $t('adminBackend.audit.columns.action') }}:</div>
                        <div class="metadata-value">{{ log.action }}</div>
                      </div>
                      <div class="metadata-row" v-if="log.requestRoute">
                        <div class="metadata-label">Request Route:</div>
                        <div class="metadata-value route">{{ log.requestRoute }}</div>
                      </div>
                      <div class="metadata-row uuid-row" v-if="log.traceId">
                        <div class="metadata-label">{{ $t('adminBackend.audit.columns.traceId') }}:</div>
                        <div class="metadata-value-with-copy">
                          <div class="metadata-value monospace-sm">{{ log.traceId }}</div>
                          <button class="btn-copy-mini" @click.stop="copyTraceId(log.traceId)">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div class="metadata-row" v-if="log.companyName">
                        <div class="metadata-label">Company:</div>
                        <div class="metadata-value">{{ log.companyName }}</div>
                      </div>
                      <div class="metadata-row uuid-row" v-if="log.companyUuid">
                        <div class="metadata-label">Company UUID:</div>
                        <div class="metadata-value-with-copy">
                          <div class="metadata-value monospace-sm">{{ log.companyUuid }}</div>
                          <button class="btn-copy-mini" @click.stop="copyToClipboard(log.companyUuid, 'Company UUID')">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="compliance-section" v-if="log.legalHold !== undefined || log.retentionDays !== undefined || log.archived !== undefined">
                    <div class="compliance-header">
                      <div class="compliance-title">Compliance Information</div>
                    </div>
                    <div class="compliance-grid">
                      <div class="compliance-column">
                        <div class="compliance-item" v-if="log.legalHold !== undefined">
                          <div class="compliance-label">Legal Hold:</div>
                          <div class="compliance-value"><span class="compliance-badge" :class="log.legalHold ? 'badge-active' : 'badge-inactive'">{{ log.legalHold ? 'Active' : 'Inactive' }}</span></div>
                        </div>
                        <div class="compliance-item" v-if="log.retentionDays !== undefined">
                          <div class="compliance-label">Retention Period:</div>
                          <div class="compliance-value">{{ log.retentionDays }} days</div>
                        </div>
                      </div>
                      <div class="compliance-column">
                        <div class="compliance-item" v-if="log.retentionExpiresAt">
                          <div class="compliance-label">Retention Expires:</div>
                          <div class="compliance-value">{{ formatDate(log.retentionExpiresAt) }}</div>
                        </div>
                        <div class="compliance-item" v-if="log.archived !== undefined">
                          <div class="compliance-label">Archived:</div>
                          <div class="compliance-value"><span class="compliance-badge" :class="log.archived ? 'badge-archived' : 'badge-active'">{{ log.archived ? 'Yes' : 'No' }}</span></div>
                        </div>
                      </div>
                      <div class="compliance-column">
                        <div class="compliance-item" v-if="log.archiveLocation">
                          <div class="compliance-label">Archive Location:</div>
                          <div class="compliance-value-with-copy">
                            <div class="compliance-value monospace-sm">{{ log.archiveLocation }}</div>
                            <button class="btn-copy-mini" @click.stop="copyToClipboard(log.archiveLocation, 'Archive Location')">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="card-details" v-if="log.eventData && Object.keys(log.eventData).length > 0">
                    <div class="detail-row-full">
                      <div class="detail-label">{{ $t('adminBackend.audit.details.eventData') }}:</div>
                      <pre class="event-data">{{ JSON.stringify(log.eventData, null, 2) }}</pre>
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
  <section class="pagination-section pagination-bottom" v-if="!loading || auditLogs.length > 0">
    <div class="container-fluid">
      <div class="pagination-controls">
        <div class="pagination-info-row">
          <div class="results-info"><span class="results-label" v-if="!loading && totalCount > 0">{{ $t('adminBackend.audit.showing') }} </span><strong class="results-count">{{ auditLogs.length }} </strong><span class="results-of">{{ $t('adminBackend.audit.of') }} </span><strong class="results-total">{{ totalCount }} </strong><span class="results-text">{{ $t('adminBackend.audit.results') }}</span></div>
          <div class="sort-control">
            <label class="sort-label">{{ $t('adminBackend.audit.sort.label') }}:</label>
            <select class="sort-select" v-model="sortOrder" @change="onSortChange">
              <option value="desc">{{ $t('adminBackend.audit.sort.newest') }}</option>
              <option value="asc">{{ $t('adminBackend.audit.sort.oldest') }}</option>
            </select>
          </div>
        </div>
        <div class="pagination-actions-row">
          <div class="page-size-control">
            <label class="page-size-label">{{ $t('adminBackend.audit.pagination.itemsPerPage') }}:</label>
            <select class="page-size-select" v-model.number="pagination.itemsPerPage" @change="onPageSizeChange">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
          <div class="page-navigation">
            <div class="page-indicator"><span class="page-text">{{ $t('adminBackend.audit.pagination.page') }} </span><strong>{{ currentPage }} </strong><span class="of-text">{{ $t('adminBackend.audit.of') }} </span><strong>{{ totalPages }}</strong></div>
            <div class="nav-buttons">
              <button class="btn-nav" @click="goToPreviousPage" :disabled="!hasPreviousPage || loading" :title="$t('adminBackend.audit.pagination.previous')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"></path>
                </svg><span>{{ $t('adminBackend.audit.pagination.previous') }}</span>
              </button>
              <button class="btn-nav" @click="goToNextPage" :disabled="!hasNextPage || loading" :title="$t('adminBackend.audit.pagination.next')"><span>{{ $t('adminBackend.audit.pagination.next') }}</span>
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
import { defineComponent, ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuditLogs, formatAuditLogDate, formatAuditLogDateOnly, type AuditLog, type AuditLogFilters } from "@/composables/useAuditLog";
import { CalculumLoading } from '@ada/design-system'
import { useToast } from "vue-toastification";

export default defineComponent({
  name: "AuditLogs",
  components: {
    CalculumLoading
  },
  setup() {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();

    // Set page title
    document.title = translate.t("adminBackend.audit.title");

    // State
    const searchQuery = ref("");
    const expandedLogIds = ref<Set<string>>(new Set());
    const sortOrder = ref<"asc" | "desc">("desc");
    const searchTimeout = ref<number | null>(null);
    const collapsedGroups = ref<Set<string>>(new Set());
    const quickFiltersExpanded = ref(false); // Collapsed by default

    // Filters state
    const filters = ref<AuditLogFilters>({});
    const pagination = ref({
      page: 1,
      itemsPerPage: 50
    });

    // Use the composable
    const { auditLogs, paginationInfo, pageInfo, totalCount, loading, error, refetch, resetPagination, loadNextPage } = useAuditLogs(
      filters,
      pagination
    );

    // Quick filter definitions
    const quickFilterLevels = [
      { value: "Error", label: translate.t("adminBackend.audit.levels.error") },
      { value: "Warning", label: translate.t("adminBackend.audit.levels.warning") },
      { value: "Info", label: translate.t("adminBackend.audit.levels.info") },
      { value: "Debug", label: translate.t("adminBackend.audit.levels.debug") }
    ];

    const quickFilterOutcomes = [
      { value: "Successful", label: translate.t("adminBackend.audit.outcomes.successful") },
      { value: "Unsuccessful", label: translate.t("adminBackend.audit.outcomes.unsuccessful") }
    ];

    const quickFilterTypes = [
      { value: "Security", label: translate.t("adminBackend.audit.types.security") },
      { value: "Data", label: translate.t("adminBackend.audit.types.data") },
      { value: "System", label: translate.t("adminBackend.audit.types.system") },
      { value: "User", label: translate.t("adminBackend.audit.types.user") }
    ];

    const quickFilterSources = [
      { value: "Controller", label: translate.t("adminBackend.audit.sources.controller") },
      { value: "Service", label: translate.t("adminBackend.audit.sources.service") },
      { value: "Command", label: translate.t("adminBackend.audit.sources.command") },
      { value: "Listener", label: translate.t("adminBackend.audit.sources.listener") },
      { value: "Middleware", label: translate.t("adminBackend.audit.sources.middleware") },
      { value: "Queue", label: translate.t("adminBackend.audit.sources.queue") },
      { value: "Scheduled", label: translate.t("adminBackend.audit.sources.scheduled") }
    ];

    const quickFilterContexts = [
      { value: "Doctrine", label: translate.t("adminBackend.audit.contexts.doctrine") },
      { value: "Api", label: translate.t("adminBackend.audit.contexts.api") },
      { value: "Worker", label: translate.t("adminBackend.audit.contexts.worker") },
      { value: "Console", label: translate.t("adminBackend.audit.contexts.console") },
      { value: "Queue", label: translate.t("adminBackend.audit.contexts.queue") }
    ];

    // Computed
    const hasActiveFilters = computed(() => {
      return !!(filters.value.level || filters.value.auditType || filters.value.source || filters.value.context || filters.value.outcome);
    });

    // Group logs by date
    const groupedLogs = computed(() => {
      const groups: { date: string; label: string; logs: AuditLog[] }[] = [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      auditLogs.value.forEach((log: AuditLog) => {
        if (!log || !log.createdAt) return;
        const logDate = new Date(log.createdAt);
        const logDateOnly = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
        
        let dateLabel: string;
        if (logDateOnly.getTime() === today.getTime()) {
          dateLabel = translate.t("adminBackend.audit.dates.today");
        } else if (logDateOnly.getTime() === yesterday.getTime()) {
          dateLabel = translate.t("adminBackend.audit.dates.yesterday");
        } else {
          dateLabel = formatAuditLogDateOnly(log.createdAt);
        }

        const dateKey = logDateOnly.toISOString().split('T')[0];
        let group = groups.find(g => g.date === dateKey);
        
        if (!group) {
          group = { date: dateKey, label: dateLabel, logs: [] };
          groups.push(group);
        }
        
        group.logs.push(log);
      });

      return groups;
    });

    // Pagination computed properties
    const currentPage = computed(() => pagination.value.page);
    const totalPages = computed(() => Math.ceil(totalCount.value / pagination.value.itemsPerPage) || 1);
    const hasNextPage = computed(() => pageInfo.value.hasNextPage);
    const hasPreviousPage = computed(() => pagination.value.page > 1);

    // Methods
    const toggleLevelFilter = (level: string) => {
      if (filters.value.level === level) {
        filters.value.level = undefined;
      } else {
        filters.value.level = level;
      }
      resetPagination();
      refetch();
    };

    const toggleOutcomeFilter = (outcome: string) => {
      if (filters.value.outcome === outcome) {
        filters.value.outcome = undefined;
      } else {
        filters.value.outcome = outcome;
      }
      resetPagination();
      refetch();
    };

    const toggleTypeFilter = (type: string) => {
      if (filters.value.auditType === type) {
        filters.value.auditType = undefined;
      } else {
        filters.value.auditType = type;
      }
      resetPagination();
      refetch();
    };

    const toggleSourceFilter = (source: string) => {
      if (filters.value.source === source) {
        filters.value.source = undefined;
      } else {
        filters.value.source = source;
      }
      resetPagination();
      refetch();
    };

    const toggleContextFilter = (context: string) => {
      if (filters.value.context === context) {
        filters.value.context = undefined;
      } else {
        filters.value.context = context;
      }
      resetPagination();
      refetch();
    };

    const toggleQuickFilters = () => {
      quickFiltersExpanded.value = !quickFiltersExpanded.value;
    };

    const removeFilter = (filterKey: keyof AuditLogFilters) => {
      filters.value[filterKey] = undefined;
      resetPagination();
      refetch();
    };

    const clearAllFilters = () => {
      filters.value = {};
      searchQuery.value = "";
      resetPagination();
      refetch();
    };

    const onSearchInput = () => {
      // Debounce search
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
      }
      
      searchTimeout.value = window.setTimeout(() => {
        // Apply global search (searches across message, action, requestRoute, ipAddress, traceId)
        if (searchQuery.value && searchQuery.value.trim()) {
          filters.value.search = searchQuery.value.trim();
        } else {
          delete filters.value.search;
        }
        
        if (import.meta.env.DEV) console.log("Search query:", searchQuery.value, "Filter:", filters.value.search);
        resetPagination();
        refetch();
      }, 500);
    };

    const clearSearch = () => {
      searchQuery.value = "";
      delete filters.value.search;
      resetPagination();
      refetch();
    };

    const onSortChange = () => {
      // Note: Sorting is currently handled by backend (DESC by default)
      // This would require backend support for ASC sorting
      if (import.meta.env.DEV) console.log("Sort order changed:", sortOrder.value);
      resetPagination();
      refetch();
    };

    const toggleExpand = (logId: string) => {
      const newSet = new Set(expandedLogIds.value);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      expandedLogIds.value = newSet;
    };

    const toggleGroupCollapse = (dateKey: string) => {
      if (collapsedGroups.value.has(dateKey)) {
        collapsedGroups.value.delete(dateKey);
      } else {
        collapsedGroups.value.add(dateKey);
      }
      // Trigger reactivity
      collapsedGroups.value = new Set(collapsedGroups.value);
    };

    const handleExport = () => {
      // TODO: Implement export functionality
      toast.info("Export functionality coming soon!");
      if (import.meta.env.DEV) console.log("Export clicked");
    };

    const copyTraceId = (traceId: string | null) => {
      if (traceId) {
        navigator.clipboard.writeText(traceId);
        toast.success(translate.t("adminBackend.audit.actions.traceCopied"));
      }
    };

    const copyToClipboard = (text: string | null, label: string) => {
      if (text) {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
      }
    };

    const goToNextPage = () => {
      if (hasNextPage.value && !loading.value) {
        pagination.value.page++;
        loadNextPage();
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const goToPreviousPage = () => {
      if (hasPreviousPage.value && !loading.value) {
        pagination.value.page = Math.max(1, pagination.value.page - 1);
        resetPagination();
        refetch();
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const onPageSizeChange = () => {
      // Reset to page 1 when changing page size
      pagination.value.page = 1;
      resetPagination();
      refetch();
      if (import.meta.env.DEV) console.log("Page size changed to:", pagination.value.itemsPerPage);
    };

    const formatDate = (dateString: string): string => {
      return formatAuditLogDate(dateString);
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


    // Watch for errors
    watch(error, (newError) => {
      if (newError) {
        console.error('Error loading audit logs:', newError);
        toast.error(translate.t("adminBackend.audit.error"));
      }
    });

    // Load data on mount
    onMounted(() => {
      if (import.meta.env.DEV) console.log('AuditLogs component mounted');
      refetch();
    });

    return {
      // State
      searchQuery,
      expandedLogIds,
      sortOrder,
      filters,
      pagination,
      collapsedGroups,
      quickFilterLevels,
      quickFilterOutcomes,
      quickFilterTypes,
      quickFilterSources,
      quickFilterContexts,
      
      // Computed
      auditLogs,
      groupedLogs,
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
      toggleLevelFilter,
      toggleOutcomeFilter,
      toggleTypeFilter,
      toggleSourceFilter,
      toggleContextFilter,
      toggleQuickFilters,
      quickFiltersExpanded,
      removeFilter,
      clearAllFilters,
      onSearchInput,
      clearSearch,
      onSortChange,
      toggleExpand,
      toggleGroupCollapse,
      handleExport,
      copyTraceId,
      copyToClipboard,
      goToNextPage,
      goToPreviousPage,
      onPageSizeChange,
      formatDate,
      formatTime,
      refetch
    };
  }
});
</script>

<style lang="scss" scoped>
// Color Variables
$color-error: #dc3545;
$color-warning: #ffc107;
$color-info: #17a2b8;
$color-debug: #6c757d;
$color-success: #28a745;

$color-primary: #ff2c4f; // Color primario rojo de la plataforma
$color-bg: #f8f9fa;
$color-card: #ffffff;
$color-border: #e0e0e0;
$color-text-primary: #212529;
$color-text-secondary: #6c757d;

// Modern Audit Logs Layout
.audit-logs-modern {
  background: $color-bg;
  min-height: 100vh;
  padding-bottom: 2rem;
  font-size: 1rem;
}

// Compact Header (Title + Search + Actions in one row)
.logs-header-compact {
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
    
    // Color indicators for level filters
    &.filter-level-error::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-error;
      border-radius: 2px;
      opacity: 0.7;
    }
    
    &.filter-level-warning::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-warning;
      border-radius: 2px;
      opacity: 0.7;
    }
    
    &.filter-level-info::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-info;
      border-radius: 2px;
      opacity: 0.7;
    }
    
    &.filter-level-debug::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-text-secondary;
      border-radius: 2px;
      opacity: 0.7;
    }
    
    // Add left padding for filters with indicators
    &.filter-level-error,
    &.filter-level-warning,
    &.filter-level-info,
    &.filter-level-debug {
      padding-left: 1.25rem;
    }
    
    // Color indicators for outcome filters (at the end of the button)
    &.filter-outcome-successful::after {
      content: '';
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: #28a745; // Success green
      border-radius: 2px;
      opacity: 0.7;
    }
    
    &.filter-outcome-unsuccessful::after {
      content: '';
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: $color-error;
      border-radius: 2px;
      opacity: 0.7;
    }
    
    // Add right padding for outcome filters with indicators
    &.filter-outcome-successful,
    &.filter-outcome-unsuccessful {
      padding-right: 1.25rem;
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
      
      &::after {
        opacity: 1;
        background: white;
      }
    }
  }
  
  .divider {
    width: 1px;
    height: 24px;
    background: $color-border;
    margin: 0 0.5rem;
  }
  
  // Transition animations for collapsible filters
  .slide-fade-enter-active {
    transition: all 0.3s ease-out;
  }
  
  .slide-fade-leave-active {
    transition: all 0.3s ease-in;
  }
  
  .slide-fade-enter-from {
    transform: translateY(-10px);
    opacity: 0;
  }
  
  .slide-fade-leave-to {
    transform: translateY(-10px);
    opacity: 0;
  }
}

// Active Filters Section
.active-filters-section {
  padding: 0.5rem 0;
  background: lighten($color-warning, 45%);
  border-bottom: 1px solid $color-border;
  
  .active-filters {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .filter-label {
    font-weight: 600;
    color: $color-text-primary;
  }
  
  .filter-chips {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    flex: 1;
  }
  
  .chip {
    background: white;
    border: 1px solid $color-border;
    border-radius: 20px;
    padding: 0.375rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: $color-error;
      border-color: $color-error;
      color: white;
      
      .chip-close {
        color: white;
      }
    }
    
    .chip-close {
      width: 14px;
      height: 14px;
      color: $color-text-secondary;
      flex-shrink: 0;
      stroke-width: 2.5;
    }
  }
}

// Clear All Button (used in multiple places)
.clear-all-btn {
  background: $color-error;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: darken($color-error, 10%);
    transform: translateY(-1px);
  }
}

// Loading Container
.loading-container {
  padding: 0.5rem 0;
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
  
  .date-group.collapsed {
    .date-header {
      margin-bottom: 0;
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
  
  .logs-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-left: 1.5rem;
  }
}

// Log Card
.log-card {
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
    
    &.border-error,
    &.border-critical {
      background: $color-error;
    }
    
    &.border-warning {
      background: $color-warning;
    }
    
    &.border-info {
      background: $color-info;
    }
    
    &.border-debug {
      background: $color-debug;
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
  
  .header-user,
  .header-company {
    color: $color-text-secondary;
    font-weight: 500;
  }
  
  .header-right {
    flex-shrink: 0;
  }
  
  .level-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;

    .badge-icon {
    }
    
    &.badge-error,
    &.badge-critical {
      background: lighten($color-error, 40%);
      color: $color-error;
    }
    
    &.badge-warning {
      background: lighten($color-warning, 35%);
      color: darken($color-warning, 20%);
    }
    
    &.badge-info {
      background: lighten($color-info, 40%);
      color: $color-info;
    }
    
    &.badge-debug {
      background: lighten($color-debug, 40%);
      color: $color-debug;
    }
  }
  
  .log-time {
    font-weight: 600;
    color: $color-text-primary;
    font-family: monospace;
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
  
  // Compact Message (always visible)
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
  
  // Expanded Content Container
  .card-expanded {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid $color-border;
    animation: expandContent 0.3s ease-out;
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
  
  .expanded-level {
    margin-bottom: 0.75rem;
  }
  
  // Metadata Grid (2 columns)
  .card-metadata-grid {
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
    
    &.uuid-row {
      align-items: center;
    }
    
    .metadata-label {
      font-weight: 600;
      color: $color-text-secondary;
      min-width: 95px;
      flex-shrink: 0;
    }
    
    .metadata-value {
      color: $color-text-primary;
      word-break: break-word;
      
      &.route {
        font-family: monospace;
        background: white;
        padding: 0.1rem 0.3rem;
        border-radius: 3px;
      }
      
      &.monospace-sm {
        font-family: monospace;
        background: white;
        padding: 0.1rem 0.0rem;
        border-radius: 3px;
      }
    }
    
    .metadata-value-with-copy {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex: 1;
    }
  }
  
  .outcome-badge {
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-weight: 600;
    
    &.outcome-successful {
      background: lighten($color-success, 40%);
      color: $color-success;
    }
    
    &.outcome-unsuccessful {
      background: lighten($color-error, 40%);
      color: $color-error;
    }
    
    &.outcome-partial {
      background: lighten($color-warning, 35%);
      color: darken($color-warning, 20%);
    }
    
    &.outcome-unknown {
      background: lighten($color-debug, 40%);
      color: $color-debug;
    }
  }
  
  .card-details {
    margin-top: 0.5rem;
  }
  
  // Expanded Details - Full Width Rows
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
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .detail-value {
      color: $color-text-primary;
      word-break: break-all;
      
      &.monospace {
        font-family: monospace;
        background: white;
        padding: 0.4rem 0.6rem;
        border-radius: 4px;
        border: 1px solid $color-border;
      }
    }
  }
  
  .btn-copy {
    background: $color-primary;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.3rem 0.6rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    
    &:hover {
      background: darken($color-primary, 10%);
      transform: translateY(-1px);
    }
    
    span {
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
    
    &:active {
      transform: scale(0.95);
    }
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

  // Compliance Section
  .compliance-section {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid $color-border;
  }

  .compliance-header {
    margin-bottom: 0.5rem;
  }

  .compliance-title {
    font-weight: 700;
    color: $color-text-primary;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .compliance-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1.5rem;
    padding: 0.6rem;
    background: lighten($color-bg, 2%);
    border-radius: 6px;
  }

  .compliance-column {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .compliance-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .compliance-label {
    font-weight: 600;
    color: $color-text-secondary;
  }

  .compliance-value {
    color: $color-text-primary;
    word-break: break-word;
    
    &.monospace-sm {
      font-family: monospace;
      background: white;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
    }
  }

  .compliance-value-with-copy {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
  }

  .compliance-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
    
    &.badge-active {
      background: lighten($color-success, 40%);
      color: $color-success;
    }
    
    &.badge-inactive {
      background: lighten($color-debug, 40%);
      color: $color-debug;
    }
    
    &.badge-archived {
      background: lighten($color-info, 40%);
      color: $color-info;
    }
  }
}

// Empty State
.empty-state {
  text-align: center;
  padding: 6rem 2rem;
  background: $color-card;
  border-radius: 12px;
  max-width: 600px;
  margin: 0 auto;
  
  .empty-icon {
    font-size: 80px;
    margin-bottom: 1.5rem;
    opacity: 0.5;
  }
  
  .empty-title {
    font-size: 24px;
    font-weight: 700;
    color: $color-text-primary;
    margin-bottom: 0.75rem;
  }
  
  .empty-message {
    font-size: 16px;
    color: $color-text-secondary;
    margin-bottom: 2rem;
  }
}

// Pagination Section
.pagination-section {
  padding: 0.75rem 0;
  border-top: 2px solid $color-border;
  background: white;
  
  &.pagination-top {
    border-bottom: 1px solid lighten($color-border, 5%);
  }
  
  &.pagination-bottom {
    border-top: 2px solid $color-border;
  }
  
  .pagination-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  // First Row: Results info + Sort
  .pagination-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .results-info {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: $color-text-secondary;
    
    .results-label,
    .results-of,
    .results-text {
      color: $color-text-secondary;
    }
    
    strong {
      color: $color-text-primary;
      font-weight: 600;
    }
  }
  
  .sort-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .sort-label {
      font-weight: 500;
      color: $color-text-primary;
      white-space: nowrap;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      display: flex;
      align-items: center;
    }
    
    .sort-select {
      padding: 0.4rem 0.75rem;
      border: 1px solid $color-border;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      background: white;
      transition: all 0.2s ease;
      line-height: 1.5;
      
      &:hover {
        border-color: $color-primary;
      }
      
      &:focus {
        outline: none;
        border-color: $color-primary;
        box-shadow: 0 0 0 3px rgba($color-primary, 0.1);
      }
    }
  }
  
  // Second Row: Page size + Navigation
  .pagination-actions-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .page-size-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .page-size-label {
      font-weight: 500;
      color: $color-text-primary;
      white-space: nowrap;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      display: flex;
      align-items: center;
    }
    
    .page-size-select {
      padding: 0.4rem 0.75rem;
      border: 1px solid $color-border;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      background: white;
      transition: all 0.2s ease;
      color: $color-text-primary;
      line-height: 1.5;
      
      &:hover {
        border-color: $color-primary;
      }
      
      &:focus {
        outline: none;
        border-color: $color-primary;
        box-shadow: 0 0 0 3px rgba($color-primary, 0.1);
      }
    }
  }
  
  .page-navigation {
    display: flex;
    align-items: center;
    gap: 1rem;
    
    .page-indicator {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: $color-text-secondary;
      white-space: nowrap;
      
      .page-text,
      .of-text {
        color: $color-text-secondary;
      }
      
      strong {
        color: $color-text-primary;
        font-weight: 600;
      }
    }
    
    .nav-buttons {
      display: flex;
      gap: 0.5rem;
      
      .btn-nav {
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
        white-space: nowrap;
        
        svg {
          width: 16px;
          height: 16px;
          stroke-width: 2.5;
          flex-shrink: 0;
        }
        
        &:hover:not(:disabled) {
          border-color: $color-primary;
          background: lighten($color-primary, 45%);
          color: $color-primary;
          transform: translateY(-1px);
        }
        
        &:active:not(:disabled) {
          transform: translateY(0);
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: lighten($color-border, 5%);
        }
      }
    }
  }
}

// Responsive
@media (max-width: 992px) {
  .logs-header-compact {
    .header-row {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
    
    .header-title {
      .page-title {
        font-size: 22px;
        justify-content: center;
      }
    }
    
    .header-search {
      max-width: 100%;
      order: 2;
    }
    
    .header-actions {
      order: 3;
      justify-content: center;
    }
  }
}

@media (max-width: 768px) {
  .logs-header-compact {
    padding: 1rem 0;
    
    .header-title .page-title {
      font-size: 20px;
    }
    
    .header-search .search-bar-wrapper .search-input {
      padding: 0.65rem 2.5rem 0.65rem 2.75rem;
    }
    
    .header-actions {
      flex-wrap: wrap;
    }
  }
  
  .quick-filters-section .filters-wrapper {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .timeline-section .logs-list {
    padding-left: 1rem;
  }
  
  .log-card {
    .header-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
    }
    
    .card-metadata-grid {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
    
    .metadata-row {
      flex-direction: column;
      gap: 0.25rem;
      
      .metadata-label {
        min-width: auto;
      }
    }
    
    .detail-row-full {
      padding: 0.75rem;
    }

    .compliance-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
  
  .pagination-section {
    .pagination-info-row {
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      
      .results-info,
      .sort-control {
        justify-content: center;
        width: 100%;
      }
    }
    
    .pagination-actions-row {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
      
      .page-size-control {
        justify-content: center;
      }
      
      .page-navigation {
        flex-direction: column;
        gap: 0.75rem;
        
        .page-indicator {
          justify-content: center;
        }
        
        .nav-buttons {
          width: 100%;
          
          .btn-nav {
            flex: 1;
            justify-content: center;
          }
        }
      }
    }
  }
}
</style>
