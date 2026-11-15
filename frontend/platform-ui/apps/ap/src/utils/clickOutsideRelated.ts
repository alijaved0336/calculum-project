/**
 * This could be used for the clicked outside event
 * just include the element, and the iconClass, and the dropDownClass
 * @param e event
 */
export function menuPopup(
  e: any,
  iconClass: string,
  dropDownClass: string,
) /*: boolean */ {
  if (
    e.target.closest(`${iconClass}`) ||
    e.target.closest(".custom-select-dropdown") ||
    e.target.closest(".label-topbar") ||
    e.target.closest(".custom-select") ||
    e.target.closest(".custom-dropdown") ||
    e.target.closest("#search-currencies") ||
    e.target.closest("#icon-search") ||
    e.target.closest("#search") ||
    e.target.tagName === "SELECT" ||
    e.target.tagName === "INPUT"
    // e.target.closest("#selectPeriod") ||
    // e.target.closest("#selectProgram")
  ) {
    return;
  }
  if (e.target.closest(`${dropDownClass}`) !== null) {
    return true;
  }
  if (e.target.closest(`${dropDownClass}`) === null) {
    return false;
  }
}

export function handleClickOutsideDialog(
  e: Event,
  isShowing: boolean,
): boolean {
  const t = e.target as HTMLElement;

  // Check if the click target matches any of the conditions
  if (
    t.outerHTML?.trim().startsWith("<path") ||
    t.closest(".options-container") ||
    t.closest(".filter-icon-container") ||
    t.closest(".filter-applied-badge") ||
    t.closest(".transition-colors") ||
    t.closest(".open-gf-from-manage")    
  ) {
    return isShowing; // Return current state if inside any of the elements
  }

  return false; // Hide the dialog if clicked outside
}
