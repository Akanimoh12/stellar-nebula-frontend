import { expect, type Page, type Locator } from '@playwright/test'
import { gotoStable, waitForNetworkIdleSafe, WAIT_TIMEOUTS } from '../helpers/wait-helpers'

export class AppPage {
  readonly page: Page
  readonly nav: Locator
  readonly mobileNav: Locator
  readonly homeLink: Locator
  readonly nebulaLink: Locator
  readonly shipLink: Locator
  readonly marketLink: Locator
  readonly leaderboardLink: Locator
  readonly header: Locator
  readonly main: Locator
  readonly skipLink: Locator
  readonly hamburger: Locator
  readonly themeToggle: Locator
  readonly notificationTrigger: Locator

  constructor(page: Page) {
    this.page = page
    this.nav = page.getByRole('navigation', { name: /primary navigation/i })
    this.mobileNav = page.getByRole('navigation', { name: /mobile navigation/i })
    this.homeLink = this.nav.getByRole('link', { name: /home/i })
    this.nebulaLink = this.nav.getByRole('link', { name: /nebula/i })
    this.shipLink = this.nav.getByRole('link', { name: /ship/i })
    this.marketLink = this.nav.getByRole('link', { name: /market/i })
    this.leaderboardLink = this.nav.getByRole('link', { name: /leaderboard/i })
    this.header = page.getByRole('banner')
    this.main = page.getByRole('main')
    this.skipLink = page.getByRole('link', { name: /skip to main content/i })
    this.hamburger = page.getByRole('button', { name: /open menu|close menu/i })
    this.themeToggle = page.getByRole('button', {
      name: /switch to (light|dark) mode|toggle dark/i,
    })
    this.notificationTrigger = page.getByRole('button', { name: /notifications/i })
  }

  async goto(path = '/') {
    await gotoStable(this.page, path)
  }

  async navigateTo(route: 'home' | 'nebula' | 'ship' | 'market' | 'leaderboard') {
    const linkMap = {
      home: this.homeLink,
      nebula: this.nebulaLink,
      ship: this.shipLink,
      market: this.marketLink,
      leaderboard: this.leaderboardLink,
    } as const
    const expectedUrl: Record<typeof route, RegExp | string> = {
      home: '/',
      nebula: /\/nebula/,
      ship: /\/dashboard/,
      market: /\/marketplace/,
      leaderboard: /\/leaderboard/,
    }
    const link = linkMap[route]
    await link.waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.standard })
    await link.click()
    // Wait for SPA route change to commit before waiting on network/main.
    await expect(this.page).toHaveURL(expectedUrl[route], { timeout: WAIT_TIMEOUTS.standard })
    await waitForNetworkIdleSafe(this.page)
    await this.main.waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.standard })
  }

  async openMobileMenuIfVisible() {
    if (await this.hamburger.isVisible().catch(() => false)) {
      const expanded = await this.hamburger.getAttribute('aria-expanded')
      if (expanded !== 'true') await this.hamburger.click()
    }
  }

  async closeMobileMenuIfOpen() {
    if (await this.hamburger.isVisible().catch(() => false)) {
      const expanded = await this.hamburger.getAttribute('aria-expanded')
      if (expanded === 'true') await this.hamburger.click()
    }
  }

  async getTitle() {
    return this.page.title()
  }

  async hasNoConsoleErrors(): Promise<string[]> {
    const errors: string[] = []
    this.page.on('pageerror', (e) => errors.push(e.message))
    return errors
  }

  async waitForMainVisible(timeout = WAIT_TIMEOUTS.standard) {
    await this.main.waitFor({ state: 'visible', timeout })
  }
}
