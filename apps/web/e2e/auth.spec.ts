import { expect, test } from '@playwright/test';

test.describe('Auth 流程', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible();
    await expect(page.getByPlaceholder('alice@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('输入密码')).toBeVisible();
  });

  test('authenticated user gets redirected from login to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            accessToken: 'mock-token',
            refreshToken: 'mock-refresh',
            user: { id: '1', email: 'a@b.com', name: 'A' },
          },
          version: 0,
        })
      );
    });
    await page.goto('/login');
    await expect(page).toHaveURL('http://localhost:3001/');
  });

  test('unauthenticated user accessing dashboard gets redirected to login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible({ timeout: 10000 });
  });
});
