import { ChatWindow } from './chat-window'
import { FileContent } from './file-content'
import { FileTree } from './file-tree'
import { Statusbar } from './statusbar'

/**
 * ProjectPage component that provides the main workspace layout.
 * Features a three-column layout with file tree, content viewer, and chat panel,
 * plus a bottom status bar for project information.
 *
 * @returns The complete project workspace interface
 */
export function ProjectPage() {
  return (
    <div className="flex h-screen flex-col bg-[#1e1e1e] text-[#cccccc]">
      <div className="flex min-h-0 flex-1">
        <div className="w-64 flex-shrink-0 border-r border-[#3e3e42]">
          <FileTree />
        </div>

        <div className="flex-1 border-r border-[#3e3e42]">
          <FileContent />
        </div>

        <div className="w-96 flex-shrink-0">
          <ChatWindow />
        </div>
      </div>

      <Statusbar />
    </div>
  )
}
