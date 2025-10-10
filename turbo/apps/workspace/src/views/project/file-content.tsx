import { useLastResolved } from 'ccstate-react'
import { selectedFileContent$, selectedFileItem$ } from '../../signals/project/project'

export function FileContent() {
  const fileContent = useLastResolved(selectedFileContent$)
  const selectedFile = useLastResolved(selectedFileItem$)

  if (!fileContent) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-[#969696]">
        <div className="text-center">
          <div className="mb-2 text-3xl">📄</div>
          <div className="text-[13px]">Select a file to view its content</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#1e1e1e]">
      <div className="border-b border-[#3e3e42] px-3 py-1.5 text-[#cccccc] text-[13px] flex items-center gap-1.5">
        <span className="text-[#c5c5c5] text-xs">📄</span>
        <span>{selectedFile?.path.split('/').pop() ?? 'File'}</span>
      </div>
      <div className="p-3">
        <pre className="font-mono text-[13px] text-[#d4d4d4] whitespace-pre-wrap leading-[1.6]">
          {fileContent}
        </pre>
      </div>
    </div>
  )
}
