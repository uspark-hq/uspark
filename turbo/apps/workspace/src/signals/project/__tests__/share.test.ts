import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testContext } from '../../__tests__/context'
import { server } from '../../../mocks/node'
import { setupProjectPage } from '../../../views/project/test-helpers'
import { setupMock } from '../../test-utils'
import { shareCurrentFile$ } from '../share'

// Mock sonner at the top level
vi.mock<typeof import('sonner')>('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}))

// Setup Clerk mock
setupMock()

const context = testContext()

describe('share', () => {
  const projectId = 'test-project-share-123'
  const testContent = '# Test\n\nTest content for sharing'

  beforeEach(async () => {
    // Mock clipboard API
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })

    // Setup project page with file
    await setupProjectPage(`/projects/${projectId}?file=test.md`, context, {
      projectId,
      files: [
        {
          path: 'test.md',
          hash: 'test-hash',
          content: testContent,
        },
      ],
    })
  })

  afterEach(() => {
    server.resetHandlers()
    vi.unstubAllGlobals()
  })

  describe('shareCurrentFile$', () => {
    it('should create share link and copy to clipboard', async () => {
      const mockShareResponse = {
        id: 'share-123',
        url: 'https://example.com/share/token123',
        token: 'token123',
      }

      // Mock the share API endpoint
      server.use(
        http.post('*/api/share', () => {
          return HttpResponse.json(mockShareResponse)
        }),
      )

      // Execute the share command
      await context.store.set(shareCurrentFile$, context.signal)

      // Verify clipboard was called with the share URL
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        mockShareResponse.url,
      )
    })
  })
})
