import path from 'path'
import { createRule } from './utils'

export const tsxInViews = createRule({
  defaultOptions: [],
  name: 'tsx-in-views',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce .tsx files to be in views directory',
      recommended: true,
    },
    schema: [],
    messages: {
      tsxInViews:
        'TSX files should be in the src/views directory: {{filename}}',
    },
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.filename
        if (!filename.endsWith('.tsx')) {
          return
        }

        const relativePath = path.relative(process.cwd(), filename)
        if (!relativePath.startsWith('src/views/')) {
          context.report({
            node,
            messageId: 'tsxInViews',
            data: {
              filename: relativePath,
            },
          })
        }
      },
    }
  },
})
