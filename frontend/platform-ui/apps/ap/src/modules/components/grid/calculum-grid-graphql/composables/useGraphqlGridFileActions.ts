/**
 * File download / delete / clean and toolbar button event forwards.
 */

export type GraphqlGridFileEmit = (
  event: "downloadFile" | "buttonClick" | "deleteFile" | "clean-file",
  ...args: unknown[]
) => void;

export interface UseGraphqlGridFileActionsOptions {
  emit: GraphqlGridFileEmit;
}

export function useGraphqlGridFileActions(
  options: UseGraphqlGridFileActionsOptions,
) {
  function onDownloadFile(event: unknown) {
    options.emit("downloadFile", event);
  }

  function onButtonClick(event: unknown) {
    options.emit("buttonClick", event);
  }

  function onDeleteFile(event: unknown, forCompare: unknown) {
    options.emit("deleteFile", event, forCompare);
  }

  function cleanFile(id: unknown, fileType: unknown) {
    options.emit("clean-file", id, fileType);
  }

  return {
    onDownloadFile,
    onButtonClick,
    onDeleteFile,
    cleanFile,
  };
}
