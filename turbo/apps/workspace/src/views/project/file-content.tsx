import { useGet, useLastResolved, useSet } from 'ccstate-react'
import {
  closeFileContent$,
  selectedFileContent$,
  selectedFileItem$,
  setViewMode$,
  viewMode$,
} from '../../signals/project/project'
import { shareCurrentFile$ } from '../../signals/project/share'
import { rootSignal$ } from '../../signals/root-signal'
import { onDomEventFn } from '../../signals/utils'
import { MarkdownEditor } from './markdown-editor'
import { MarkdownPreview } from './markdown-preview'

export function FileContent() {
  const fileContent = useLastResolved(selectedFileContent$)
  const selectedFile = useLastResolved(selectedFileItem$)
  const closeFileContent = useSet(closeFileContent$)
  const mode = useLastResolved(viewMode$) ?? 'preview'
  const setViewMode = useSet(setViewMode$)
  const shareFile = useSet(shareCurrentFile$)
  const signal = useGet(rootSignal$)

  const handleShare = onDomEventFn(() => shareFile(signal))

  if (!fileContent) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-[#969696]">
        <div className="text-center">
          <div className="text-[13px]">Select a file to view its content</div>
        </div>
      </div>
    )
  }

  // 只渲染 markdown 文件
  const isMarkdown = selectedFile?.path.endsWith('.md') ?? false

  if (isMarkdown) {
    return (
      <div className="flex h-full flex-col bg-[#1e1e1e]">
        {/* Header with file name, mode toggle, and close button */}
        <div className="flex items-center justify-between border-b border-[#3e3e42] bg-[#252526] px-4 py-2">
          <div className="text-[13px] text-[#cccccc]">
            {selectedFile?.path.split('/').pop()}
          </div>

          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded border border-[#3e3e42] bg-[#2a2d2e] px-3 py-1 text-[12px] text-[#cccccc] transition-colors hover:bg-[#3e3e42] hover:text-[#ffffff]"
              title="Share file"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Share</span>
            </button>

            {/* Preview/Edit toggle buttons */}
            <div className="flex overflow-hidden rounded border border-[#3e3e42]">
              <button
                onClick={() => {
                  setViewMode('preview')
                }}
                className={`px-3 py-1 text-[12px] transition-colors ${
                  mode === 'preview'
                    ? 'bg-[#094771] text-[#ffffff]'
                    : 'bg-[#2a2d2e] text-[#cccccc] hover:bg-[#3e3e42]'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => {
                  setViewMode('edit')
                }}
                className={`px-3 py-1 text-[12px] transition-colors ${
                  mode === 'edit'
                    ? 'bg-[#094771] text-[#ffffff]'
                    : 'bg-[#2a2d2e] text-[#cccccc] hover:bg-[#3e3e42]'
                }`}
              >
                Edit
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={closeFileContent}
              className="flex h-6 w-6 items-center justify-center rounded text-[#cccccc] transition-colors hover:bg-[#2a2d2e] hover:text-[#ffffff]"
              aria-label="Close file"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* File content - show preview or editor based on mode */}
        <div className="flex-1 overflow-hidden">
          {mode === 'preview' ? <MarkdownPreview /> : <MarkdownEditor />}
        </div>
      </div>
    )
  }

  // 非 markdown 文件不显示内容
  return null
}
