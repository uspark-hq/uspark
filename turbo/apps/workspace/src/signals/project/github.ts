import { command, computed, state } from 'ccstate'
import {
  createGithubRepository$,
  githubRepository as externalGithubRepository,
  githubInstallations$,
  syncToGithub$,
} from '../external/project-detail'
import { pathParams$ } from '../route'

const projectId$ = computed((get) => {
  const pathParams = get(pathParams$)
  return pathParams?.projectId as string | undefined
})

// Re-export installations from external
export { githubInstallations$ }

// Get repository for current project
export const githubRepository$ = computed((get) => {
  const projectId = get(projectId$)
  if (!projectId) {
    return Promise.resolve(undefined)
  }

  return get(externalGithubRepository(projectId))
})

// State for selected installation (used when creating repository)
const internalSelectedInstallationId$ = state<number | null>(null)

export const selectedInstallationId$ = computed((get) =>
  get(internalSelectedInstallationId$),
)

export const selectInstallation$ = command(
  ({ set }, installationId: number | null) => {
    set(internalSelectedInstallationId$, installationId)
  },
)

// Command to create and sync repository
export const createAndSyncRepository$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    const projectId = get(projectId$)
    const installationId = get(internalSelectedInstallationId$)

    if (!projectId || !installationId) {
      throw new Error('Project ID and installation ID are required')
    }

    // Create repository
    await set(createGithubRepository$, { projectId, installationId }, signal)

    // Sync files to the newly created repository
    await set(syncToGithub$, { projectId }, signal)
  },
)

// Command to sync to GitHub
export const syncRepository$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    const projectId = get(projectId$)

    if (!projectId) {
      throw new Error('Project ID is required')
    }

    await set(syncToGithub$, { projectId }, signal)
  },
)
