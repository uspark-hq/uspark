import {
  AST_NODE_TYPES,
  ESLintUtils,
  type TSESTree,
} from '@typescript-eslint/utils'
import type { Type } from 'typescript'
import { createRule } from './utils'

export const noExportState = createRule({
  name: 'no-export-state',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'prevent exporting state signals',
      recommended: true,
      requiresTypeChecking: true,
    },
    schema: [],
    messages: {
      noExportState: 'State signals should not be exported: {{name}}',
    },
  },
  create(context) {
    const services = ESLintUtils.getParserServices(context)

    const checker = services.program.getTypeChecker()

    function isStateType(type: Type): boolean {
      const symbol = type.getSymbol()
      if (!symbol) {
        return false
      }

      const declarations = symbol.getDeclarations()
      if (!declarations?.length) {
        return false
      }

      const sourceFile = declarations[0].getSourceFile()
      return (
        sourceFile.fileName.includes('ccstate') && symbol.getName() === 'State'
      )
    }

    function checkExportedNode(
      node: TSESTree.Node | null | undefined,
      name: string,
    ) {
      if (!node) {
        return
      }

      const tsNode = services.esTreeNodeToTSNodeMap.get(node)
      const type = checker.getTypeAtLocation(tsNode)

      if (isStateType(type)) {
        context.report({
          node,
          messageId: 'noExportState',
          data: { name },
        })
      }
    }

    return {
      'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator'(
        node: TSESTree.VariableDeclarator,
      ) {
        if (node.id.type !== AST_NODE_TYPES.Identifier) {
          return
        }
        checkExportedNode(node.init, node.id.name)
      },

      'ExportNamedDeclaration > ExportSpecifier'(
        node: TSESTree.ExportSpecifier,
      ) {
        if (node.local.type !== AST_NODE_TYPES.Identifier) {
          return
        }
        checkExportedNode(node.local, node.local.name)
      },
    }
  },
})
