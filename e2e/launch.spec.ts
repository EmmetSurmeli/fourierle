import { expect, test } from '@playwright/test';

test('launch pages and credits are reachable from the game', async ({ page }) => {
  const offsite: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).hostname !== '127.0.0.1') offsite.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://fourierle.onrender.com/',
  );
  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Privacy, in plain language.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ess256@cornell.edu' })).toBeVisible();
  await page.getByRole('link', { name: 'Accessibility', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Access to the game.' })).toBeVisible();
  await page.goto('/credits.html');
  await expect(
    page.getByRole('heading', { name: 'Made from maps and mathematics.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'ISC license' })).toHaveAttribute(
    'href',
    '/licenses/lucide-react.txt',
  );
  await page.goto('/404.html');
  await expect(
    page.getByRole('heading', { name: 'This page has wandered off the map.' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(offsite).toEqual([]);
});
