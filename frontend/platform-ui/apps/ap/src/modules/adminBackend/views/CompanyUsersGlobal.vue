<template>
<section class="page-content-top">
  <div class="container-steady mt-header"></div>
</section>
<section class="page-content">
  <div class="container-fluid mt-3">
    <CalculumConfirmModal v-if="showConfirmModalResetIdentityProvider" :actionDescription="$t('global.confirmResetIdentityProvider')" @hide-modal="showConfirmModalResetIdentityProvider=false" @confirm-action="confirmResetIdentityProvider"></CalculumConfirmModal>
    <CalculumDeleteModal v-if="showDeleteConfirmModal" forDeleteUser="forDeleteUser" :loading="deletingUser" @hide="showDeleteConfirmModal = !showDeleteConfirmModal" @delete="removeUserFromCompanies"></CalculumDeleteModal>
    <CalculumRevokeModal v-if="showRevokeAccessModal" :showCurrentCompanyButton="companySelectedId !== 'all'" :isForRevoking="isForRevoking" @close-modal="closeRevokeModal" @revoke-user-from-all-companies="revokeUserFromCompanies" @revoke-user-from-current-company="revokeUserFromCompanies" @grant-user-to-current-company="grantUserToCompanies" @grant-user-to-all-companies="grantUserToCompanies"></CalculumRevokeModal>
    <teleport to="body">
      <transition name="adduser-fade">
        <div class="adduser-overlay" v-if="showAddUserCompanyModal" @click.self="!addUserSaving && closeAddUserCompanyModal()">
          <div class="adduser-modal">
            <div class="adduser-header"><span class="adduser-title">{{ !!editUserCompaniesContext ? $t('adminBackend.button.addUserModal.overwriteRolesTitle') : $t('adminBackend.button.addUserModal.title') }}</span>
              <button class="adduser-close" v-if="!addUserSaving" @click="closeAddUserCompanyModal" aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="adduser-body">
              <div class="adduser-section">
                <div class="adduser-label">{{ $t('global.emails') }}</div>
                <input class="adduser-input" type="email" v-model="addUserEmail" :placeholder="$t('placeholder.email')" :disabled="!!editUserCompaniesContext" @input="addUserEmailError = ''"/>
                <div class="adduser-input-hint">{{ $t('form.emailBatchHint', { max: MAX_EMAILS_PER_BATCH }) }}</div>
                <div class="adduser-error-alert" v-if="addUserEmailError" role="alert"><i class="fa-solid fa-triangle-exclamation adduser-error-alert__icon"></i><span>{{ addUserEmailError }}</span></div>
              </div>
              <div class="adduser-section">
                <div class="adduser-label">{{ $t('adminBackend.button.addUserModal.searchLabel') }}</div>
                <div class="adduser-search-wrap">
                  <svg class="adduser-search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input class="adduser-search" type="text" v-model="addUserCompanySearch" :placeholder="$t('adminBackend.button.addUserModal.searchPlaceholder')"/>
                </div>
                <div class="adduser-company-list">
                  <div class="adduser-list-empty" v-if="companiesFilteredForModal.length === 0">{{ $t('adminBackend.button.addUserModal.noCompanies') }}</div>
                  <template v-else>
                    <template v-if="companiesFilteredSelectableForModal.length > 0">
                      <label class="adduser-company-item adduser-select-all">
                        <input type="checkbox" :checked="addUserAllFilteredCompaniesSelected" @change="toggleAddUserSelectAllFiltered($event.target.checked)"/><span class="adduser-company-name">{{ $t('adminBackend.button.addUserModal.checkAll') }} ({{ companiesFilteredSelectableForModal.length }})</span>
                      </label>
                      <div class="adduser-company-divider"></div>
                    </template>
                    <label class="adduser-company-item" v-for="company in companiesFilteredSelectableForModal" :key="company.id">
                      <input type="checkbox" :checked="addUserSelectedCompanyIds.includes(company.id)" @change="toggleAddUserCompanySelection(company.id, $event.target.checked)"/><span class="adduser-company-name">{{ getAddUserCompanyLabel(company) }}</span>
                    </label>
                    <template v-if="addUserLimitedCompanies.length > 0">
                      <div class="adduser-company-divider"></div>
                      <div class="adduser-company-limited" v-for="company in addUserLimitedCompanies" :key="company.id">
                        <svg class="adduser-lock-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg><span class="adduser-company-name">{{ company.name }}</span><span class="adduser-limit-reason">{{ company.reason }}</span>
                      </div>
                    </template>
                  </template>
                </div>
                <div class="adduser-error-hint" v-if="addUserSelectedCompanyIds.length === 0 && addUserFormTouched">{{ $t('adminBackend.button.addUserModal.companiesRequired') }}</div>
              </div>
              <div class="adduser-section">
                <div class="adduser-label">{{ $t('welcomeTeam.accessRoles') }}</div>
                <div class="adduser-roles-hint">{{ $t('adminBackend.drawer.grantAccess.rolesHint', { role: 'User' }) }}</div>
                <div class="adduser-roles-checkboxes">
                  <label class="adduser-role-checkbox">
                    <input type="checkbox" v-model="addUserRoleAdmin"/><span class="adduser-role-label">{{ $t('adminBackend.drawer.grantAccess.admin') }}</span>
                  </label>
                  <label class="adduser-role-checkbox">
                    <input type="checkbox" v-model="addUserRolePartner"/><span class="adduser-role-label">{{ $t('adminBackend.drawer.grantAccess.partner') }}</span>
                  </label>
                </div>
              </div>
              <div class="adduser-section" v-if="editUserCompaniesContext">
                <div class="adduser-overwrite-row">
                  <label class="adduser-toggle">
                    <input type="checkbox" v-model="addUserOverwriteRoles" @click="toggleAddUserOverwriteRoles"/><span class="adduser-toggle-slider"></span>
                  </label><span class="adduser-overwrite-text">{{ $t('adminBackend.button.addUserModal.overwriteRoles') }}</span>
                </div>
              </div>
            </div>
            <div class="adduser-footer">
              <div class="adduser-alert-error" v-if="addUserFormErrorMessage">{{ addUserFormErrorMessage }}</div>
              <div class="adduser-actions">
                <button class="adduser-btn-save" :disabled="addUserSaving || addUserSelectedCompanyIds.length === 0" @click="saveAddUserInModal"><span class="adduser-spinner" v-if="addUserSaving"></span>{{ $t('adminBackend.drawer.grantAccess.grantButton', { count: addUserSelectedCompanyIds.length }) }}</button>
                <button class="adduser-btn-cancel" :disabled="addUserSaving" @click="closeAddUserCompanyModal">{{ $t('button.cancel') }}</button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
    <div style="margin-top: 60px;"></div>
    <section class="page-content company-users-global-page bg-white rounded-8 shadow-sm">
      <div class="topbar">
        <h2 class="topbar-title">{{ $t('adminBackend.button.companyUsersGlobal') }}</h2>
        <div class="topbar-actions">
          <div class="combo-wrap">
            <button class="combo-btn" :class="{ open: toggleGroupDropdown }" @click="toggleGroupDropdownFn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#9ca3af;flex-shrink:0;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg><span class="combo-label" :title="getSelectedGroupName">{{ getSelectedGroupName }}</span>
              <svg class="combo-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="combo-dropdown" v-if="toggleGroupDropdown" @click.stop>
              <div class="combo-search">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input class="combo-search-input" type="text" v-model="searchGroup" :placeholder="$t('global.search')" autocomplete="off" @keydown="handleGroupKeydown" @input="debounceGroupSearch" ref="groupSearchInput"/>
              </div>
              <div class="combo-list">
                <div class="combo-item" v-for="(group, index) in groupsFilteredListWithAll" :key="group.id" :class="{ selected: group.id === groupSelectedId, highlighted: index === highlightedGroupIndex }" @click="selectGroup(group)" @mouseenter="highlightedGroupIndex = index"><span>{{ group.name }}</span><span class="combo-check" v-if="group.id === groupSelectedId">✓</span></div>
              </div>
            </div>
          </div>
          <div class="combo-wrap">
            <button class="combo-btn" :class="{ open: toggleCompanyDropdown }" @click="toggleCompanyDropdownFn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#9ca3af;flex-shrink:0;">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 7V5a4 4 0 0 0-8 0v2"></path>
                <line x1="8" y1="11" x2="8" y2="17"></line>
                <line x1="12" y1="11" x2="12" y2="17"></line>
                <line x1="16" y1="11" x2="16" y2="17"></line>
              </svg><span class="combo-label" :title="getSelectedCompanyNameDisplay">{{ getSelectedCompanyNameDisplay }}</span>
              <svg class="combo-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="combo-dropdown" v-if="toggleCompanyDropdown" @click.stop>
              <div class="combo-search">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input class="combo-search-input" type="text" v-model="searchCompanyFilter" :placeholder="$t('global.search')" autocomplete="off" @keydown="handleCompanyFilterKeydown" @input="debounceCompanyFilterSearch" ref="companyFilterSearchInput"/>
              </div>
              <div class="combo-list">
                <div class="combo-item" v-for="(company, index) in companiesFilteredListWithAll" :key="company.id" :class="{ selected: company.id === companySelectedId, highlighted: index === highlightedCompanyIndex }" @click="selectCompanyFilter(company)" @mouseenter="highlightedCompanyIndex = index"><span>{{ company.name }}</span><span class="combo-check" v-if="company.id === companySelectedId">✓</span></div>
              </div>
            </div>
          </div>
          <div class="combo-wrap">
            <button class="combo-btn" :class="{ open: showUserTypeDropdown }" @click="toggleUserTypeDropdownFn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#9ca3af;flex-shrink:0;">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg><span class="combo-label">{{ graphqlFilters.companyUsers ? $t('adminBackend.drawer.filters.externalOnly') : $t('adminBackend.drawer.filters.allUsers') }}</span>
              <svg class="combo-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="combo-dropdown" v-if="showUserTypeDropdown" @click.stop>
              <div class="combo-list">
                <div class="combo-item" :class="{ selected: !graphqlFilters.companyUsers }" @click="graphqlFilters.companyUsers = false; showUserTypeDropdown = false; resetPagination()"><span>{{ $t('adminBackend.drawer.filters.allUsers') }}</span><span class="combo-check" v-if="!graphqlFilters.companyUsers">✓</span></div>
                <div class="combo-item" :class="{ selected: graphqlFilters.companyUsers }" @click="graphqlFilters.companyUsers = true; showUserTypeDropdown = false; resetPagination()"><span>{{ $t('adminBackend.drawer.filters.externalOnly') }}</span><span class="combo-check" v-if="graphqlFilters.companyUsers">✓</span></div>
              </div>
            </div>
          </div>
          <div class="combo-wrap">
            <button class="combo-btn" :class="{ open: showProviderDropdown }" @click="toggleProviderDropdownFn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#9ca3af;flex-shrink:0;">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg><span class="combo-label">{{ providerOptions.find(o => o.id === selectedProviderId)?.name || $t('adminBackend.drawer.filters.allProviders') }}</span>
              <svg class="combo-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="combo-dropdown" v-if="showProviderDropdown" @click.stop>
              <div class="combo-list">
                <div class="combo-item" v-for="opt in providerOptions" :key="opt.id" :class="{ selected: opt.id === selectedProviderId }" @click="selectProvider(opt)"><span>{{ opt.name }}</span><span class="combo-check" v-if="opt.id === selectedProviderId">✓</span></div>
              </div>
            </div>
          </div>
          <div class="combo-wrap">
            <button class="combo-btn" :class="{ open: showStatusDropdown }" @click="toggleStatusDropdownFn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#9ca3af;flex-shrink:0;">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg><span class="combo-label">{{ statusOptions.find(o => o.id === selectedStatusId)?.name || $t('adminBackend.drawer.filters.allStatus') }}</span>
              <svg class="combo-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="combo-dropdown" v-if="showStatusDropdown" @click.stop>
              <div class="combo-list">
                <div class="combo-item" v-for="opt in statusOptions" :key="opt.id" :class="{ selected: opt.id === selectedStatusId }" @click="selectStatus(opt)"><span>{{ opt.name }}</span><span class="combo-check" v-if="opt.id === selectedStatusId">✓</span></div>
              </div>
            </div>
          </div>
          <div class="topbar-search-wrap">
            <svg class="topbar-search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input class="topbar-search" type="text" v-model="findByName" :placeholder="$t('global.search') + '…'"/>
            <button class="topbar-search-clear" v-if="findByName" @click="findByName = ''" aria-label="Clear search">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <button class="btn-export" @click="exportUsersToExcel" :disabled="loadExport"><span class="export-spinner" v-if="loadExport"></span>
            <template v-else>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </template>{{ $t('adminBackend.drawer.grid.export') }}
          </button>
          <button class="btn-add-user" v-if="!isUserAddOrEditFormShown" @click="openAddUserCompanyModal" :disabled="loadingUsers">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>{{ $t('adminBackend.drawer.grid.add') }}
          </button>
        </div>
      </div>
      <div class="px-4 pt-4">
        <CreateEditUserForm v-if="isUserAddOrEditFormShown" style="width: 100%" :isNewUser="isNewUser" :companyId="(dataFormEdit && dataFormEdit.company && dataFormEdit.company['@id']) || (router.currentRoute._value.params.id ? `/api/companies/${router.currentRoute._value.params.id}` : '')" :formType="typeOfFormShown" :formData="dataFormEdit" :limitReached="limitReached" @closeForm="callbackFormAddUserClose" @callbackUpdateUserList="callbackUpdateUserList"></CreateEditUserForm>
        <div class="users-and-drawer" v-else>
          <div class="users-table-wrapper">
            <div class="users-table-loading" v-if="loadingUsers">
              <div class="spinner-border spinner-border-sm me-2"></div><span>{{ $t('adminBackend.drawer.grid.loading') }}</span>
            </div>
            <div class="users-table-empty" v-else-if="collectionUsers.length === 0">
              <p class="text-muted">{{ $t('adminBackend.drawer.grid.noUsers') }}</p>
            </div>
            <template v-else>
              <div class="users-table-scroll">
                <table class="users-table">
                  <thead>
                    <tr>
                      <th class="col-user">{{ $t('adminBackend.drawer.grid.user') }}</th>
                      <th class="col-idp">{{ $t('adminBackend.drawer.grid.identityProvider') }}</th>
                      <th class="col-company">{{ $t('adminBackend.drawer.grid.company') }}</th>
                      <th class="col-group">{{ $t('adminBackend.drawer.grid.group') }}</th>
                      <th class="col-status">{{ $t('adminBackend.drawer.grid.status') }}</th>
                      <th class="col-activity">{{ $t('adminBackend.drawer.grid.lastActivity') }}</th>
                      <th class="col-days">{{ $t('adminBackend.adminUploadData.grid.activeDaysLast30') }}</th>
                      <th class="col-days">{{ $t('adminBackend.adminUploadData.grid.activeDaysLast60') }}</th>
                      <th class="col-days">{{ $t('adminBackend.adminUploadData.grid.activeDaysLast90') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="user in collectionUsers" :key="user.userUuid || user.uuid" :class="{ 'row-active': selectedUser && (selectedUser.userUuid || selectedUser.uuid) === (user.userUuid || user.uuid) }" @click="openDrawer(user)">
                      <td class="cell-user">
                        <div class="user-cell">
                          <div class="user-avatar" :style="{ backgroundColor: getAvatarColor(user) }">{{ getAvatarInitials(user) }}</div>
                          <div class="user-info">
                            <div class="user-name">{{ user.userFullName }}</div>
                            <div class="user-email">{{ user.userEmail }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="cell-idp"><span class="idp-badge" :class="getIdpBadgeClass(user)">
                          <svg class="idp-icon" v-if="getIdpBadgeClass(user) === 'idp-local'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          <svg class="idp-icon" v-else-if="getIdpBadgeClass(user) === 'idp-sso'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 7V5a4 4 0 0 0-8 0v2"></path>
                            <line x1="8" y1="11" x2="8" y2="17"></line>
                            <line x1="12" y1="11" x2="12" y2="17"></line>
                            <line x1="16" y1="11" x2="16" y2="17"></line>
                          </svg>
                          <svg class="idp-icon" v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>{{ getIdpLabel(user) }}</span></td>
                      <td class="cell-company">
                        <div class="company-cell"><span class="company-badge">{{ getCompanyFirstName(user) }}</span><span class="company-extra" v-if="getCompanyExtraCount(user) > 0">+{{ getCompanyExtraCount(user) }}</span></div>
                      </td>
                      <td class="cell-group">
                        <div class="groups-cell" v-if="user.companyUiGroupName"><span class="group-badge" v-for="g in user.companyUiGroupName.split(',')" :key="g">{{ g.trim() }}</span></div><span v-else>—</span>
                      </td>
                      <td class="cell-status"><span class="status-badge" :class="getUserStatusClass(user)">{{ getUserStatusLabel(user) }}</span></td>
                      <td class="cell-activity">{{ formatActivity(user.lastActivity) }}</td>
                      <td class="cell-days">{{ user.activeDaysLast30 ?? '—' }}</td>
                      <td class="cell-days">{{ user.activeDaysLast60 ?? '—' }}</td>
                      <td class="cell-days">{{ user.activeDaysLast90 ?? '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="users-pagination" v-if="graphqlTotalCount > 0">
                <div class="pagination-controls">
                  <div class="pagination-info-row">
                    <div class="results-info"><span>{{ $t('adminBackend.drawer.grid.showing') }}&nbsp;</span><strong>{{ collectionUsers.length }}</strong><span>&nbsp;{{ $t('adminBackend.drawer.grid.of') }}&nbsp;</span><strong>{{ graphqlTotalCount }}</strong><span>&nbsp;{{ $t('adminBackend.drawer.grid.users') }}</span></div>
                  </div>
                  <div class="pagination-actions-row">
                    <div class="page-size-control">
                      <label class="page-size-label">{{ $t('adminBackend.drawer.grid.itemsPerPage') }}</label>
                      <select class="page-size-select" v-model.number="pagination.first" @change="pageChangeHandler({ skip: 0, take: pagination.first })">
                        <option :value="10">10</option>
                        <option :value="25">25</option>
                        <option :value="50">50</option>
                        <option :value="100">100</option>
                      </select>
                    </div>
                    <div class="page-navigation">
                      <div class="page-indicator"><span>{{ $t('adminBackend.drawer.grid.page') }}&nbsp;</span><strong>{{ Math.floor(pagination.skip / pagination.first) + 1 }}</strong><span>&nbsp;{{ $t('adminBackend.drawer.grid.of') }}&nbsp;</span><strong>{{ Math.ceil(graphqlTotalCount / pagination.first) }}</strong></div>
                      <div class="nav-buttons">
                        <button class="btn-nav" :disabled="pagination.skip === 0" @click="pageChangeHandler({ skip: Math.max(0, pagination.skip - pagination.first), take: pagination.first })">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 18l-6-6 6-6"></path>
                          </svg><span>{{ $t('adminBackend.drawer.grid.previous') }}</span>
                        </button>
                        <button class="btn-nav" :disabled="pagination.skip + pagination.first >= graphqlTotalCount" @click="pageChangeHandler({ skip: pagination.skip + pagination.first, take: pagination.first })"><span>{{ $t('adminBackend.drawer.grid.next') }}</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
          <UserDrawer :user="selectedUser" :available-companies="companiesFormatted" :companies-capacity="companiesIdAndUserLeftToCreate" @close="closeDrawer" @updated="() => graphqlRefetch()" @deleted="onUserDeleted"></UserDrawer>
        </div>
      </div>
    </section>
  </div>
</section>
</template>

<script lang="ts">
import { defaultCompaniesUsersGridColumns } from '@/modules/adminBackend/data/columns'
import { MAX_EMAILS_PER_BATCH } from '@/modules/adminBackend/views/composables/constants'
import { fontIcons, images } from '@/resources/assets/assets'
import { reactive, toRefs, computed, onMounted, defineComponent, ref, watch, ComputedRef, onUnmounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Roles, UserFormType } from '@/services/user/UserTypes'
import { useI18n } from 'vue-i18n'
import { useAdminBackendStore } from '@/stores/adminBackend'
import { getISODate } from '@/utils/FormatData'
import { StringUtils, ArrayUtils } from '@/utils'
import * as Validator from '@/utils/validators'
import * as Routing from '@/services/router/Routing'
import CalculumDeleteModal from '@/modules/components/CalculumDeleteModal.vue'
import CalculumConfirmModal from '@/modules/components/CalculumModalConfirmAction.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import KendoCheckbox from '@/modules/components/checkbox/KendoCheckbox.vue'
import UserDrawer from '../components/UserDrawer.vue'
import { CalculumLoading } from '@ada/design-system'
import CalculumRevokeModal from '@/modules/components/CalculumRevokeModal.vue'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'
import iconGrantAccess from '@/resources/assets/images/icons/iconGrantAccess.vue'
import iconPencil from '@/resources/assets/images/icons/iconPencil.vue'
import iconRevokeAccess from '@/resources/assets/images/icons/iconRevokeAccess.vue'
import iconSendOrInvite from '@/resources/assets/images/icons/iconSendOrInvite.vue'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import { useToast } from "vue-toastification";
import router from '@/services/router/index'
import CreateEditUserForm from '@/modules/components/forms/CreateEditUserForm.vue'
import { useUser, useCompanyUsers } from '@/composables'
import { useApolloClient } from '@vue/apollo-composable'
import { HomeManageTeam } from '@/modules/adminBackend/types'
import { useUserStore } from '@/stores/user'
import { saveExcel } from '@progress/kendo-vue-excel-export'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import iconCheck from '@/resources/assets/images/icons/iconCheck.vue'

export default defineComponent({
  name: 'CompanyUsersGlobal',
  components: {
    CalculumConfirmModal,
    CalculumDeleteModal,
    CalculumModal,
    KendoCheckbox,
    UserDrawer,
    CalculumLoading,
    CalculumRevokeModal,
    Tooltip,
    iconCheck,
    iconEllipsisVertical,
    iconGrantAccess,
    iconPencil,
    iconRevokeAccess,
    iconSendOrInvite,
    iconTrash,
    CreateEditUserForm,
  },
  props: {
    companyId: { type: String, required: false, default: '' },
    companyName: { type: String, required: true }    
  },
  setup(props) {
    const toast = useToast()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const userStore = useUserStore()    
    const adminBackendStore = useAdminBackendStore()
    const loadExport = ref(false)
    const apolloClient = useApolloClient()

    document.title = translate.t('home.homeManageTeam.title')

    const companySelectedId = ref<string>('all')

    const listGroups = ref<any[]>([])
    const groupSelectedId = ref<string>('all')

    // Dropdowns with search (Groups and Companies)
    const toggleGroupDropdown = ref(false)
    const toggleCompanyDropdown = ref(false)
    const searchGroup = ref('')
    const searchCompanyFilter = ref('')
    const highlightedGroupIndex = ref(-1)
    const highlightedCompanyIndex = ref(-1)
    const groupSearchInput = ref<HTMLInputElement | null>(null)
    const companyFilterSearchInput = ref<HTMLInputElement | null>(null)

    // User type, Provider & Status combo state
    const showUserTypeDropdown = ref(false)
    const showProviderDropdown = ref(false)
    const showStatusDropdown = ref(false)
    const selectedProviderId = ref('all')
    const selectedStatusId = ref('all')

    const providerOptions = computed(() => [
      { id: 'all', name: translate.t('adminBackend.drawer.filters.allProviders') },
      { id: 'local', name: translate.t('adminBackend.drawer.filters.local') },
      { id: 'sso', name: translate.t('adminBackend.drawer.filters.sso') },
      { id: 'pending', name: translate.t('adminBackend.drawer.filters.pendingSignup') },
    ])

    const statusOptions = computed(() => [
      { id: 'all', name: translate.t('adminBackend.drawer.filters.allStatus') },
      { id: 'active', name: translate.t('adminBackend.drawer.filters.active') },
      { id: 'inactive', name: translate.t('adminBackend.drawer.filters.inactive') },
    ])

    function closeAllFilterDropdowns() {
      showUserTypeDropdown.value = false
      showProviderDropdown.value = false
      showStatusDropdown.value = false
      toggleGroupDropdown.value = false
      toggleCompanyDropdown.value = false
    }

    function toggleUserTypeDropdownFn() {
      const opening = !showUserTypeDropdown.value
      closeAllFilterDropdowns()
      showUserTypeDropdown.value = opening
    }

    function toggleProviderDropdownFn() {
      const opening = !showProviderDropdown.value
      closeAllFilterDropdowns()
      showProviderDropdown.value = opening
    }

    function toggleStatusDropdownFn() {
      const opening = !showStatusDropdown.value
      closeAllFilterDropdowns()
      showStatusDropdown.value = opening
    }

    function selectProvider(opt: { id: string }) {
      selectedProviderId.value = opt.id
      graphqlFilters.value.identityProvider = opt.id === 'all' ? undefined : opt.id
      showProviderDropdown.value = false
      resetPagination()
    }

    function selectStatus(opt: { id: string }) {
      selectedStatusId.value = opt.id
      graphqlFilters.value.status = opt.id === 'all' ? undefined : opt.id
      showStatusDropdown.value = false
      resetPagination()
    }

    const showAddUserCompanyModal = ref(false)
    const addUserCompanySearch = ref('')
    const addUserSelectedCompanyIds = ref<string[]>([])
    const addUserEmail = ref('')
    const addUserEmailError = ref('')
    const addUserRoleAdmin = ref(false)
    const addUserRolePartner = ref(false)    
    /** When editing: if true, apply selected roles to all currently selected companies; if false, only to newly added companies. */
    const addUserOverwriteRoles = ref(false)
    const addUserFormErrorMessage = ref('')
    const addUserFormTouched = ref(false)
    const addUserSaving = ref(false)
    /** When editing companies of an existing user: { userUuid, initialCompanyUuids }. Null when adding new user. */
    const editUserCompaniesContext = ref<{ userUuid: string; initialCompanyUuids: string[] } | null>(null)
    /** When editing: rolesByCompany from dataItem (key = company uuid, value = { roles, companyName }). Used to show roles in parentheses next to company name. */
    const editRolesByCompany = ref<Record<string, { roles: string[]; companyName: string }> | null>(null)

    const companyUuid = computed(() => {
      return companySelectedId.value === 'all' ? null : companySelectedId.value
    })

    const groupUuid = computed(() => {
      return groupSelectedId.value === 'all' ? null : groupSelectedId.value
    })

    // GraphQL: Setup filters for useCompanyUsers (companyUuid/companyUiGroupUuid optional: full universe or filter)
    const graphqlFilters = ref({
      companyUuid: companyUuid.value ?? null,
      companyUiGroupUuid: groupUuid.value ?? null,
      search: '',
      enabled: undefined as boolean | undefined,
      roles: undefined as string | undefined,
      order: [{ userEmail: 'ASC' }] as Array<{ [key: string]: 'ASC' | 'DESC' }> | undefined,
      telerikFilter: undefined as string | undefined,
      companyUsers: false,
      identityProvider: undefined as string | undefined,
      status: undefined as string | undefined,
    })

    // GraphQL: Pagination settings (offset-based for CalculumGridGraphql)
    const pagination = ref({
      first: 25,
      skip: 0
    })

    // GraphQL: Sort settings (for CalculumGridGraphql)
    // Default sort: by full name ascending
    const sortSettings = ref<any>([{ field: 'user', dir: 'asc' }])

    // GraphQL: Filter settings (for CalculumGridGraphql)
    const filterSettings = ref<any>(null)

    // GraphQL: Use the composable to fetch users
    const {
      userCompanies: graphqlUsers,
      loading: graphqlLoading,
      refetch: graphqlRefetch,
      paginationInfo
    } = useCompanyUsers(graphqlFilters, pagination, true)

    // GraphQL: Total count for grid
    const graphqlTotalCount = computed(() => paginationInfo.value.totalCount)

    const homeManageTeam = reactive<HomeManageTeam>({
      users: [],
      dataFormEdit: {},
      dataTeam: [],
      email: '',
      findByName: '',
      firstName: '',
      lastName: '',
      newTeam: '',
      tokenExpiration: '',
      invitationToken: '',
      roles: {
        admin: false,
        standard: false
      },
      team: '',
      userID: '',
      typeOfFormShown: UserFormType.ADD_USER,
      formErrorMessage: '',
      formHasError: false,
      isUserAddOrEditFormShown: false,
      showCreateTeamDialog: false,
      showInviteUserSuccess: false,
      loadingInviteUsers: false,
      loadingUsers: false,
      userObj: {},
      showRevokeAccessModal: false,
      showDeleteConfirmModal: false,
      showConfirmModalResetIdentityProvider: false,
      deleteUserObj: {},
      deletingUser: false,
      isAdmin: false,
      isNewUser: false,
      isForRevoking: false,
      listUsersColumns: getGridColumns(),
      companyNameValue: '',
      pagable: [8, 10, 25, 50, 100, 150],
      widthScreen: 1024,
      pageSizeNumber: 5,
      XlargeScreen: 1920,
      largeScreen: 1420,
      mediumScreen: 1120,
      smallScreen: 800,
      key: new Date().getUTCMilliseconds(),
      userInputSearch: '',
      loadingLimitUsersValue: false,
      limitUsers: 0,
      amountOfUsers: 0,
      gridHeight: '280px'
    })

    const { user } = useUser();

    // Watch GraphQL users and update local state
    watch(graphqlUsers, (newUsers) => {
      if (newUsers && newUsers.length > 0) {
        homeManageTeam.users = newUsers.map((userCompany: any) => {
          return {
            '@id': `/api/users/${userCompany.userUuid}`,
            id: userCompany.id,
            uuid: userCompany.userUuid,
            userFullName: userCompany.userFullName,
            userEmail: userCompany.userEmail,
            userFirstName: userCompany.userFirstName,
            userLastName: userCompany.userLastName,                        
            companyUuid: userCompany.companyUuid,
            companyName: userCompany.companyName,
            enabled: userCompany.enabled,
            company: {
              '@id': `/api/companies/${userCompany.companyUuid}`,
              uuid: userCompany.companyUuid,
              name: userCompany.companyName
            },            
            invitationToken: userCompany.invitationToken,
            tokenExpiration: userCompany.tokenExpiration,
            userCompanyId: `/api/user_companies/${userCompany.id}`,
            showUserOptions: false,
            companyUiGroupUuid: userCompany.companyUiGroupUuid,
            companyUiGroupName: userCompany.companyUiGroupName,
            rolesByCompany: userCompany.rolesByCompany,
            lastActivity: userCompany.lastActivity
              ? getISODate(userCompany.lastActivity)
              : translate.t('home.homeManageTeam.search.neverAccess'),
            activeDaysLast30: userCompany.activeDaysLast30,
            activeDaysLast60: userCompany.activeDaysLast60,
            activeDaysLast90: userCompany.activeDaysLast90,
            userAzureId: userCompany.userAzureId ?? null,
            identityProvider: userCompany.identityProvider ?? null,
            azureLastInvitationDate: userCompany.azureLastInvitationDate ?? null,
            userRoles: userCompany.userRoles || []
          }
        })
      } else {
        homeManageTeam.users = []
      }
    }, { immediate: true })

    // Watch GraphQL loading state and sync with loadingUsers
    watch(graphqlLoading, (loading) => {
      homeManageTeam.loadingUsers = loading
    }, { immediate: true })

    // Reset pagination to page 1 whenever any filter changes
    function resetPagination() {
      pagination.value.skip = 0
    }

    // Watch search input with debounce and update GraphQL filter
    const updateSearch = useDebounceFn((newSearch: string) => {
      graphqlFilters.value.search = newSearch
      resetPagination()
    }, 500)

    watch(() => homeManageTeam.findByName, (newSearch) => {
      updateSearch(newSearch)
      closeDrawer()
    })

    watch(companySelectedId, (newCompanySelectedId) => {
      getAmountOfUsers()
      graphqlFilters.value.companyUuid = newCompanySelectedId === 'all' ? null : newCompanySelectedId
      resetPagination()
    })

    watch(groupSelectedId, (newGroupSelectedId) => {
      graphqlFilters.value.companyUiGroupUuid = newGroupSelectedId === 'all' ? null : newGroupSelectedId
      resetPagination()
    })


    /**
     * checks if user is super admin
     */
     const superAdmin = computed(() => {
      return user.value?.isSuperAdmin ?? false
    })
    
    /**
    * if the limit has been reached for the current company, the add button will be disabled
    */
    const amountOfUsersComputed = computed(() => homeManageTeam.amountOfUsers)
    const limitUsersComputed = computed(() => homeManageTeam.limitUsers)

    /**
     * loading is finished for both the amount of users and the limit
     */
    const loadingFinished = computed(() => {
      return homeManageTeam.loadingLimitUsersValue === false && homeManageTeam.loadingUsers === false
    })
    
    /**
     * 
     * if the limit has been reached for the current company, the add button will be disabled
     * and text below the btn will show
     * **/ 
     const limitReached = computed(() => {
        return loadingFinished.value && (amountOfUsersComputed.value >= limitUsersComputed.value)
    })


    onMounted(() => {
      // GraphQL will automatically fetch on mount
      homeManageTeam.companyNameValue = adminBackendStore.getCurrentCompanyName
      homeManageTeam.isAdmin = admin()
      setGridHeight()
      getGroups()
      document.body.addEventListener('click', closeGroupAndCompanyDropdownsOnClickOutside)

    })

    onUnmounted(() => {
      document.body.removeEventListener('click', closeGroupAndCompanyDropdownsOnClickOutside)
    })

    function setGridHeight() {
      setTimeout(() => {
        const pageEl = document.querySelector('.company-users-global-page') as HTMLElement
        if (!pageEl) return

        // The app uses html { zoom: 0.67 }, so window.innerHeight is in zoomed CSS pixels.
        // To get the real visual viewport height we divide by the zoom factor.
        const zoom = parseFloat((getComputedStyle(document.documentElement) as any).zoom) || 1
        const viewportHeight = window.innerHeight / zoom
        const top = pageEl.getBoundingClientRect().top / zoom
        const h = Math.max(400, viewportHeight - top - 50) + 'px'

        pageEl.style.setProperty('min-height', h, 'important')
        pageEl.style.setProperty('height', h, 'important')
      }, 100)
    }

    /**
     * Get list of column titles for company users grid
     * 
     * @returns {Array<any>}
     */
    function getGridColumns(): Array<any> {
      return defaultCompaniesUsersGridColumns
    }


    function admin() {
      if (user.value && user.value.roles) {
        const arrayRoles = Object.values(user.value.roles);
        return !!arrayRoles.find((x: any) => x === 'ROLE_ADMIN')
      } else {
        return false
      }
    }

    function closeRevokeModal() {
      homeManageTeam.showRevokeAccessModal = false
    }

    // ── Drawer state ─────────────────────────────────────────────────────────
    const selectedUser = ref<Record<string, any> | null>(null)

    function openDrawer(user: Record<string, any>) {
      selectedUser.value = user
    }

    function closeDrawer() {
      selectedUser.value = null
    }

    function onUserDeleted(userUuid: string) {
      selectedUser.value = null
      graphqlRefetch()
    }

    const collectionUsers = computed(() => {
      // For server-side pagination: return only the actual data fetched
      // The grid should NOT paginate client-side, it should trigger refetch
      const users = homeManageTeam.users || []
      console.log(`Grid data: ${users.length} users, total: ${graphqlTotalCount.value}`)
      return users
    })

    
    function callbackFormAddUserClose() {
      homeManageTeam.isUserAddOrEditFormShown = false
    }

    function callbackUpdateUserList() {
      // GraphQL: Refetch users data
      graphqlRefetch()
    }

    function showDeleteModal(user: any) {
      homeManageTeam.userObj.id = user.uuid
      homeManageTeam.userObj.companies = user.companyUuid
      homeManageTeam.deleteUserObj = user["userCompanyId"]
      homeManageTeam.showDeleteConfirmModal = true
    }


    function toggleRevokeModal(user: any, revoke: boolean) {
      homeManageTeam.userObj.id = user.uuid
      homeManageTeam.userObj.company = companySelectedId.value
      homeManageTeam.isForRevoking = revoke
      homeManageTeam.showRevokeAccessModal = true
    }

    function confirmResetIdentity(user: any) {
      homeManageTeam.userObj.id = user.uuid
      homeManageTeam.userObj.company = user.companyUuid
      homeManageTeam.showConfirmModalResetIdentityProvider = true
    }

    function grantUserToCompanies(allCompanies: boolean) {
      const params = {
        userId: homeManageTeam.userObj.id,
        companyId: homeManageTeam.userObj.company,
        allCompanies: allCompanies,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.grant.all.success'));
          homeManageTeam.showRevokeAccessModal = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.grant.all.error'));
          homeManageTeam.showRevokeAccessModal = false
        }
      }
      adminBackendStore.grantAccess(params)
    }


    function revokeUserFromCompanies(allCompanies: boolean) {
      const params = {
        userId: homeManageTeam.userObj.id,
        companyId: homeManageTeam.userObj.company,
        allCompanies: allCompanies,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.revoke.all.success'));
          homeManageTeam.showRevokeAccessModal = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.revoke.all.error'));
          homeManageTeam.showRevokeAccessModal = false
          graphqlRefetch()
        }
      }
      adminBackendStore.revokeAccess(params)
    }


    function confirmResetIdentityProvider() {
      homeManageTeam.showConfirmModalResetIdentityProvider = false
      const params = {
        userId: homeManageTeam.userObj.id,
        companyId: homeManageTeam.userObj.company,
        callbackSuccess: () => {
          toast.success(translate.t('global.modal.resetIdentity.success'));
          homeManageTeam.showConfirmModalResetIdentityProvider = false
        },
        callbackError: () => {
          toast.error(translate.t('global.modal.resetIdentity.error'));
          homeManageTeam.showConfirmModalResetIdentityProvider = false
        } 
      }
      adminBackendStore.resetIdentityProvider(params)  
    }

 
    function apiDeleteUser() {
      homeManageTeam.deletingUser = true
      homeManageTeam.loadingUsers = true
      const params = {
        userID: homeManageTeam.deleteUserObj,
        callbackSuccess: () => {
          homeManageTeam.deletingUser = false
          homeManageTeam.showDeleteConfirmModal = false
          homeManageTeam.loadingUsers = false
          toast.success(translate.t('global.successDeleteUser'));
          graphqlRefetch()
        },
        callbackError: (response: any) => {
          homeManageTeam.deletingUser = false
          homeManageTeam.showDeleteConfirmModal = false
          homeManageTeam.loadingUsers = false
          toast.error(translate.t('global.errorDeleteUser'));
        }
      }
      userStore.deleteUser(params)
    }

    function getAmountOfUsers() {

      if (companySelectedId.value === 'all') {
        return
      }

      homeManageTeam.loadingLimitUsersValue = true
      const params = {
        companyId: `/api/companies/${companySelectedId.value}`,
        callbackSuccess: (callbackSuccessData: any) => {
          homeManageTeam.limitUsers = callbackSuccessData.limitUsers
          homeManageTeam.amountOfUsers = callbackSuccessData.externalUsers
          homeManageTeam.loadingLimitUsersValue = false
        },
        callbackError: (callbackErrorData: any) => {
          homeManageTeam.loadingLimitUsersValue = true
        }
      }
      userStore.getAmountOfUsers(params)
    }

    function onClickMessageClear() {
      homeManageTeam.showInviteUserSuccess = false
    }

    function onClickOpenFormToAddUser(type: string, user: { showUserOptions: boolean }) {
      homeManageTeam.typeOfFormShown = type || UserFormType.ADD_USER
      homeManageTeam.dataFormEdit = {
        firstName: '',
        lastName: '',
        email: '',
        roles: '',
        team: ''
      }
      homeManageTeam.isNewUser = homeManageTeam.typeOfFormShown === UserFormType.ADD_USER
      if (user) {
        user.showUserOptions = !user.showUserOptions
      }
      homeManageTeam.isUserAddOrEditFormShown = true
    }

    function onClickOpenFormToEditUser(type: boolean, user: any) {
      homeManageTeam.isUserAddOrEditFormShown = true
      homeManageTeam.typeOfFormShown = type ? UserFormType.EDIT_USER : UserFormType.ADD_USER

      if (type) {
        homeManageTeam.dataFormEdit = {
          firstName: user.userFirstName,
          lastName: user.userLastName,
          email: user.userEmail,
          roles: user.roles,
          team: user.team,
          userId: user['@id'],
          company: user.companyUuid,
          userCompanyId: user.userCompanyId

        }
        if (user) {
          user.showUserOptions = !user.showUserOptions
        }
      }
    }

    function onShowUserOptions(user: { showUserOptions: boolean }) {
      user.showUserOptions = !user.showUserOptions
    }

    function userRolesToString(roles: any) {
      let result = ''
      if (roles !== undefined) {
        if (Object.values(roles).includes(Roles.ADMIN)) {
          result += result.length > 0 ? ', Admin' : 'Admin'
        }
        if (Object.values(roles).includes(Roles.STANDARD)) {
          result += result.length > 0 ? ', User' : 'User'
        }

      }
      return result
    }

    function resendInvitation(user: any) {
      homeManageTeam.loadingUsers = true
      const params = {
        userID: user['userCompanyId'],
        callbackSuccess: (response: any) => {
          toast.success(translate.t('global.successResendInvitationUser'));
          
          homeManageTeam.loadingUsers = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.errorResendInvitationUser'));
          
          homeManageTeam.loadingUsers = false
        }
      }

      userStore.resendInvitation(params)
    }


    function invalidateToken(user: any) {
      homeManageTeam.loadingUsers = true
      const params = {
        userID: user['@id'],
        callbackSuccess: (response: any) => {
          toast.success(translate.t('global.successInvalidatetoken'));
          
          homeManageTeam.loadingUsers = false
          graphqlRefetch()
        },
        callbackError: () => {
          toast.error(translate.t('global.errorInvalidatetoken'));
          
          homeManageTeam.loadingUsers = false
        }
      }

      userStore.invalidateToken(params)
    }

    /**
     * Handle page change from CalculumGridGraphql
     * Supports both page size changes and page navigation
     * Pattern from Lists.vue
     */
    async function pageChangeHandler(event: any) {
      console.log('Page change event:', event)

      // Handle flat { skip, take } from custom pagination buttons
      if (typeof event.skip === 'number' && typeof event.take === 'number') {
        pagination.value = {
          first: event.take,
          skip: event.skip
        }
      }
      // Handle page size change (dropdown)
      else if (event.event && event.event.value) {
        pagination.value = {
          first: event.event.value,
          skip: 0  // Reset to first page
        }
      }
      // Handle page navigation (prev/next buttons, page numbers)
      else if (event.page) {
        pagination.value = {
          first: event.page.take,
          skip: event.page.skip
        }
      }

      // Refetch data with new pagination
      await graphqlRefetch()
    }

    /**
     * Handle sort change event from grid
     * Converts Kendo sort format to GraphQL order format
     */
    // Handle data change (filter and sort) from grid
    async function dataChangeHandler(filter: any, sort: any) {
      console.log('Data change event - filter:', filter, 'sort:', sort)

      // Reset pagination to first page
      pagination.value = {
        first: pagination.value.first,
        skip: 0
      }

      // Update filter settings for grid (visual state)
      filterSettings.value = filter

      // Update sort settings for grid (visual state)
      sortSettings.value = sort

      // Convert Kendo sort format to GraphQL order format
      if (sort && sort.length > 0) {
        const order = sort.map((sortDescriptor: any) => {
          return {
            [sortDescriptor.field]: sortDescriptor.dir.toUpperCase()
          }
        })
        console.log('Setting order to:', order)
        graphqlFilters.value.order = order
      } else {
        console.log('Clearing order')
        graphqlFilters.value.order = undefined
      }


      // Convert Kendo filter format to GraphQL filter format
      if (filter) {
        graphqlFilters.value.telerikFilter = JSON.stringify(filter)
      } else {
        // Clearing all grid filters
        graphqlFilters.value.telerikFilter = undefined
      }
      
      // NOTE: We do NOT call graphqlRefetch() here
      // The watch in the composable will detect the change and trigger refetch automatically
    }

    /** Export company users list to Excel via global filter export API */
    async function exportUsersToExcel() {
      loadExport.value = true
      try {
        const { COMPANY_GLOBAL_USERS_EXPORT_QUERY } = await import('@/composables/useCompanyUsers')
        const f = graphqlFilters.value
        const pageSize = 100
        let page = 1
        let allRows: any[] = []
        let hasMore = true

        while (hasMore) {
          const { data } = await apolloClient.client.query({
            query: COMPANY_GLOBAL_USERS_EXPORT_QUERY,
            variables: {
              itemsPerPage: pageSize,
              page,
              company_uuid: f.companyUuid || undefined,
              company_ui_group_uuid: f.companyUiGroupUuid || undefined,
              search: f.search || undefined,
              telerikFilter: f.telerikFilter || undefined,
              enabled: f.enabled,
              roles: f.roles || undefined,
              companyUsers: f.companyUsers,
              identityProvider: f.identityProvider || undefined,
              status: f.status || undefined,
              order: f.order || undefined,
            },
            fetchPolicy: 'network-only',
          })
          const batch = data?.collectionQueryCompanyUsers?.collection ?? []
          allRows = allRows.concat(batch)
          hasMore = batch.length === pageSize
          page++
        }

        const rows = allRows
        const transformedData = rows.map((row: any) => {
          const idp = !row.userAzureId ? 'Pending' : (!row.identityProvider || row.identityProvider === 'local') ? 'Local' : `SSO — ${row.identityProvider}`
          const statusLabel = !row.userAzureId ? 'Pending' : !row.enabled ? 'Disabled' : 'Active'
          const rbc = row.rolesByCompany
          const companies = rbc ? Object.values(rbc).map((c: any) => c.companyName).join(', ') : row.companyName
          const SESSION_ROLES = ['ROLE_COMPANY_ADMIN', 'ROLE_PARTNER', 'ROLE_DATA', 'ROLE_SALES']
          const roles = rbc
            ? [...new Set(Object.values(rbc).flatMap((c: any) => c.roles || []))]
                .filter((r: string) => SESSION_ROLES.includes(r))
                .map((r: string) => {
                  if (r === 'ROLE_COMPANY_ADMIN') return 'Admin'
                  if (r === 'ROLE_PARTNER') return 'Partner'
                  if (r === 'ROLE_DATA') return 'Data'
                  if (r === 'ROLE_SALES') return 'Sales'
                  return r
                })
                .join(', ') || 'User'
            : ''
          return {
            userFullName: row.userFullName,
            userEmail: row.userEmail,
            identityProvider: idp,
            companies,
            companyUiGroupName: row.companyUiGroupName || '—',
            status: statusLabel,
            lastActivity: row.lastActivity || '—',
            activeDaysLast30: row.activeDaysLast30 ?? '—',
            activeDaysLast60: row.activeDaysLast60 ?? '—',
            activeDaysLast90: row.activeDaysLast90 ?? '—',
            roles,
          }
        })

        saveExcel({
          data: transformedData,
          fileName: 'Company_Users',
          columns: [
            { field: 'userFullName', title: translate.t('adminBackend.drawer.grid.user'), width: 200 },
            { field: 'userEmail', title: translate.t('adminBackend.dataChange.columns.email'), width: 250 },
            { field: 'identityProvider', title: translate.t('adminBackend.drawer.grid.identityProvider'), width: 150 },
            { field: 'companies', title: translate.t('adminBackend.drawer.grid.company'), width: 200 },
            { field: 'companyUiGroupName', title: translate.t('adminBackend.drawer.grid.group'), width: 150 },
            { field: 'status', title: translate.t('adminBackend.drawer.grid.status'), width: 100 },
            { field: 'lastActivity', title: translate.t('adminBackend.drawer.grid.lastActivity'), width: 130 },
            { field: 'activeDaysLast30', title: translate.t('adminBackend.drawer.grid.activeDays'), width: 130 },
            { field: 'activeDaysLast60', title: translate.t('adminBackend.drawer.grid.activeDays60'), width: 130 },
            { field: 'activeDaysLast90', title: translate.t('adminBackend.drawer.grid.activeDays90'), width: 130 },
            { field: 'roles', title: translate.t('adminBackend.drawer.access.roles'), width: 200 },
          ],
          filterable: true,
        })
      } catch {
        toast.error(translate.t('error.get-data') || 'Export failed.')
      } finally {
        loadExport.value = false
      }
    }

    // ── Table helper functions ────────────────────────────────────────────────
    const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']

    function getAvatarColor(user: any): string {
      const letter = (user.userLastName?.[0] || user.userFirstName?.[0] || 'A').toUpperCase()
      const idx = (letter.codePointAt(0) ?? 65) - 65
      return idx >= 0 && idx < 26 ? AVATAR_COLORS[idx % AVATAR_COLORS.length] : '#94a3b8'
    }

    function getAvatarInitials(user: any): string {
      return ((user.userFirstName?.[0] ?? '') + (user.userLastName?.[0] ?? '')).toUpperCase() || '?'
    }

    function getIdpLabel(user: any): string {
      if (!user.userAzureId) return translate.t('adminBackend.drawer.grid.signupPending')
      if (!user.identityProvider || user.identityProvider === 'local') return translate.t('adminBackend.drawer.filters.local')
      return `SSO — ${user.identityProvider}`
    }

    function getIdpBadgeClass(user: any): string {
      if (!user.userAzureId) return 'idp-pending'
      if (!user.identityProvider || user.identityProvider === 'local') return 'idp-local'
      return 'idp-sso'
    }

    function getUserStatusLabel(user: any): string {
      if (!user.userAzureId) return translate.t('adminBackend.drawer.grid.statusPending')
      if (!user.enabled) return translate.t('adminBackend.drawer.grid.statusDisabled')
      return translate.t('adminBackend.drawer.grid.statusActive')
    }

    function getUserStatusClass(user: any): string {
      if (!user.userAzureId) return 'status-pending'
      if (!user.enabled) return 'status-disabled'
      return 'status-active'
    }

    function getCompanyFirstName(user: any): string {
      const rbc = user.rolesByCompany
      if (!rbc) return user.companyName || '—'
      const keys = Object.keys(rbc)
      if (keys.length === 0) return user.companyName || '—'
      return rbc[keys[0]]?.companyName || user.companyName || '—'
    }

    function getCompanyExtraCount(user: any): number {
      const rbc = user.rolesByCompany
      if (!rbc) return 0
      return Math.max(0, Object.keys(rbc).length - 1)
    }

    function getRolesDisplay(user: any): string {
      if (!user.rolesByCompany) return '—'
      const allRoles = Object.values(user.rolesByCompany as Record<string, { roles: string[] }>)
        .flatMap((c: any) => c.roles ?? [])
      const unique = [...new Set(allRoles)]
      return unique.length > 0 ? unique.join(', ') : '—'
    }

    function formatActivity(date: string | null | undefined): string {
      if (!date) return '—'
      const parsed = new Date(date)
      return isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString()
    }

    //- Companies
    const companies: ComputedRef<any[]> = computed(
      () => adminBackendStore.getCompanies,
    );

    watch(companySelectedId, () => {
      graphqlFilters.value.order = undefined
      graphqlFilters.value.telerikFilter = undefined
    });

    watch(groupSelectedId, () => {
      graphqlFilters.value.order = undefined
      graphqlFilters.value.telerikFilter = undefined
    });

    const companiesFormatted: ComputedRef<any[]> = computed(() => {
      // Ensure companies.value is an array before processing
      if (!Array.isArray(companies.value)) {
        return [];
      }
      
      // Capitalize company names
      const companiesCapitalized = companies.value.map((company: any) => {
        return {
          ...company,
          name: StringUtils.capitalizeFirstCharacter(company.name),
          id: StringUtils.removeIRI(company['@id']) || '',
        };
      });

      return ArrayUtils.sortAscBy(companiesCapitalized, ["name"]);
    })

    /** Per-company id and userLeftToCreate derived from limitUsers, externalUsers, and group limits. */
    const companiesIdAndUserLeftToCreate = computed(() => {
      if (!Array.isArray(companies.value)) {
        return [];
      }
      return companies.value.map((company: any) => {
        const id = StringUtils.removeIRI(company['@id']) || '';
        const limitUsers = Number(company.limitUsers) || 0;
        const externalUsers = Number(company.externalUsers) || 0;
        const companyLeft = Math.max(0, limitUsers - externalUsers);

        // Check group-level limit
        const group = company.uiGroup;
        let groupLeft = Infinity;
        let groupLimitReached = false;
        if (group && group.maxNumberOfUsers != null) {
          const activeInGroup = Number(group.activeUsersCount) || 0;
          groupLeft = Math.max(0, group.maxNumberOfUsers - activeInGroup);
          groupLimitReached = groupLeft <= 0;
        }

        const userLeftToCreate = Math.min(companyLeft, groupLeft === Infinity ? companyLeft : groupLeft);
        return { id, userLeftToCreate, groupLimitReached };
      });
    })

    const companiesFilteredForModal = computed(() => {
      const list = companiesFilteredByGroup.value || []
      const search = (addUserCompanySearch.value || '').trim().toLowerCase()
      if (!search) return list
      return list.filter((c: any) => (c.name || '').toLowerCase().includes(search))
    })

    /** True when add-user email is @calculum.ai (limit-by-userLeftToCreate does not apply). */
    const isAddUserCalculumEmail = computed(() => {
      const email = (addUserEmail.value || '').trim().toLowerCase()
      return email.endsWith('@calculum.ai')
    })

    /** userLeftToCreate for a company id (from companiesIdAndUserLeftToCreate). */
    function getAddUserUserLeftToCreate(companyId: string): number {
      const entry = companiesIdAndUserLeftToCreate.value.find((c: { id: string; userLeftToCreate: number }) => c.id === companyId)
      return entry ? entry.userLeftToCreate : 0
    }

    /** Company checkbox disabled when: not selected and userLeftToCreate <= 0 (cannot select). Selected companies can always be unchecked. Skipped for @calculum.ai emails. */
    function isAddUserCompanyCheckboxDisabled(companyId: string): boolean {
      if (isAddUserCalculumEmail.value) return false
      const selected = addUserSelectedCompanyIds.value
      const isSelected = selected.includes(companyId)
      if (isSelected) return false
      return getAddUserUserLeftToCreate(companyId) <= 0
    }

    /** Filtered companies that can be selected. For @calculum.ai all are selectable; else only userLeftToCreate > 0. */
    const companiesFilteredSelectableForModal = computed(() => {
      if (isAddUserCalculumEmail.value) return companiesFilteredForModal.value
      return companiesFilteredForModal.value.filter((c: any) => getAddUserUserLeftToCreate(c.id) > 0)
    })

    /** Companies in the filtered list that are disabled due to user/group limits (for new design). */
    const addUserLimitedCompanies = computed(() => {
      if (isAddUserCalculumEmail.value) return []
      return companiesFilteredForModal.value
        .filter((c: any) => getAddUserUserLeftToCreate(c.id) <= 0)
        .map((c: any) => {
          const cap = companiesIdAndUserLeftToCreate.value.find((x: any) => x.id === c.id)
          const reason = cap?.groupLimitReached ? translate.t('adminBackend.drawer.grantAccess.groupLimitReached') : translate.t('adminBackend.drawer.grantAccess.companyLimitReached')
          return { ...c, reason }
        })
    })

    const addUserAllFilteredCompaniesSelected = computed(() => {
      const filtered = companiesFilteredForModal.value
      const selected = addUserSelectedCompanyIds.value
      const selectableFiltered = isAddUserCalculumEmail.value
        ? filtered
        : filtered.filter((c: any) => getAddUserUserLeftToCreate(c.id) > 0)
      return selectableFiltered.length > 0 && selectableFiltered.every((c: any) => selected.includes(c.id))
    })

    function toggleAddUserSelectAllFiltered(checked: boolean) {
      const filtered = companiesFilteredForModal.value
      const selectableIds = isAddUserCalculumEmail.value
        ? filtered.map((c: any) => c.id)
        : filtered.filter((c: any) => getAddUserUserLeftToCreate(c.id) > 0).map((c: any) => c.id)
      if (checked) {
        const merged = [...new Set([...addUserSelectedCompanyIds.value, ...selectableIds])]
        addUserSelectedCompanyIds.value = merged
      } else {
        const filteredIds = filtered.map((c: any) => c.id)
        addUserSelectedCompanyIds.value = addUserSelectedCompanyIds.value.filter(
          (id) => !filteredIds.includes(id)
        )
      }
    }

    function toggleAddUserCompanySelection(companyId: string, checked: boolean) {
      const ids = addUserSelectedCompanyIds.value
      if (checked) {
        if (!ids.includes(companyId)) addUserSelectedCompanyIds.value = [...ids, companyId]
      } else {
        addUserSelectedCompanyIds.value = ids.filter((id) => id !== companyId)
      }
    }

    /** Label for company in add-user modal: name + (roles) when editing and rolesByCompany has match; excludes ROLE_USER. */
    function getAddUserCompanyLabel(company: { id: string; name: string }): string {
      const rbc = editRolesByCompany.value
      if (!rbc || !company.id) return company.name || ''
      const entry = rbc[company.id]
      if (!entry || !Array.isArray(entry.roles)) return company.name || ''
      const rolesFiltered = entry.roles.filter((r: string) => r !== 'ROLE_USER' && r !== Roles.STANDARD)
      if (rolesFiltered.length === 0) return company.name || ''
      const labels = rolesFiltered.map((r: string) => {
        if (r === 'ROLE_COMPANY_ADMIN' || r === Roles.COMPANY_ADMIN) return translate.t('global.users.adminUser')
        if (r === 'ROLE_PARTNER' || r === Roles.PARTNER) return translate.t('global.users.partner')
        return r
      })
      return `${company.name || ''} (${labels.join(', ')})`
    }

    /** Extract company IDs from dataItem.companyUuid (string: single id or comma-separated ids). Always returns string[]. Normalized with removeIRI so they match companiesFormatted id. */
    function getCompanyIdsFromDataItem(dataItem: any): string[] {
      if (!dataItem) return []
      const companyUuid = dataItem.companyUuid
      if (typeof companyUuid !== 'string' || !companyUuid.trim()) return []
      const raw = companyUuid.split(',').map((s: string) => s.trim()).filter(Boolean)
      const normalized = raw.map((id) => (typeof id === 'string' ? StringUtils.removeIRI(id) || id : '')).filter(Boolean)
      return Array.isArray(normalized) ? [...normalized] : []
    }

    function toggleAddUserOverwriteRoles() {
      addUserOverwriteRoles.value = !addUserOverwriteRoles.value
    }

    function openAddUserCompanyModal() {
      editUserCompaniesContext.value = null
      editRolesByCompany.value = null
      addUserCompanySearch.value = ''
      addUserSelectedCompanyIds.value = []
      addUserEmail.value = ''
      addUserRoleAdmin.value = false
      addUserRolePartner.value = false
      addUserOverwriteRoles.value = false
      addUserFormErrorMessage.value = ''
      addUserFormTouched.value = false
      showAddUserCompanyModal.value = true
    }

    /** Open add-user modal with companies, email and roles from the row pre-selected (edit user's companies). */
    function onEditUserCompany(dataItem: any) {
      const ids = getCompanyIdsFromDataItem(dataItem)
      const userUuid = (dataItem.uuid ?? dataItem.userUuid ?? '').trim()
      editUserCompaniesContext.value = userUuid ? { userUuid, initialCompanyUuids: Array.isArray(ids) ? [...ids] : [] } : null
      editRolesByCompany.value = dataItem.rolesByCompany && typeof dataItem.rolesByCompany === 'object' ? { ...dataItem.rolesByCompany } : null
      addUserCompanySearch.value = ''
      addUserSelectedCompanyIds.value = Array.isArray(ids) ? [...ids] : []
      addUserEmail.value = typeof dataItem.userEmail === 'string' ? dataItem.userEmail : ''
      const roles = dataItem.roles
      const rolesList = Array.isArray(roles) ? roles : (roles != null ? Object.values(roles) : [])
      addUserRoleAdmin.value = companySelectedId.value === 'all' ? false : rolesList.some((r: any) => r === Roles.COMPANY_ADMIN || r === 'ROLE_COMPANY_ADMIN')
      addUserRolePartner.value = companySelectedId.value === 'all' ? false : rolesList.some((r: any) => r === Roles.PARTNER || r === 'ROLE_PARTNER')
      addUserOverwriteRoles.value = false
      addUserFormErrorMessage.value = ''
      addUserFormTouched.value = false
      showAddUserCompanyModal.value = true
    }

    function closeAddUserCompanyModal() {
      editUserCompaniesContext.value = null
      showAddUserCompanyModal.value = false
      addUserCompanySearch.value = ''
      addUserSelectedCompanyIds.value = []
      addUserEmail.value = ''
      addUserEmailError.value = ''
      addUserRoleAdmin.value = false
      addUserRolePartner.value = false
      addUserFormErrorMessage.value = ''
      addUserFormTouched.value = false
    }

    /** Returns roles to send: ROLE_USER is always included by default when adding to a company; optionally COMPANY_ADMIN and/or PARTNER. */
    function getAddUserSelectedRoles(): string[] {
      const selected: string[] = [Roles.STANDARD]
      if (addUserRoleAdmin.value) selected.push(Roles.COMPANY_ADMIN)
      if (addUserRolePartner.value) selected.push(Roles.PARTNER)      
      return selected
    }

    function validateAddUserForm(): boolean {
      addUserFormTouched.value = true
      addUserFormErrorMessage.value = ''
      const email = (addUserEmail.value || '').trim()
      if (!email) {
        addUserFormErrorMessage.value = translate.t('form.emailFieldIsRequired')
        return false
      }
      const emailSingle = StringUtils.getEmails(email)
      if (!emailSingle || emailSingle.length === 0) {
        addUserFormErrorMessage.value = translate.t('form.emailFieldIsRequired')
        return false
      }
      if (!Validator.isValidEmail(emailSingle[0])) {
        addUserFormErrorMessage.value = translate.t('form.emailFieldIsRequired')
        return false
      }
      if (getAddUserSelectedRoles().length === 0 && editUserCompaniesContext.value === null) {
        return false
      }
      if (addUserSelectedCompanyIds.value.length === 0 && editUserCompaniesContext.value === null) {
        return false
      }
      return true
    }

    async function removeUserFromCompanies() {
      const removedCompanyUuids = homeManageTeam.userObj.companies.split(',')
      const userUuid = homeManageTeam.userObj.id
      let lastError: any = null
      homeManageTeam.deletingUser = true
      homeManageTeam.loadingUsers = true
      for (const companyUuid of removedCompanyUuids) {
          try {
            await new Promise<void>((resolve, reject) => {
              userStore.removeUserCompanyByUuids({
                userUuid: userUuid,
                companyUuid,
                callbackSuccess: () => resolve(),
                callbackError: (err: any) => {
                  lastError = err
                  reject(err)
                }
              })
            })
          } catch {
            addUserSaving.value = false
            const msg = lastError?.data?.message ?? lastError?.data?.detail ?? translate.t('global.errorDeleteUser')
            addUserFormErrorMessage.value = typeof msg === 'string' ? msg : translate.t('global.errorDeleteUser')
            return
          }
        }
        homeManageTeam.deletingUser = false
        homeManageTeam.loadingUsers = false
        homeManageTeam.showDeleteConfirmModal = false
        toast.success(translate.t('global.successDeleteUser'));
        graphqlRefetch()

    }

    async function saveAddUserInModal() {
      if (!validateAddUserForm()) return
      addUserEmailError.value = ''
      const email = StringUtils.getEmails(addUserEmail.value)
      let anyQueued = false

      const roles = getAddUserSelectedRoles()
      const selectedIds = [...addUserSelectedCompanyIds.value]
      const context = editUserCompaniesContext.value

      addUserSaving.value = true
      addUserFormErrorMessage.value = ''
      let lastError: any = null

      if (context) {
        // Edit existing user: remove from unchecked companies, then add to new companies; optionally overwrite roles on already-selected companies
        const removedCompanyUuids = context.initialCompanyUuids.filter((u) => !selectedIds.includes(u))
        const newCompanyIds = selectedIds.filter((id) => !context.initialCompanyUuids.includes(id))
        const existingCompanyIds = selectedIds.filter((id) => context.initialCompanyUuids.includes(id))

        for (const companyUuid of removedCompanyUuids) {
          try {
            await new Promise<void>((resolve, reject) => {
              userStore.removeUserCompanyByUuids({
                userUuid: context.userUuid,
                companyUuid,
                callbackSuccess: () => resolve(),
                callbackError: (err: any) => {
                  lastError = err
                  reject(err)
                }
              })
            })
          } catch {
            addUserSaving.value = false
            const msg = lastError?.data?.message ?? lastError?.data?.detail ?? translate.t('global.errorDeleteUser')
            addUserFormErrorMessage.value = typeof msg === 'string' ? msg : translate.t('global.errorDeleteUser')
            return
          }
        }

        if (addUserOverwriteRoles.value && existingCompanyIds.length > 0) {
          for (const companyUuid of existingCompanyIds) {
            try {
              await new Promise<void>((resolve, reject) => {
                userStore.updateUserCompanyRolesByUuids({
                  userUuid: context.userUuid,
                  companyUuid,
                  roles,
                  callbackSuccess: () => resolve(),
                  callbackError: (err: any) => {
                    lastError = err
                    reject(err)
                  }
                })
              })
            } catch {
              addUserSaving.value = false
              const msg = lastError?.data?.message ?? lastError?.data?.detail ?? translate.t('global.errorUserCreate')
              addUserFormErrorMessage.value = typeof msg === 'string' ? msg : translate.t('global.errorUserCreate')
              return
            }
          }
        }

        let addSuccessCount = 0
        for (const companyId of newCompanyIds) {
          const companyIri = `/api/companies/${companyId}`
          try {
            await new Promise<void>((resolve, reject) => {
              userStore.postCreateMultipleUsersbyEmail({
                email,
                language: 'en',
                roles,
                companyId: companyIri,
                callbackSuccess: (response: any) => {
                  addSuccessCount++
                  if (response?.data?.status === 'queued') anyQueued = true
                  resolve()
                },
                callbackError: (err: any) => {
                  lastError = err
                  reject(err)
                }
              })
            })
          } catch {
            addUserSaving.value = false
            const msg = lastError?.data?.detail || lastError?.data?.violations?.[0]?.message || translate.t('global.errorUserCreate')
            addUserFormErrorMessage.value = typeof msg === 'string' ? msg + ' For one of the selected companies' : translate.t('global.errorUserCreate')
            return
          }
        }

        addUserSaving.value = false

        if (context) {
          toast.success(translate.t(anyQueued ? 'global.invitationAsyncSuccess' : 'global.successActionUser'))
        } else {
          toast.success(translate.t(anyQueued ? 'global.invitationAsyncSuccess' : 'global.successUserCreate'))
        }
        
        graphqlRefetch()
        editUserCompaniesContext.value = null
        closeAddUserCompanyModal()
        refreshCompaniesList()
        return
      }


      function refreshCompaniesList(): void {
        const params = {
          callbackSuccess: (          
          ) => {        
          },
          callbackError: () => {
          }
        };

        adminBackendStore.fetchCompanies(params);
    }

      // Add new user: add to all selected companies
      let successCount = 0
      for (const companyId of selectedIds) {
        const companyIri = `/api/companies/${companyId}`
        try {
          await new Promise<void>((resolve, reject) => {
            userStore.postCreateMultipleUsersbyEmail({
              email,
              language: 'en',
              roles,
              companyId: companyIri,
              callbackSuccess: (response: any) => {
                successCount++
                if (response?.data?.status === 'queued') anyQueued = true
                resolve()
              },
              callbackError: (err: any) => {
                lastError = err
                reject(err)
              }
            })
          })
        } catch {
          break
        }
      }
      addUserSaving.value = false
      if (successCount === selectedIds.length) {
        toast.success(translate.t(anyQueued ? 'global.invitationAsyncSuccess' : 'global.successUserCreate'))
        graphqlRefetch()
        closeAddUserCompanyModal()
      } else if (successCount > 0) {
        toast.warning(translate.t('adminBackend.button.addUserModal.partialSuccess', { count: successCount, total: selectedIds.length }))
        graphqlRefetch()
        closeAddUserCompanyModal()
      } else {
        const msg = lastError?.data?.detail || lastError?.data?.violations?.[0]?.message || translate.t('global.errorUserCreate')
        addUserFormErrorMessage.value = typeof msg === 'string' ? msg + ' For one of the selected companies' : translate.t('global.errorUserCreate')
      }
    }


    //- Groups
    function getGroups() {      
      const params = {
        filters: [],
        callbackSuccess: (callbackSuccessData: any) => {
          
          listGroups.value = callbackSuccessData["hydra:member"];          
        },
        callbackError: () => {
          
        },
      };
      adminBackendStore.getUiGroups(params);
    }

    const listGroupsFormatted = computed(() => {
      return listGroups.value.map((group: any) => {
        return {
          ...group,
          name: StringUtils.capitalizeFirstCharacter(group.name),
          id: StringUtils.removeIRI(group['@id']) || '',
        };
      });
    });

    /** Filtered list for groups dropdown (by search). */
    const groupsFilteredList = computed(() => {
      const searchTerm = searchGroup.value.trim().toLowerCase();
      if (searchTerm === '') return listGroupsFormatted.value;
      return listGroupsFormatted.value.filter((g: any) =>
        (g.name || '').toLowerCase().includes(searchTerm)
      );
    });

    /** Groups list with "All groups" as first option for dropdown. */
    const groupsFilteredListWithAll = computed(() => {
      const allOption = { id: 'all', name: translate.t('global.allGroups') };
      return [allOption, ...groupsFilteredList.value];
    });

    /** Companies filtered by selected UI group (cascade), then by search term. */
    const companiesFilteredByGroup = computed(() => {
      if (groupSelectedId.value === 'all') return companiesFormatted.value;
      const selectedGroup = listGroups.value.find((g: any) => {
        const gId = StringUtils.removeIRI(g['@id']) || '';
        return gId === groupSelectedId.value;
      });
      if (!selectedGroup || !Array.isArray(selectedGroup.companies)) return companiesFormatted.value;
      const groupCompanyIds = new Set(
        selectedGroup.companies.map((c: any) =>
          typeof c === 'string' ? StringUtils.removeIRI(c) : (c.uuid || StringUtils.removeIRI(c['@id']) || '')
        )
      );
      return companiesFormatted.value.filter((c: any) => groupCompanyIds.has(c.id));
    });

    /** Filtered list for companies dropdown (by search). */
    const companiesFilteredList = computed(() => {
      const searchTerm = searchCompanyFilter.value.trim().toLowerCase();
      if (searchTerm === '') return companiesFilteredByGroup.value;
      return companiesFilteredByGroup.value.filter((c: any) =>
        (c.name || '').toLowerCase().includes(searchTerm)
      );
    });

    /** Companies list with "All companies" as first option for dropdown. */
    const companiesFilteredListWithAll = computed(() => {
      const allOption = { id: 'all', name: translate.t('global.allCompanies') };
      return [allOption, ...companiesFilteredList.value];
    });

    /** Label for selected group in dropdown (All Groups or group name). */
    const getSelectedGroupName = computed(() => {
      if (groupSelectedId.value === 'all') return translate.t('global.allGroups');
      const g = listGroupsFormatted.value.find((x: any) => x.id === groupSelectedId.value);
      return g ? g.name : translate.t('global.allGroups');
    });

    /** Label for selected company in dropdown (All Companies or company name). */
    const getSelectedCompanyNameDisplay = computed(() => {
      if (companySelectedId.value === 'all') return translate.t('global.allCompanies');
      const c = companiesFormatted.value.find((x: any) => x.id === companySelectedId.value);
      return c ? c.name : translate.t('global.allCompanies');
    });

    let groupSearchTimeout: ReturnType<typeof setTimeout> | null = null;
    function debounceGroupSearch() {
      if (groupSearchTimeout) clearTimeout(groupSearchTimeout);
      groupSearchTimeout = setTimeout(() => { highlightedGroupIndex.value = -1; }, 300);
    }

    let companyFilterSearchTimeout: ReturnType<typeof setTimeout> | null = null;
    function debounceCompanyFilterSearch() {
      if (companyFilterSearchTimeout) clearTimeout(companyFilterSearchTimeout);
      companyFilterSearchTimeout = setTimeout(() => { highlightedCompanyIndex.value = -1; }, 300);
    }

    function handleGroupKeydown(event: KeyboardEvent) {
      const filtered = groupsFilteredListWithAll.value;
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          highlightedGroupIndex.value = Math.min(highlightedGroupIndex.value + 1, filtered.length - 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          highlightedGroupIndex.value = Math.max(highlightedGroupIndex.value - 1, -1);
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedGroupIndex.value >= 0 && filtered[highlightedGroupIndex.value]) {
            selectGroup(filtered[highlightedGroupIndex.value]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          toggleGroupDropdown.value = false;
          searchGroup.value = '';
          highlightedGroupIndex.value = -1;
          break;
      }
    }

    function handleCompanyFilterKeydown(event: KeyboardEvent) {
      const filtered = companiesFilteredListWithAll.value;
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          highlightedCompanyIndex.value = Math.min(highlightedCompanyIndex.value + 1, filtered.length - 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          highlightedCompanyIndex.value = Math.max(highlightedCompanyIndex.value - 1, -1);
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedCompanyIndex.value >= 0 && filtered[highlightedCompanyIndex.value]) {
            selectCompanyFilter(filtered[highlightedCompanyIndex.value]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          toggleCompanyDropdown.value = false;
          searchCompanyFilter.value = '';
          highlightedCompanyIndex.value = -1;
          break;
      }
    }

    function toggleGroupDropdownFn() {
      const opening = !toggleGroupDropdown.value;
      closeAllFilterDropdowns();
      toggleGroupDropdown.value = opening;
      if (toggleGroupDropdown.value) {
        searchGroup.value = '';
        highlightedGroupIndex.value = -1;
        setTimeout(() => { groupSearchInput.value?.focus(); }, 100);
      } else {
        searchGroup.value = '';
        highlightedGroupIndex.value = -1;
      }
    }

    function toggleCompanyDropdownFn() {
      const opening = !toggleCompanyDropdown.value;
      closeAllFilterDropdowns();
      toggleCompanyDropdown.value = opening;
      if (toggleCompanyDropdown.value) {
        searchCompanyFilter.value = '';
        highlightedCompanyIndex.value = -1;
        setTimeout(() => { companyFilterSearchInput.value?.focus(); }, 100);
      } else {
        searchCompanyFilter.value = '';
        highlightedCompanyIndex.value = -1;
      }
    }

    function selectGroup(group: { id: string; name: string }) {
      groupSelectedId.value = group.id;
      toggleGroupDropdown.value = false;
      searchGroup.value = '';
      highlightedGroupIndex.value = -1;
      // Reset company selection when group changes (cascade)
      companySelectedId.value = 'all';
      searchCompanyFilter.value = '';
      closeDrawer();
    }

    function selectCompanyFilter(company: { id: string; name: string }) {
      companySelectedId.value = company.id;
      toggleCompanyDropdown.value = false;
      searchCompanyFilter.value = '';
      highlightedCompanyIndex.value = -1;
      closeDrawer();
    }

    function closeGroupAndCompanyDropdownsOnClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('.combo-wrap')) return;
      toggleGroupDropdown.value = false;
      toggleCompanyDropdown.value = false;
      showUserTypeDropdown.value = false;
      showProviderDropdown.value = false;
      showStatusDropdown.value = false;
      searchGroup.value = '';
      searchCompanyFilter.value = '';
      highlightedGroupIndex.value = -1;
      highlightedCompanyIndex.value = -1;
    }

    return {
      ...toRefs(homeManageTeam),
      amountOfUsersComputed,
      apiDeleteUser,
      callbackFormAddUserClose,
      callbackUpdateUserList,
      closeRevokeModal,
      collectionUsers,
      fontIcons,
      UserFormType,      
      graphqlFilters,
      graphqlTotalCount,
      images,      
      limitReached,
      limitUsersComputed,
      loadingFinished,
      onClickMessageClear,
      onClickOpenFormToAddUser,
      onClickOpenFormToEditUser,
      onShowUserOptions,
      pageChangeHandler,
      pagination,
      resendInvitation,
      revokeUserFromCompanies,
      confirmResetIdentityProvider,
      router,
      Routing,
      showDeleteModal,
      sortSettings,
      filterSettings,
      dataChangeHandler,
      superAdmin,
      toggleRevokeModal,
      confirmResetIdentity,
      userRolesToString,
      invalidateToken,
      companyUuid,
      exportUsersToExcel,
      loadExport,
      groupUuid,
      companiesFormatted,
      companiesIdAndUserLeftToCreate,
      companySelectedId,
      groupSelectedId,
      listGroupsFormatted,
      toggleGroupDropdown,
      toggleCompanyDropdown,
      searchGroup,
      searchCompanyFilter,
      highlightedGroupIndex,
      highlightedCompanyIndex,
      groupsFilteredList,
      groupsFilteredListWithAll,
      companiesFilteredList,
      companiesFilteredListWithAll,
      getSelectedGroupName,
      getSelectedCompanyNameDisplay,
      debounceGroupSearch,
      debounceCompanyFilterSearch,
      handleGroupKeydown,
      handleCompanyFilterKeydown,
      toggleGroupDropdownFn,
      toggleCompanyDropdownFn,
      selectGroup,
      selectCompanyFilter,
      showAddUserCompanyModal,
      addUserCompanySearch,
      addUserSelectedCompanyIds,
      companiesFilteredForModal,
      companiesFilteredSelectableForModal,
      isAddUserCompanyCheckboxDisabled,
      openAddUserCompanyModal,
      closeAddUserCompanyModal,
      onEditUserCompany,
      saveAddUserInModal,
      toggleAddUserCompanySelection,
      toggleAddUserSelectAllFiltered,
      getAddUserCompanyLabel,
      addUserAllFilteredCompaniesSelected,
      addUserLimitedCompanies,
      addUserEmail,
      addUserEmailError,
      editUserCompaniesContext,
      addUserRoleAdmin,
      addUserRolePartner,      
      addUserOverwriteRoles,
      addUserFormErrorMessage,
      addUserFormTouched,
      addUserSaving,
      MAX_EMAILS_PER_BATCH,
      toggleAddUserOverwriteRoles,
      grantUserToCompanies,
      removeUserFromCompanies,
      groupSearchInput,
      companyFilterSearchInput,
      selectedUser,
      openDrawer,
      closeDrawer,
      onUserDeleted,
      getAvatarColor,
      getAvatarInitials,
      getIdpLabel,

      graphqlRefetch,
      getIdpBadgeClass,
      getUserStatusLabel,
      getUserStatusClass,
      showUserTypeDropdown,
      toggleUserTypeDropdownFn,
      showProviderDropdown,
      showStatusDropdown,
      selectedProviderId,
      selectedStatusId,
      providerOptions,
      statusOptions,
      toggleProviderDropdownFn,
      toggleStatusDropdownFn,
      selectProvider,
      selectStatus,
      getCompanyFirstName,
      getCompanyExtraCount,
      getRolesDisplay,
      formatActivity,
      resetPagination
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

#create-new-team {
  .close-create-new-team {
    color: #abafb5;
    transition: all ease 0.3s;
    width: 10px;
    margin-bottom: 10px;
    cursor: pointer;

    &:hover {
      color: #212529;
    }
  }
}

.card--full .card__body {
    margin: 20px;
    font-size: 1rem;
}

.width-250 {
  width: 250px;
}

.total-users-limit-reached {
  background-color: $color-warning-50;
  border-radius: 6px;
  padding: 8px 12px;
}

.total-users-label {
  color: $color-gray-500;
  font-weight: 400;
}

.total-users-value {
  color: $color-gray-700;
  font-weight: 600;
}

// Back button styling
.btn-back {
  color: $color-gray-600;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  
  &:hover {
    color: $color-primary;
    text-decoration: none;
    transform: translateX(-2px);
  }
  
  &:focus {
    box-shadow: none;
  }
  
  i {
    font-size: 1rem;
  }
}

// Page title
.text-gray-700 {
  color: $color-gray-700;
}

// Gap utility for flexbox
.gap-3 {
  gap: 1rem;
}

/* ── Topbar ─────────────────────────────────── */
.topbar {
  background: #fff; border-bottom: 1px solid #e5e7eb;
  padding: 10px 20px; display: flex; align-items: center; gap: 12px; flex-shrink: 0;
  width: 100%;
}
.topbar-title { font-weight: 700; color: #111827; margin: 0; white-space: nowrap; }
.topbar-actions { display: flex; gap: 8px; align-items: center; margin-left: auto; flex-shrink: 0; }

/* Combo dropdown */
.combo-wrap { position: relative; }
.combo-btn {
  border: 1px solid #d1d5db; border-radius: 6px; padding: 5px 10px;
  background: #fff; color: #374151; cursor: pointer;
  display: flex; align-items: center; gap: 6px; min-width: 140px; user-select: none;
}
.combo-btn:hover { border-color: #9ca3af; }
.combo-btn.open { border-color: #ff2c4f; box-shadow: 0 0 0 2px #ffdfe4; }
.combo-label { flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.combo-arrow { color: #9ca3af; transition: transform 0.15s; flex-shrink: 0; }
.combo-btn.open .combo-arrow { transform: rotate(180deg); }

.combo-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; min-width: 200px; width: 100%;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1); z-index: 100;
}
.combo-search {
  padding: 8px 10px; border-bottom: 1px solid #f3f4f6;
  display: flex; align-items: center; gap: 6px;
}
.combo-search-input {
  border: none; outline: none; color: #374151;
  flex: 1; background: transparent; font-family: inherit;
}
.combo-search-input::placeholder { color: #9ca3af; }
.combo-list { max-height: 200px; overflow-y: auto; padding: 4px 0; }
.combo-item {
  padding: 7px 12px; color: #374151;
  display: flex; justify-content: space-between; align-items: center; cursor: pointer;
}
.combo-item:hover, .combo-item.highlighted { background: #f9fafb; }
.combo-item.selected { color: #ff2c4f; font-weight: 500; }
.combo-check { color: #ff2c4f; font-weight: 700; }

/* Topbar search */
.topbar-search-wrap { position: relative; }
.topbar-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.topbar-search {
  border: 1px solid #d1d5db; border-radius: 6px; padding: 5px 26px 5px 28px;
  color: #374151; width: 190px; background: #fff;
  outline: none; font-family: inherit;
}
.topbar-search:focus { border-color: #ff2c4f; box-shadow: 0 0 0 2px #ffdfe4; }
.topbar-search::placeholder { color: #9ca3af; }
.topbar-search-clear {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: #9ca3af;
  padding: 2px; line-height: 1; display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
}
.topbar-search-clear:hover { color: #374151; background: #f3f4f6; }

/* Add button */
.btn-export {
  background: #fff; color: #374151; border: 1px solid #e5e7eb; border-radius: 6px;
  padding: 6px 14px; font-weight: 500; cursor: pointer;
  display: flex; align-items: center; gap: 6px; white-space: nowrap;
}
.btn-export:hover { background: #f9fafb; border-color: #d1d5db; }
.btn-export:disabled { opacity: 0.6; cursor: not-allowed; }
.export-spinner {
  display: inline-block; width: 12px; height: 12px; border: 2px solid #d1d5db;
  border-top-color: #374151; border-radius: 50%; animation: export-spin 0.6s linear infinite;
}
@keyframes export-spin { to { transform: rotate(360deg); } }

.btn-add-user {
  background: #ff2c4f; color: #fff; border: none; border-radius: 6px;
  padding: 6px 14px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 6px; white-space: nowrap;
}
.btn-add-user:hover { background: #e02343; }
.btn-add-user:disabled { opacity: 0.6; cursor: not-allowed; }



// Responsive layout adjustments
@media (max-width: 992px) {
  .flex-wrap {
    flex-direction: column;
    align-items: flex-start !important;

    > div:first-child {
      width: 100%;
      margin-bottom: 1rem;
    }

    > div:last-child {
      width: 100%;

      .d-flex {
        width: 100%;
        flex-direction: column;
        gap: 0.75rem;

        .input-group {
          width: 100%;
        }
      }
    }
  }
}

:deep(.k-grid-header) {
  padding-right: 0 !important;
}

:deep(.k-grid td) {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}

:deep(.k-grid-content) {
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  &::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }
}

/* ── Custom Users Table ─────────────────────────────────── */
.users-table-wrapper {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.users-table-loading {
  padding: 32px;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.users-table-empty {
  padding: 32px;
  text-align: center;
  color: #6b7280;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table thead tr {
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.users-table th {
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
}
.col-status { width: 1%; white-space: nowrap; }
.col-days { width: 1%; white-space: nowrap; }

.users-table tbody tr {
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.1s;
}

.users-table tbody tr:hover td {
  background: #f9fafb;
}

.users-table tbody tr.row-active td {
  background: #f3f4f6 !important;
}
.users-table tbody tr.row-active td:first-child {
  border-left: 3px solid #ff2c4f;
  padding-left: 11px;
}

.users-table td {
  padding: 10px 14px;
  vertical-align: middle;
  color: #374151;
}

/* User cell */
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.user-info {
  min-width: 0;
}

.user-name {
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.user-email {
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

/* Identity Provider badge — matches mockup & drawer badges */
.idp-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.idp-icon {
  flex-shrink: 0;
}

.idp-local {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.idp-sso {
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.idp-pending {
  background: #fef9c3;
  color: #713f12;
  border: 1px solid #fde047;
}

/* Status badges */
.status-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 12px; font-weight: 500;
}
.status-active { background: #d1fae5; color: #065f46; }
.status-disabled { background: #fee2e2; color: #991b1b; }
.status-pending { background: #fef9c3; color: #713f12; }

/* Pagination — matches AuditLogs pattern */
.users-pagination {
  padding: 0.75rem 1rem;
  border-top: 2px solid #e0e0e0;
  background: white;
}
.users-pagination .pagination-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.users-pagination .pagination-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.users-pagination .results-info {
  display: flex;
  align-items: center;
  color: #6c757d;
}
.users-pagination .results-info strong {
  color: #212529;
  font-weight: 600;
}
.users-pagination .pagination-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.users-pagination .page-size-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.users-pagination .page-size-label {
  font-weight: 500;
  color: #212529;
  white-space: nowrap;
  margin: 0;
}
.users-pagination .page-size-select {
  padding: 0.4rem 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  background: white;
  color: #212529;
  line-height: 1.5;
  outline: none;
}
.users-pagination .page-size-select:hover { border-color: #ff2c4f; }
.users-pagination .page-size-select:focus { border-color: #ff2c4f; box-shadow: 0 0 0 3px rgba(255, 44, 79, 0.1); }
.users-pagination .page-navigation {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.users-pagination .page-indicator {
  display: flex;
  align-items: center;
  color: #6c757d;
  white-space: nowrap;
}
.users-pagination .page-indicator strong {
  color: #212529;
  font-weight: 600;
}
.users-pagination .nav-buttons {
  display: flex;
  gap: 0.5rem;
}
.users-pagination .btn-nav {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #212529;
  white-space: nowrap;
}
.users-pagination .btn-nav svg {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
  flex-shrink: 0;
}
.users-pagination .btn-nav:hover:not(:disabled) {
  border-color: #ff2c4f;
  background: #fff0f2;
  color: #ff2c4f;
}
.users-pagination .btn-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f5f5f5;
}

/* ── Full viewport height chain ─────────────────────────── */
.company-users-global-page {
  display: flex;
  flex-direction: column;
}
.company-users-global-page > .px-4 {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* ── Side-by-side drawer layout ─────────────────────────── */
.users-and-drawer {
  display: flex;
  align-items: stretch;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.users-and-drawer .users-table-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.users-table-scroll {
  flex: 1;
  overflow-y: auto;
}

/* Company cell */
.company-cell {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.company-badge {
  display: inline-block;
  background: #f0fdf4;
  color: #166534;
  border-radius: 4px;
  padding: 1px 6px;
}

.company-extra {
  display: inline-block;
  background: #e5e7eb;
  color: #374151;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 10px;
  flex-shrink: 0;
}

.groups-cell { display: flex; gap: 4px; flex-wrap: wrap; }
.group-badge {
  display: inline-block;
  background: #f3e8ff;
  color: #7c3aed;
  border-radius: 4px;
  padding: 1px 6px;
}

/* ── User type filter ── */
.user-type-filter {
  display: flex; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;
}
.user-type-btn {
  padding: 5px 12px; font-weight: 500; border: none;
  background: #fff; color: #6b7280; cursor: pointer; transition: all 0.15s;
  white-space: nowrap;
}
.user-type-btn:first-child { border-right: 1px solid #e5e7eb; }
.user-type-btn:hover { background: #f9fafb; }
.user-type-btn.active { background: #ff2c4f; color: #fff; }

/* ── Add User Modal (new design) ── */
.adduser-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35);
  display: flex; align-items: center; justify-content: center; z-index: 10000;
}
.adduser-modal {
  background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  width: 420px; max-width: 90vw; overflow: hidden; display: flex; flex-direction: column;
  max-height: 85vh;
}
.adduser-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
}
.adduser-title { font-weight: 700; color: #111827; }
.adduser-close {
  background: none; border: none; cursor: pointer; color: #9ca3af; padding: 2px; line-height: 1;
}
.adduser-close:hover { color: #374151; }
.adduser-body { padding: 18px; overflow-y: auto; flex: 1; }
.adduser-section { margin-bottom: 16px; }
.adduser-section:last-child { margin-bottom: 0; }
.adduser-label {
  font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;
}
.adduser-input {
  width: 100%; padding: 7px 10px; border: 1px solid #d1d5db;
  border-radius: 6px; outline: none; box-sizing: border-box;
  font-family: inherit; color: #111827;
}
.adduser-input:focus { border-color: #ff2c4f; box-shadow: 0 0 0 2px #ffdfe4; }
.adduser-input:disabled { background: #f9fafb; color: #6b7280; cursor: not-allowed; }

/* Search */
.adduser-search-wrap { position: relative; margin-bottom: 6px; }
.adduser-search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af;
}
.adduser-search {
  width: 100%; padding: 7px 10px 7px 28px; border: 1px solid #d1d5db;
  border-radius: 6px; outline: none; box-sizing: border-box;
  font-family: inherit; color: #111827;
}
.adduser-search:focus { border-color: #ff2c4f; box-shadow: 0 0 0 2px #ffdfe4; }

/* Company list */
.adduser-company-list {
  border: 1px solid #e5e7eb; border-radius: 6px; max-height: 200px;
  overflow-y: auto; background: #fff;
}
.adduser-list-empty {
  padding: 12px; color: #9ca3af; text-align: center;
}
.adduser-company-item {
  display: flex; align-items: center; gap: 8px; padding: 4px 12px;
  cursor: pointer; color: #374151; transition: background 0.1s;
}
.adduser-company-item:hover { background: #f9fafb; }
.adduser-select-all { font-weight: 600; color: #111827; }
.adduser-company-item input[type="checkbox"] {
  width: 14px; height: 14px; accent-color: #ff2c4f; cursor: pointer; flex-shrink: 0;
}
.adduser-company-name {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.adduser-company-divider { border-top: 1px solid #e5e7eb; }

/* Limited */
.adduser-company-limited {
  display: flex; align-items: center; gap: 8px; padding: 5px 12px;
  color: #9ca3af; background: #f9fafb;
}
.adduser-company-limited .adduser-company-name { color: #9ca3af; }
.adduser-lock-icon { flex-shrink: 0; color: #d1d5db; }
.adduser-limit-reason {
  margin-left: auto; flex-shrink: 0;
  font-weight: 500; color: #b45309; background: #fef3c7;
  padding: 1px 6px; border-radius: 4px;
}

/* Roles */
.adduser-roles-hint { color: #6b7280; line-height: 1.4; margin-bottom: 8px; }
.adduser-roles-checkboxes { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.adduser-role-checkbox {
  display: flex; align-items: center; gap: 8px; cursor: pointer; color: #374151;
}
.adduser-role-checkbox input[type="checkbox"] {
  width: 16px; height: 16px; accent-color: #ff2c4f; cursor: pointer;
}
.adduser-role-label { font-weight: 500; }

/* Overwrite toggle */
.adduser-overwrite-row {
  display: flex; align-items: center; gap: 10px;
}
.adduser-toggle {
  position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer;
}
.adduser-toggle input { opacity: 0; width: 0; height: 0; }
.adduser-toggle-slider {
  position: absolute; inset: 0; background: #d1d5db; border-radius: 10px;
  transition: background 0.2s;
}
.adduser-toggle-slider::before {
  content: ''; position: absolute; height: 16px; width: 16px; left: 2px; bottom: 2px;
  background: #fff; border-radius: 50%; transition: transform 0.2s;
}
.adduser-toggle input:checked + .adduser-toggle-slider { background: #ff2c4f; }
.adduser-toggle input:checked + .adduser-toggle-slider::before { transform: translateX(16px); }
.adduser-overwrite-text { color: #374151; }

/* Error hint */
.adduser-error-hint {
  margin-top: 4px; color: #dc2626;
}

/* Error alert (prominent, used for batch limit and similar critical errors) */
.adduser-error-alert {
  display: flex; align-items: flex-start; gap: 8px;
  margin-top: 8px;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-left: 4px solid #dc2626;
  border-radius: 6px;
  color: #991b1b;
  font-size: 13px;
  line-height: 1.4;
}
.adduser-error-alert__icon {
  color: #dc2626; flex-shrink: 0; margin-top: 2px;
}

/* Input hint (informational, neutral grey) */
.adduser-input-hint {
  margin-top: 4px; font-size: 11px; color: #6b7280;
}

/* Footer */
.adduser-footer { padding: 0 18px 18px; flex-shrink: 0; }
.adduser-actions { display: flex; gap: 12px; justify-content: flex-end; }
.adduser-actions button {
  border-radius: 8px; padding: 10px 24px; 
  line-height: 1.4; box-sizing: border-box; font-family: inherit;
  cursor: pointer; text-align: center;
}
.adduser-btn-save {
  background: #ff2c4f; color: #fff; border: 1px solid #ff2c4f; font-weight: 600;
  white-space: nowrap;
}
.adduser-btn-save:hover { background: #e02343; border-color: #e02343; }
.adduser-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.adduser-btn-cancel {
  background: #fff; color: #374151; border: 1px solid #d1d5db; font-weight: 500;
}
.adduser-btn-cancel:hover { background: #f9fafb; }
.adduser-btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
.adduser-alert-error {
  margin-bottom: 10px; padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; color: #dc2626;
}
.adduser-spinner {
  display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: adduser-spin 0.6s linear infinite; margin-right: 6px;
}
@keyframes adduser-spin { to { transform: rotate(360deg); } }
.adduser-fade-enter-active, .adduser-fade-leave-active { transition: opacity 0.2s ease; }
.adduser-fade-enter-from, .adduser-fade-leave-to { opacity: 0; }
</style>
