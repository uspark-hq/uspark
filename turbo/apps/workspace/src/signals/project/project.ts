import type { FileItem } from '@uspark/core/yjs-filesystem'
import { command, computed, state } from 'ccstate'
import { delay } from 'signal-timers'
import { IN_VITEST } from '../../env'
import {
  blobStore$,
  createSession$,
  getFileContentUrl,
  lastBlockId,
  projectFiles,
  projectSessions,
  sendMessage$,
  sessionTurns,
  turnDetail,
} from '../external/project-detail'
import { pathParams$, searchParams$, updateSearchParams$ } from '../route'
import { onRef, throwIfAbort } from '../utils'

function findFileInTree(
  files: FileItem[],
  targetPath: string,
): FileItem | undefined {
  for (const file of files) {
    if (file.path === targetPath) {
      return file
    }
    if (file.type === 'directory' && file.children) {
      const found = findFileInTree(file.children, targetPath)
      if (found) {
        return found
      }
    }
  }
  return undefined
}

function findFirstFile(files: FileItem[]): FileItem | undefined {
  for (const item of files) {
    if (item.type === 'file') {
      return item
    }
    if (item.children) {
      const found = findFirstFile(item.children)
      if (found) {
        return found
      }
    }
  }
  return undefined
}

const projectId$ = computed((get) => {
  const pathParams = get(pathParams$)
  return pathParams?.projectId as string | undefined
})

export const projectFiles$ = computed((get) => {
  const projectId = get(projectId$)
  if (!projectId) {
    return undefined
  }

  return get(projectFiles(projectId))
})

const selectedFile$ = computed((get) => {
  const searchParams = get(searchParams$)
  return searchParams.get('file') ?? undefined
})

export const selectedFileItem$ = computed(async (get) => {
  const files = await get(projectFiles$)
  if (!files) {
    return undefined
  }

  const filePath = get(selectedFile$)

  const file = filePath
    ? findFileInTree(files.files, filePath)
    : findFirstFile(files.files)

  return file
})

export const selectedFileContent$ = computed(async (get) => {
  const projectId = get(projectId$)
  if (!projectId) {
    return undefined
  }

  const file = await get(selectedFileItem$)

  if (!file?.hash || file.type === 'directory') {
    return undefined
  }

  const store = await get(blobStore$)
  const contentUrl = getFileContentUrl(store.storeId, projectId, file.hash)
  const resp = await fetch(contentUrl)
  return await resp.text()
})

export const selectFile$ = command(({ get, set }, filePath: string) => {
  const currentSearchParams = get(searchParams$)
  const newSearchParams = new URLSearchParams(currentSearchParams)

  newSearchParams.set('file', filePath)

  set(updateSearchParams$, newSearchParams)
})

export const selectSession$ = command(({ get, set }, sessionId: string) => {
  const currentSearchParams = get(searchParams$)
  const newSearchParams = new URLSearchParams(currentSearchParams)

  newSearchParams.set('sessionId', sessionId)

  set(updateSearchParams$, newSearchParams)
})

const internalReloadSessions$ = state(0)

export const projectSessions$ = computed((get) => {
  get(internalReloadSessions$)

  const projectId = get(projectId$)
  if (!projectId) {
    return Promise.resolve(undefined)
  }

  return get(projectSessions(projectId))
})

const sessionId$ = computed((get) => {
  const searchParams = get(searchParams$)

  return searchParams.get('sessionId') ?? undefined
})

export const selectedSession$ = computed(async (get) => {
  const sessionId = get(sessionId$)
  if (!sessionId) {
    return undefined
  }

  const sessionsResponse = await get(projectSessions$)
  if (!sessionsResponse) {
    return undefined
  }

  const sessions = sessionsResponse.sessions
  return sessions.find((s) => s.id === sessionId)
})

const internalReloadTurn$ = state(0)

const internalTurnListContainerEl$ = state<HTMLDivElement | null>(null)

const internalMountTurnList$ = command(
  ({ set }, el: HTMLDivElement, signal: AbortSignal) => {
    set(internalTurnListContainerEl$, el)
    signal.addEventListener('abort', () => {
      set(internalTurnListContainerEl$, null)
    })
  },
)

export const mountTurnList$ = onRef(internalMountTurnList$)

export const turnListContainerEl$ = computed((get) =>
  get(internalTurnListContainerEl$),
)

export const turns$ = computed(async (get) => {
  get(internalReloadTurn$)

  const session = await get(selectedSession$)
  if (!session) {
    return undefined
  }
  const projectId = get(projectId$)
  if (!projectId) {
    return undefined
  }

  const resp = await get(
    sessionTurns({
      projectId: projectId,
      sessionId: session.id,
    }),
  )

  return Promise.all(
    resp.turns.map((turn) => {
      return get(
        turnDetail({
          projectId: projectId,
          sessionId: session.id,
          turnId: turn.id,
        }),
      )
    }),
  )
})

const internalChatInput$ = state('')

export const chatInput$ = computed((get) => get(internalChatInput$))

export const updateChatInput$ = command(({ set }, value: string) => {
  set(internalChatInput$, value)
})

export const sendChatMessage$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    const projectId = get(projectId$)
    let session = await get(selectedSession$)
    signal.throwIfAborted()

    const message = get(internalChatInput$)

    if (!projectId || !message.trim()) {
      return
    }

    if (!session) {
      const newSession = await set(
        createSession$,
        { projectId, title: '' },
        signal,
      )

      const searchParams = get(searchParams$)
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.set('sessionId', newSession.id)
      set(updateSearchParams$, newSearchParams)

      set(internalReloadSessions$, (x) => x + 1)

      session = newSession
    }

    await set(
      sendMessage$,
      {
        projectId,
        sessionId: session.id,
        userMessage: message.trim(),
      },
      signal,
    )

    set(internalChatInput$, '')
    set(internalReloadTurn$, (x) => x + 1)
  },
)

export const currentLastBlockId$ = computed(async (get) => {
  const turns = await get(turns$)
  if (!turns || turns.length === 0) {
    return null
  }

  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i]
    if (turn.blocks.length > 0) {
      return turn.blocks[turn.blocks.length - 1].id
    }
  }

  return null
})

export const hasActiveTurns$ = computed(async (get) => {
  const turns = await get(turns$)
  if (!turns) {
    return false
  }

  return turns.some(
    (turn) => turn.status === 'pending' || turn.status === 'in_progress',
  )
})

const pollingInterval$ = computed(async (get) => {
  const hasActive = await get(hasActiveTurns$)
  return hasActive ? 1000 : 5000
})

export const startWatchSession$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    do {
      try {
        const session = await get(selectedSession$)
        signal.throwIfAborted()
        const projectId = get(projectId$)

        if (session && projectId) {
          const { lastBlockId: serverLastBlockId } = await get(
            lastBlockId({
              projectId,
              sessionId: session.id,
            }),
          )
          signal.throwIfAborted()

          const localLastBlockId = await get(currentLastBlockId$)
          signal.throwIfAborted()

          if (serverLastBlockId !== localLastBlockId) {
            set(internalReloadTurn$, (x) => x + 1)
          }
        }

        if (!IN_VITEST) {
          const interval = await get(pollingInterval$)
          signal.throwIfAborted()
          await delay(interval, { signal })
        }
      } catch (error) {
        throwIfAbort(error)

        if (!IN_VITEST) {
          try {
            await delay(5000, { signal })
          } catch (error) {
            throwIfAbort(error)
            break
          }
        }
      }
    } while (!IN_VITEST && !signal.aborted)
  },
)
