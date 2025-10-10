import { ChatWindow } from './chat-window'
import { FileContent } from './file-content'
import { FileTree } from './file-tree'

export function ProjectPage() {
  return (
    <div className="flex h-screen bg-[#1e1e1e] text-[#cccccc]">
      {/* Left sidebar - File tree */}
      <div className="w-64 flex-shrink-0 border-r border-[#3e3e42]">
        <FileTree />
      </div>

      {/* Center panel - File content */}
      <div className="flex-1 border-r border-[#3e3e42]">
        <FileContent />
      </div>

      {/* Right sidebar - Chat window */}
      <div className="w-96 flex-shrink-0">
        <ChatWindow />
      </div>
    </div>
  )
}
