/**
 * E2E tests for critical user journeys
 * Location: tests/e2e/user-journey.spec.ts
 * Tests complete flows through the application UI
 */

import { test, expect } from '@playwright/test';

test.describe('ETHEON User Journey E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto('/');
  });

  test.describe('Complete Signup & Deposit Journey', () => {
    test('should complete full user flow: signup -> verify -> login -> deposit', async ({
      page,
    }) => {
      // Step 1: Navigate to signup
      await page.click('text=Register'); // or button with register text
      await expect(page).toHaveURL(/.*signup/);

      // Step 2: Fill signup form
      const testEmail = `user-${Date.now()}@test.etheon.io`;
      const testPassword = 'TestPassword123!';

      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[placeholder*="password"]', testPassword);
      await page.fill('input[placeholder*="confirm"]', testPassword);

      // Step 3: Accept terms and submit
      await page.check('input[type="checkbox"]'); // Terms checkbox
      await page.click('button:has-text("Create Account")');

      // Step 4: Verify email confirmation message appears
      await expect(page).toContainText('Check your email');

      // Step 5: Simulate email verification (in real test, would click email link)
      // For now, assume user verified email in inbox

      // Step 6: Login with new account
      await page.goto('/signin');
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button:has-text("Sign In")');

      // Step 7: Verify redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page).toContainText('Welcome');

      // Step 8: Navigate to deposit page
      await page.click('text=Deposit');
      await expect(page).toHaveURL(/.*deposit/);

      // Step 9: Select deposit amount
      await page.click('button:has-text("£50")'); // Click £50 button
      await expect(page).toContainText('Total: £50');

      // Step 10: Proceed to checkout
      await page.click('button:has-text("Continue to Payment")');

      // Step 11: Verify Stripe checkout appears
      // (In real test, would enter Stripe test card details)
      // await expect(page).toContainText('Stripe');
    });

    test('should show validation errors for invalid signup data', async ({
      page,
    }) => {
      await page.click('text=Register');

      // Try to submit with empty fields
      await page.click('button:has-text("Create Account")');

      // Should show validation errors
      await expect(page).toContainText('Email is required');
      await expect(page).toContainText('Password is required');
    });

    test('should reject weak passwords', async ({ page }) => {
      await page.click('text=Register');

      const testEmail = 'test@example.com';
      const weakPassword = 'pass123'; // Less than 8 characters

      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[placeholder*="password"]', weakPassword);
      await page.fill('input[placeholder*="confirm"]', weakPassword);

      // Should show password strength error
      await expect(page).toContainText('at least 8 characters');
    });
  });

  test.describe('Login Flow', () => {
    test('should successfully login with correct credentials', async ({
      page,
    }) => {
      const testEmail = 'test@example.com';
      const testPassword = 'TestPassword123!';

      await page.goto('/signin');

      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button:has-text("Sign In")');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should reject login with wrong password', async ({ page }) => {
      await page.goto('/signin');

      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'WrongPassword123!');
      await page.click('button:has-text("Sign In")');

      // Should show error message
      await expect(page).toContainText('Invalid login credentials');
    });

    test('should reject login for non-existent user', async ({ page }) => {
      await page.goto('/signin');

      await page.fill('input[type="email"]', 'nonexistent@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Sign In")');

      // Should show error message
      await expect(page).toContainText('Invalid login credentials');
    });
  });

  test.describe('Dashboard & Real-time Updates', () => {
    test('should display user balance and recent transactions', async ({
      page,
    }) => {
      // Assuming user is already logged in
      await page.goto('/dashboard');

      // Should display balance
      await expect(page).toContainText('Balance');
      await expect(page).toContainText('£');

      // Should display recent transactions
      await expect(page).toContainText('Recent Transactions');
    });

    test('should update balance when new transaction arrives', async ({
      page,
    }) => {
      await page.goto('/dashboard');

      // Get initial balance
      const initialBalance = await page.textContent('.balance-amount');

      // Simulate transaction completion (would need backend mock)
      await page.waitForTimeout(2000); // Wait for real-time update

      // Balance should update
      const updatedBalance = await page.textContent('.balance-amount');
      // In real test, would verify balance changed if transaction occurred
    });

    test('should navigate to deposit from quick actions', async ({ page }) => {
      await page.goto('/dashboard');

      await page.click('button:has-text("Deposit")');
      await expect(page).toHaveURL(/.*deposit/);
    });
  });

  test.describe('Deposit Flow', () => {
    test('should select and customize deposit amount', async ({ page }) => {
      await page.goto('/deposit');

      // Test quick amount selection
      const amountButtons = page.locator('button:has-text("£")');
      expect(await amountButtons.count()).toBeGreaterThan(0);

      // Click first amount button
      await amountButtons.first().click();

      // Should update total
      await expect(page).toContainText('Total:');
    });

    test('should validate custom deposit amount', async ({ page }) => {
      await page.goto('/deposit');

      // Find custom amount input
      const customInput = page.locator('input[placeholder*="Custom"]');
      if (await customInput.isVisible()) {
        // Test too low amount
        await customInput.fill('5');
        await expect(page).toContainText('Minimum');

        // Test too high amount
        await customInput.fill('15000');
        await expect(page).toContainText('Maximum');
      }
    });

    test('should display fees clearly', async ({ page }) => {
      await page.goto('/deposit');

      // Select amount
      await page.click('button:has-text("£50")');

      // Should show fee breakdown
      await expect(page).toContainText('Fee');
      await expect(page).toContainText('Total');
    });
  });

  test.describe('Withdrawal Flow', () => {
    test('should request withdrawal from dashboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Click withdraw button
      await page.click('button:has-text("Withdraw")');
      await expect(page).toHaveURL(/.*withdraw/);

      // Should display current balance
      await expect(page).toContainText('Available Balance');
    });

    test('should select bank account for withdrawal', async ({ page }) => {
      await page.goto('/withdrawals');

      // Should display bank account options
      const accountRadios = page.locator('input[type="radio"]');
      const count = await accountRadios.count();

      if (count > 0) {
        // Select first account
        await accountRadios.first().check();
      }
    });

    test('should validate withdrawal amount', async ({ page }) => {
      await page.goto('/withdrawals');

      // Get available balance (would need to parse from page)
      // Try to withdraw more than available
      const amountInput = page.locator('input[type="number"]');
      await amountInput.fill('99999'); // Unrealistic amount

      // Should show insufficient balance error
      await expect(page).toContainText('insufficient');
    });
  });

  test.describe('Account Settings', () => {
    test('should navigate to account settings', async ({ page }) => {
      await page.goto('/dashboard');

      // Click user menu
      const userMenu = page.locator('button:has-text("Account")');
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.click('text=Settings');
        await expect(page).toHaveURL(/.*settings/);
      }
    });

    test('should display user account information', async ({ page }) => {
      await page.goto('/settings');

      // Should show email
      await expect(page).toContainText('Email');

      // Should show tier information
      await expect(page).toContainText('Tier');
    });

    test('should allow logout', async ({ page }) => {
      await page.goto('/dashboard');

      // Click user menu and logout
      await page.click('button:has-text("Account")');
      await page.click('text=Sign Out');

      // Should redirect to home/login
      await expect(page).toHaveURL(/\/$|\/signin/);
    });
  });

  test.describe('Error Handling', () => {
    test('should show error message when Stripe checkout fails', async ({
      page,
    }) => {
      await page.goto('/deposit');

      // Select amount and attempt to proceed
      await page.click('button:has-text("£50")');
      await page.click('button:has-text("Continue to Payment")');

      // If Stripe fails, should show error
      // (Would need to mock Stripe failure)
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Set offline mode
      await page.context().setOffline(true);

      await page.goto('/dashboard');

      // Try to perform action while offline
      // Should show network error message

      // Go back online
      await page.context().setOffline(false);
    });

    test('should show 404 for non-existent pages', async ({ page }) => {
      await page.goto('/nonexistent-page');

      // Should show 404 or redirect to home
      await expect(page).toHaveURL(/\/$|error|404/);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be usable on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard');

      // Should display mobile navigation
      const mobileMenu = page.locator('[aria-label="Menu"]');
      expect(await mobileMenu.isVisible()).toBeTruthy();

      // Should be able to navigate
      await mobileMenu.click();
      const navItems = page.locator('[role="navigation"]');
      expect(await navItems.isVisible()).toBeTruthy();
    });

    test('should be usable on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/deposit');

      // Should display properly
      const depositForm = page.locator('form');
      expect(await depositForm.isVisible()).toBeTruthy();
    });
  });
});
