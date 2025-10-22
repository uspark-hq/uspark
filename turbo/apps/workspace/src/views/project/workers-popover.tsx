import {
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@uspark/ui'
import { useLastResolved } from 'ccstate-react'
import { Activity } from 'lucide-react'
import { currentProjectWorkers$ } from '../../signals/project/project'

const WORKER_TIMEOUT_MS = 60_000 // 60 seconds

function isWorkerActive(lastHeartbeatAt: string): boolean {
  const now = new Date()
  const heartbeat = new Date(lastHeartbeatAt)
  const timeSinceHeartbeat = now.getTime() - heartbeat.getTime()
  return timeSinceHeartbeat < WORKER_TIMEOUT_MS
}

export function WorkersPopover() {
  const workersData = useLastResolved(currentProjectWorkers$)

  const activeWorkers = workersData?.workers.filter((w) =>
    isWorkerActive(w.last_heartbeat_at),
  )

  const activeCount = activeWorkers?.length ?? 0

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-[14px]"
          aria-label="View active workers"
        >
          <Activity className="h-4 w-4" />
          <span>
            {activeCount} {activeCount === 1 ? 'worker' : 'workers'}
          </span>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent
        align="end"
        className="w-[280px] border-[#3e3e42] bg-[#252526] p-0"
      >
        <div className="border-b border-[#3e3e42] px-4 py-3">
          <h4 className="text-sm font-semibold text-[#cccccc]">
            Active Workers
          </h4>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {activeWorkers && activeWorkers.length > 0 ? (
            <div className="py-1">
              {activeWorkers.map((worker) => {
                const lastSeen = new Date(worker.last_heartbeat_at)
                const now = new Date()
                const secondsAgo = Math.floor(
                  (now.getTime() - lastSeen.getTime()) / 1000,
                )

                let timeAgoText = ''
                if (secondsAgo < 5) {
                  timeAgoText = 'just now'
                } else if (secondsAgo < 60) {
                  timeAgoText = `${String(secondsAgo)}s ago`
                } else {
                  timeAgoText = `${String(Math.floor(secondsAgo / 60))}m ago`
                }

                return (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-[#2a2d2e]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                      <span className="font-mono text-[13px] text-[#cccccc]">
                        {worker.id.slice(0, 8)}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#858585]">
                      {timeAgoText}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-[#858585]">No active workers</p>
              <p className="mt-1 text-[11px] text-[#656565]">
                Start a claude-worker to see it here
              </p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
