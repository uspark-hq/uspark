import { RuleTester } from '@typescript-eslint/rule-tester'
import { afterAll, describe, it } from 'vitest'

RuleTester.afterAll = afterAll

// If you are not using vitest with globals: true (https://vitest.dev/config/#globals):
RuleTester.it = it
RuleTester.itOnly = it.only
RuleTester.describe = describe
