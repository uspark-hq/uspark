import { useLastResolved } from 'ccstate-react'
import { fileContentVisible$ } from '../../signals/project/project'
import { ChatWindow } from './chat-window'
import { FileContent } from './file-content'
import { FileTreePopover } from './file-tree-popover'

/**
 * ProjectPage component that provides the main workspace layout.
 * Features a dynamic layout that adapts based on file selection:
 * - Default: Full-screen chat window
 * - File selected: 50/50 split between chat and file viewer
 * - File tree accessible via popover in top-right corner
 *
 * @returns The complete project workspace interface
 */
export function ProjectPage() {
  const isFileContentVisible = useLastResolved(fileContentVisible$)

  return (
    <div className="flex h-screen flex-col bg-[#1e1e1e] text-[#cccccc]">
      {/* Top bar with file tree button */}
      <div className="flex items-center justify-end border-b border-[#3e3e42] bg-[#252526] px-4 py-2">
        <FileTreePopover />
      </div>

      {/* Main content area */}
      <div className="flex min-h-0 flex-1">
        {isFileContentVisible ? (
          <>
            {/* 50/50 split: Chat window on left, file content on right */}
            <div className="flex-1 border-r border-[#3e3e42]">
              <ChatWindow />
            </div>
            <div className="flex-1">
              <FileContent />
            </div>
          </>
        ) : (
          /* Full-screen chat window */
          <div className="flex-1">
            <ChatWindow />
          </div>
        )}
      </div>
    </div>
  )
}
