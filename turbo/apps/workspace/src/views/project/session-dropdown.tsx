import { useLastResolved, useSet } from 'ccstate-react'
import {
  closeSessionDropdown$,
  sessionDropdownOpen$,
  setButtonEl$,
  setDropdownEl$,
  setupDropdownClickOutside$,
  toggleSessionDropdown$,
} from '../../signals/project/session-dropdown'
import { onDomEventFn } from '../../signals/utils'

interface Session {
  id: string
  title: string | null
}

interface SessionDropdownProps {
  sessions: Session[]
  selectedSessionId: string | undefined
  onSelectSession: (sessionId: string) => void
}

/**
 * Session dropdown menu component with VS Code dark theme styling.
 * Provides a dropdown menu for selecting active sessions with keyboard navigation support.
 */
export function SessionDropdown({
  sessions,
  selectedSessionId,
  onSelectSession,
}: SessionDropdownProps) {
  const isOpen = useLastResolved(sessionDropdownOpen$)
  const toggleDropdown = useSet(toggleSessionDropdown$)
  const closeDropdown = useSet(closeSessionDropdown$)
  const setButtonEl = useSet(setButtonEl$)
  const setDropdownEl = useSet(setDropdownEl$)
  const setupClickOutside = useSet(setupDropdownClickOutside$)

  const selectedSession = sessions.find((s) => s.id === selectedSessionId)

  const handleSelect = (sessionId: string) => {
    onSelectSession(sessionId)
    closeDropdown()
  }

  const handleKeyDown = (
    event: React.KeyboardEvent,
    sessionId: string,
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelect(sessionId)
    }
  }

  return (
    <div ref={setupClickOutside} className="relative">
      {/* Trigger Button */}
      <button
        ref={setButtonEl}
        type="button"
        onClick={onDomEventFn(toggleDropdown)}
        className="flex items-center gap-1.5 rounded border border-[#3e3e42] bg-[#3c3c3c] px-2 py-0.5 text-[11px] text-[#cccccc] transition-colors hover:bg-[#505050] focus:border-[#007acc] focus:outline-none"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="max-w-[150px] truncate">
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Need to handle empty strings */}
          {selectedSession?.title?.trim() || 'Select session'}
        </span>
        <svg
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={setDropdownEl}
          className="absolute top-full right-0 z-50 mt-1 max-w-[300px] min-w-[200px] overflow-hidden rounded border border-[#3e3e42] bg-[#252526] shadow-lg"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="max-h-[300px] overflow-y-auto py-1">
            {sessions.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-[#6a6a6a]">
                No sessions available
              </div>
            ) : (
              sessions.map((session) => {
                const isSelected = session.id === selectedSessionId
                return (
                  <button
                    key={session.id}
                    type="button"
                    role="menuitem"
                    onClick={onDomEventFn(() => {
                      handleSelect(session.id)
                    })}
                    onKeyDown={(e) => {
                      handleKeyDown(e, session.id)
                    }}
                    className={`w-full px-3 py-1.5 text-left text-[11px] transition-colors focus:outline-none ${
                      isSelected
                        ? 'bg-[#094771] text-[#ffffff]'
                        : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Need to handle empty strings */}
                        {session.title?.trim() || 'Untitled Session'}
                      </span>
                      {isSelected && (
                        <svg
                          className="h-3 w-3 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
