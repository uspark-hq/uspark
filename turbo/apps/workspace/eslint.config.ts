import casePolice from 'eslint-plugin-case-police'
import formatjs from 'eslint-plugin-formatjs'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import testingLibrary from 'eslint-plugin-testing-library'
import vitest from 'eslint-plugin-vitest'
import { config, configs } from 'typescript-eslint'
import { customPlugin } from './custom-eslint'

export default config(
  {
    extends: [...configs.strictTypeChecked, ...configs.stylisticTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'case-police': casePolice },
    rules: {
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'arrow-body-style': 'off',
      'prefer-arrow-callback': 'off',
      '@typescript-eslint/prefer-readonly': 'error',
      'case-police/string-check': [
        'error',
        {
          dict: {
            uspark: 'uSpark',
          },
        },
      ],
    },
  },

  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      custom: customPlugin,
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    rules: {
      // @ts-expect-error eslint-plugin-custom
      ...customPlugin.configs?.recommended.rules,
    },
  },

  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/impl/*.ts', 'src/signals/wasm/js-call/typing.ts'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: ['enumMember'],
          format: ['PascalCase'],
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/*.btest.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'error',
        { ignoreVoid: false },
      ],
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      react,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/function-component-definition': ['error'],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      '**/{__tests__, __benchmarks__}/**/*.{ts,tsx}',
      '**/*.{test,btest,bench}.{ts,tsx}',
      'src/views/pages/playground.tsx',
    ],
    plugins: {
      formatjs,
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    rules: {
      // @ts-expect-error eslint-plugin-formatjs
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ...formatjs.configs.strict.rules,
      'formatjs/enforce-id': [
        'error',
        {
          idInterpolationPattern: '[sha512:contenthash:base64:10]',
        },
      ],
    },
  },
  {
    files: ['**/*.{test,btest,bench}.{ts,tsx}'],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.{test,btest,bench}.{ts,tsx}'],
    ...testingLibrary.configs['flat/react'],
    rules: {
      ...testingLibrary.configs['flat/react'].rules,
      'testing-library/no-node-access': 'warn',
      'testing-library/prefer-user-event': 'error',
      'testing-library/prefer-explicit-assert': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      '**/*.test.{ts,tsx}',
      '**/*.btest.{ts,tsx}',
      '**/*.bench.{ts,tsx}',
      '**/js-call/impl/*.ts',
      'src/mocks/**/*.ts',
      '**/{__tests__, __benchmarks__}/**/*.{ts,tsx}', // 添加这个以匹配 __tests__ 目录下的文件
      'src/signals/feature-switch/**',
    ],
    rules: {
      'custom/no-package-variable': [
        'error',
        {
          allowedMutableTypes: [
            ...['State', 'Computed', 'Command'].map((name) => {
              return {
                from: 'package',
                name,
                package: 'ccstate',
              }
            }),
            ...['FC', 'ReactNode', 'ReactElement'].map((name) => {
              return {
                from: 'package',
                name,
                package: 'react',
              }
            }),
            ...['ZodLazy', 'ZodObject', 'ZodArray'].map((name) => {
              return {
                from: 'package',
                name,
                package: 'zod',
              }
            }),
            {
              from: 'file',
              name: 'ConsoleLogger',
            },
            {
              from: 'package',
              name: 'Request',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.{test,btest,bench}.{ts,tsx}',
      'scripts/**/*.ts',
      'src/mocks/handlers.ts',
      '**/__tests__/**/*.{ts,tsx}',
    ],
    rules: {
      'custom/signal-check-await': 'off',
    },
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  {
    ignores: [
      'dist',
      'public',
      'coverage',
      'src/signals/wasm/moxt-wasm-app.js',
      'src/signals/wasm/moxt-wasm-app.d.ts',
      'src/signals/wasm/wasm-call/**/*.ts',
      'src/proto/*.js',
      'src/proto/*.ts',
      'src/wasm/viewstate/index.ts',
      'moxt-eslint/examples/**/*',
    ],
  },
)
