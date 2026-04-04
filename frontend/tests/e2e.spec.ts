import { test, expect } from '@playwright/test';

test.describe('UMBRIX Smoke Tests', () => {
    test('Dashboard loads and displays key metrics', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.getByText('TOTAL ASSETS')).toBeVisible();
        await expect(page.getByText('CLOUD RISK SCORE')).toBeVisible();
        await expect(page.getByText('SECURITY POSTURE')).toBeVisible();
        await expect(page.getByText('COMPLIANCE')).toBeVisible();

        // Wait for real data to replace skeleton loaders if backend is running
        // We know '22,221' is no longer hardcoded, so we just check the cards are visible
        await expect(page.getByRole('heading', { name: 'Infrastructure Data Flow' })).toBeVisible();
    });

    test('Events page active stream', async ({ page }) => {
        await page.goto('/events');
        // SSE stream connection tag
        await expect(page.getByText('Awaiting Events').or(page.getByText('Real-time Stream'))).toBeVisible();
        await expect(page.getByText('Events/Sec')).toBeVisible();
    });

    test('Pipeline page visualizer', async ({ page }) => {
        await page.goto('/pipeline');
        await expect(page.getByRole('heading', { name: 'ML Pipeline' })).toBeVisible();
        await expect(page.getByText('ML Flow Visualizer')).toBeVisible();
        await expect(page.getByText('Hardware Utilization')).toBeVisible();
        await expect(page.getByText('Neural Log Feed')).toBeVisible();
    });

    test('Campaigns page lists threats', async ({ page }) => {
        await page.goto('/campaigns');
        await expect(page.getByText('Active Campaigns', { exact: true })).toBeVisible();
        await expect(page.getByText('Global Threat Matrix')).toBeVisible();
    });

    test('Findings triage page', async ({ page }) => {
        await page.goto('/findings');
        await expect(page.getByText('Threat Vectors')).toBeVisible();
        await expect(page.getByText('Findings Triage')).toBeVisible();
        await expect(page.getByText('Node Analysis')).toBeVisible();
    });
});
