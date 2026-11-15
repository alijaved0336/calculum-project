/**
 * @fileoverview
 * E2E test for Admin - Revoke and Grant Access in Manage Team and Admin Console.
 *
 * This test verifies that a super admin can revoke and grant access to users
 * both from the Manage Team section and from the Admin Console company users
 * grid. Both grids render through CalculumGridGraphql backed by the
 * collectionQueryCompanyUsers GraphQL query; the legacy REST /user_companies
 * call this test used to wait on no longer fires.
 *
 * Test Flow:
 * 1. Log in as Super Admin before each test.
 * 2. Open Manage Team, pick an eligible user, revoke or grant its access,
 *    verify the state flip in the refetched grid data, then toggle it back.
 * 3. Open the Admin Console, enter the first company's users grid, and repeat
 *    the same toggle-and-restore cycle through the /api/admin endpoints.
 *
 * Acceptance Criteria:
 * - Super admin can revoke access for a user and the grid reflects it.
 * - Super admin can grant access back and the original state is restored.
 * - The e2e auth fixture accounts are never toggled.
 */

import { test, expect, Locator, Page, Response } from "@playwright/test";
import {
  waitElementVisibleAndClick,
  goToHomeSection,
  loginAsSuperAdmin,
  ensureDefaultLogin,
} from "../utils/Utils";
import { locators } from "../utils/locators";

type CompanyUserRow = {
  userEmail: string;
  enabled: boolean;
  companyUuid: string | null;
};

test.beforeEach(async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});

/**
 * Emails owned by the e2e auth fixtures. Toggling their access would break
 * unrelated specs (and the current session), so they are never picked as
 * toggle targets.
 */
