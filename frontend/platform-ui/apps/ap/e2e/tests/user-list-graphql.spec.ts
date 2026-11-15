import { test, expect, Page } from '@playwright/test'
import { ensureDefaultLogin, ensureSuperAdminLogin } from './utils/Utils'
import AdminConsoleUtils from './utils/AdminConsoleUtils'

/**
 * E2E Tests for User List GraphQL Functionality
 *
 * These tests verify the GraphQL integration for fetching company users
 * using the CompanyUserGraphQL entity and CalculumGridGraphql component.
 *
 * Navigation: Admin Console → Companies → click manage-team icon → CompanyUsers page
 * The grid renders via Kendo UI CalculumGridGraphql (no data-test attributes).
 */

// Data rows only — excludes Kendo's "No records available" placeholder row,
// which also carries .k-table-row (full class "k-table-row k-grid-norecords")
// and is rendered while the GraphQL users query is still in flight. Counting
// that placeholder as a data row is what made these grid assertions flaky:
// a count/`.first()` read right after the grid mounts catches the placeholder
// instead of the loaded users.
const DATA_ROWS = '.k-grid-content tr.k-table-row:not(.k-grid-norecords)'

/**
 * Navigate Admin Console → Companies → first company's users (CompanyUsers page)
 * and wait for the users grid shell to mount. Returns the data-rows locator;
 * callers that need loaded data should await a web-first assertion on it.
 */
async function openFirstCompanyUsers(page: Page) {
  await AdminConsoleUtils.goToCompanies(page)
  await page.waitForSelector('.k-grid', { timeout: 10000 })

  // Click the manage-team icon (.go-to-company) of the first company row
  await Promise.all([
    page.waitForResponse(
      response => response.url().includes('/api/graphql') && response.ok()
    ),
    page.locator('.go-to-company').first().click()
  ])

  // Wait for the users grid shell to render on the CompanyUsers page
  await page.waitForSelector('.k-grid', { timeout: 10000 })

  return page.locator(DATA_ROWS)
}

test.describe('User List GraphQL', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await ensureSuperAdminLogin(page)
  })

  test('should load company users via GraphQL', async ({ page }) => {
    const dataRows = await openFirstCompanyUsers(page)

    // Real user rows render (not the transient "No records" placeholder).
    // toBeVisible auto-retries, so it waits out the GraphQL fetch + render.
    await expect(dataRows.first()).toBeVisible({ timeout: 10000 })
  })

  test('should filter users by search term', async ({ page }) => {
    const dataRows = await openFirstCompanyUsers(page)

    // Establish a real baseline: wait until the grid has actually rendered
    // loaded user rows, not the transient empty/loading placeholder.
    await expect(dataRows.first()).toBeVisible({ timeout: 10000 })

    // Type a term that cannot match any user, then wait for the specific
    // search-filtered GraphQL response (debounced 500ms) instead of a blind
    // timeout. The Apollo request body carries the search term in its variables.
    const searchTerm = 'test-nonexistent-user-query'
    const searchInput = page.locator('input.form-control.border-start-0')
    await Promise.all([
      page.waitForResponse(
        response =>
          response.url().includes('/api/graphql') &&
          response.ok() &&
          (response.request().postData() ?? '').includes(searchTerm)
      ),
      searchInput.fill(searchTerm)
    ])

    // A guaranteed-nonexistent term must collapse the grid to its empty state.
    // toHaveCount auto-retries, so it waits out the re-render with no race.
    await expect(dataRows).toHaveCount(0, { timeout: 10000 })
  })

  test('should display user details correctly in grid columns', async ({ page }) => {
    const dataRows = await openFirstCompanyUsers(page)

    // Verify the grid header is visible
    await expect(page.locator('.k-grid-header')).toBeVisible()

    // Wait for a real data row (not the placeholder) before inspecting cells
    const firstRow = dataRows.first()
    await expect(firstRow).toBeVisible({ timeout: 10000 })

    // The row exposes its columns (username, email, lastAccess, activeDays,
    // status, roles, actions). Custom cell templates (AdminUsername,
    // AdminUserActions, etc.) render their own <td> without the k-table-td
    // class, so we count all <td> children. expect.poll retries while the
    // row's cell templates finish rendering.
    await expect
      .poll(() => firstRow.locator('td').count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(5)
  })

  test('should handle pagination correctly', async ({ page }) => {
    const dataRows = await openFirstCompanyUsers(page)

    // Ensure data has loaded before evaluating pager state — the pager only
    // renders when total > pageSize, and total is 0 until the query resolves,
    // so checking it earlier would falsely skip the assertion.
    await expect(dataRows.first()).toBeVisible({ timeout: 10000 })

    // Pager is optional (only present when total exceeds the page size).
    const pager = page.locator('.k-pager')
    if (await pager.isVisible()) {
      const pagerInfo = page.locator('.k-pager-info')
      if (await pagerInfo.isVisible()) {
        await expect(pagerInfo).not.toBeEmpty()
      }
    }
  })

  test('should navigate back to companies list', async ({ page }) => {
    await openFirstCompanyUsers(page)

    // Click the back button
    await page.locator('button.btn.btn-outline-secondary.btn-sm').click()

    // Verify we are back on the companies page
    await expect(page).toHaveURL(/.*\/admin\/companies$/)
  })

  test('should display active days last 30 correctly', async ({ page }) => {
    const dataRows = await openFirstCompanyUsers(page)

    // Wait for a real data row (not the "No records" placeholder)
    const firstRow = dataRows.first()
    await expect(firstRow).toBeVisible({ timeout: 10000 })

    // activeDaysLast30 column uses className 'text-center' and no custom cell
    // template; it's the 4th data column (username, email, lastAccess, activeDaysLast30)
    const activeDaysCell = firstRow.locator('td.k-table-td.text-center').first()
    await expect(activeDaysCell).toBeVisible()
    const activeDaysText = await activeDaysCell.textContent()
    const activeDaysValue = Number.parseInt(activeDaysText?.trim() || '0')
    expect(activeDaysValue).toBeGreaterThanOrEqual(0)
    expect(activeDaysValue).toBeLessThanOrEqual(30)
  })

  test.afterEach(async ({ page }) => {
    await ensureDefaultLogin(page)
  })
})
