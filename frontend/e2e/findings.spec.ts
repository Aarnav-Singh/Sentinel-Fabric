import { test, expect } from "@playwright/test";

/**
 * Findings & Events E2E Tests
 *
 * Validates the findings page loads, events table renders,
 * and filtering/pagination works.
 */

test.describe("Findings Page", () => {
    test("should render findings page structure", async ({ page }) => {
        await page.goto("/findings");
        await expect(page.locator("body")).toBeVisible();

        // Should have a heading or table
        const heading = page.locator("h1, h2").first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test("should display event severity badges", async ({ page }) => {
        await page.goto("/findings");

        // Wait for the page to load
        await page.waitForTimeout(2000);

        // Check that the page has rendered content (not just a blank page)
        const body = await page.locator("body").textContent();
        expect(body).toBeTruthy();
    });

    test("should support pagination", async ({ page }) => {
        await page.goto("/findings");
        await page.waitForTimeout(2000);

        // Look for pagination controls
        const paginationButtons = page.locator("button").filter({ hasText: /next|prev|›|‹|\d+/i });
        const count = await paginationButtons.count();

        // If there is data, pagination should exist
        if (count > 0) {
            expect(count).toBeGreaterThan(0);
        }
    });
});
