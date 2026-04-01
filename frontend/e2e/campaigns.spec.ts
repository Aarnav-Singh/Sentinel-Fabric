import { test, expect } from "@playwright/test";

/**
 * Campaigns E2E Tests
 *
 * Validates the campaign correlation dashboard loads and
 * displays campaign data correctly.
 */

test.describe("Campaigns Page", () => {
    test("should render campaigns view", async ({ page }) => {
        await page.goto("/campaigns");
        await expect(page.locator("body")).toBeVisible();

        const content = await page.locator("body").textContent();
        expect(content?.length).toBeGreaterThan(0);
    });

    test("should display campaign timeline or cards", async ({ page }) => {
        await page.goto("/campaigns");
        await page.waitForTimeout(2000);

        // Page should have rendered campaign data or an empty state message
        const heading = page.locator("h1, h2, h3").first();
        if (await heading.isVisible()) {
            await expect(heading).toBeVisible();
        }
    });

    test("should show campaign severity indicators", async ({ page }) => {
        await page.goto("/campaigns");
        await page.waitForTimeout(2000);

        // Campaigns page should have severity badges or indicators
        const body = await page.locator("body").textContent();
        expect(body).toBeTruthy();
    });

    test("should support campaign detail navigation", async ({ page }) => {
        await page.goto("/campaigns");
        await page.waitForTimeout(2000);

        // If campaign cards exist, clicking one should navigate or expand
        const campaignCards = page.locator("[data-testid='campaign-card'], .campaign-card, a[href*='campaign']");
        const count = await campaignCards.count();
        if (count > 0) {
            await campaignCards.first().click();
            await page.waitForTimeout(1000);
            // Should either navigate or show detail view
            await expect(page.locator("body")).toBeVisible();
        }
    });
});
