import type { FileItem } from '@uspark/core/yjs-filesystem'
import { command, computed, state } from 'ccstate'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import mermaid from 'mermaid'
import { delay } from 'signal-timers'
import { IN_VITEST } from '../../env'
import {
  blobStore$,
  createSession$,
  getFileContentUrl,
  githubRepository,
  interruptSession$,
  lastBlockId,
  projectDetail,
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

export const currentProject$ = computed((get) => {
  const projectId = get(projectId$)
  if (!projectId) {
    return undefined
  }

  return get(projectDetail(projectId))
})

export const currentGitHubRepository$ = computed((get) => {
  const projectId = get(projectId$)
  if (!projectId) {
    return undefined
  }

  return get(githubRepository(projectId))
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

  if (filePath) {
    // If a file is explicitly specified in the URL, use it
    return findFileInTree(files.files, filePath)
  }

  // Default to wiki/00-README.md if it exists
  const defaultFile = findFileInTree(files.files, 'wiki/00-README.md')
  if (defaultFile) {
    return defaultFile
  }

  // Fall back to the first file in the tree
  return findFirstFile(files.files)
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
  const contentUrl = getFileContentUrl(store.store_id, projectId, file.hash)
  const resp = await fetch(contentUrl)
  return await resp.text()
})

export const selectedFileContentHtml$ = computed(async (get) => {
  const fileContent = await get(selectedFileContent$)
  if (!fileContent) {
    return undefined
  }

  // Step 1: Parse Markdown to HTML
  let rawHtml = await marked.parse(fileContent)

  // Step 2: Find and render mermaid code blocks
  const mermaidRegex =
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g
  const mermaidBlocks: { match: string; code: string; id: string }[] = []
  let mermaidIndex = 0

  // Find all mermaid blocks
  let match
  while ((match = mermaidRegex.exec(rawHtml)) !== null) {
    const encodedCode = match[1]
    // Decode HTML entities
    const code = encodedCode
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    mermaidBlocks.push({
      match: match[0],
      code,
      id: `mermaid-${mermaidIndex.toString()}`,
    })
    mermaidIndex++
  }

  // Step 3: Render all mermaid blocks to SVG
  if (mermaidBlocks.length > 0) {
    // Ensure mermaid is initialized
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        background: '#1e1e1e',
        primaryColor: '#333',
        primaryTextColor: '#fff',
        primaryBorderColor: '#555',
        lineColor: '#888',
        secondaryColor: '#444',
        tertiaryColor: '#222',
      },
    })

    const renderPromises = mermaidBlocks.map(async ({ id, code, match }) => {
      const { svg } = await mermaid.render(id, code)
      return { match, svg }
    })

    const renderedBlocks = await Promise.all(renderPromises)

    // Step 4: Replace code blocks with rendered SVGs
    for (const { match, svg } of renderedBlocks) {
      rawHtml = rawHtml.replace(match, svg)
    }
  }

  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'],
    ADD_ATTR: ['style', 'class'],
  })
})

export const selectFile$ = command(
  async ({ get, set }, filePath: string, signal: AbortSignal) => {
    const currentSearchParams = get(searchParams$)
    const newSearchParams = new URLSearchParams(currentSearchParams)

    newSearchParams.set('file', filePath)
    newSearchParams.delete('sessionId') // Deselect any session

    set(updateSearchParams$, newSearchParams)

    // Show file content when a file is selected
    set(internalFileContentVisible$, true)

    // Wait for file content to load
    await get(selectedFileContentHtml$)
    signal.throwIfAborted()

    // Wait for next tick to ensure DOM is updated
    await delay(0, { signal })

    // Scroll to top
    const container = get(internalFileContentContainerEl$)
    if (container) {
      container.scrollTop = 0
    }
  },
)

export const selectSession$ = command(({ get, set }, sessionId: string) => {
  const currentSearchParams = get(searchParams$)
  const newSearchParams = new URLSearchParams(currentSearchParams)

  newSearchParams.set('sessionId', sessionId)
  newSearchParams.delete('file') // Deselect any file

  set(updateSearchParams$, newSearchParams)

  // Hide file content when a session is selected
  set(internalFileContentVisible$, false)
})

const internalReloadSessions$ = state(0)

const projectSessions$ = computed((get) => {
  get(internalReloadSessions$)

  const projectId = get(projectId$)
  if (!projectId) {
    return Promise.resolve(undefined)
  }

  return get(projectSessions(projectId))
})

/**
 * Helper function to extract preview text from the latest turn
 */
function extractPreviewText(latestTurn?: {
  user_prompt: string
  status: string
}): string {
  if (!latestTurn) {
    return 'No messages yet'
  }

  // For simplicity and performance, always show user prompt
  // (Showing AI response would require fetching full turn details)
  const preview = latestTurn.user_prompt.slice(0, 50)
  return preview + (latestTurn.user_prompt.length > 50 ? '...' : '')
}

/**
 * Sessions with pre-computed display information for the session list
 */
