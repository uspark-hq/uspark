import { ChatWindow } from './chat-window'
import { FileContent } from './file-content'
import { FileTree } from './file-tree'

export function ProjectPage() {
  return (
    <div className="flex h-screen">
      {/* Left sidebar - File tree */}
      <div className="w-64 flex-shrink-0">
        <FileTree />
      </div>

      {/* Center panel - File content */}
      <div className="flex-1">
        <FileContent />
      </div>

      {/* Right sidebar - Chat window */}
      <div className="w-96 flex-shrink-0">
        <ChatWindow />
      </div>
    </div>
  )
}
