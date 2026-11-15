/**
 * Admin / company-user event forwards for CalculumGridGraphql.
 * Parent screens own API work; this bag only re-emits.
 */

export type GraphqlGridAdminUserEmit = (
  event:
    | "show-data-change-modal"
    | "delete-user-from-company"
    | "edit-user-from-admin-dashboard"
    | "grant-access"
    | "revoke-access-user-admin-dashboard"
    | "toggle-options-admin-dashboard"
    | "resend-invitation-user-admin-dashboard"
    | "reset-identity-provider"
    | "invalidate-token"
    | "clone-item"
    | "edit-item"
    | "delete-item",
  ...args: unknown[]
) => void;

export interface UseGraphqlGridAdminUserActionsOptions {
  emit: GraphqlGridAdminUserEmit;
}

export function useGraphqlGridAdminUserActions(
  options: UseGraphqlGridAdminUserActionsOptions,
) {
  function showAdminDataChangeModal(dataItem: unknown) {
    options.emit("show-data-change-modal", dataItem);
  }

  function deleteUserFromAdminDashboard(user: unknown) {
    options.emit("delete-user-from-company", user);
  }

  function editUserFromAdminDashboard(edit: unknown, user: unknown) {
    options.emit("edit-user-from-admin-dashboard", edit, user);
  }

  function grantAccess(user: unknown, revoke: unknown) {
    options.emit("grant-access", user, revoke);
  }

  function revokeAccessAdminDashboard(user: unknown, revoke: unknown) {
    options.emit("revoke-access-user-admin-dashboard", user, revoke);
  }

  function toggleOptionsAdminDashboard(user: unknown) {
    options.emit("toggle-options-admin-dashboard", user);
  }

  function resendInvitationAdminDashboard(user: unknown) {
    options.emit("resend-invitation-user-admin-dashboard", user);
  }

  function resetIdentityProvider(dataItem: unknown) {
    options.emit("reset-identity-provider", dataItem);
  }

  function invalidateToken(user: unknown) {
    options.emit("invalidate-token", user);
  }

  function cloneItem(dataItem: unknown) {
    options.emit("clone-item", dataItem);
  }

  function editItem(dataItem: unknown) {
    options.emit("edit-item", dataItem);
  }

  function deleteItem(dataItem: unknown) {
    options.emit("delete-item", dataItem);
  }

  return {
    showAdminDataChangeModal,
    deleteUserFromAdminDashboard,
    editUserFromAdminDashboard,
    grantAccess,
    revokeAccessAdminDashboard,
    toggleOptionsAdminDashboard,
    resendInvitationAdminDashboard,
    resetIdentityProvider,
    invalidateToken,
    cloneItem,
    editItem,
    deleteItem,
  };
}
