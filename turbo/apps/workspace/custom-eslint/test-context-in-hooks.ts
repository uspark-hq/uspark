import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils'

export const testContextInHooks = createRule({
  name: 'test-context-in-hooks',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'prevent destructuring testContext() outside test hooks',
      recommended: true,
    },
    schema: [],
    messages: {
      testContextDestructuringOutsideHook:
        'Destructuring testContext() return value must happen within test hooks',
    },
  },
  create(context) {
    const testHooks = new Set([
      'it',
      'test',
      'beforeEach',
      'afterEach',
      'beforeAll',
      'afterAll',
    ])
    let currentTestHookDepth = 0

    function isInTestHook(): boolean {
      return currentTestHookDepth > 0
    }

    function isTestContextCall(node: TSESTree.CallExpression): boolean {
      return (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        node.callee.name === 'testContext' &&
        node.arguments.length === 0
      )
    }

    return {
      // Track when we enter/exit test hooks
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          testHooks.has(node.callee.name)
        ) {
          currentTestHookDepth++
        }
      },

      'CallExpression:exit'(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          testHooks.has(node.callee.name)
        ) {
          currentTestHookDepth--
        }
      },

      // Only check for destructuring assignment from testContext()
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.init &&
          node.init.type === AST_NODE_TYPES.CallExpression &&
          isTestContextCall(node.init) &&
          !isInTestHook() &&
          node.id.type === AST_NODE_TYPES.ObjectPattern
        ) {
          context.report({
            node,
            messageId: 'testContextDestructuringOutsideHook',
          })
        }
      },
    }
  },
})
