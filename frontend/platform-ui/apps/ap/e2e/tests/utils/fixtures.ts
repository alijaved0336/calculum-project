import { test as baseTest } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
export { expect } from '@playwright/test'

export const test = baseTest.extend({
  storageState: async({ browser }, use, testInfo) => {
    // Override storage state, use parallel index to look up logged-in info and generate it lazily.
    const fileName = path.join(testInfo.project.outputDir, 'storage-' + testInfo.parallelIndex)
    if (!fs.existsSync(fileName)) {
      // Make sure we are not using any other storage state.
      const page = await browser.newPage({ storageState: undefined })
      // Create a unique username for each worker.
      await page.fill('input[name="email"]', process.env.E2E_USERNAME!)
      await page.fill('input[name="password"]', process.env.E2E_PASSWORD!)
      await page.click('a.btn.btn-primary')
      await page.waitForNavigation({ timeout: 600000 })
      await page.context().storageState({ path: fileName })
      await page.close()
    }
    await use(fileName)
  }
})
