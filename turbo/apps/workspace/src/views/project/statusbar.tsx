import { GitHubSyncButton } from './github-sync-button'

export function Statusbar() {
  return (
    <div className="flex h-6 flex-shrink-0 items-center border-t border-[#3e3e42] bg-[#007acc]">
      <GitHubSyncButton />
    </div>
  )
}
