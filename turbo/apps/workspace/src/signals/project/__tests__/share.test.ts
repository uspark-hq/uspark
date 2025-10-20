import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testContext } from '../../__tests__/context'
import { server } from '../../../mocks/node'
import { setupProjectPage } from '../../../views/project/test-helpers'
import { setupMock } from '../../test-utils'
import {
  closeSharePopover$,
  generateShareLink$,
  isSharePopoverOpenValue$,
  shareUrlValue$,
} from '../share'

// Setup Clerk mock
setupMock()

const context = testContext()

describe('share', () => {
  const projectId = 'test-project-share-123'
  const testContent = '# Test\n\nTest content for sharing'

  beforeEach(async () => {
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

  describe('generateShareLink$', () => {
    it('should generate share link and open popover', async () => {
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

      // Execute the generate share link command
      await context.store.set(generateShareLink$, context.signal)

      // Verify share URL was set
      const shareUrl = context.store.get(shareUrlValue$)
      expect(shareUrl).toBe(mockShareResponse.url)

      // Verify popover is open
      const isOpen = context.store.get(isSharePopoverOpenValue$)
      expect(isOpen).toBeTruthy()
    })

    it('should not generate link when no file is selected', async () => {
      // Create a fresh context without any files
      const emptyContext = testContext()
      await setupProjectPage(`/projects/${projectId}`, emptyContext, {
        projectId,
        files: [],
      })

      // Execute the generate share link command
      await emptyContext.store.set(generateShareLink$, emptyContext.signal)

      // Verify share URL was not set
      const shareUrl = emptyContext.store.get(shareUrlValue$)
      expect(shareUrl).toBeNull()

      // Verify popover is not open
      const isOpen = emptyContext.store.get(isSharePopoverOpenValue$)
      expect(isOpen).toBeFalsy()
    })
  })

  describe('closeSharePopover$', () => {
    it('should close the share popover', async () => {
      // First open the popover by generating a link
      const mockShareResponse = {
        id: 'share-123',
        url: 'https://example.com/share/token123',
        token: 'token123',
      }

      server.use(
        http.post('*/api/share', () => {
          return HttpResponse.json(mockShareResponse)
        }),
      )

      await context.store.set(generateShareLink$, context.signal)

      // Verify popover is open
      let isOpen = context.store.get(isSharePopoverOpenValue$)
      expect(isOpen).toBeTruthy()

      // Close the popover
      context.store.set(closeSharePopover$)

      // Verify popover is closed
      isOpen = context.store.get(isSharePopoverOpenValue$)
      expect(isOpen).toBeFalsy()
    })
  })
})
