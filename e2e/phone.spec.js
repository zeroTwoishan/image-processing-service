// The phone layout is different, not just smaller: one tool at a time under the photo, and a bar fixed to the
// bottom with the tool tabs and Apply. This runs in the "phone" project (a Pixel 7 screen and touch).
import { expect, test } from '@playwright/test';

test('a guest edits on a phone with the bottom tool bar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample photo' }).click();

  const tools = page.getByRole('tablist', { name: 'Edit tools' });
  await expect(tools).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled(); // nothing to apply yet

  await tools.getByRole('tab', { name: 'Filters' }).click();
  await page.getByRole('button', { name: 'Grayscale' }).click();
  // The tab gets a "changed" mark for screen readers too
  await expect(tools.getByRole('tab', { name: /Filters.*changed/ })).toBeVisible();

  await page.getByRole('button', { name: 'Apply 1 edit' }).click();
  await expect(page.getByRole('heading', { name: 'Your photo is developed' })).toBeVisible();
  await expect(page.getByText(/900×1200 · jpeg/)).toBeVisible();
});

test('switching tools on a phone scrolls back up to the photo and the new tool', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample photo' }).click();
  const tools = page.getByRole('tablist', { name: 'Edit tools' });

  // Crop is the longest tool: scroll down through it, like someone typing exact pixels
  await tools.getByRole('tab', { name: 'Crop' }).click();
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

  await tools.getByRole('tab', { name: 'Size' }).click();
  expect(await page.evaluate(() => window.scrollY)).toBe(0); // instantly: no scroll animation to swallow the next tap
  await expect(page.getByRole('tabpanel')).toContainText('Resize');

  // Tapping straight on to the next tool works first time
  await tools.getByRole('tab', { name: 'Format' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Output');
});
