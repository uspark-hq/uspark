import type { ESLint } from 'eslint'
import { computedConstArgsPackageScope } from './computed-const-args-package-scope'
import { noCatchAbort } from './no-catch-abort'
import { noExportState } from './no-export-state'
import { noGetSignal } from './no-get-signal'
import { noPackageVariable } from './no-package-variable'
import { noStoreInParams } from './no-store-in-params'
import { signalCheckAwait } from './signal-check-await'
import { signalDollarSuffix } from './signal-dollar-suffix'
import { testContextInHooks } from './test-context-in-hooks'
import { tsxInViews } from './tsx-in-views'

export const customPlugin: ESLint.Plugin = {
  rules: {
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'tsx-in-views': tsxInViews,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'signal-dollar-suffix': signalDollarSuffix,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-export-state': noExportState,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'signal-check-await': signalCheckAwait,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-catch-abort': noCatchAbort,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-package-variable': noPackageVariable,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-get-signal': noGetSignal,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'test-context-in-hooks': testContextInHooks,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'computed-const-args-package-scope': computedConstArgsPackageScope,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-store-in-params': noStoreInParams,
  },
  configs: {
    recommended: {
      rules: {
        'custom/tsx-in-views': 'error',
        'custom/signal-dollar-suffix': 'error',
        'custom/no-export-state': 'error',
        'custom/signal-check-await': 'error',
        'custom/no-catch-abort': 'error',
        'custom/no-get-signal': 'warn',
        'custom/test-context-in-hooks': 'error',
        'custom/computed-const-args-package-scope': 'error',
        'custom/no-store-in-params': 'error',
      },
    },
  },
}
