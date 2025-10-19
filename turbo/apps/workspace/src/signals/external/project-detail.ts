import { contractFetch, ContractFetchError } from '@uspark/core/contract-fetch'
import {
  projectDetailContract,
  type GitHubRepository,
} from '@uspark/core/contracts/project-detail.contract'
import { projectsContract } from '@uspark/core/contracts/projects.contract'
import { turnsContract } from '@uspark/core/contracts/turns.contract'
import { parseYjsFileSystem, type FileItem } from '@uspark/core/yjs-filesystem'
import { command, computed } from 'ccstate'
import { fetch$ } from '../fetch'
import { throwIfAbort } from '../utils'

interface ProjectFilesData {
  files: FileItem[]
  totalSize: number
  fileCount: number
}

export const blobStore$ = computed(async (get) => {
  const workspaceFetch = get(fetch$)

  return await contractFetch(projectDetailContract.getBlobStore, {
    fetch: workspaceFetch,
  })
})

export const projectFiles = function (projectId: string) {
  return computed(async (get): Promise<ProjectFilesData> => {
    const workspaceFetch = get(fetch$)

    const response = await contractFetch(projectsContract.getProjectSnapshot, {
      params: { projectId },
      fetch: workspaceFetch,
    })

    const yjsData = new Uint8Array(response)

    return parseYjsFileSystem(yjsData)
  })
}

export const shareFile$ = command(
  (
    { get },
    params: { projectId: string; filePath: string },
    signal: AbortSignal,
  ) => {
    const workspaceFetch = get(fetch$)

    return contractFetch(projectDetailContract.shareFile, {
      body: {
        project_id: params.projectId,
        file_path: params.filePath,
      },
      fetch: workspaceFetch,
      signal,
    })
  },
)

export const projectSessions = function (projectId: string) {
  return computed(async (get) => {
    const workspaceFetch = get(fetch$)

    return await contractFetch(projectDetailContract.listSessions, {
      params: { projectId },
      fetch: workspaceFetch,
    })
  })
}

export const sessionTurns = function (params: {
  projectId: string
  sessionId: string
  limit?: number
  offset?: number
}) {
  return computed(async (get) => {
    const workspaceFetch = get(fetch$)

    return await contractFetch(turnsContract.listTurns, {
      params: {
        projectId: params.projectId,
        sessionId: params.sessionId,
      },
      query: {
        limit: params.limit?.toString() ?? '20',
        offset: params.offset?.toString() ?? '0',
      },
      fetch: workspaceFetch,
    })
  })
}

export const turnDetail = function (params: {
  projectId: string
  sessionId: string
  turnId: string
}) {
  return computed(async (get) => {
    const workspaceFetch = get(fetch$)

    return await contractFetch(turnsContract.getTurn, {
      params: {
        projectId: params.projectId,
        sessionId: params.sessionId,
        turnId: params.turnId,
      },
      fetch: workspaceFetch,
    })
  })
}

export const createSession$ = command(
  (
    { get },
    params: { projectId: string; title: string },
    signal: AbortSignal,
  ) => {
    const workspaceFetch = get(fetch$)

    return contractFetch(projectDetailContract.createSession, {
      params: { projectId: params.projectId },
      body: { title: params.title },
      fetch: workspaceFetch,
      signal,
    })
  },
)

export const sendMessage$ = command(
  (
    { get },
    params: { projectId: string; sessionId: string; userMessage: string },
    signal: AbortSignal,
  ) => {
    const workspaceFetch = get(fetch$)

    return contractFetch(projectDetailContract.sendMessage, {
      params: {
        projectId: params.projectId,
        sessionId: params.sessionId,
      },
      body: { user_message: params.userMessage },
      fetch: workspaceFetch,
      signal,
    })
  },
)

export const interruptSession$ = command(
  (
    { get },
    params: { projectId: string; sessionId: string },
    signal: AbortSignal,
  ) => {
    const workspaceFetch = get(fetch$)

    return contractFetch(projectDetailContract.interruptSession, {
      params: {
        projectId: params.projectId,
        sessionId: params.sessionId,
      },
      body: {},
      fetch: workspaceFetch,
      signal,
    })
  },
)

export const lastBlockId = function (params: {
  projectId: string
  sessionId: string
}) {
  return computed(async (get) => {
    const workspaceFetch = get(fetch$)

    return await contractFetch(projectDetailContract.getLastBlockId, {
      params: {
        projectId: params.projectId,
        sessionId: params.sessionId,
      },
      fetch: workspaceFetch,
    })
  })
}

export const githubRepository = function (projectId: string) {
  return computed(
    async (get): Promise<{ repository: GitHubRepository | null }> => {
      const workspaceFetch = get(fetch$)

      try {
        return await contractFetch(projectDetailContract.getGitHubRepository, {
          params: { projectId },
          fetch: workspaceFetch,
        })
      } catch (error) {
        throwIfAbort(error)
        // 404 means repository doesn't exist yet - this is a normal state, not an error
        if (error instanceof ContractFetchError && error.status === 404) {
          return { repository: null }
        }
        // Re-throw other errors (network issues, auth errors, etc)
        throw error
      }
    },
  )
}

export const githubInstallations$ = computed(async (get) => {
  const workspaceFetch = get(fetch$)

  return await contractFetch(projectDetailContract.listGitHubInstallations, {
    fetch: workspaceFetch,
  })
})

export const createGithubRepository$ = command(
  (
    { get },
    params: { projectId: string; installationId: number },
    signal: AbortSignal,
  ) => {
    const workspaceFetch = get(fetch$)

    return contractFetch(projectDetailContract.createGitHubRepository, {
      params: { projectId: params.projectId },
      body: { installation_id: params.installationId },
      fetch: workspaceFetch,
      signal,
    })
  },
)

export const getFileContentUrl = (
  storeId: string,
  projectId: string,
  fileHash: string,
): string => {
  return `https://${storeId}.public.blob.vercel-storage.com/projects/${projectId}/${fileHash}`
}