export const sessionsWithDisplayInfo$ = computed(async (get) => {
  get(internalReloadSessions$)

  const projectSessionsResp = await get(projectSessions$)
  const projectId = get(projectId$)

  if (!projectSessionsResp || !projectId) {
    return []
  }

  const sessionsWithInfo = await Promise.all(
    projectSessionsResp.sessions.map(async (session) => {
      const turnsResp = await get(
        sessionTurns({
          projectId,
          sessionId: session.id,
          limit: 1,
          offset: 0,
        }),
      )

      const latestTurn = turnsResp.turns[0] as
        | (typeof turnsResp.turns)[0]
        | undefined

      return {
        id: session.id,
        title: session.title,
        createdAt: session.created_at,
        // Pre-computed display data
        previewText: extractPreviewText(latestTurn),
        status: latestTurn ? latestTurn.status : undefined,
        lastActivityTime: latestTurn
          ? latestTurn.created_at
          : session.created_at,
      }
    }),
  )

  // Sort by last activity time (most recent first)
  return sessionsWithInfo.sort(
    (a, b) =>
      new Date(b.lastActivityTime).getTime() -
      new Date(a.lastActivityTime).getTime(),
  )
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

const internalAutoScrollEnabled$ = state(true)

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

export const triggerReloadTurn$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    // Trigger reload
    set(internalReloadTurn$, (x) => x + 1)

    // Wait for turns to update
    await get(turns$)
    signal.throwIfAborted()

    // Wait for next tick to ensure DOM is updated
    await delay(0, { signal })

    // Check if auto-scroll is enabled
    const autoScrollEnabled = get(internalAutoScrollEnabled$)
    if (!autoScrollEnabled) {
      return
    }

    // Scroll to bottom
    const container = get(internalTurnListContainerEl$)
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  },
)

// File content visibility state
const internalFileContentVisible$ = state(false)

export const fileContentVisible$ = computed((get) =>
  get(internalFileContentVisible$),
)

export const closeFileContent$ = command(({ get, set }) => {
  set(internalFileContentVisible$, false)

  // Also clear the file selection from URL
  const currentSearchParams = get(searchParams$)
  const newSearchParams = new URLSearchParams(currentSearchParams)
  newSearchParams.delete('file')
  set(updateSearchParams$, newSearchParams)
})

// File content container element for scrolling
const internalFileContentContainerEl$ = state<HTMLDivElement | null>(null)

const internalMountFileContentContainer$ = command(
  ({ set }, el: HTMLDivElement, signal: AbortSignal) => {
    set(internalFileContentContainerEl$, el)
    signal.addEventListener('abort', () => {
      set(internalFileContentContainerEl$, null)
    })
  },
)

export const mountFileContentContainer$ = onRef(
  internalMountFileContentContainer$,
)

const internalChatInput$ = state('')

export const chatInput$ = computed((get) => get(internalChatInput$))

export const updateChatInput$ = command(({ set }, value: string) => {
  set(internalChatInput$, value)
})

// New session input (for creating new sessions from left panel)
const internalNewSessionInput$ = state('')

export const newSessionInput$ = computed((get) => get(internalNewSessionInput$))

export const updateNewSessionInput$ = command(({ set }, value: string) => {
  set(internalNewSessionInput$, value)
})

export const sendChatMessage$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    const projectId = get(projectId$)
    const session = await get(selectedSession$)
    signal.throwIfAborted()

    const message = get(internalChatInput$)

    // Only send message if there's a selected session
    if (!projectId || !session || !message.trim()) {
      return
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
    await set(triggerReloadTurn$, signal)
  },
)

export const createSessionWithMessage$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    const projectId = get(projectId$)
    const message = get(internalNewSessionInput$)

    if (!projectId || !message.trim()) {
      return
    }

    // 1. Create new session
    const newSession = await set(
      createSession$,
      { projectId, title: '' },
      signal,
    )

    // 2. Select the new session (switches right panel to this session's chat)
    const searchParams = get(searchParams$)
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set('sessionId', newSession.id)
    newSearchParams.delete('file') // Deselect any file
    set(updateSearchParams$, newSearchParams)

    // 3. Send the first message
    await set(
      sendMessage$,
      {
        projectId,
        sessionId: newSession.id,
        userMessage: message.trim(),
      },
      signal,
    )

    // 4. Clear the input
    set(internalNewSessionInput$, '')

    // 5. Reload sessions and turns
    set(internalReloadSessions$, (x) => x + 1)
    await set(triggerReloadTurn$, signal)
  },
)

export const interruptCurrentTurn$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    const projectId = get(projectId$)
    const session = await get(selectedSession$)
    signal.throwIfAborted()

    if (!projectId || !session) {
      return
    }

    await set(
      interruptSession$,
      {
        projectId,
        sessionId: session.id,
      },
      signal,
    )

    // Reload turns to reflect the cancelled state
    await set(triggerReloadTurn$, signal)
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

const lastTurn$ = computed(async (get) => {
  const turns = await get(turns$)
  if (!turns || turns.length === 0) {
    return undefined
  }
  return turns[turns.length - 1]
})

export const lastTurnStatus$ = computed(async (get) => {
  const lastTurn = await get(lastTurn$)
  return lastTurn?.status
})

export const hasActiveTurns$ = computed(async (get) => {
  const turns = await get(turns$)
  if (!turns) {
    return false
  }

  return turns.some((turn) => turn.status === 'running')
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
          const { last_block_id: serverLastBlockId } = await get(
            lastBlockId({
              projectId,
              sessionId: session.id,
            }),
          )
          signal.throwIfAborted()

          const localLastBlockId = await get(currentLastBlockId$)
          signal.throwIfAborted()

          if (serverLastBlockId !== localLastBlockId) {
            await set(triggerReloadTurn$, signal)
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

// View mode state ('preview' | 'edit')
const internalViewMode$ = state<'preview' | 'edit'>('preview')

export const viewMode$ = computed((get) => get(internalViewMode$))

export const setViewMode$ = command(({ set }, mode: 'preview' | 'edit') => {
  set(internalViewMode$, mode)
})