function protectedEmails(): string[] {
  const configured = Object.entries(process.env)
    .filter(([key]) => key.startsWith("E2E_AUTH_USERNAME"))
    .map(([key, value]) => ({
      key,
      email: (value ?? "")
        .trim()
        .replace(/^["']|["']$/g, "")
        .toLowerCase(),
    }))
    .filter(({ email }) => email.length > 0);

  // The grid rows carry full addresses in userEmail, so only an email-form
  // value can ever match one. A fixture variable holding a bare username
  // would be a silent no-op in the exclusion check below and let its own
  // account be picked as the toggle target, so fail on it instead.
  expect(
    configured.filter(({ email }) => !email.includes("@")).map(({ key }) => key),
    "E2E_AUTH_USERNAME* variables must hold full email addresses",
  ).toEqual([]);

  return configured.map(({ email }) => email);
}

function isCompanyUsersQuery(response: Response): boolean {
  return (
    response.url().includes("/api/graphql") &&
    response.ok() &&
    (response.request().postData() ?? "").includes(
      "collectionQueryCompanyUsers",
    )
  );
}

async function usersFrom(response: Response): Promise<CompanyUserRow[]> {
  const body = await response.json();
  return body?.data?.collectionQueryCompanyUsers?.collection ?? [];
}

function pickToggleTarget(users: CompanyUserRow[]): CompanyUserRow {
  const excluded = protectedEmails();
  const target = users.find(
    (user) =>
      Boolean(user.companyUuid) &&
      Boolean(user.userEmail) &&
      !excluded.includes(user.userEmail.toLowerCase()),
  );
  expect(target, "no eligible user row to toggle access for").toBeTruthy();
  return target!;
}

/**
 * Opens the row kebab and returns the access entry for the wanted direction,
 * once the popup renders it enabled. AdminUserActions builds those entries
 * from the row's own dataItem and closes the popup when the grid rebuilds the
 * row, so a popup opened right after a toggle can still list the pre-toggle
 * entries - the opposite action being the enabled one. Reopening is what
 * rebuilds them, so retry the open instead of clicking into a locator that
 * would only ever time out on a permanently disabled entry.
 */
async function openAccessAction(
  page: Page,
  row: Locator,
  revoke: boolean,
): Promise<Locator> {
  const action = page
    .locator(
      revoke
        ? ".revoke-access-action:not(.disabled)"
        : ".grant-access-action:not(.disabled)",
    )
    .first();
  const kebab = row.locator(".ellipsis-icon-manage-team");
  await expect(kebab).toBeVisible({ timeout: 30_000 });

  await expect
    .poll(
      async () => {
        if (await action.isVisible()) {
          return true;
        }
        // The kebab is a plain toggle. Open the popup and give it a moment:
        // the entries are bound to dataItem.enabled, so an open popup picks
        // the refetched state up on its own. Only when the grid rebuilds the
        // row - which resets the popup's own open state - is a reopen needed,
        // so close it again and let the next round do that.
        await kebab.click();
        const entryAppeared = await action
          .waitFor({ state: "visible", timeout: 5_000 })
          .then(() => true)
          .catch(() => false);
        if (entryAppeared) {
          return true;
        }
        await kebab.click();
        return false;
      },
      {
        message: `the ${revoke ? "revoke" : "grant"} access entry never became enabled for this row`,
        timeout: 60_000,
        intervals: [500, 1_000, 2_000],
      },
    )
    .toBe(true);

  return action;
}

/**
 * Toggles one user's access from the users grid (revoke when enabled, grant
 * when disabled), confirms through the CalculumRevokeModal current-company
 * button, and asserts the flipped state in the grid's refetched data.
 * Returns the refreshed row so a second call restores the original state.
 */
async function toggleUserAccess(
  page: Page,
  user: CompanyUserRow,
  fromAdminConsole: boolean,
): Promise<CompanyUserRow> {
  console.log(
    `Toggling access for '${user.userEmail}' (enabled=${user.enabled}, adminConsole=${fromAdminConsole})`,
  );
  const row = page
    .locator("tr.k-master-row", { hasText: user.userEmail })
    .first();
  await expect(row).toBeVisible({ timeout: 30_000 });

  const action = await openAccessAction(page, row, user.enabled);
  await action.click();

  const confirmLabel = user.enabled
    ? "Revoke Access to the current company"
    : "Grant Access to the current company";
  const endpointBase = fromAdminConsole ? "/api/admin/users/" : "/api/users/";
  const endpointSuffix = user.enabled ? "/deny" : "/grant";

  const [refetch] = await Promise.all([
    page.waitForResponse(isCompanyUsersQuery),
    page.waitForResponse(
      (response) =>
        response.url().includes(endpointBase) &&
        response.url().endsWith(endpointSuffix) &&
        response.ok(),
    ),
    page
      .locator("#calculum-modal-container button.btn.btn-primary", {
        hasText: confirmLabel,
      })
      .click(),
  ]);

  const updated = (await usersFrom(refetch)).find(
    (candidate) => candidate.userEmail === user.userEmail,
  );
  expect(
    updated,
    `user ${user.userEmail} missing from refetched grid data`,
  ).toBeTruthy();
  expect(updated!.enabled).toBe(!user.enabled);
  console.log(
    `Access toggled for '${user.userEmail}' (enabled=${updated!.enabled})`,
  );
  return updated!;
}

test("Admin > Companies > First Available Company > Revoke / Grant Access Test @admin @integrated @us-3538 @flakyResolved", async ({
  page,
}) => {
  // --- Manage Team ---
  await waitElementVisibleAndClick(
    page,
    locators.headerMenu.topMenu.dropDownMenu,
  );
  const [manageTeamUsersResponse] = await Promise.all([
    page.waitForResponse(isCompanyUsersQuery),
    page.locator(locators.headerMenu.topMenu.manageTeam).click(),
  ]);
  const manageTeamUsers = await usersFrom(manageTeamUsersResponse);
  const manageTeamTarget = pickToggleTarget(manageTeamUsers);

  const manageTeamToggled = await toggleUserAccess(
    page,
    manageTeamTarget,
    false,
  );
  // Toggle back so the dev environment keeps its original state.
  await toggleUserAccess(page, manageTeamToggled, false);

  // --- Admin Console > first available company users ---
  await goToHomeSection(page);
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/companies") && response.ok(),
    ),
    page.locator(locators.headerMenu.topMenu.adminConsole).click(),
  ]);

  const [companyUsersResponse] = await Promise.all([
    page.waitForResponse(isCompanyUsersQuery),
    page.locator("span.go-to-company").nth(0).click(),
  ]);
  const companyUsers = await usersFrom(companyUsersResponse);
  const companyTarget = pickToggleTarget(companyUsers);

  const companyToggled = await toggleUserAccess(page, companyTarget, true);
  // Toggle back so the dev environment keeps its original state.
  await toggleUserAccess(page, companyToggled, true);
});
