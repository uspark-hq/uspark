import { useLastResolved } from 'ccstate-react'
import {
  selectedFileContent$,
  selectedFileItem$,
} from '../../signals/project/project'

export function FileContent() {
  const fileContent = useLastResolved(selectedFileContent$)
  const selectedFile = useLastResolved(selectedFileItem$)

  if (!fileContent) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-[#969696]">
        <div className="text-center">
          <div className="text-[13px]">Select a file to view its content</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#1e1e1e]">
      <div className="flex items-center gap-1.5 border-b border-[#3e3e42] px-3 py-1.5 text-[13px] text-[#cccccc]">
        <span>{selectedFile?.path.split('/').pop() ?? 'File'}</span>
      </div>
      <div className="p-3">
        <pre className="font-mono text-[13px] leading-[1.6] whitespace-pre-wrap text-[#d4d4d4]">
          {fileContent}
        </pre>
      </div>
    </div>
  )
}
