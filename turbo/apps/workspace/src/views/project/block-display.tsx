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
        <div className="rounded bg-[#2d2d30] border border-[#3e3e42] p-2">
          <div className="mb-1 text-[11px] text-[#4ec9b0] font-medium">Assistant</div>
          <div className="text-[13px] text-[#d4d4d4] whitespace-pre-wrap leading-[1.5]">
            {getTextContent(block.content)}
          </div>
        </div>
      )
    }

    case 'thinking': {
      return (
        <div className="rounded bg-[#3d2d47] border border-[#5c4461] p-2">
          <div className="mb-1 text-[11px] text-[#c586c0] font-medium">💭 Thinking</div>
          <div className="text-[13px] text-[#d4d4d4] whitespace-pre-wrap leading-[1.5]">
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
        <div className="rounded bg-[#1e3a5f] border border-[#2d4f7c] p-2">
          <div className="mb-1 text-[11px] text-[#569cd6] font-medium">🔧 Tool: {toolName}</div>
          <details className="text-[13px]">
            <summary className="cursor-pointer text-[#9cdcfe] hover:text-[#569cd6] transition-colors">
              Parameters
            </summary>
            <pre className="mt-1.5 overflow-x-auto rounded bg-[#1e1e1e] border border-[#3e3e42] p-1.5 text-[11px] text-[#ce9178]">
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
          className={`rounded border p-2 ${hasError ? 'bg-[#4b2b2b] border-[#6b3a3a]' : 'bg-[#1e4620] border-[#2d5f30]'}`}
        >
          <div
            className={`mb-1 text-[11px] font-medium ${hasError ? 'text-[#f48771]' : 'text-[#89d185]'}`}
          >
            {hasError ? '❌ Tool Error' : '✅ Tool Result'}
          </div>
          <pre className="overflow-x-auto text-[11px] text-[#d4d4d4] whitespace-pre-wrap">
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
        <div className="rounded bg-[#1e1e1e] border border-[#3e3e42] p-2">
          <div className="mb-1 text-[11px] text-[#4ec9b0] font-medium">Code</div>
          <pre className="overflow-x-auto text-[11px] text-[#ce9178] font-mono leading-[1.5]">
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
        <div className="rounded bg-[#4b2b2b] border border-[#6b3a3a] p-2">
          <div className="mb-1 text-[11px] text-[#f48771] font-medium">⚠️ Error</div>
          <div className="text-[13px] text-[#f48771] whitespace-pre-wrap leading-[1.5]">
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
        <div className="rounded bg-[#2d2d30] border border-[#3e3e42] p-2">
          <div className="mb-1 text-[11px] text-[#969696] font-medium">
            Unknown block type: {block.type}
          </div>
          <div className="text-[13px] text-[#d4d4d4] whitespace-pre-wrap">{unknownContent}</div>
        </div>
      )
    }
  }
}
