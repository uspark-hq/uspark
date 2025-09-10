import {
  isTypeReadonly,
  type TypeOrValueSpecifier,
} from '@typescript-eslint/type-utils'
import {
  ESLintUtils,
  type ParserServicesWithTypeInformation,
} from '@typescript-eslint/utils'
import type { Type, TypeChecker } from 'typescript'

interface RuleDocs {
  description: string
  recommended?: boolean
  requiresTypeChecking?: boolean
}

// oxlint-disable-next-line new-cap
export const createRule = ESLintUtils.RuleCreator<RuleDocs>(() => '')

function isEmptyObjectLiteral(type: Type, checker: TypeChecker): boolean {
  return checker.typeToString(type) === '{}'
}

export function isMutableObjectType(
  type: Type,
  services: ParserServicesWithTypeInformation,
  checker: TypeChecker,
  allowedMutableTypes: TypeOrValueSpecifier[] = [],
): boolean {
  return (
    !isTypeReadonly(services.program, type, {
      allow: allowedMutableTypes,
    }) || isEmptyObjectLiteral(type, checker)
  )
}
