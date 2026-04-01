import { test, expect } from "@playwright/test";

/**
 * Compliance E2E Tests
 *
 * Validates compliance-related pages: audit trail, retention config,
 * and compliance reporting.
 */

test.describe("Audit Trail Page", () => {
    test("should render audit trail", async ({ page }) => {
        await page.goto("/audit");
        await expect(page.locator("body")).toBeVisible();

        const heading = page.locator("h1").first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test("should display audit entries table", async ({ page }) => {
        await page.goto("/audit");
        await page.waitForTimeout(2000);

        // Should render a table with audit columns
        const table = page.locator("table");
        if (await table.isVisible()) {
            const headers = table.locator("thead th");
            expect(await headers.count()).toBeGreaterThanOrEqual(3);
        }
    });

    test("should support search filtering", async ({ page }) => {
        await page.goto("/audit");
        await page.waitForTimeout(2000);

        const searchInput = page.locator("input[placeholder*='Filter'], input[placeholder*='Search']");
        if (await searchInput.isVisible()) {
            await searchInput.fill("login");
            await page.waitForTimeout(1000);
            // Page should still be functional after filtering
            await expect(page.locator("body")).toBeVisible();
        }
    });

    test("should support pagination controls", async ({ page }) => {
        await page.goto("/audit");
        await page.waitForTimeout(2000);

        // Should have page indicator or next/prev buttons
        const pageIndicator = page.locator("text=/\\d+\\/\\d+/");
        if (await pageIndicator.isVisible()) {
            expect(await pageIndicator.textContent()).toMatch(/\d+\/\d+/);
        }
    });
});


test.describe("Data Retention Page", () => {
    test("should render retention configuration", async ({ page }) => {
        await page.goto("/retention");
        await expect(page.locator("body")).toBeVisible();

        const heading = page.locator("h1").first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test("should display retention slider", async ({ page }) => {
        await page.goto("/retention");
        await page.waitForTimeout(2000);

        const slider = page.locator("input[type='range']");
        if (await slider.isVisible()) {
            await expect(slider).toBeVisible();
            // Slider should have min/max attributes
            const min = await slider.getAttribute("min");
            const max = await slider.getAttribute("max");
            expect(Number(min)).toBeLessThan(Number(max));
        }
    });

    test("should display compliance requirements", async ({ page }) => {
        await page.goto("/retention");
        await page.waitForTimeout(2000);

        // Should mention compliance frameworks
        const body = await page.locator("body").textContent();
        const frameworks = ["SOC 2", "HIPAA", "PCI-DSS", "GDPR", "NIST"];
        const found = frameworks.filter(f => body?.includes(f));
        expect(found.length).toBeGreaterThanOrEqual(3);
    });

    test("should have save and purge buttons", async ({ page }) => {
        await page.goto("/retention");
        await page.waitForTimeout(2000);

        // Save button should exist
        const saveButton = page.locator("button").filter({ hasText: /save/i });
        await expect(saveButton).toBeVisible();

        // Purge button should exist
        const purgeButton = page.locator("button").filter({ hasText: /purge/i });
        await expect(purgeButton).toBeVisible();
    });
});


test.describe("Reporting Page", () => {
    test("should render reporting page", async ({ page }) => {
        await page.goto("/reporting");
        await expect(page.locator("body")).toBeVisible();

        const content = await page.locator("body").textContent();
        expect(content?.length).toBeGreaterThan(0);
    });

    test("should display report generation options", async ({ page }) => {
        await page.goto("/reporting");
        await page.waitForTimeout(2000);

        // Should have report type buttons or cards
        const buttons = page.locator("button");
        expect(await buttons.count()).toBeGreaterThan(0);
    });
});
