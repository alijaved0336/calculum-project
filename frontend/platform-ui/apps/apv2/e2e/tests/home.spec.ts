import { test, expect } from '@playwright/test'

test.describe('DB Home view', () => {
  test('renders the welcome message for an authenticated user', async ({ page }) => {
    await page.route('**/api/session/info', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          email: 'qa@calculum.ai',
          idps: 'google',
          authenticationSource: 'test',
          sessionExpiresAt: Date.now() + 3600_000,
        }),
      }),
    )

    await page.goto('/')

    await expect(page.getByText('qa@calculum.ai')).toBeVisible()
  })
})
