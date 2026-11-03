// The whole life of a photo for a signed-up user: register → upload → edit → version → download → delete.
import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
// A fresh account per run (usernames are 3–30 characters: letters, numbers or _)
const username = `e2e_${Date.now().toString(36)}`;
const password = 'correct-horse-battery';

// Each test continues where the last one stopped, in one browser page.
test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */
let page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});
test.afterAll(async () => {
  await page.close();
});

/** SlideToDelete is a range input: End moves it to 100%, and releasing the key confirms. */
async function slideToDelete(name) {
  const slider = page.getByRole('slider', { name: `Slide to the end to delete ${name}` });
  await slider.focus();
  await slider.press('End');
}

test('signs up and lands on an empty gallery', async () => {
  await page.goto('/register');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Your photos', level: 1 })).toBeVisible();
  await expect(page.getByText('Your contact sheet is empty')).toBeVisible();
  await expect(page.getByText(`Logged in as ${username}`)).toBeAttached();
});

test('uploads a photo, which shows up in the gallery', async () => {
  await page.locator('input[type="file"]').setInputFiles(fixture('photo.jpg'));
  const card = page.getByRole('link', { name: /photo\.jpg/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText('800×600');
  await expect(page.getByText('1 photo', { exact: true })).toBeVisible();
});

test('edits the photo, which saves a new version', async () => {
  await page.getByRole('link', { name: /photo\.jpg/ }).click();
  await expect(page.getByRole('heading', { name: 'photo.jpg', level: 1 })).toBeVisible();

  await page.getByText('90°', { exact: true }).click();
  await page.getByRole('button', { name: 'Grayscale' }).click();
  await page.getByRole('button', { name: 'Apply 2 edits' }).click();

  // Apply opens the new version, compared against its original
  await expect(page.getByRole('heading', { name: 'You’re looking at v1' })).toBeVisible();
  // Turned a quarter: 800×600 became 600×800
  await expect(page.getByRole('definition').filter({ hasText: '600×800' })).toBeVisible();
});

test('downloads the version', async () => {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  expect((await download).suggestedFilename()).toMatch(/^photo\.\w+$/);
});

test('the same edit again returns the saved version instead of a new one', async () => {
  await page.getByRole('link', { name: 'Edit from original' }).click();
  // "Edit from original" carries the version's edits back to the editor
  await expect(page.getByRole('button', { name: 'Apply 2 edits' })).toBeEnabled();
  await page.getByRole('button', { name: 'Apply 2 edits' }).click();
  await expect(page.getByRole('heading', { name: 'You’re looking at v1' })).toBeVisible(); // still v1, no v2
});

test('deletes the version, then the photo', async () => {
  await slideToDelete('photo.jpg');
  // Back on the original, which now has no versions
  await expect(page.getByText('v1 deleted')).toBeVisible();
  await expect(page.getByText('No versions yet. Apply an edit to make one.')).toBeVisible();

  await slideToDelete('photo.jpg');
  await expect(page.getByText('Photo deleted')).toBeVisible();
  await expect(page.getByText('Your contact sheet is empty')).toBeVisible();
});

test('logs out, and private pages send you to log in', async () => {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Edit photos');

  await page.goto('/images/000000000000000000000000');
  await expect(page).toHaveURL(/\/login$/);
});

test('a wrong password is refused, and logging in returns you where you were', async () => {
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill('not-the-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert')).toContainText('Wrong username or password');

  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  // Logging in returns you to the page you were stopped at: here a photo id that doesn't exist, so the 404.
  await expect(page).toHaveURL(/\/images\/0{24}$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('overexposed');
  await page.getByRole('link', { name: 'Back to your photos' }).click();
  await expect(page.getByRole('heading', { name: 'Your photos', level: 1 })).toBeVisible();
});
