import type { GetTurnResponse } from '@uspark/core'

type Block = GetTurnResponse['blocks'][number]

interface BlockDisplayProps {
  block: Block
}

// Runtime type for block content (schema is incorrect - content can be object)
type BlockContent = string | Record<string, unknown>

function getTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (
    content &&
    typeof content === 'object' &&
    'text' in content &&
    typeof content.text === 'string'
  ) {
    return content.text
  }
  return JSON.stringify(content)
}

export function BlockDisplay({ block }: BlockDisplayProps) {
  switch (block.type) {
    case 'text':
    case 'content': {
      return (
        <div className="rounded bg-gray-50 p-3">
          <div className="mb-1 text-xs text-gray-600">Assistant</div>
          <div className="text-sm whitespace-pre-wrap">
            {getTextContent(block.content)}
          </div>
        </div>
      )
    }

    case 'thinking': {
      return (
        <div className="rounded bg-purple-50 p-3">
          <div className="mb-1 text-xs text-purple-600">💭 Thinking</div>
          <div className="text-sm whitespace-pre-wrap text-gray-700">
            {getTextContent(block.content)}
          </div>
        </div>
      )
    }

    case 'tool_use': {
      const content = block.content as BlockContent
      const toolData = typeof content === 'object' ? content : {}
      const toolName =
        'tool_name' in toolData && typeof toolData.tool_name === 'string'
          ? toolData.tool_name
          : 'Unknown'
      const parameters =
        'parameters' in toolData && typeof toolData.parameters === 'object'
          ? toolData.parameters
          : {}

      return (
        <div className="rounded bg-blue-50 p-3">
          <div className="mb-1 text-xs text-blue-600">🔧 Tool: {toolName}</div>
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600">
              Parameters
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs">
              {JSON.stringify(parameters, null, 2)}
            </pre>
          </details>
        </div>
      )
    }

    case 'tool_result': {
      const content = block.content as BlockContent
      const resultData = typeof content === 'object' ? content : {}
      const hasError = 'error' in resultData && Boolean(resultData.error)
      const result =
        'result' in resultData && typeof resultData.result === 'string'
          ? resultData.result
          : ''
      const error =
        'error' in resultData && typeof resultData.error === 'string'
          ? resultData.error
          : ''

      return (
        <div
          className={`rounded p-3 ${hasError ? 'bg-red-50' : 'bg-green-50'}`}
        >
          <div
            className={`mb-1 text-xs ${hasError ? 'text-red-600' : 'text-green-600'}`}
          >
            {hasError ? '❌ Tool Error' : '✅ Tool Result'}
          </div>
          <pre className="overflow-x-auto text-xs whitespace-pre-wrap">
            {error || result || JSON.stringify(block.content)}
          </pre>
        </div>
      )
    }

    case 'code': {
      const codeContent =
        typeof block.content === 'string'
          ? block.content
          : JSON.stringify(block.content)
      return (
        <div className="rounded bg-gray-900 p-3">
          <div className="mb-1 text-xs text-gray-400">Code</div>
          <pre className="overflow-x-auto text-xs text-green-400">
            <code>{codeContent}</code>
          </pre>
        </div>
      )
    }

    case 'error': {
      const errorContent =
        typeof block.content === 'string'
          ? block.content
          : JSON.stringify(block.content)
      return (
        <div className="rounded bg-red-50 p-3">
          <div className="mb-1 text-xs text-red-600">⚠️ Error</div>
          <div className="text-sm whitespace-pre-wrap text-red-700">
            {errorContent}
          </div>
        </div>
      )
    }

    default: {
      const unknownContent =
        typeof block.content === 'string'
          ? block.content
          : JSON.stringify(block.content)
      return (
        <div className="rounded bg-gray-100 p-3">
          <div className="mb-1 text-xs text-gray-600">
            Unknown block type: {block.type}
          </div>
          <div className="text-sm whitespace-pre-wrap">{unknownContent}</div>
        </div>
      )
    }
  }
}
