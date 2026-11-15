/**
 * Company UI-group and template CRUD event forwards for CalculumGridGraphql.
 */

export type GraphqlGridUiGroupEmit = (
  event:
    | "showModalForCompanies"
    | "editCompanies"
    | "editUiGroup"
    | "deleteSelectedUiGroup"
    | "deleteSelectedTemplate"
    | "editSelectedTemplate",
  ...args: unknown[]
) => void;

export interface UseGraphqlGridUiGroupActionsOptions {
  emit: GraphqlGridUiGroupEmit;
}

export function useGraphqlGridUiGroupActions(
  options: UseGraphqlGridUiGroupActionsOptions,
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
