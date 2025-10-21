import { useSet } from 'ccstate-react'
import { selectSession$ } from '../../signals/project/project'
import { NewSessionChatInput } from './new-session-chat-input'
import { SessionList } from './session-list'

/**
 * Left panel containing the new session input and session list.
 * Fixed width of 320px with VS Code dark theme styling.
 */
export function LeftPanel() {
  const handleSelectSession = useSet(selectSession$)

  return (
    <div className="flex h-full w-[320px] flex-col border-r border-[#3e3e42] bg-[#252526]">
      <NewSessionChatInput />
      <SessionList onSelectSession={handleSelectSession} />
    </div>
  )
}
