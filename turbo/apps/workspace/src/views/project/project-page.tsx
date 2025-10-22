import { useLastResolved } from 'ccstate-react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import {
  currentGitHubRepository$,
  currentProject$,
  fileContentVisible$,
} from '../../signals/project/project'
import { FileContent } from './file-content'
import { FileTreePopover } from './file-tree-popover'
import { LeftPanel } from './left-panel'
import { SessionChatArea } from './session-chat-area'
import { WorkersPopover } from './workers-popover'

/**
 * ProjectPage component with two-column layout:
 * - Left: Session list with new session input (320px fixed)
 * - Right: Selected session chat OR file content (mutually exclusive)
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
          <WorkersPopover />
          <FileTreePopover />
        </div>
      </div>

      {/* Main content area - 1:1 split two-column layout */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel: Session list (50% width) */}
        <LeftPanel />

        {/* Right panel: Session chat OR file content (50% width) */}
        <div className="w-1/2">
          {isFileContentVisible ? <FileContent /> : <SessionChatArea />}
        </div>
      </div>
    </div>
  )
}
