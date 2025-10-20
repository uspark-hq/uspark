import { useLastResolved } from 'ccstate-react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import {
  currentGitHubRepository$,
  currentProject$,
  fileContentVisible$,
} from '../../signals/project/project'
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
  const project = useLastResolved(currentProject$)
  const githubRepo = useLastResolved(currentGitHubRepository$)

  const handleBackToProjects = () => {
    const currentUrl = new URL(window.location.href)
    const newUrl = currentUrl.origin.replace('app.', 'www.') + '/projects'
    window.location.href = newUrl
  }

  return (
    <div className="flex h-screen flex-col bg-[#1e1e1e] text-[#cccccc]">
      {/* Top bar with back button, project name, GitHub link, and file tree button */}
      <div className="flex items-center justify-between border-b border-[#3e3e42] bg-[#252526] px-4 py-2.5">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToProjects}
            className="flex items-center gap-2 rounded px-3 py-1.5 text-[14px] text-[#cccccc] transition-colors hover:bg-[#2a2d2e]"
            aria-label="Back to projects"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          {project && (
            <div className="text-[14px] font-medium text-[#cccccc]">
              {project.name}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {githubRepo?.repository && (
            <a
              href={`https://github.com/${githubRepo.repository.full_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded px-3 py-1.5 text-[14px] text-[#cccccc] transition-colors hover:bg-[#2a2d2e]"
              aria-label="View on GitHub"
            >
              <ExternalLink className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          )}
          <FileTreePopover />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex min-h-0 flex-1">
        {isFileContentVisible ? (
          <>
            {/* Chat window - hidden on mobile when file is open, shown on desktop */}
            <div className="hidden flex-1 border-r border-[#3e3e42] md:flex">
              <ChatWindow />
            </div>
            {/* File content - full width on mobile, 50% on desktop */}
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
