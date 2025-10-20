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
        <div className="rounded border border-[#3e3e42] bg-[#2d2d30] p-2">
          <div className="mb-1 text-[11px] font-medium text-[#4ec9b0]">
            Assistant
          </div>
          <div className="text-[13px] leading-[1.5] whitespace-pre-wrap text-[#d4d4d4]">
            {getTextContent(block.content)}
          </div>
        </div>
      )
    }

    case 'thinking': {
      return (
        <div className="rounded border border-[#5c4461] bg-[#3d2d47] p-2">
          <div className="mb-1 text-[11px] font-medium text-[#c586c0]">
            Thinking
          </div>
          <div className="text-[13px] leading-[1.5] whitespace-pre-wrap text-[#d4d4d4]">
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

      // Format parameters inline for compact display
      let paramDisplay = ''
      if (Object.keys(parameters).length > 0) {
        // For common tools, extract the main parameter
        if (toolName === 'Bash' && 'command' in parameters) {
          paramDisplay = String(parameters.command)
        } else if (toolName === 'Read' && 'file_path' in parameters) {
          paramDisplay = String(parameters.file_path)
        } else if (toolName === 'Edit' && 'file_path' in parameters) {
          paramDisplay = String(parameters.file_path)
        } else if (toolName === 'Write' && 'file_path' in parameters) {
          paramDisplay = String(parameters.file_path)
        } else if (toolName === 'Grep' && 'pattern' in parameters) {
          paramDisplay = String(parameters.pattern)
        } else {
          // For other tools, show first parameter or count
          const firstKey = Object.keys(parameters)[0]
          if (firstKey && firstKey in parameters) {
            const firstValue: unknown = parameters[firstKey]
            paramDisplay =
              typeof firstValue === 'string'
                ? firstValue
                : JSON.stringify(firstValue)
          }
        }
      }

      return (
        <div className="text-[11px] text-[#9cdcfe]">
          {toolName}
          {paramDisplay && (
            <span className="ml-1 font-mono text-[#6a6a6a]">
              {paramDisplay}
            </span>
          )}
        </div>
      )
    }

    case 'tool_result': {
      const content = block.content as BlockContent
      let resultContent = ''
      let hasError = false

      if (typeof content === 'object') {
        if ('error' in content && content.error) {
          hasError = true
          resultContent =
            typeof content.error === 'string'
              ? content.error
              : JSON.stringify(content.error)
        } else if ('result' in content) {
          // Standard field used by BlockFactory
          resultContent =
            typeof content.result === 'string'
              ? content.result
              : JSON.stringify(content.result)
        } else if ('output' in content) {
          // Alternative field for compatibility
          resultContent =
            typeof content.output === 'string'
              ? content.output
              : JSON.stringify(content.output)
        } else if ('content' in content) {
          resultContent = getTextContent(content.content)
        } else {
          resultContent = JSON.stringify(content)
        }
      } else {
        resultContent = getTextContent(content)
      }

      return (
        <div
          className={`ml-2 max-h-[200px] overflow-hidden border-l-2 pl-2 font-mono text-[11px] leading-[1.4] ${
            hasError
              ? 'border-[#f48771] text-[#f48771]'
              : 'border-[#3e3e42] text-[#d4d4d4]'
          }`}
        >
          <pre className="font-mono whitespace-pre-wrap">
            {resultContent || (
              <span className="italic opacity-50">(no output)</span>
            )}
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
        <div className="rounded border border-[#3e3e42] bg-[#1e1e1e] p-2">
          <div className="mb-1 text-[11px] font-medium text-[#4ec9b0]">
            Code
          </div>
          <pre className="overflow-x-auto font-mono text-[11px] leading-[1.5] text-[#ce9178]">
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
        <div className="rounded border border-[#6b3a3a] bg-[#4b2b2b] p-2">
          <div className="mb-1 text-[11px] font-medium text-[#f48771]">
            Error
          </div>
          <div className="text-[13px] leading-[1.5] whitespace-pre-wrap text-[#f48771]">
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
        <div className="rounded border border-[#3e3e42] bg-[#2d2d30] p-2">
          <div className="mb-1 text-[11px] font-medium text-[#969696]">
            Unknown block type: {block.type}
          </div>
          <div className="text-[13px] whitespace-pre-wrap text-[#d4d4d4]">
            {unknownContent}
          </div>
        </div>
      )
    }
  }
}
