import type { GetTurnResponse } from '@uspark/core'
import { BlockDisplay } from './block-display'

interface TurnDisplayProps {
  turn: GetTurnResponse
}

function TurnStatusBadge({ status }: { status: GetTurnResponse['status'] }) {
  const statusConfig = {
    pending: {
      label: '⏳ Pending',
      className: 'bg-yellow-100 text-yellow-800',
    },
    in_progress: {
      label: '🔄 In Progress',
      className: 'bg-blue-100 text-blue-800',
    },
    completed: {
      label: '✅ Completed',
      className: 'bg-green-100 text-green-800',
    },
    failed: { label: '❌ Failed', className: 'bg-red-100 text-red-800' },
    interrupted: {
      label: '⚠️ Interrupted',
      className: 'bg-orange-100 text-orange-800',
    },
  }

  const config = statusConfig[status]

  return (
    <span
      data-testid="turn-status"
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${config.className}`}
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
      <div className="rounded bg-blue-50 p-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-xs text-gray-600">User</div>
          <TurnStatusBadge status={turn.status} />
        </div>
        <div className="text-sm whitespace-pre-wrap">{turn.user_prompt}</div>
      </div>

      {/* Assistant blocks */}
      {hasBlocks ? (
        <div className="space-y-2 pl-4">
          {turn.blocks.map((block) => (
            <BlockDisplay key={block.id} block={block} />
          ))}
        </div>
      ) : turn.status === 'pending' || turn.status === 'in_progress' ? (
        <div className="rounded bg-gray-50 p-3 pl-7">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            <span>
              {turn.status === 'pending'
                ? 'Waiting to start...'
                : 'Processing...'}
            </span>
          </div>
        </div>
      ) : turn.status === 'failed' ? (
        <div className="rounded bg-red-50 p-3 pl-7">
          <div className="text-sm text-red-700">
            Turn execution failed. Please try again.
          </div>
        </div>
      ) : null}

      {/* Timing info */}
      {(turn.started_at ?? turn.completed_at) && (
        <div className="pl-4 text-xs text-gray-400">
          {turn.started_at && (
            <span>
              Started: {new Date(turn.started_at).toLocaleTimeString()}
            </span>
          )}
          {turn.completed_at && (
            <span className="ml-3">
              Completed: {new Date(turn.completed_at).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
