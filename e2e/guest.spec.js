// A visitor without an account: the landing page, the "Try it" editor, Apply, and the download.
import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

test('the landing page explains the product and offers the editor', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Free online photo editor/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Edit photos');
  await expect(page.getByRole('button', { name: 'Try a sample photo' })).toBeVisible();
  // The section links in the navbar lead to real sections
  for (const id of ['features', 'how', 'privacy']) await expect(page.locator(`#${id}`)).toBeAttached();
});

test('a guest edits the sample photo and downloads the result', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample photo' }).click();
  await expect(page.getByText('sample.jpg', { exact: true })).toBeVisible();

  // Three edits: a quarter turn, sepia, and WebP output
  await page.getByText('90°', { exact: true }).click();
  await page.getByRole('button', { name: 'Sepia' }).click();
  await expect(page.getByRole('button', { name: 'Sepia' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByText('webp', { exact: true }).click();

  await page.getByRole('button', { name: 'Apply 3 edits' }).click();

  // The server's answer: rotated (900×1200 → 1200×900) and converted
  await expect(page.getByRole('heading', { name: 'Your photo is developed' })).toBeVisible();
  await expect(page.getByText(/1200×900 · webp/)).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  expect((await download).suggestedFilename()).toBe('sample.webp');

  // After the first download, a polite (non-modal) nudge to sign up
  await expect(page.getByRole('heading', { name: 'Keep your photos with a free account' })).toBeVisible();
});

test('a file that is not an image is refused before anything is sent', async ({ page }) => {
  let sent = false;
  page.on('request', (req) => req.url().includes('/api/guest') && (sent = true));
  await page.goto('/');
  await page.locator('#hero-photo-input').setInputFiles(fixture('not-an-image.txt'));
  await expect(page.getByRole('alert')).toContainText('supported image');
  expect(sent).toBe(false);
});
