import { useGet, useSet } from 'ccstate-react'
import type { FormEvent, KeyboardEvent } from 'react'
import { pageSignal$ } from '../../signals/page-signal'
import {
  chatInput$,
  sendChatMessage$,
  updateChatInput$,
} from '../../signals/project/project'
import { detach, Reason } from '../../signals/utils'

export function ChatInput() {
  const input = useGet(chatInput$)
  const setInput = useSet(updateChatInput$)
  const sendMessage = useSet(sendChatMessage$)
  const signal = useGet(pageSignal$)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) {
      return
    }

    detach(sendMessage(signal), Reason.DomCallback)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-[#3e3e42] p-2 bg-[#252526]">
      <div className="flex gap-1.5">
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          className="flex-1 resize-none rounded bg-[#3c3c3c] border border-[#3e3e42] px-2 py-1.5 text-[#cccccc] text-[13px] placeholder-[#6a6a6a] focus:border-[#007acc] focus:outline-none"
          rows={2}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="self-end rounded bg-[#0e639c] px-3 py-1.5 text-[#ffffff] text-[13px] font-medium hover:bg-[#1177bb] disabled:cursor-not-allowed disabled:bg-[#3e3e42] disabled:text-[#6a6a6a] transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  )
}
