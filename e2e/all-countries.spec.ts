import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const countries: { id: string; name: string }[] = JSON.parse(
  readFileSync('public/data/countries.json', 'utf8'),
);

test('every eligible country has a renderable outline at all six stages', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'One browser performs the exhaustive rendering audit.');
  test.skip(process.env.E2E_PRODUCTION === '1', 'The calibration lab is development only.');
  test.setTimeout(300_000);

  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/data/') && !response.ok()) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/?lab');
  const selector = page.getByRole('combobox');
  await expect(selector).toBeVisible();
  const grid = page.locator('.lab-grid');
  const empty: string[] = [];
  const inkCounts: { id: string; counts: number[] }[] = [];

  for (const country of countries) {
    await selector.selectOption(country.id);
    await expect(grid).toHaveAttribute('data-country', country.id);
    await expect(grid.locator('canvas')).toHaveCount(6);

    const ink = await grid.locator('canvas').evaluateAll(async (canvases) => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      return canvases.map((element) => {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext('2d')!;
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let count = 0;
        for (let offset = 3; offset < pixels.length; offset += 4) {
          if (pixels[offset] > 0) count++;
        }
        return count;
      });
    });

    ink.forEach((count, stage) => {
      if (count === 0) empty.push(`${country.id}: stage ${stage + 1}`);
    });
    inkCounts.push({ id: country.id, counts: ink });
  }

  console.log(
    'Smallest first-stage outlines:',
    inkCounts
      .sort((a, b) => a.counts[0] - b.counts[0])
      .slice(0, 10)
      .map((item) => `${item.id}:${item.counts[0]}`)
      .join(', '),
  );
  console.log(
    'Smallest final outlines:',
    inkCounts
      .sort((a, b) => a.counts[5] - b.counts[5])
      .slice(0, 10)
      .map((item) => `${item.id}:${item.counts[5]}`)
      .join(', '),
  );
  expect(empty, 'Every country and stage must draw at least one pixel').toEqual([]);
  expect(errors, 'No geometry request or rendering errors').toEqual([]);
});

test('the production bundle serves every included country asset', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'One browser performs the exhaustive asset audit.');
  test.setTimeout(120_000);
  await page.goto('/');
  const results = await page.evaluate(
    async (ids) => {
      return Promise.all(
        ids.map(async (id) => {
          const response = await fetch(`/data/${id}.json`);
          if (!response.ok) return `${id}: HTTP ${response.status}`;
          const country = await response.json();
          if (
            country.id !== id ||
            country.chains?.length < 1 ||
            country.stages?.length !== 6 ||
            country.terms?.length < country.stages[5]
          ) {
            return `${id}: invalid geometry payload`;
          }
          return null;
        }),
      );
    },
    countries.map((country) => country.id),
  );
  expect(results.filter(Boolean)).toEqual([]);
});
