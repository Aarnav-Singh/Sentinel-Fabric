import { defineConfig, devices } from "@playwright/test";

/**
 * Sentinel Fabric V2 — Playwright E2E Configuration
 *
 * Run with: npx playwright test
 * Debug:    npx playwright test --debug
 * Report:   npx playwright show-report
 */
export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ["html", { open: "never" }],
        ["list"],
    ],
    use: {
        baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
    ],

    webServer: {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
});
