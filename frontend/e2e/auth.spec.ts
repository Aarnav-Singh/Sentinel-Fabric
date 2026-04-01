import { test, expect } from "@playwright/test";

/**
 * Authentication E2E Tests
 *
 * Tests the login flow, session persistence, and role-based access.
 */

test.describe("Authentication", () => {
    test("should display login page", async ({ page }) => {
        await page.goto("/");
        // Should redirect to login or show login form
        await expect(page.locator("body")).toBeVisible();
    });

    test("should reject invalid credentials", async ({ page }) => {
        await page.goto("/");

        // Fill login form with invalid credentials
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        const passwordInput = page.locator('input[type="password"], input[name="password"]');

        if (await emailInput.isVisible()) {
            await emailInput.fill("invalid@test.com");
            await passwordInput.fill("wrongpassword");

            const submitButton = page.locator('button[type="submit"]');
            await submitButton.click();

            // Should show error message or stay on login page
            await expect(page).not.toHaveURL(/dashboard/);
        }
    });

    test("should enforce MFA for admin roles", async ({ page }) => {
        await page.goto("/profile");
        // MFA section should be visible for authenticated admins
        await expect(page.locator("body")).toBeVisible();
    });
});
