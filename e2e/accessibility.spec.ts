import { test } from '@playwright/test'
import { AppPage } from './pages/app.page'
import { expectNoA11yViolations } from './helpers/a11y-helpers'
import { waitForNetworkIdleSafe } from './helpers/wait-helpers'

const ROUTES = ['/', '/nebula', '/dashboard', '/marketplace']

test.describe('Accessibility', () => {
  for (const route of ROUTES) {
    test(`${route} has no serious or critical axe violations`, async ({ page }) => {
      const app = new AppPage(page)
      await app.goto(route)
      await waitForNetworkIdleSafe(page)

      await expectNoA11yViolations(page)
    })
  }
})
