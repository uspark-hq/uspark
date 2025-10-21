import { useLastResolved } from 'ccstate-react'
import {
  selectedSession$,
  sessionsWithDisplayInfo$,
} from '../../signals/project/project'
import { SessionListItem } from './session-list-item'

interface SessionListProps {
  onSelectSession: (id: string) => void
}

/**
 * Scrollable list of sessions, sorted by most recent activity.
 * Shows empty state when no sessions exist.
 */
export function SessionList({ onSelectSession }: SessionListProps) {
  const sessions = useLastResolved(sessionsWithDisplayInfo$)
  const selectedSession = useLastResolved(selectedSession$)

  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="text-[13px] text-[#6a6a6a]">No sessions yet</div>
        <div className="mt-1 text-[11px] text-[#6a6a6a]">
          Create your first session above
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {sessions.map((session) => (
        <SessionListItem
          key={session.id}
          session={session}
          isSelected={session.id === selectedSession?.id}
          onClick={() => {
            onSelectSession(session.id)
          }}
        />
      ))}
    </div>
  )
}
