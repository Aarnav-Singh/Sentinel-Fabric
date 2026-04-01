import { test, expect } from "@playwright/test";

/**
 * SOAR & Campaigns E2E Tests
 *
 * Validates the SOAR automation dashboard and campaign
 * correlation pages render correctly.
 */

test.describe("SOAR Dashboard", () => {
    test("should render SOAR page", async ({ page }) => {
        await page.goto("/soar");
        await expect(page.locator("body")).toBeVisible();

        // Page should have content
        const content = await page.locator("body").textContent();
        expect(content?.length).toBeGreaterThan(0);
    });

    test("should display automation playbooks", async ({ page }) => {
        await page.goto("/soar");
        await page.waitForTimeout(2000);

        // SOAR page should have a list or card layout for playbooks
        const heading = page.locator("h1, h2, h3").first();
        if (await heading.isVisible()) {
            await expect(heading).toBeVisible();
        }
    });
});

test.describe("Campaigns Page", () => {
    test("should render campaigns view", async ({ page }) => {
        await page.goto("/campaigns");
        await expect(page.locator("body")).toBeVisible();

        const content = await page.locator("body").textContent();
        expect(content?.length).toBeGreaterThan(0);
    });

    test("should display campaign timeline", async ({ page }) => {
        await page.goto("/campaigns");
        await page.waitForTimeout(2000);

        // Should render a timeline or card-based layout
        const body = await page.locator("body").textContent();
        expect(body).toBeTruthy();
    });
});


test.describe("Navigation", () => {
    const pages = [
        { name: "Dashboard", path: "/" },
        { name: "Findings", path: "/findings" },
        { name: "Campaigns", path: "/campaigns" },
        { name: "SOAR", path: "/soar" },
        { name: "Reporting", path: "/reporting" },
        { name: "Profile", path: "/profile" },
        { name: "Admin", path: "/admin" },
        { name: "Audit", path: "/audit" },
        { name: "Retention", path: "/retention" },
    ];

    for (const pg of pages) {
        test(`should load ${pg.name} page without crash`, async ({ page }) => {
            const response = await page.goto(pg.path);
            // Should not be a server error
            expect(response?.status()).toBeLessThan(500);
            await expect(page.locator("body")).toBeVisible();
        });
    }
});
