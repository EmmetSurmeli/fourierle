import { defineConfig, devices } from '@playwright/test';
const production = process.env.E2E_PRODUCTION === '1';
const url = `http://127.0.0.1:${production ? 5174 : 5173}`;
export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  fullyParallel: true,
  use: {
    baseURL: url,
    launchOptions: process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : process.platform === 'darwin'
        ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }
        : {},
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'], launchOptions: {} } },
  ],
  webServer: {
    command: production ? 'npm run preview -- --port 5174' : 'npm run dev -- --port 5173',
    url,
    reuseExistingServer: true,
  },
});
