// End-to-end tests: a real browser clicking through the real app (React → Vite proxy → Express → MongoDB → Sharp).
// Unit and API tests prove the parts work; these prove the parts work *together*, the way a visitor uses them.
//
// Run from the repo root (Docker Desktop must be running, for MongoDB):
//   docker compose up -d
//   npm run test:e2e
//
// Playwright starts its own API and Vite on spare ports (4100 and 5174), with their own database
// (image-processing-e2e) and upload folder (server/uploads-e2e), so a run never touches your dev data
// and can run while `npm run dev` is up.
import { defineConfig, devices } from '@playwright/test';

const API_PORT = 4100;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: './e2e',
  // One at a time: the API rate-limits sign-ups and guest edits per IP, and every test shares one IP.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /phone\.spec/ },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /phone\.spec/ },
  ],
  webServer: [
    {
      command: 'node src/index.js',
      cwd: './server',
      url: `http://localhost:${API_PORT}/api/health/ready`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        PORT: String(API_PORT),
        MONGO_URI: process.env.E2E_MONGO_URI ?? 'mongodb://localhost:27017/image-processing-e2e',
        JWT_SECRET: 'e2e-only-secret-not-used-anywhere-else-0123456789',
        BCRYPT_COST: '4', // the lowest bcrypt cost: sign-up in milliseconds, not a quarter second
        UPLOAD_DIR: 'uploads-e2e',
        PUBLIC_ASSET_BASE: '/uploads',
        STORAGE_DRIVER: 'local',
      },
    },
    {
      command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
      cwd: './client',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
