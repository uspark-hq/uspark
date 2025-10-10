import { ChatWindow } from './chat-window'
import { FileContent } from './file-content'
import { FileTree } from './file-tree'
import { GitHubSyncButton } from './github-sync-button'

export function ProjectPage() {
  return (
    <div className="flex h-screen flex-col">
      {/* Top toolbar - GitHub sync */}
      <div className="border-b border-gray-200">
        <GitHubSyncButton />
      </div>

      {/* Main content */}
      <div className="flex flex-1">
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
    </div>
  )
}
