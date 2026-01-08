import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('should redirect root to login for unauthenticated users', async ({ page }) => {
    await page.goto('/')

    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('should have correct page title', async ({ page }) => {
    await page.goto('/login')

    await expect(page).toHaveTitle(/ระบบเบิกค่าใช้จ่าย/i)
  })
})
