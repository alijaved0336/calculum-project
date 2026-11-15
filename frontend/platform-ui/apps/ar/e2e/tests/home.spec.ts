import { test, expect } from '@playwright/test'

/**
 * The AR landing page against a stubbed API.
 *
 * Every backend call is intercepted, so this asserts what the application does with a response,
 * not whether the backend is up. The end-to-end path through a real API and worker is covered by
 * the manual cases in docs/requirements/test-cases-week1.md (TC-01, TC-02), which need the whole
 * stack running.
 *
 * The previous version of this file asserted a heading and a welcome message that the application
 * has never rendered. It had never been run, so nothing said so.
 */

const company = {
  id: 1,
  uuid: '11111111-1111-4111-8111-111111111111',
  name: 'Contoso Manufacturing',
}

const saleFile = {
  id: 1,
  name: 'sample-sales-file.xlsx',
  versions: [
    {
      id: 1,
      version: 1,
      status: 'ready',
      periodStartDate: '2022-01-01',
      periodEndDate: '2022-12-31',
      importedLineCount: 6,
    },
  ],
}

async function stubApi(page: import('@playwright/test').Page, options: {
  companies?: unknown
  switchableCompanies?: unknown
  saleFiles?: unknown
  saleFilesStatus?: number
} = {}) {
  await page.route('**/api/session/info', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'qa@calculum.ai',
        idps: 'google',
        authenticationSource: 'test',
        // SECONDS, and the comment here used to say milliseconds — which the API sent only from a
        // development stub, corrected when the real /api/session/info shipped (G-48 in
        // `Ada-Platform`). Harmless while nothing read the field; UC-ENT-08's keep-alive does, and
        // a millisecond value read as seconds puts the expiry tens of thousands of years out, so a
        // stub left in the old unit would have quietly proved the renewal never fires.
        sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
      }),
    }),
  )

  // The dashboard still reads this one: it wants the company's full catalogue row, and it is
  // scoped to the session, so it answers the active company whichever one that is.
  await page.route('**/api/companies', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options.companies ?? { total: 1, companies: [company] }),
    }),
  )

  // The navbar's picker reads THIS one since UC-ENT-19, and the two are different questions: the
  // route above answers "the company this session is in", this one answers "the companies it may
  // move to". Stubbing only the first left the picker empty while the heading rendered, which is
  // the shape of the defect the story exists to fix, arriving through the test double.
  await page.route('**/api/session/companies', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        options.switchableCompanies ?? {
          companies: [{ uuid: company.uuid, name: company.name }],
          activeCompanyUuid: company.uuid,
        },
      ),
    }),
  )

  await page.route('**/api/sale-files', (route) =>
    route.fulfill({
      status: options.saleFilesStatus ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(options.saleFiles ?? [saleFile]),
    }),
  )
}

test.describe('AR home', () => {
  test('shows the active company and its sale files', async ({ page }) => {
    await stubApi(page)

    await page.goto('/')

    await expect(page.getByRole('heading', { name: company.name })).toBeVisible()
    await expect(page.getByText('sample-sales-file.xlsx')).toBeVisible()
    await expect(page.getByText('ready')).toBeVisible()
    await expect(page.getByText('2022-01-01 to 2022-12-31')).toBeVisible()
  })

  test('says so plainly when the company has no files yet', async ({ page }) => {
    // An empty state, not an empty screen: a new tenant must be told what to do next rather than
    // left wondering whether the page failed to load.
    await stubApi(page, { saleFiles: [] })

    await page.goto('/')

    await expect(page.getByText('No sale files yet')).toBeVisible()
  })

  test('reports a server failure instead of rendering an empty page', async ({ page }) => {
    await stubApi(page, { saleFilesStatus: 500, saleFiles: {} })

    await page.goto('/')

    await expect(page.getByText('Could not load your data')).toBeVisible()
    await expect(page.getByText('The server answered 500.')).toBeVisible()
  })

  test('offers navigation to the match view', async ({ page }) => {
    await stubApi(page)

    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Match' })).toBeVisible()
  })
})
