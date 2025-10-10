import { useGet, useLoadable, useSet } from 'ccstate-react'
import { pageSignal$ } from '../../signals/page-signal'
import {
  createAndSyncRepository$,
  githubInstallations$,
  githubRepository$,
  selectedInstallationId$,
  selectInstallation$,
  syncRepository$,
} from '../../signals/project/github'
import { detach, Reason } from '../../signals/utils'

export function GitHubSyncButton() {
  const repository = useLoadable(githubRepository$)
  const installations = useLoadable(githubInstallations$)
  const selectedInstallationId = useGet(selectedInstallationId$)
  const handleSelectInstallation = useSet(selectInstallation$)
  const handleCreateAndSync = useSet(createAndSyncRepository$)
  const handleSync = useSet(syncRepository$)
  const signal = useGet(pageSignal$)

  // Loading state
  if (repository.state === 'loading') {
    return (
      <div className="flex items-center gap-2 px-2 py-0.5">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#005a9e] border-t-white" />
        <span className="text-[11px] text-white/90">
          Checking repository...
        </span>
      </div>
    )
  }

  // Error state
  if (repository.state === 'hasError') {
    return (
      <div className="px-2 py-0.5 text-[11px] text-[#ff6b6b]">
        Error loading repository
      </div>
    )
  }

  // Has repository - show sync button
  if (repository.data) {
    return (
      <div className="flex items-center gap-2 px-2 py-0.5">
        <div className="flex items-center gap-1.5 rounded bg-white/10 px-2 py-0.5 text-[11px] text-white">
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span>{repository.data.repository.fullName}</span>
        </div>
        <button
          onClick={() => {
            detach(handleSync(signal), Reason.DomCallback)
          }}
          className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-white/30"
        >
          Sync to GitHub
        </button>
      </div>
    )
  }

  // No repository - show creation UI
  const installationsList =
    installations.state === 'hasData' ? installations.data : undefined

  return (
    <div className="flex items-center gap-2 px-2 py-0.5">
      {installationsList && installationsList.installations.length > 0 ? (
        <>
          <select
            value={selectedInstallationId ?? ''}
            onChange={(e) => {
              const value = e.target.value
              handleSelectInstallation(value ? Number(value) : null)
            }}
            className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] text-white transition-colors hover:bg-white/15 focus:border-white/40 focus:outline-none"
          >
            <option value="">Select GitHub account...</option>
            {installationsList.installations.map((installation) => (
              <option key={installation.id} value={installation.installationId}>
                {installation.accountName}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              detach(handleCreateAndSync(signal), Reason.DomCallback)
            }}
            disabled={!selectedInstallationId}
            className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-white/30 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/40"
          >
            Create & Sync Repository
          </button>
        </>
      ) : (
        <div className="rounded border border-[#ff6b6b]/40 bg-[#ff6b6b]/20 px-2 py-0.5 text-[11px] text-white">
          Please connect your GitHub account in Settings
        </div>
      )}
    </div>
  )
}
