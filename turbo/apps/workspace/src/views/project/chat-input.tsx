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
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          className="flex-1 resize-none rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          rows={3}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="self-end rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Send
        </button>
      </div>
    </form>
  )
}
