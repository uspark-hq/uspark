import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 5000, // 5 seconds per test
  globalSetup: require.resolve('./playwright/global-setup.ts'),
  use: {
    baseURL: process.env.BASE_URL || 'https://uspark-8fgbrlx5p-uspark.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    storageState: 'playwright/.clerk/auth.json',
    actionTimeout: 5000, // 5 seconds for actions
    navigationTimeout: 5000, // 5 seconds for navigation
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'authenticated',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.clerk/auth.json', // 使用保存的认证状态
      },
    },
  ],

  // webServer: {
  //   command: 'cd ../../turbo && pnpm dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true,
  //   timeout: 120 * 1000,
  // },
});