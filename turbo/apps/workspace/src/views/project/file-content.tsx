import { useLastResolved } from 'ccstate-react'
import { selectedFileContent$ } from '../../signals/project/project'

export function FileContent() {
  const fileContent = useLastResolved(selectedFileContent$)

  if (!fileContent) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Select a file to view its content
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-gray-200 p-4 font-semibold">
        File Content
      </div>
      <div className="p-4">
        <pre className="font-mono text-sm whitespace-pre-wrap">
          {fileContent}
        </pre>
      </div>
    </div>
  )
}
