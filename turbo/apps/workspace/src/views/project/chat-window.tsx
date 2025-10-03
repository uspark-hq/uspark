import { useLastResolved } from 'ccstate-react'
import {
  projectSessions$,
  selectedSession$,
  turns$,
} from '../../signals/project/project'
import { ChatInput } from './chat-input'

export function ChatWindow() {
  const projectSessions = useLastResolved(projectSessions$)
  const selectedSession = useLastResolved(selectedSession$)
  const turns = useLastResolved(turns$)

  return (
    <div className="flex h-full flex-col border-l border-gray-200">
      <div className="border-b border-gray-200 p-4 font-semibold">Chat</div>

      <div className="flex-1 overflow-y-auto">
        {!selectedSession && (
          <div className="p-4 text-gray-500">
            {projectSessions?.sessions.length === 0 ? (
              <div>
                No sessions yet. Create a new session to start chatting.
              </div>
            ) : (
              <div>Select a session to view the conversation</div>
            )}
          </div>
        )}

        {selectedSession && (
          <div className="p-4">
            <div className="mb-4 border-b border-gray-200 pb-2">
              <div className="font-semibold">
                {selectedSession.title ?? 'Untitled Session'}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(selectedSession.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="space-y-4">
              {turns?.map((turn) => (
                <div key={turn.id} className="space-y-2">
                  {turn.userMessage && (
                    <div className="rounded bg-blue-50 p-3">
                      <div className="mb-1 text-xs text-gray-600">User</div>
                      <div className="text-sm">{turn.userMessage}</div>
                    </div>
                  )}
                  {turn.assistantMessage && (
                    <div className="rounded bg-gray-50 p-3">
                      <div className="mb-1 text-xs text-gray-600">
                        Assistant
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {turn.assistantMessage}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ChatInput />
    </div>
  )
}
