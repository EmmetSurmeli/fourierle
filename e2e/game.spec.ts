import { test, expect } from '@playwright/test';
import { dailyCountry, utcDay } from '../src/engine';
import { readFileSync } from 'node:fs';
const countries = JSON.parse(readFileSync('public/data/countries.json', 'utf8'));
const time = new Date('2026-10-19T12:00:00Z');
const answer = dailyCountry(utcDay(+time));
const name = countries.find((c: any) => c.id === answer).name;
async function submit(page: any, country: string) {
  await page.getByRole('combobox').fill(country);
  await page.getByRole('button', { name: 'Guess', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time });
  await page.goto('/');
  await expect(page.getByRole('combobox')).toBeEnabled();
});
test('first guess win, explorer, share text, refresh and statistics', async ({ page }) => {
  await submit(page, name);
  await expect(page.getByText('Nicely drawn. Nicely done.')).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explore the circles' }).click();
  await expect(page.getByRole('slider')).toBeVisible();
  await page.getByRole('slider').fill('8');
  await page.reload();
  await expect(page.getByText('Nicely drawn. Nicely done.')).toBeVisible();
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('100%');
  await expect(
    page.getByRole('textbox', { name: 'Spoiler-free result to copy' }),
  ).not.toContainText(name);
});
test('six wrong guesses, progressive circles, invalid and duplicate inputs', async ({ page }) => {
  await page.getByRole('combobox').fill('Atlantis');
  await page.getByRole('button', { name: 'Guess', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Choose a country');
  const wrong = countries.filter((c: any) => c.id !== answer).slice(0, 6);
  await submit(page, wrong[0].name);
  await expect(page.locator('.drawing-caption strong')).toHaveText('4');
  await submit(page, wrong[0].name);
  await expect(page.getByRole('status')).toContainText('already guessed');
  await page.reload();
  await expect(page.locator('.drawing-caption strong')).toHaveText('4');
  for (const c of wrong.slice(1)) await submit(page, c.name);
  await expect(page.getByText(`The country was ${name}.`, { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);
});
test('easy mode shows a clearer outline and a clue, then survives refresh', async ({ page }) => {
  const geometry = JSON.parse(readFileSync(`public/data/${answer}.json`, 'utf8'));
  await page.getByRole('button', { name: 'Easy', exact: true }).click();
  await expect(page.locator('.drawing-caption strong')).toHaveText(String(geometry.stages[2]));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const wrong = countries.filter((c: any) => c.id !== answer).slice(0, 3);
  for (const c of wrong) await submit(page, c.name);
  await expect(page.getByText(/Name clue: starts with/)).toContainText(name.charAt(0));
  await expect(page.locator('.drawing-caption strong')).toHaveText(String(geometry.stages[5]));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Easy', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText(/Name clue: starts with/)).toBeVisible();
  await page.getByRole('button', { name: 'Hard', exact: true }).click();
  await submit(page, name);
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Spoiler-free result to copy' })).toHaveValue(
    /Easy/,
  );
});
test('practice preserves daily progress and does not count in daily statistics', async ({
  page,
}) => {
  await submit(page, countries.find((c: any) => c.id !== answer).name);
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(page.getByText('NO LIMITS')).toBeVisible();
  for (const c of countries.slice(0, 6)) {
    if (await page.getByRole('combobox').count()) await submit(page, c.name);
  }
  await page.getByRole('button', { name: 'Daily puzzle' }).click();
  await expect(page.locator('.drawing-caption strong')).toHaveText('4');
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.getByText('Your first adventure starts here.')).toBeVisible();
});
test('UTC rollover resets open tab and preserves historical result', async ({ page }) => {
  await submit(page, name);
  await page.clock.fastForward(12 * 60 * 60 * 1000 + 1000);
  await expect(page.getByRole('combobox')).toBeEnabled();
  await expect(page.getByText('GUESS 1 OF 6')).toBeVisible();
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(name);
});
test('keyboard selection, settings and no horizontal overflow', async ({ page }) => {
  await page.getByRole('combobox').fill('Turk');
  await page.getByRole('combobox').press('ArrowDown');
  await page.getByRole('combobox').press('Enter');
  await expect(page.locator('.guess-slot.used')).toHaveCount(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Off', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('small screens, tablet and reduced motion remain usable', async ({ page }) => {
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume animation' })).toBeVisible();
});
test('practice session survives refresh without touching the daily record', async ({ page }) => {
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(page.getByText('NO LIMITS')).toBeVisible();
  const initial = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('fourierle-practice')!).game.answer,
  );
  const wrong = countries.find((c: any) => c.id !== initial).name;
  await submit(page, wrong);
  await expect(page.locator('.drawing-caption strong')).toHaveText('4');
  await page.reload();
  await expect(page.getByRole('combobox')).toBeEnabled();
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(page.locator('.drawing-caption strong')).toHaveText('4');
  expect(await page.evaluate(() => localStorage.getItem('fourierle-v1'))).toBeNull();
});
