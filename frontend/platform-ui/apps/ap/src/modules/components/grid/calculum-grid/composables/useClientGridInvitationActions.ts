/**
 * Invitation / value-proposition refresh and share-modal event forwards.
 */

export type ClientGridInvitationEmit = (
  event: "refresh-invitations" | "launch-share-modal",
  ...args: unknown[]
) => void;

export interface UseClientGridInvitationActionsOptions {
  emit: ClientGridInvitationEmit;
}

export function useClientGridInvitationActions(
  options: UseClientGridInvitationActionsOptions,
) {
  function refreshInvitations() {
    options.emit("refresh-invitations");
  }

  /** Historical alias: value propositions reuse the invitations refresh event. */
  function refreshValuePropositions() {
    options.emit("refresh-invitations");
  }

  function launchShareModal(id: unknown) {
    options.emit("launch-share-modal", id);
  }

  return {
    refreshInvitations,
    refreshValuePropositions,
    launchShareModal,
  };
}
