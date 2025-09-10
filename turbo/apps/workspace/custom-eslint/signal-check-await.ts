import {
  AST_NODE_TYPES,
  ESLintUtils,
  type ParserServicesWithTypeInformation,
  type TSESTree,
} from '@typescript-eslint/utils'
import type { SourceCode } from '@typescript-eslint/utils/ts-eslint'
import type { Type, TypeChecker } from 'typescript'
import { createRule } from './utils'

type FunctionLike =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression

function isAbortSignalType(type: Type): boolean {
  const symbol = type.getSymbol()
  if (!symbol) {
    return false
  }
  return symbol.getName() === 'AbortSignal'
}

function hasAbortSignalParam(
  services: ParserServicesWithTypeInformation,
  checker: TypeChecker,
  node: TSESTree.CallExpression,
): boolean {
  for (const arg of node.arguments) {
    const tsNode = services.esTreeNodeToTSNodeMap.get(arg)
    const type = checker.getTypeAtLocation(tsNode)

    if (isAbortSignalType(type)) {
      return true
    }

    const properties = type.getProperties()
    for (const prop of properties) {
      const propType = checker.getTypeOfSymbolAtLocation(prop, tsNode)
      if (isAbortSignalType(propType)) {
        return true
      }
    }
  }
  return false
}

function isThrowIfAbortedCall(
  services: ParserServicesWithTypeInformation,
  checker: TypeChecker,
  node: TSESTree.CallExpression,
) {
  const tsNode = services.esTreeNodeToTSNodeMap.get(node.callee)
  const type = checker.getTypeAtLocation(tsNode)

  const signatures = type.getCallSignatures()
  if (!signatures.length) {
    return false
  }

  if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
    const objectNode = services.esTreeNodeToTSNodeMap.get(node.callee.object)
    const objectType = checker.getTypeAtLocation(objectNode)

    const objectSymbol = objectType.getSymbol()
    if (!objectSymbol) {
      return false
    }

    return (
      objectSymbol.getName() === 'AbortSignal' &&
      node.callee.property.type === AST_NODE_TYPES.Identifier &&
      node.callee.property.name === 'throwIfAborted'
    )
  }

  return false
}

function findParentFunction(
  sourceCode: Readonly<SourceCode>,
  node: TSESTree.Node,
): FunctionLike | undefined {
  const ancestors = sourceCode.getAncestors(node)

  return ancestors
    .reverse()
    .find(
      (n): n is FunctionLike =>
        [
          AST_NODE_TYPES.FunctionDeclaration,
          AST_NODE_TYPES.FunctionExpression,
          AST_NODE_TYPES.ArrowFunctionExpression,
        ].includes(n.type) &&
        'async' in n &&
        n.async,
    )
}

function isComputedType(type: Type): boolean {
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
    sourceFile.fileName.includes('ccstate') && symbol.getName() === 'computed'
  )
}

function isInsideComputedCallback(
  services: ParserServicesWithTypeInformation,
  checker: TypeChecker,
  sourceCode: Readonly<SourceCode>,
  node: TSESTree.Node,
): boolean {
  const ancestors = sourceCode.getAncestors(node)
  for (const ancestor of ancestors) {
    if (ancestor.type !== AST_NODE_TYPES.CallExpression) {
      continue
    }

    const tsNode = services.esTreeNodeToTSNodeMap.get(ancestor.callee)
    const type = checker.getTypeAtLocation(tsNode)

    if (isComputedType(type)) {
      return true
    }
  }
  return false
}

function isSafeAwait(
  services: ParserServicesWithTypeInformation,
  checker: TypeChecker,
  node: TSESTree.AwaitExpression,
): boolean {
  if (
    node.argument.type === AST_NODE_TYPES.CallExpression &&
    hasAbortSignalParam(services, checker, node.argument)
  ) {
    return true
  }

  return false
}

function isSafePromise(
  sourceCode: Readonly<SourceCode>,
  safePromisesMap: WeakMap<TSESTree.Node, Set<string>>,
  node: TSESTree.Identifier,
): boolean {
  const parent = findParentFunction(sourceCode, node)
  if (!parent) {
    return false
  }

  const safePromises = safePromisesMap.get(parent)
  if (!safePromises) {
    return false
  }

  return safePromises.has(node.name)
}

