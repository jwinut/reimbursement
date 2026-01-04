import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Reimbursement' })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with line/i })).toBeVisible()
  })

  test('should have LINE sign in button', async ({ page }) => {
    await page.goto('/login')

    const lineButton = page.getByRole('button', { name: /sign in with line/i })
    await expect(lineButton).toBeEnabled()
  })

  test('should redirect unauthenticated users from expense page to login', async ({ page }) => {
    await page.goto('/expenses/new')

    // Should redirect to login or auth error page (when NextAuth is not configured)
    const url = page.url()
    const isRedirectedAway = url.includes('login') || url.includes('auth/error')
    expect(isRedirectedAway).toBe(true)
  })
})
