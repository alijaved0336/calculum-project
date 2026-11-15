/**
 * Company UI-group and template CRUD event forwards for CalculumGrid.
 */

export type ClientGridUiGroupEmit = (
  event:
    | "showModalForCompanies"
    | "editCompanies"
    | "editUiGroup"
    | "deleteSelectedUiGroup"
    | "deleteSelectedTemplate"
    | "editSelectedTemplate",
  ...args: unknown[]
) => void;

export interface UseClientGridUiGroupActionsOptions {
  emit: ClientGridUiGroupEmit;
}

export function useClientGridUiGroupActions(
  options: UseClientGridUiGroupActionsOptions,
) {
  function showModalForCompanies(uiGroup: unknown) {
    options.emit("showModalForCompanies", uiGroup);
  }

  function editCompanies(uiGroup: unknown) {
    options.emit("editCompanies", uiGroup);
  }

  function editUiGroup(uiGroup: unknown) {
    options.emit("editUiGroup", uiGroup);
  }

  function deleteSelectedUiGroup(uiGroup: unknown) {
    options.emit("deleteSelectedUiGroup", uiGroup);
  }

  function deleteSelectedTemplate(templateObj: unknown) {
    options.emit("deleteSelectedTemplate", templateObj);
  }

  function editSelectedTemplate(templateObj: unknown) {
    options.emit("editSelectedTemplate", templateObj);
  }

  return {
    showModalForCompanies,
    editCompanies,
    editUiGroup,
    deleteSelectedUiGroup,
    deleteSelectedTemplate,
    editSelectedTemplate,
  };
}
