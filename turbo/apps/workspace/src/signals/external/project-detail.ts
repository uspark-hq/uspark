import { contractFetch } from '@uspark/core/contract-fetch'
import { projectDetailContract } from '@uspark/core/contracts/project-detail.contract'
import { projectsContract } from '@uspark/core/contracts/projects.contract'
import { parseYjsFileSystem, type FileItem } from '@uspark/core/yjs-filesystem'
import { command, computed } from 'ccstate'
import { fetch$ } from '../fetch'

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

export const sessionUpdates = function (params: {
  projectId: string
  sessionId: string
  state: string
  timeout?: string
}) {
  return computed(async (get) => {
    const workspaceFetch = get(fetch$)

    return await contractFetch(projectDetailContract.getSessionUpdates, {
      params: {
        projectId: params.projectId,
        sessionId: params.sessionId,
      },
      query: {
        state: params.state,
        timeout: params.timeout ?? '30000',
      },
      fetch: workspaceFetch,
    })
  })
}

export const githubRepository = function (projectId: string) {
  return computed(async (get) => {
    const workspaceFetch = get(fetch$)

    return await contractFetch(projectDetailContract.getGitHubRepository, {
      params: { projectId },
      fetch: workspaceFetch,
    })
  })
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
      body: { installationId: params.installationId },
      fetch: workspaceFetch,
      signal,
    })
  },
)

export const syncToGithub$ = command(
  ({ get }, params: { projectId: string }, signal: AbortSignal) => {
    const workspaceFetch = get(fetch$)

    return contractFetch(projectDetailContract.syncToGitHub, {
      params: { projectId: params.projectId },
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
