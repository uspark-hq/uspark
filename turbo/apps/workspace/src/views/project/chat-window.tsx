import { useLastResolved, useSet } from 'ccstate-react'
import {
  mountTurnList$,
  projectSessions$,
  selectedSession$,
  selectSession$,
  turns$,
} from '../../signals/project/project'
import { ChatInput } from './chat-input'
import { TurnDisplay } from './turn-display'

export function ChatWindow() {
  const projectSessions = useLastResolved(projectSessions$)
  const selectedSession = useLastResolved(selectedSession$)
  const turns = useLastResolved(turns$)
  const handleSelectSession = useSet(selectSession$)
  const mountTurnList = useSet(mountTurnList$)

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      <div className="flex h-8 items-center justify-between border-b border-[#3e3e42] px-3">
        <div className="text-[11px] font-semibold tracking-wide text-[#cccccc] uppercase">
          Assistant
        </div>
        {projectSessions && projectSessions.sessions.length > 0 && (
          <select
            value={selectedSession?.id ?? ''}
            onChange={(e) => {
              if (e.target.value) {
                handleSelectSession(e.target.value)
              }
            }}
            className="rounded border border-[#3e3e42] bg-[#3c3c3c] px-2 py-0.5 text-[11px] text-[#cccccc] transition-colors hover:bg-[#505050] focus:border-[#007acc] focus:outline-none"
          >
            <option value="">Select session</option>
            {projectSessions.sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title ?? 'Untitled Session'}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" ref={mountTurnList}>
        {!selectedSession && (
          <div className="p-3 text-[13px] text-[#969696]">
            {projectSessions?.sessions.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mb-2 text-3xl">💬</div>
                <div>
                  No sessions yet. Create a new session to start chatting.
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="mb-2 text-3xl">💬</div>
                <div>Select a session to view the conversation</div>
              </div>
            )}
          </div>
        )}

        {selectedSession && (
          <div className="p-3">
            <div className="mb-3 border-b border-[#3e3e42] pb-2">
              <div className="text-[13px] font-medium text-[#ffffff]">
                {selectedSession.title ?? 'Untitled Session'}
              </div>
              <div className="mt-0.5 text-[11px] text-[#969696]">
                {new Date(selectedSession.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="space-y-3">
              {turns && turns.length > 0 ? (
                turns.map((turn) => <TurnDisplay key={turn.id} turn={turn} />)
              ) : (
                <div className="py-12 text-center text-[13px] text-[#969696]">
                  <div className="mb-2 text-3xl">✨</div>
                  <div>No conversation yet. Send a message to start.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ChatInput />
    </div>
  )
}
