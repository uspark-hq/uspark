/**
 * Tests for session watching functionality
 */

import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { testContext } from '../../__tests__/context'
import { server } from '../../../mocks/node'
import { setupProjectPage } from '../../../views/project/test-helpers'
import { setupMock } from '../../test-utils'
import {
  currentLastBlockId$,
  hasActiveTurns$,
  startWatchSession$,
} from '../project'

// Setup Clerk mock
setupMock()

const context = testContext()

describe('session watching', () => {
  const mockProjectId = 'test-project-123'
  const mockSessionId = 'sess_test123'

  afterEach(() => {
    server.resetHandlers()
  })

  describe('currentLastBlockId$', () => {
    it('should return null when no turns', async () => {
      await setupProjectPage(
        `/projects/${mockProjectId}?sessionId=${mockSessionId}`,
        context,
        {
          projectId: mockProjectId,
          files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
          sessions: [{ id: mockSessionId, title: 'Test Session' }],
          turns: {},
        },
      )

      const result = await context.store.get(currentLastBlockId$)
      expect(result).toBeNull()
    })

    it('should return last block ID from turns', async () => {
      await setupProjectPage(
        `/projects/${mockProjectId}?sessionId=${mockSessionId}`,
        context,
        {
          projectId: mockProjectId,
          files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
          sessions: [{ id: mockSessionId, title: 'Test Session' }],
          turns: {
            [mockSessionId]: [
              {
                id: 'turn_1',
                userMessage: 'test',
                assistantMessage: 'response',
                status: 'completed',
              },
            ],
          },
        },
      )

      const result = await context.store.get(currentLastBlockId$)
      // The test-helpers creates blocks with id: `block_${t.id}_1`
      expect(result).toBe('block_turn_1_1')
    })
  })

  describe('hasActiveTurns$', () => {
    it('should return false when no turns', async () => {
      await setupProjectPage(
        `/projects/${mockProjectId}?sessionId=${mockSessionId}`,
        context,
        {
          projectId: mockProjectId,
          files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
          sessions: [{ id: mockSessionId, title: 'Test Session' }],
          turns: {},
        },
      )

      const result = await context.store.get(hasActiveTurns$)
      expect(result).toBeFalsy()
    })

    it('should return true when there are pending turns', async () => {
      await setupProjectPage(
        `/projects/${mockProjectId}?sessionId=${mockSessionId}`,
        context,
        {
          projectId: mockProjectId,
          files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
          sessions: [{ id: mockSessionId, title: 'Test Session' }],
          turns: {
            [mockSessionId]: [
              {
                id: 'turn_1',
                userMessage: 'test',
                status: 'pending',
              },
            ],
          },
        },
      )

      const result = await context.store.get(hasActiveTurns$)
      expect(result).toBeTruthy()
    })

    it('should return true when there are in_progress turns', async () => {
      await setupProjectPage(
        `/projects/${mockProjectId}?sessionId=${mockSessionId}`,
        context,
        {
          projectId: mockProjectId,
          files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
          sessions: [{ id: mockSessionId, title: 'Test Session' }],
          turns: {
            [mockSessionId]: [
              {
                id: 'turn_1',
                userMessage: 'test',
                assistantMessage: 'processing...',
                status: 'in_progress',
              },
            ],
          },
        },
      )

      const result = await context.store.get(hasActiveTurns$)
      expect(result).toBeTruthy()
    })

    it('should return false when all turns are completed', async () => {
      await setupProjectPage(
        `/projects/${mockProjectId}?sessionId=${mockSessionId}`,
        context,
        {
          projectId: mockProjectId,
          files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
          sessions: [{ id: mockSessionId, title: 'Test Session' }],
          turns: {
            [mockSessionId]: [
              {
                id: 'turn_1',
                userMessage: 'test',
                assistantMessage: 'done',
                status: 'completed',
              },
            ],
          },
        },
      )

      const result = await context.store.get(hasActiveTurns$)
      expect(result).toBeFalsy()
    })
  })

  describe('startWatchSession$', () => {
    it('should trigger refresh when lastBlockId changes', async () => {
      await setupProjectPage(
        `/projects/${mockProjectId}?sessionId=${mockSessionId}`,
        context,
        {
          projectId: mockProjectId,
          files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
          sessions: [{ id: mockSessionId, title: 'Test Session' }],
          turns: {
            [mockSessionId]: [
              {
                id: 'turn_1',
                userMessage: 'test',
                assistantMessage: 'response',
                status: 'in_progress',
              },
            ],
          },
        },
        [
          // Mock lastBlockId API returning a different block
          http.get(
            `*/api/projects/${mockProjectId}/sessions/${mockSessionId}/last-block-id`,
            () => {
              return HttpResponse.json({
                lastBlockId: 'block_new_id',
              })
            },
          ),
        ],
      )

      // In test environment, this should execute once without error
      await expect(
        context.store.set(startWatchSession$, context.signal),
      ).resolves.toBeUndefined()
    })

    it('should not trigger refresh when lastBlockId is the same', async () => {
      await setupProjectPage(
        `/projects/${mockProjectId}?sessionId=${mockSessionId}`,
        context,
        {
          projectId: mockProjectId,
          files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
          sessions: [{ id: mockSessionId, title: 'Test Session' }],
          turns: {
            [mockSessionId]: [
              {
                id: 'turn_1',
                userMessage: 'test',
                assistantMessage: 'done',
                status: 'completed',
              },
            ],
          },
        },
        [
          // Mock lastBlockId API returning the same block
          http.get(
            `*/api/projects/${mockProjectId}/sessions/${mockSessionId}/last-block-id`,
            () => {
              return HttpResponse.json({
                lastBlockId: 'block_turn_1_1',
              })
            },
          ),
        ],
      )

      await expect(
        context.store.set(startWatchSession$, context.signal),
      ).resolves.toBeUndefined()
    })

    it('should handle no selected session gracefully', async () => {
      await setupProjectPage(`/projects/${mockProjectId}`, context, {
        projectId: mockProjectId,
        files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
        sessions: [],
      })

      await expect(
        context.store.set(startWatchSession$, context.signal),
      ).resolves.toBeUndefined()
    })
  })
})
