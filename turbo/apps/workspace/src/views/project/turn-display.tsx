import type { GetTurnResponse } from '@uspark/core'
import { BlockDisplay } from './block-display'

interface TurnDisplayProps {
  turn: GetTurnResponse
}

function TurnStatusBadge({ status }: { status: GetTurnResponse['status'] }) {
  const statusConfig = {
    pending: {
      label: '⏳ Pending',
      className: 'bg-[#433519] text-[#e5c07b]',
    },
    in_progress: {
      label: '🔄 In Progress',
      className: 'bg-[#1e3a5f] text-[#569cd6]',
    },
    completed: {
      label: '✅ Completed',
      className: 'bg-[#1e4620] text-[#89d185]',
    },
    failed: {
      label: '❌ Failed',
      className: 'bg-[#4b2b2b] text-[#f48771]',
    },
    interrupted: {
      label: '⚠️ Interrupted',
      className: 'bg-[#4b3319] text-[#e5c07b]',
    },
  }

  const config = statusConfig[status]

  return (
    <span
      data-testid="turn-status"
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

export function TurnDisplay({ turn }: TurnDisplayProps) {
  const hasBlocks = (turn.blocks as unknown[] | undefined)?.length > 0

  return (
    <div className="space-y-2">
      {/* User message */}
      <div className="rounded border border-[#0d5a8c] bg-[#094771] p-2">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[11px] font-medium text-[#9cdcfe]">User</div>
          <TurnStatusBadge status={turn.status} />
        </div>
        <div className="text-[13px] leading-[1.5] whitespace-pre-wrap text-[#e3e3e3]">
          {turn.user_prompt}
        </div>
      </div>

      {/* Assistant blocks */}
      {hasBlocks ? (
        <div className="space-y-1.5 pl-3">
          {turn.blocks.map((block) => (
            <BlockDisplay key={block.id} block={block} />
          ))}
        </div>
      ) : turn.status === 'pending' || turn.status === 'in_progress' ? (
        <div className="rounded border border-[#3e3e42] bg-[#2d2d30] p-2 pl-5">
          <div className="flex items-center gap-2 text-[13px] text-[#969696]">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#3e3e42] border-t-[#007acc]" />
            <span>
              {turn.status === 'pending'
                ? 'Waiting to start...'
                : 'Processing...'}
            </span>
          </div>
        </div>
      ) : turn.status === 'failed' ? (
        <div className="rounded border border-[#6b3a3a] bg-[#4b2b2b] p-2 pl-5">
          <div className="text-[13px] text-[#f48771]">
            Turn execution failed. Please try again.
          </div>
        </div>
      ) : null}

      {/* Timing info */}
      {(turn.started_at ?? turn.completed_at) && (
        <div className="pl-3 text-[10px] text-[#6a6a6a]">
          {turn.started_at && (
            <span>
              Started: {new Date(turn.started_at).toLocaleTimeString()}
            </span>
          )}
          {turn.completed_at && (
            <span className="ml-2">
              Completed: {new Date(turn.completed_at).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
