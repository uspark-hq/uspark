import { useGet, useLastResolved, useSet } from 'ccstate-react'
import type { FormEvent, KeyboardEvent } from 'react'
import { pageSignal$ } from '../../signals/page-signal'
import {
  chatInput$,
  interruptCurrentTurn$,
  lastTurnStatus$,
  sendChatMessage$,
  updateChatInput$,
} from '../../signals/project/project'
import { detach, Reason } from '../../signals/utils'

export function ChatInput() {
  const input = useGet(chatInput$)
  const setInput = useSet(updateChatInput$)
  const sendMessage = useSet(sendChatMessage$)
  const interruptTurn = useSet(interruptCurrentTurn$)
  const signal = useGet(pageSignal$)
  const lastTurnStatus = useLastResolved(lastTurnStatus$)

  const isRunning = lastTurnStatus === 'running'

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (isRunning) {
      // Interrupt the current turn
      detach(interruptTurn(signal), Reason.DomCallback)
    } else {
      // Send a new message
      if (!input.trim()) {
        return
      }
      detach(sendMessage(signal), Reason.DomCallback)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isRunning) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-[#3e3e42] bg-[#252526] p-2"
    >
      <div className="flex gap-1.5">
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isRunning
              ? 'Processing... Click Interrupt to stop'
              : 'Type a message... (Enter to send, Shift+Enter for new line)'
          }
          disabled={isRunning}
          className="flex-1 resize-none rounded border border-[#3e3e42] bg-[#3c3c3c] px-2 py-1.5 text-[13px] text-[#cccccc] placeholder-[#6a6a6a] focus:border-[#007acc] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          rows={2}
        />
        <button
          type="submit"
          disabled={!isRunning && !input.trim()}
          className={`self-end rounded px-3 py-1.5 text-[13px] font-medium text-[#ffffff] transition-colors ${
            isRunning
              ? 'bg-[#a1260d] hover:bg-[#c72e0d]'
              : 'bg-[#0e639c] hover:bg-[#1177bb] disabled:cursor-not-allowed disabled:bg-[#3e3e42] disabled:text-[#6a6a6a]'
          }`}
        >
          {isRunning ? 'Interrupt' : 'Send'}
        </button>
      </div>
    </form>
  )
}
