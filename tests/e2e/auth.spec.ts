import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show sign in and sign up buttons when not authenticated', async ({ page }) => {
    // Check that sign in button is visible
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    // Check that sign up button is visible
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    // Click sign in button
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should be on sign in page
    await expect(page).toHaveURL(/.*\/sign-in/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should navigate to sign up page', async ({ page }) => {
    // Click sign up button
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Should be on sign up page
    await expect(page).toHaveURL(/.*\/sign-up/);
    await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Go to sign in page
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: /continue/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/email address is required/i)).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    // Go to sign in page
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Enter invalid email
    await page.getByLabel(/email address/i).fill('invalid-email');
    await page.getByRole('button', { name: /continue/i }).click();
    
    // Should show email validation error
    await expect(page.getByText(/invalid email format/i)).toBeVisible();
  });

  test('should redirect to dashboard after successful sign in', async ({ page }) => {
    // Mock successful authentication
    await page.route('**/sign-in', async route => {
      await route.fulfill({
        status: 302,
        headers: { location: '/dashboard' }
      });
    });

    // Go to sign in page
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Fill in credentials
    await page.getByLabel(/email address/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should show user menu when authenticated', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.localStorage.setItem('clerk-db-jwt', 'mock-jwt-token');
    });

    // Mock user data response
    await page.route('**/api/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user_123',
          email: 'test@example.com',
          name: 'Test User'
        })
      });
    });

    await page.reload();
    
    // Should show user avatar/menu instead of sign in buttons
    await expect(page.getByRole('button', { name: /sign in/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /test user/i })).toBeVisible();
  });

  test('should sign out successfully', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.localStorage.setItem('clerk-db-jwt', 'mock-jwt-token');
    });

    // Mock user data response
    await page.route('**/api/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user_123',
          email: 'test@example.com',
          name: 'Test User'
        })
      });
    });

    await page.reload();
    
    // Click user menu
    await page.getByRole('button', { name: /test user/i }).click();
    
    // Click sign out
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    
    // Should redirect to home and show sign in buttons
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should handle sign up flow', async ({ page }) => {
    // Go to sign up page
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Fill in sign up form
    await page.getByLabel(/email address/i).fill('newuser@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Should show verification message or redirect
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test('should show password strength indicator', async ({ page }) => {
    // Go to sign up page
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Type weak password
    await page.getByLabel(/password/i).fill('123');
    
    // Should show weak password indicator
    await expect(page.getByText(/password is too weak/i)).toBeVisible();
    
    // Type strong password
    await page.getByLabel(/password/i).fill('StrongPassword123!');
    
    // Should show strong password indicator
    await expect(page.getByText(/password is strong/i)).toBeVisible();
  });

  test('should handle social authentication', async ({ page }) => {
    // Go to sign in page
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show social login buttons
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
    
    // Mock social auth redirect
    await page.route('**/oauth/google', async route => {
      await route.fulfill({
        status: 302,
        headers: { location: 'https://accounts.google.com/oauth/authorize' }
      });
    });

    // Click Google sign in
    await page.getByRole('button', { name: /continue with google/i }).click();
    
    // Should redirect to Google OAuth
    await expect(page).toHaveURL(/.*accounts\.google\.com/);
  });
});
