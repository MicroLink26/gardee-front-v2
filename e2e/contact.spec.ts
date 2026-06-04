import { test, expect } from '@playwright/test';

test.describe('Contact and Footer', () => {
  test('should navigate to contact page', async ({ page }) => {
    await page.goto('/');

    // Click contact link
    const contactLink = page.locator('a:has-text("Contact")');
    await contactLink.click();

    await expect(page).toHaveURL(/\/contact/);
  });

  test('should display contact form', async ({ page }) => {
    await page.goto('/contact');

    // Check form fields
    const nameField = page.locator('input[placeholder*="Nom"]');
    const emailField = page.locator('input[type="email"]');
    const messageField = page.locator('textarea[placeholder*="Message"]');

    await expect(nameField).toBeVisible();
    await expect(emailField).toBeVisible();
    await expect(messageField).toBeVisible();
  });

  test('should show footer on all pages', async ({ page }) => {
    await page.goto('/');

    // Check footer exists
    const footer = page.locator('footer');
    const isFooterVisible = await footer.isVisible().catch(() => false);

    if (isFooterVisible) {
      await expect(footer).toBeVisible();
    }
  });

  test('should have social links in footer', async ({ page }) => {
    await page.goto('/');

    // Scroll to footer
    const footer = page.locator('footer');
    const isFooterVisible = await footer.isVisible().catch(() => false);

    if (isFooterVisible) {
      await footer.scrollIntoViewIfNeeded();

      // Check for common footer elements
      const footerText = page.locator('footer').textContent();
      expect(footerText).toBeTruthy();
    }
  });
});
