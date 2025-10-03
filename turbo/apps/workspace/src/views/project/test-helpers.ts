import { http, HttpResponse, type RequestHandler } from 'msw'
import * as Y from 'yjs'
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
  const ydoc = new Y.Doc()
  const filesMap = ydoc.getMap('files')
  const blobsMap = ydoc.getMap('blobs')

  for (const file of files) {
    filesMap.set(file.path, { hash: file.hash, mtime: Date.now() })
    blobsMap.set(file.hash, { size: file.size ?? 100 })
  }

  return Y.encodeStateAsUpdate(ydoc)
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
                userMessage: t.userMessage,
                createdAt: t.createdAt ?? new Date().toISOString(),
              })),
            })
          },
        ),
        ...sessionTurns.map((turn) =>
          http.get(
            `*/api/projects/${projectId}/sessions/${session.id}/turns/${turn.id}`,
            () => {
              return HttpResponse.json({
                id: turn.id,
                userMessage: turn.userMessage,
                assistantMessage: turn.assistantMessage,
                createdAt: turn.createdAt ?? new Date().toISOString(),
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
