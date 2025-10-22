import { useSet } from 'ccstate-react'
import { selectSession$ } from '../../signals/project/project'
import { NewSessionChatInput } from './new-session-chat-input'
import { SessionList } from './session-list'

/**
 * Left panel containing the new session input and session list.
 * Takes up 50% of screen width (1:1 split with right panel).
 */
export function LeftPanel() {
  const handleSelectSession = useSet(selectSession$)

  return (
    <div className="flex h-full w-1/2 flex-col border-r border-[#3e3e42] bg-[#252526]">
      <NewSessionChatInput />
      <SessionList onSelectSession={handleSelectSession} />
    </div>
  )
}
