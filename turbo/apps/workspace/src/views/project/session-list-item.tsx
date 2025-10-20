import { getRelativeTime } from '../../utils/time'

interface SessionListItemProps {
  session: {
    id: string
    title: string | null
    previewText: string
    status?: string
    lastActivityTime: string
  }
  isSelected: boolean
  onClick: () => void
}

/**
 * Individual session list item showing status, title, preview, and time.
 * Uses VS Code dark theme styling.
 */
export function SessionListItem({
  session,
  isSelected,
  onClick,
}: SessionListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full border-b border-[#3e3e42] px-3 py-2 text-left transition-colors ${
        isSelected
          ? 'border-l-2 border-l-[#007acc] bg-[#094771]'
          : 'hover:bg-[#2a2d2e]'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Status indicator */}
        <div className="mt-1 flex-shrink-0">
          {session.status === 'running' && (
            <div className="h-2 w-2 animate-pulse rounded-full bg-[#007acc]" />
          )}
          {session.status === 'completed' && (
            <div className="h-2 w-2 rounded-full bg-[#4ec9b0]" />
          )}
          {session.status === 'failed' && (
            <div className="h-2 w-2 rounded-full bg-[#f48771]" />
          )}
          {session.status === 'interrupted' && (
            <div className="h-2 w-2 rounded-full bg-[#dcdcaa]" />
          )}
          {(!session.status || session.status === 'cancelled') && (
            <div className="h-2 w-2 rounded-full bg-[#6a6a6a]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Title */}
          <div className="mb-0.5 truncate text-[13px] font-medium text-[#cccccc]">
            {session.title ?? 'Untitled Session'}
          </div>

          {/* Preview text */}
          <div className="truncate text-[11px] text-[#969696]">
            {session.previewText}
          </div>

          {/* Relative time */}
          <div className="mt-1 text-[10px] text-[#6a6a6a]">
            {getRelativeTime(session.lastActivityTime)}
          </div>
        </div>
      </div>
    </button>
  )
}
