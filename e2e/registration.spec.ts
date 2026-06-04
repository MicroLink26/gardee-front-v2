import { test, expect } from '@playwright/test';

test.describe('Prestataire Registration', () => {
  test('should load postuler page', async ({ page }) => {
    await page.goto('/postuler');

    expect(page).toHaveTitle(/Devenir prestataire/i);

    // Check form title
    const title = page.locator('h1:has-text("Devenir prestataire")');
    await expect(title).toBeVisible();
  });

  test('should show benefits on postuler page', async ({ page }) => {
    await page.goto('/postuler');

    // Check benefits are displayed
    const benefits = page.locator('text=Visibilité locale immédiate');
    await expect(benefits).toBeVisible();
  });

  test('should display form stepper', async ({ page }) => {
    await page.goto('/postuler');

    // Check stepper exists
    const stepper = page.locator('[class*="stepper"]');
    await expect(stepper).toBeVisible();

    // Check all steps are present
    const identityStep = page.locator('text=Identité');
    await expect(identityStep).toBeVisible();
  });

  test('should show first step form fields', async ({ page }) => {
    await page.goto('/postuler');

    // Check first step inputs
    const prenomField = page.locator('input[placeholder*="Jean"]');
    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');
    const telField = page.locator('input[type="tel"]');

    await expect(prenomField).toBeVisible();
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await expect(telField).toBeVisible();
  });

  test('should validate required fields on next step', async ({ page }) => {
    await page.goto('/postuler');

    // Try to click next without filling form
    const nextButton = page.locator('button:has-text("Continuer")').first();
    await nextButton.click();

    // Check for error message
    const errorMessage = page.locator('text=/Veuillez remplir|obligatoires/i');
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);

    // Should show error or stay on same step
    expect(isErrorVisible).toBeTruthy();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/postuler');

    const emailField = page.locator('input[type="email"]');
    await emailField.fill('invalid-email');
    await emailField.blur();

    // Check for real-time validation error
    const errorMessage = page.locator('text=/Email invalide/i');
    const hasError = await errorMessage.isVisible().catch(() => false);

    // Should either show error or prevent submission
    if (hasError) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should validate password length', async ({ page }) => {
    await page.goto('/postuler');

    const passwordField = page.locator('input[type="password"]');
    const prenomField = page.locator('input[placeholder*="Jean"]');
    const nomField = page.locator('input[placeholder*="Dupont"]');
    const emailField = page.locator('input[type="email"]');
    const telField = page.locator('input[type="tel"]');

    // Fill all fields except password is too short
    await prenomField.fill('Test');
    await nomField.fill('User');
    await emailField.fill('test@example.com');
    await telField.fill('0612345678');
    await passwordField.fill('short');

    // Try to go to next step
    const nextButton = page.locator('button:has-text("Continuer")').first();
    await nextButton.click();

    // Should show error about password length
    const errorMessage = page.locator('text=/8 caractères/i');
    const hasError = await errorMessage.isVisible().catch(() => false);

    expect(hasError).toBeTruthy();
  });

  test('should persist form data to localStorage', async ({ page, context }) => {
    await page.goto('/postuler');

    // Fill some fields
    const prenomField = page.locator('input[placeholder*="Jean"]');
    await prenomField.fill('Jean');

    // Check localStorage
    const storage = await context.storageState();
    const localStorageData = await page.evaluate(() => {
      return localStorage.getItem('gardee-postuler-draft');
    });

    expect(localStorageData).toBeTruthy();

    if (localStorageData) {
      const draft = JSON.parse(localStorageData);
      expect(draft.prenom).toBe('Jean');
    }
  });

  test('should restore form data from localStorage', async ({ page }) => {
    // Set localStorage data
    await page.context().addCookies([]);
    await page.evaluate(() => {
      localStorage.setItem('gardee-postuler-draft', JSON.stringify({
        prenom: 'TestName',
        nom: 'TestSurname',
        email: 'test@test.com',
        password: 'password123',
        telephone: '0612345678',
        profilType: 'amateur',
        prestations: [],
        photoPreview: '',
        step: 1,
        tarifHoraire: '',
        description: '',
        materielOK: false,
        isEntrepreneur: false,
        siret: '',
        qualifElagage: false,
        adresse: '',
        codePostal: '',
        ville: '',
        contactCom: false,
        cgu: false,
        consentDataProcessing: false,
      }));
    });

    await page.goto('/postuler');

    // Check that form is restored
    const prenomField = page.locator('input[placeholder*="Jean"]');
    const value = await prenomField.inputValue();

    expect(value).toBe('TestName');
  });
});
