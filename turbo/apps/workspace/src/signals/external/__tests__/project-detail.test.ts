/**
 * Tests for project detail external signals
 * This test ensures all exports are imported to avoid knip issues
 * and demonstrates MSW mocking pattern for workspace endpoints
 */

import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { testContext } from '../../__tests__/context'
import { server } from '../../../mocks/node'
import {
  blobStore$,
  createGithubRepository$,
  createSession$,
  getFileContentUrl,
  githubInstallations$,
  githubRepository,
  lastBlockId,
  projectFiles,
  projectSessions,
  sendMessage$,
  shareFile$,
  syncToGithub$,
  turnDetail,
} from '../project-detail'

const context = testContext()

describe('project-detail signals', () => {
  describe('blobStore$', () => {
    it('should fetch blob store ID', async () => {
      const { store } = context

      const mockResponse = {
        storeId: 'store-123',
      }

      server.use(
        http.get('*/api/blob-store', () => {
          return HttpResponse.json(mockResponse)
        }),
      )

      const result = await store.get(blobStore$)
      expect(result).toStrictEqual(mockResponse)
    })
  })

  describe('projectFiles', () => {
    it('should fetch and parse YJS document', async () => {
      const { store } = context
      const projectId = 'test-project-123'

      // Create a valid empty YJS document structure
      // YJS encodeStateAsUpdate for empty doc starts with these bytes
      const mockBinaryData = new Uint8Array([0, 0])

      server.use(
        http.get('*/api/projects/:projectId', ({ params }) => {
          expect(params.projectId).toBe(projectId)
          return new HttpResponse(mockBinaryData, {
            headers: {
              'Content-Type': 'application/octet-stream',
            },
          })
        }),
      )

      const filesSignal$ = projectFiles(projectId)
      const result = await store.get(filesSignal$)

      // For empty YJS doc, we should get empty files array
      expect(result).toHaveProperty('files')
      expect(result.files).toStrictEqual([])
      expect(result).toHaveProperty('totalSize')
      expect(result.totalSize).toBe(0)
      expect(result).toHaveProperty('fileCount')
      expect(result.fileCount).toBe(0)
    })
  })

  describe('shareFile$', () => {
    it('should create share link', async () => {
      const { store, signal } = context

      const mockResponse = {
        url: 'https://share.example.com/abc123',
      }

      server.use(
        http.post('*/api/share', async ({ request }) => {
          const body = (await request.json()) as {
            project_id: string
            file_path: string
          }
          expect(body).toMatchObject({
            project_id: 'project-123',
            file_path: '/src/index.ts',
          })
          return HttpResponse.json(mockResponse)
        }),
      )

      const result = await store.set(
        shareFile$,
        {
          projectId: 'project-123',
          filePath: '/src/index.ts',
        },
        signal,
      )

      expect(result).toStrictEqual(mockResponse)
    })
  })

  describe('projectSessions', () => {
    it('should fetch project sessions', async () => {
      const { store } = context
      const projectId = 'project-123'

      const mockResponse = {
        sessions: [
          {
            id: 'session-1',
            title: 'Session 1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      }

      server.use(
        http.get('*/api/projects/:projectId/sessions', ({ params }) => {
          expect(params.projectId).toBe(projectId)
          return HttpResponse.json(mockResponse)
        }),
      )

      const sessionsSignal$ = projectSessions(projectId)
      const result = await store.get(sessionsSignal$)

      expect(result).toStrictEqual(mockResponse)
    })
  })

  describe('createSession$', () => {
    it('should create a new session', async () => {
      const { store, signal } = context

      const mockResponse = {
        id: 'session-new',
        title: 'New Session',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      server.use(
        http.post(
          '*/api/projects/:projectId/sessions',
          async ({ params, request }) => {
            expect(params.projectId).toBe('project-123')
            const body = (await request.json()) as { title: string }
            expect(body.title).toBe('New Session')
            return HttpResponse.json(mockResponse, { status: 201 })
          },
        ),
      )

      const result = await store.set(
        createSession$,
        {
          projectId: 'project-123',
          title: 'New Session',
        },
        signal,
      )

      expect(result).toStrictEqual(mockResponse)
    })
  })

  describe('sendMessage$', () => {
    it('should send a message to session', async () => {
      const { store, signal } = context

      const mockResponse = {
        id: 'turn-123',
      }

      server.use(
        http.post(
          '*/api/projects/:projectId/sessions/:sessionId/turns',
          async ({ params, request }) => {
            expect(params.projectId).toBe('project-123')
            expect(params.sessionId).toBe('session-456')
            const body = (await request.json()) as { user_message: string }
            expect(body.user_message).toBe('Hello Claude')
            return HttpResponse.json(mockResponse, { status: 201 })
          },
        ),
      )

      const result = await store.set(
        sendMessage$,
        {
          projectId: 'project-123',
          sessionId: 'session-456',
          userMessage: 'Hello Claude',
        },
        signal,
      )

      expect(result).toStrictEqual(mockResponse)
    })
  })

  describe('lastBlockId', () => {
    it('should fetch last block ID when blocks exist', async () => {
      const { store } = context

      const mockResponse = {
        lastBlockId: 'block-123',
      }

      server.use(
        http.get(
          '*/api/projects/:projectId/sessions/:sessionId/last-block-id',
          ({ params }) => {
            expect(params.projectId).toBe('project-123')
            expect(params.sessionId).toBe('session-456')
            return HttpResponse.json(mockResponse)
          },
        ),
      )

      const blockIdSignal$ = lastBlockId({
        projectId: 'project-123',
        sessionId: 'session-456',
      })
      const result = await store.get(blockIdSignal$)

      expect(result).toStrictEqual(mockResponse)
    })

    it('should return null when no blocks exist', async () => {
      const { store } = context

      server.use(
        http.get(
          '*/api/projects/:projectId/sessions/:sessionId/last-block-id',
          () => {
            return HttpResponse.json({ lastBlockId: null })
          },
        ),
      )

      const blockIdSignal$ = lastBlockId({
        projectId: 'project-123',
        sessionId: 'session-456',
      })
      const result = await store.get(blockIdSignal$)

      expect(result).toStrictEqual({ lastBlockId: null })
    })
  })

  describe('turnDetail', () => {
    it('should fetch turn with all blocks', async () => {
      const { store } = context

      const mockResponse = {
        id: 'turn_123',
        session_id: 'session-456',
        user_prompt: 'Test question',
        status: 'completed',
        started_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T00:01:00Z',
        blocks: [
          {
            id: 'block_1',
            type: 'text',
            content: { text: 'Answer 1' },
          },
          {
            id: 'block_2',
            type: 'code',
            content: { code: 'console.log("hello")' },
          },
        ],
      }

      server.use(
        http.get(
          '*/api/projects/:projectId/sessions/:sessionId/turns/:turnId',
          ({ params }) => {
            expect(params.projectId).toBe('project-123')
            expect(params.sessionId).toBe('session-456')
            expect(params.turnId).toBe('turn_123')
            return HttpResponse.json(mockResponse)
          },
        ),
      )

      const turnSignal$ = turnDetail({
        projectId: 'project-123',
        sessionId: 'session-456',
        turnId: 'turn_123',
      })
      const result = await store.get(turnSignal$)

      expect(result).toStrictEqual(mockResponse)
    })
  })

  describe('githubRepository', () => {
    it('should fetch GitHub repository info', async () => {
      const { store } = context
      const projectId = 'project-123'

      const mockResponse = {
        repository: {
          fullName: 'user/repo',
          accountName: 'user',
          repoName: 'repo',
        },
      }

      server.use(
        http.get(
          '*/api/projects/:projectId/github/repository',
          ({ params }) => {
            expect(params.projectId).toBe(projectId)
            return HttpResponse.json(mockResponse)
          },
        ),
      )

      const repoSignal$ = githubRepository(projectId)
      const result = await store.get(repoSignal$)

      expect(result).toStrictEqual(mockResponse)
    })
  })

  describe('githubInstallations$', () => {
    it('should fetch GitHub installations', async () => {
      const { store } = context

      const mockResponse = {
        installations: [
          {
            id: 'install-1',
            installationId: 12_345,
            accountName: 'my-org',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      }

      server.use(
        http.get('*/api/github/installations', () => {
          return HttpResponse.json(mockResponse)
        }),
      )

      const result = await store.get(githubInstallations$)
      expect(result).toStrictEqual(mockResponse)
    })
  })

  describe('createGithubRepository$', () => {
    it('should create GitHub repository', async () => {
      const { store, signal } = context

      const mockResponse = {
        repository: {
          fullName: 'user/new-repo',
          accountName: 'user',
          repoName: 'new-repo',
        },
      }

      server.use(
        http.post(
          '*/api/projects/:projectId/github/repository',
          async ({ params, request }) => {
            expect(params.projectId).toBe('project-123')
            const body = (await request.json()) as { installationId: number }
            expect(body.installationId).toBe(12_345)
            return HttpResponse.json(mockResponse, { status: 201 })
          },
        ),
      )

      const result = await store.set(
        createGithubRepository$,
        {
          projectId: 'project-123',
          installationId: 12_345,
        },
        signal,
      )

      expect(result).toStrictEqual(mockResponse)
    })
  })

  describe('syncToGithub$', () => {
    it('should sync project to GitHub', async () => {
      const { store, signal } = context

      const mockResponse = {
        filesCount: 10,
      }

      server.use(
        http.post('*/api/projects/:projectId/github/sync', ({ params }) => {
          expect(params.projectId).toBe('project-123')
          // Empty body for POST request (contract defines it as empty object)
          return HttpResponse.json(mockResponse)
        }),
      )

      const result = await store.set(
        syncToGithub$,
        {
          projectId: 'project-123',
        },
        signal,
      )

      expect(result).toStrictEqual(mockResponse)
    })
  })

  describe('getFileContentUrl', () => {
    it('should construct blob URL correctly', () => {
      const url = getFileContentUrl('store-123', 'project-456', 'hash-789')
      expect(url).toBe(
        'https://store-123.public.blob.vercel-storage.com/projects/project-456/hash-789',
      )
    })
  })
})
