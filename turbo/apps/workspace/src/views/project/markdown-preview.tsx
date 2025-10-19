import { useLastResolved } from 'ccstate-react'
import { selectedFileContent$ } from '../../signals/project/project'

export function MarkdownPreview() {
  const fileContent = useLastResolved(selectedFileContent$)

  if (!fileContent) {
    return null
  }

  return (
    <div className="h-full overflow-auto bg-[#1e1e1e] p-4">
      <pre className="font-mono text-[13px] whitespace-pre-wrap text-[#cccccc]">
        {fileContent}
      </pre>
    </div>
  )
}
