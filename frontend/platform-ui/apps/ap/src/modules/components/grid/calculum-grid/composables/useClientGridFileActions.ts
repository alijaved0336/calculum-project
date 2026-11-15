/**
 * File download / delete / clean and toolbar / action-button event forwards.
 */

export type ClientGridFileEmit = (
  event:
    | "downloadFile"
    | "button-action-clicked"
    | "actions-menu-on-action-clicked"
    | "buttonDenominatorMatchClick"
    | "deleteFile"
    | "clean-file",
  ...args: unknown[]
) => void;

export interface UseClientGridFileActionsOptions {
  emit: ClientGridFileEmit;
}

export function useClientGridFileActions(
  options: UseClientGridFileActionsOptions,
) {
  function onDownloadFile(event: unknown) {
    options.emit("downloadFile", event);
  }

  function onActionButtonClicked(payload: {
    action: unknown;
    dataItem: unknown;
  }) {
    options.emit("button-action-clicked", payload);
  }

  function actionsMenuOnActionClicked(action: unknown) {
    options.emit("actions-menu-on-action-clicked", action);
  }

  function onButtonDenominatorMatchClick(event: unknown) {
    options.emit("buttonDenominatorMatchClick", event);
  }

  function onDeleteFile(event: unknown, forCompare: unknown) {
    options.emit("deleteFile", event, forCompare);
  }

  function cleanFile(id: unknown, fileType: unknown) {
    options.emit("clean-file", id, fileType);
  }

  return {
    onDownloadFile,
    onActionButtonClicked,
    actionsMenuOnActionClicked,
    onButtonDenominatorMatchClick,
    onDeleteFile,
    cleanFile,
  };
}
