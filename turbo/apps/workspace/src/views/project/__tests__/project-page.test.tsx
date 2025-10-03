import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { server } from '../../../mocks/node'
import { setupPage, testContext } from '../../../signals/__tests__/context'
import { clerk$ } from '../../../signals/auth'
import { getMockClerk, setupMock } from '../../../signals/test-utils'

// Setup Clerk mock
setupMock()

const context = testContext()

describe('projectPage', () => {
  beforeEach(async () => {
    // Set up a logged-in user BEFORE initializing clerk
    const mockClerk = getMockClerk()
    if (!mockClerk) {
      // Initialize clerk first to create the mock instance
      await context.store.get(clerk$)
      const newMockClerk = getMockClerk()
      if (newMockClerk) {
        newMockClerk.setUser({
          id: 'test-user-123',
          emailAddresses: [
            {
              emailAddress: 'test@example.com',
            },
          ],
          fullName: 'Test User',
        })
        newMockClerk.setSession({
          getToken: () => Promise.resolve('test-token').catch(() => null),
        })
      }
    }

    // For now, mock fetch to fail since we can't easily create valid YJS data in tests
    // This will cause the project page to show an error, which we'll test for
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Test error')))

    await setupPage('/projects/1a2b3c4d', context)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders project page with error when fetch fails', async () => {
    // Since we're mocking fetch to fail, the page should show an error
    const errorMessage = await screen.findByText('Error loading files')
    expect(errorMessage).toBeInTheDocument()
  })
})

describe('projectPage - file content display', () => {
  const projectId = 'test-project-123'
  const fileContent = '# Test README\n\nThis is a test document'

  beforeEach(async () => {
    // Restore fetch from previous test's stubGlobal
    vi.unstubAllGlobals()

    // Always reinitialize clerk for clean state
    await context.store.get(clerk$)
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

    // Create YJS document with a test file
    const ydoc = new Y.Doc()
    const filesMap = ydoc.getMap('files')
    const blobsMap = ydoc.getMap('blobs')

    filesMap.set('README.md', { hash: 'readme-hash-123', mtime: Date.now() })
    blobsMap.set('readme-hash-123', { size: 100 })

    const yjsData = Y.encodeStateAsUpdate(ydoc)

    // Mock all required APIs
    server.use(
      http.get('*/api/blob-store', () => {
        return HttpResponse.json({ storeId: 'test-store' })
      }),
      http.get(`*/api/projects/${projectId}`, () => {
        return HttpResponse.arrayBuffer(yjsData.buffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        })
      }),
      http.get(
        `https://test-store.public.blob.vercel-storage.com/projects/${projectId}/readme-hash-123`,
        () => {
          return new HttpResponse(fileContent)
        },
      ),
      http.get(`*/api/projects/${projectId}/sessions`, () => {
        return HttpResponse.json({ sessions: [], total: 0 })
      }),
    )

    await setupPage(`/projects/${projectId}`, context)
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('displays file content when file is loaded', async () => {
    // Wait for file tree to load
    await expect(
      screen.findByText('📄 README.md', {}, { timeout: 5000 }),
    ).resolves.toBeInTheDocument()

    // Verify file content is displayed
    const content = await screen.findByText(/Test README/)
    expect(content).toBeInTheDocument()
    expect(screen.getByText(/This is a test document/)).toBeInTheDocument()
  })
})
