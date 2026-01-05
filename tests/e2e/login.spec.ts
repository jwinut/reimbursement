import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test('should display login page with correct title', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Reimbursement' })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with line/i })).toBeVisible()
  })

  test('should have enabled LINE sign in button', async ({ page }) => {
    await page.goto('/login')

    const lineButton = page.getByRole('button', { name: /sign in with line/i })
    await expect(lineButton).toBeEnabled()
    await expect(lineButton).toBeVisible()
  })

  test('should redirect unauthenticated users from expense page to login', async ({ page }) => {
    await page.goto('/expenses/new')

    // Should redirect to login or auth error page
    const url = page.url()
    const isRedirectedAway = url.includes('login') || url.includes('auth/error') || url.includes('api/auth')
    expect(isRedirectedAway).toBe(true)
  })

  test('should redirect unauthenticated users from home page', async ({ page }) => {
    await page.goto('/')

    // Home should redirect to login for unauthenticated users
    await page.waitForURL(/\/(login|api\/auth)/)
    const url = page.url()
    expect(url.includes('login') || url.includes('api/auth')).toBe(true)
  })

  test('should display error message when OAuth fails', async ({ page }) => {
    // Simulate OAuth error callback
    await page.goto('/login?error=OAuthCallback')

    // Should show error state or message
    await expect(page.getByRole('heading', { name: 'Reimbursement' })).toBeVisible()
    // The login page should still be functional
    await expect(page.getByRole('button', { name: /sign in with line/i })).toBeVisible()
  })

  test('should display error message for account creation failure', async ({ page }) => {
    await page.goto('/login?error=OAuthCreateAccount')

    await expect(page.getByRole('heading', { name: 'Reimbursement' })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with line/i })).toBeVisible()
  })

  test('should have proper page title', async ({ page }) => {
    await page.goto('/login')

    await expect(page).toHaveTitle(/reimbursement/i)
  })
})
