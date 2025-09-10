import {
  AST_NODE_TYPES,
  ESLintUtils,
  type TSESTree,
} from '@typescript-eslint/utils'
import type { Type } from 'typescript'
import { createRule } from './utils'

export const signalDollarSuffix = createRule({
  name: 'signal-dollar-suffix',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce signal variables to end with $',
      recommended: true,
      requiresTypeChecking: true,
    },
    schema: [],
    messages: {
      dollarSuffix: 'Signal variable must end with $: {{name}}$',
    },
  },
  create(context) {
    const services = ESLintUtils.getParserServices(context)
    const checker = services.program.getTypeChecker()

    const typeCache = new WeakMap<Type, boolean>()

    const signalTypeNames = new Set(['State', 'Command', 'Computed'])

    function isSignalType(type: Type): boolean {
      const cached = typeCache.get(type)
      if (cached !== undefined) {
        return cached
      }

      const symbol = type.getSymbol()
      if (!symbol) {
        typeCache.set(type, false)
        return false
      }

      const typeName = symbol.getName()
      if (!signalTypeNames.has(typeName)) {
        typeCache.set(type, false)
        return false
      }

      const declarations = symbol.getDeclarations()
      if (!declarations?.length) {
        typeCache.set(type, false)
        return false
      }

      const sourceFile = declarations[0].getSourceFile()
      const result = sourceFile.fileName.includes('ccstate')

      typeCache.set(type, result)
      return result
    }

    function checkSignalVariable(node: TSESTree.VariableDeclarator) {
      if (node.id.type !== AST_NODE_TYPES.Identifier || !node.init) {
        return
      }

      const tsNode = services.esTreeNodeToTSNodeMap.get(node.init)
      const type = checker.getTypeAtLocation(tsNode)

      if (isSignalType(type) && !node.id.name.endsWith('$')) {
        context.report({
          node,
          messageId: 'dollarSuffix',
          data: {
            name: node.id.name,
          },
        })
      }
    }

    return {
      VariableDeclarator: checkSignalVariable,
    }
  },
})
