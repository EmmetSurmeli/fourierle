import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:5173',
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
    command: 'npm run dev -- --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
});
