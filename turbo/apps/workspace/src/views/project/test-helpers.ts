import { http, HttpResponse, type RequestHandler } from 'msw'
import { Doc, encodeStateAsUpdate, Map as YMap } from 'yjs'
import { server } from '../../mocks/node'
import {
  setupPage,
  type TestFixtureConfig,
} from '../../signals/__tests__/context'
import { clerk$ } from '../../signals/auth'
import { getMockClerk } from '../../signals/test-utils'

interface FileSpec {
  path: string
  hash: string
  content: string
  size?: number
}

interface SessionSpec {
  id: string
  title: string
  createdAt?: string
}

interface TurnSpec {
  id: string
  userMessage: string
  assistantMessage?: string
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'interrupted'
  createdAt?: string
}

interface MockProjectConfig {
  projectId: string
  files: FileSpec[]
  sessions?: SessionSpec[]
  turns?: Record<string, TurnSpec[]>
  storeId?: string
}

/**
 * Create YJS document with files
 */
function createYjsDocument(files: FileSpec[]): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const ydoc: Doc = new Doc()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const filesMap: YMap<{ hash: string; mtime: number }> = ydoc.getMap('files')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const blobsMap: YMap<{ size: number }> = ydoc.getMap('blobs')

  for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    filesMap.set(file.path, { hash: file.hash, mtime: Date.now() })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    blobsMap.set(file.hash, { size: file.size ?? 100 })
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return encodeStateAsUpdate(ydoc)
}

/**
 * Mock all project-related APIs
 */
function mockProjectApis(config: MockProjectConfig) {
  const {
    projectId,
    files,
    sessions = [],
    turns = {},
    storeId = 'test-store',
  } = config

  const handlers = [
    // Blob store
    http.get('*/api/blob-store', () => {
      return HttpResponse.json({ storeId })
    }),

    // Project YJS data
    http.get(`*/api/projects/${projectId}`, () => {
      const yjsData = createYjsDocument(files)
      return HttpResponse.arrayBuffer(yjsData.buffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      })
    }),

    // File contents
    ...files.map((file) =>
      http.get(
        `https://${storeId}.public.blob.vercel-storage.com/projects/${projectId}/${file.hash}`,
        () => {
          return new HttpResponse(file.content)
        },
      ),
    ),

    // Sessions list
    http.get(`*/api/projects/${projectId}/sessions`, () => {
      return HttpResponse.json({
        sessions: sessions.map((s) => ({
          id: s.id,
          title: s.title,
          createdAt: s.createdAt ?? new Date().toISOString(),
        })),
        total: sessions.length,
      })
    }),

    // Turns for each session
    ...sessions.flatMap((session) => {
      const sessionTurns = turns[session.id] ?? []
      return [
        http.get(
          `*/api/projects/${projectId}/sessions/${session.id}/turns`,
          () => {
            return HttpResponse.json({
              turns: sessionTurns.map((t) => ({
                id: t.id,
                user_prompt: t.userMessage,
                status: t.status ?? 'completed',
                started_at: t.createdAt ?? new Date().toISOString(),
                completed_at: t.createdAt ?? new Date().toISOString(),
                created_at: t.createdAt ?? new Date().toISOString(),
                block_count: t.assistantMessage ? 1 : 0,
                block_ids: t.assistantMessage ? [`block_${t.id}_1`] : [],
              })),
              total: sessionTurns.length,
            })
          },
        ),
        ...sessionTurns.map((turn) =>
          http.get(
            `*/api/projects/${projectId}/sessions/${session.id}/turns/${turn.id}`,
            () => {
              return HttpResponse.json({
                id: turn.id,
                session_id: session.id,
                user_prompt: turn.userMessage,
                status: turn.status ?? 'completed',
                started_at: turn.createdAt ?? new Date().toISOString(),
                completed_at: turn.createdAt ?? new Date().toISOString(),
                created_at: turn.createdAt ?? new Date().toISOString(),
                blocks: turn.assistantMessage
                  ? [
                      {
                        id: `block_${turn.id}_1`,
                        turnId: turn.id,
                        type: 'text',
                        content: turn.assistantMessage,
                        sequenceNumber: 0,
                        createdAt: turn.createdAt ?? new Date().toISOString(),
                      },
                    ]
                  : [],
              })
            },
          ),
        ),
      ]
    }),
  ]

  server.use(...handlers)
}

/**
 * Setup project page with all mocks
 */
export async function setupProjectPage(
  url: string,
  // eslint-disable-next-line custom/no-store-in-params -- Test helper needs config with store for setup
  config: TestFixtureConfig,
  mockConfig: MockProjectConfig,
  additionalHandlers?: RequestHandler[],
): Promise<void> {
  await config.store.get(clerk$)
  config.signal.throwIfAborted()
  const mockClerk = getMockClerk()
  if (mockClerk) {
    mockClerk.setUser({
      id: 'test-user-123',
      emailAddresses: [
        {
          emailAddress: 'test@example.com',
        },
      ],
      fullName: 'Test User',
    })
    mockClerk.setSession({
      getToken: () => Promise.resolve('test-token').catch(() => null),
    })
  }

  mockProjectApis(mockConfig)
  if (additionalHandlers) {
    server.use(...additionalHandlers)
  }
  config.signal.throwIfAborted()
  await setupPage(url, config)
}
