import { useLastResolved, useSet } from 'ccstate-react'
import {
  mountTurnList$,
  selectedSession$,
  turns$,
} from '../../signals/project/project'
import { ChatInput } from './chat-input'
import { TurnDisplay } from './turn-display'

/**
 * Right panel chat area for displaying a selected session's conversation.
 * Shows session title, turn history, and input for sending messages.
 */
export function SessionChatArea() {
  const selectedSession = useLastResolved(selectedSession$)
  const turns = useLastResolved(turns$)
  const mountTurnList = useSet(mountTurnList$)

  if (!selectedSession) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#1e1e1e]">
        <div className="text-center">
          <div className="mb-2 text-3xl">💬</div>
          <div className="text-[13px] text-[#969696]">
            Select a session to view the conversation
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#1e1e1e]">
      {/* Session header */}
      <div className="border-b border-[#3e3e42] bg-[#252526] px-3 py-2">
        <div className="text-[13px] font-medium text-[#ffffff]">
          {selectedSession.title ?? 'Untitled Session'}
        </div>
        <div className="mt-0.5 text-[11px] text-[#969696]">
          {new Date(selectedSession.created_at).toLocaleString()}
        </div>
      </div>

      {/* Turn list */}
      <div className="flex-1 overflow-y-auto" ref={mountTurnList}>
        <div className="p-3">
          <div className="space-y-3">
            {turns && turns.length > 0 ? (
              turns.map((turn, index) => (
                <TurnDisplay
                  key={turn.id}
                  turn={turn}
                  isLastTurn={index === turns.length - 1}
                />
              ))
            ) : (
              <div className="py-12 text-center text-[13px] text-[#969696]">
                <div className="mb-2 text-3xl">✨</div>
                <div>No conversation yet. Send a message to start.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat input */}
      <ChatInput />
    </div>
  )
}
