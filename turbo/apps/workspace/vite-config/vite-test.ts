import { coverageConfigDefaults, type UserWorkspaceConfig } from 'vitest/config'
import type { UserConfig as VitestConfig } from 'vitest/node'

const FAKE_DOM_TEST: Readonly<UserWorkspaceConfig> = {
  test: {
    setupFiles: ['./vitest.setup.ts', './vitest.setup.node.ts'],
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        settings: {
          disableJavaScriptFileLoading: true,
          disableJavaScriptEvaluation: true,
          disableCSSFileLoading: true,
          disableIframePageLoading: true,
        },
      },
    },
  },
}

export const vitestOptions: VitestConfig = {
  testTimeout: 2000,
  coverage: {
    reporter: ['text', 'json-summary', 'json', 'cobertura', 'html'],
    provider: 'v8',
    exclude: [
      ...coverageConfigDefaults.exclude,
      'dist/**',
      '*.config.*',
      'coverage/**',
      'src/mocks',
      'public',
    ],
  },
  projects: [
    {
      extends: true,
      test: {
        include: ['src/**/*.test.{ts,tsx}'],
        name: 'fake-dom',
        ...FAKE_DOM_TEST.test,
      },
    },
    {
      extends: true,
      test: {
        include: ['src/**/*.btest.{ts,tsx}'],
        name: 'browser',
        setupFiles: ['./vitest.setup.ts', './vitest.setup.browser.ts'],
        browser: {
          enabled: true,
          headless: true,
          provider: 'playwright',
          instances: [{ browser: 'chromium' }],
        },
      },
    },
    {
      test: {
        include: ['custom-eslint/**/*.test.ts'],
        name: 'eslint',
        setupFiles: ['./vitest.setup.eslint.ts'],
      },
    },
  ],
  reporters: ['default', ['json', { outputFile: 'vitest-report.json' }]],
}