export const signalCheckAwait = createRule({
  name: 'signal-check-await',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce signal check after await',
      recommended: true,
      requiresTypeChecking: true,
    },
    schema: [],
    messages: {
      signalCheckAwait: 'Check signal.throwIfAborted() after await.',
    },
  },
  create(context) {
    const services = ESLintUtils.getParserServices(context)
    const checker = services.program.getTypeChecker()
    const sourceCode = context.sourceCode

    const awaitExpressionsMap = new Map<
      TSESTree.Node,
      TSESTree.AwaitExpression | null
    >()
    const safePromisesMap = new WeakMap<TSESTree.Node, Set<string>>()

    return {
      'FunctionDeclaration[async=true], FunctionExpression[async=true], ArrowFunctionExpression[async=true]'(
        node: FunctionLike,
      ) {
        if (isInsideComputedCallback(services, checker, sourceCode, node)) {
          return
        }

        awaitExpressionsMap.set(node, null)
      },

      AwaitExpression(node: TSESTree.AwaitExpression) {
        const parent = findParentFunction(sourceCode, node)
        if (!parent) {
          return
        }

        if (!awaitExpressionsMap.has(parent)) {
          return
        }

        const awaitToCheck = awaitExpressionsMap.get(parent)
        if (awaitToCheck) {
          context.report({
            node: awaitToCheck,
            messageId: 'signalCheckAwait',
          })
          awaitExpressionsMap.set(parent, null)
        }

        if (isSafeAwait(services, checker, node)) {
          return
        }

        if (
          node.argument.type === AST_NODE_TYPES.Identifier &&
          isSafePromise(sourceCode, safePromisesMap, node.argument)
        ) {
          return
        }

        awaitExpressionsMap.set(parent, node)
      },

      // 处理所有语句
      'ExpressionStatement, VariableDeclaration'(
        node: TSESTree.ExpressionStatement | TSESTree.VariableDeclaration,
      ) {
        const parent = findParentFunction(sourceCode, node)
        if (!parent) {
          return
        }

        if (node.type === AST_NODE_TYPES.VariableDeclaration) {
          for (const declarator of node.declarations) {
            if (
              declarator.id.type !== AST_NODE_TYPES.Identifier ||
              !declarator.init
            ) {
              continue
            }

            const safePromises =
              safePromisesMap.get(parent) ?? new Set<string>()

            let isSafe = false

            if (declarator.init.type === AST_NODE_TYPES.CallExpression) {
              isSafe = hasAbortSignalParam(services, checker, declarator.init)
            } else if (declarator.init.type === AST_NODE_TYPES.Identifier) {
              isSafe = isSafePromise(
                sourceCode,
                safePromisesMap,
                declarator.init,
              )
            }

            if (isSafe) {
              safePromises.add(declarator.id.name)
            } else {
              safePromises.delete(declarator.id.name)
            }

            safePromisesMap.set(parent, safePromises)
          }
        }

        const awaitToCheck = awaitExpressionsMap.get(parent)
        if (!awaitToCheck) {
          return
        }

        awaitExpressionsMap.set(parent, null)
        if (
          node.type === AST_NODE_TYPES.ExpressionStatement &&
          node.expression.type === AST_NODE_TYPES.CallExpression &&
          isThrowIfAbortedCall(services, checker, node.expression)
        ) {
          return
        }

        context.report({
          node: awaitToCheck,
          messageId: 'signalCheckAwait',
        })
      },

      'FunctionDeclaration[async=true], FunctionExpression[async=true], ArrowFunctionExpression[async=true]:exit'(
        node: FunctionLike,
      ) {
        const awaitToCheck = awaitExpressionsMap.get(node)
        awaitExpressionsMap.delete(node)
        safePromisesMap.delete(node)
        if (!awaitToCheck) {
          return
        }

        context.report({
          node: awaitToCheck,
          messageId: 'signalCheckAwait',
        })
      },
    }
  },
})
