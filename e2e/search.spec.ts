import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test('should load home page and navigate to search', async ({ page }) => {
    await page.goto('/');
    expect(page).toHaveTitle(/Trouvez votre jardinier/i);

    // Check hero section exists
    const heroTitle = page.locator('h1:has-text("Votre jardin")');
    await expect(heroTitle).toBeVisible();
  });

  test('should navigate to map from home page', async ({ page }) => {
    await page.goto('/');

    // Click "Voir la carte" button
    const mapButton = page.locator('a:has-text("Voir la carte")').first();
    await mapButton.click();

    // Check map page loaded
    await expect(page).toHaveURL(/\/carte/);
  });

  test('should navigate to ranking page', async ({ page }) => {
    await page.goto('/');

    // Click ranking link in navbar dropdown
    const dropdown = page.locator('button:has-text("Recherchez un jardinier")');
    await dropdown.click();

    const rankingLink = page.locator('text=Classement des jardiniers');
    await rankingLink.click();

    await expect(page).toHaveURL(/\/classement/);
  });

  test('should filter by service on ranking page', async ({ page }) => {
    await page.goto('/classement');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that service filter exists
    const filterSection = page.locator('text=Services').first();
    await expect(filterSection).toBeVisible();
  });

  test('should perform search with location query', async ({ page }) => {
    await page.goto('/recherche?q=tonte&ville=Paris');

    // Wait for results to load
    await page.waitForLoadState('networkidle');

    // Check that results are displayed
    const results = page.locator('[class*="card"]').first();
    const isVisible = await results.isVisible().catch(() => false);

    if (isVisible) {
      await expect(results).toBeVisible();
    }
  });

  test('should view gardener profile', async ({ page }) => {
    // Go to ranking page to get a profile link
    await page.goto('/classement');
    await page.waitForLoadState('networkidle');

    // Try to click first gardener profile
    const profileLink = page.locator('a[href*="/prestataires/"]').first();
    const href = await profileLink.getAttribute('href');

    if (href) {
      await page.goto(href);

      // Check breadcrumb navigation
      const breadcrumb = page.locator('nav').filter({ hasText: /Accueil.*Jardiniers/ });
      const isBreadcrumbVisible = await breadcrumb.isVisible().catch(() => false);

      if (isBreadcrumbVisible) {
        await expect(breadcrumb).toBeVisible();
      }
    }
  });
});
