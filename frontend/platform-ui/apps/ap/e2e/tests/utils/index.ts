import AdminConsoleUtils from "./AdminConsoleUtils";
import AnalyzeUtils from "./AnalyzeUtils";
import ApiWaitersUtils from "./ApiWaitersUtils";
import AuthUtils from "./AuthUtils";
import EntityCardUtils from "./EntityCardUtils";
import GlobalFiltersUtils from "./GlobalFiltersUtils";
import GraphQlUtils from "./graphql";
import GridUtils from "./GridUtils";
import ManageUtils from "./ManageUtils";
import ProgramUtils from "./ProgramUtils";
import SetupUtils from "./SetupUtils";
import SpendFileVersionUtils, {
  RECALCULATION_POLL_BUDGET_MS
} from "./SpendFileVersionUtils";
import StringUtils from "./StringUtils";
// Reexport utils from each module
export {
  RECALCULATION_POLL_BUDGET_MS,
  AdminConsoleUtils,
  AnalyzeUtils,
  ApiWaitersUtils,
  AuthUtils,
  EntityCardUtils,
  GlobalFiltersUtils,
  GraphQlUtils,
  GridUtils,
  ManageUtils,
  ProgramUtils,
  SetupUtils,
  SpendFileVersionUtils,
  StringUtils
};

// *** Type Checks ***
/**
 * Checks if the given value is null or undefined.
 *
 * @param {unknown} value - The value to check for.
 * @return {boolean} Returns true if the value is null or undefined, false otherwise.
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return isNull(value) || isUndefined(value);
}

/**
 * Checks if the given value is null.
 *
 * @param {unknown} value - The value to check for.
 * @return {boolean} Returns true if the value is null, false otherwise.
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Checks if the given value is undefined.
 *
 * @param {unknown} value - The value to check for.
 * @return {boolean} Returns true if the value is undefined, false otherwise.
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}
// *** END Type Checks ***
