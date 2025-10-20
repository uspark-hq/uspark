import { useGet, useSet } from 'ccstate-react'
import type { FormEvent, KeyboardEvent } from 'react'
import { pageSignal$ } from '../../signals/page-signal'
import {
  createSessionWithMessage$,
  newSessionInput$,
  updateNewSessionInput$,
} from '../../signals/project/project'
import { detach, Reason } from '../../signals/utils'

/**
 * Input component for creating a new session with an initial message.
 * Located at the top of the left panel.
 */
export function NewSessionChatInput() {
  const input = useGet(newSessionInput$)
  const setInput = useSet(updateNewSessionInput$)
  const createSession = useSet(createSessionWithMessage$)
  const signal = useGet(pageSignal$)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) {
      return
    }

    detach(createSession(signal), Reason.DomCallback)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-[#3e3e42] bg-[#252526] p-2"
    >
      <div className="flex gap-1.5">
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder="New session... (Enter to send, Shift+Enter for new line)"
          className="flex-1 resize-none rounded border border-[#3e3e42] bg-[#3c3c3c] px-2 py-1.5 text-[13px] text-[#cccccc] placeholder-[#6a6a6a] focus:border-[#007acc] focus:outline-none"
          rows={2}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="self-end rounded bg-[#0e639c] px-3 py-1.5 text-[13px] font-medium text-[#ffffff] transition-colors hover:bg-[#1177bb] disabled:cursor-not-allowed disabled:bg-[#3e3e42] disabled:text-[#6a6a6a]"
        >
          Create
        </button>
      </div>
    </form>
  )
}
