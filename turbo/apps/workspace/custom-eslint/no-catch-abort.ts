import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils'

function checkCatchClauseHasThrowIfAbort(node: TSESTree.CatchClause) {
  if (!node.param || node.param.type !== AST_NODE_TYPES.Identifier) {
    return true
  }

  if (node.body.body.length === 0) {
    return true
  }

  const firstStatement = node.body.body[0]

  if (firstStatement.type !== AST_NODE_TYPES.ExpressionStatement) {
    return true
  }

  if (firstStatement.expression.type !== AST_NODE_TYPES.CallExpression) {
    return true
  }

  const callExpr = firstStatement.expression
  if (
    callExpr.callee.type !== AST_NODE_TYPES.Identifier ||
    callExpr.callee.name !== 'throwIfAbort'
  ) {
    return true
  }

  if (
    callExpr.arguments.length !== 1 ||
    callExpr.arguments[0].type !== AST_NODE_TYPES.Identifier ||
    callExpr.arguments[0].name !== node.param.name
  ) {
    return true
  }

  return false
}
export const noCatchAbort = createRule({
  name: 'no-catch-abort',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce throwIfAbort in catch block',
      recommended: true,
    },
    schema: [],
    messages: {
      noCatchAbort:
        'throwIfAbort should be the first statement in catch block.',
    },
  },
  create(context) {
    return {
      CatchClause: (block) => {
        if (checkCatchClauseHasThrowIfAbort(block)) {
          context.report({
            node: block,
            messageId: 'noCatchAbort',
          })
        }
      },
    }
  },
})
