const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROME_PATH ||
        (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined),
      args: ['--no-sandbox']
    }
  }
});
