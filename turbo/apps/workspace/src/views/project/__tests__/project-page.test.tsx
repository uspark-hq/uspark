import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPage, testContext } from '../../../signals/__tests__/context'
import { getMockClerk, setupMock } from '../../../signals/test-utils'
import { clerk$ } from '../../../signals/auth'

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
          emailAddresses: [{
            emailAddress: 'test@example.com'
          }],
          fullName: 'Test User'
        })
        newMockClerk.setSession({
          getToken: () => Promise.resolve('test-token').catch(() => null)
        })
      }
    }

    // For now, mock fetch to fail since we can't easily create valid YJS data in tests
    // This will cause the project page to show an error, which we'll test for
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      new Error('Test error')
    ))

    await setupPage('/projects/1a2b3c4d', context)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders project page with error when fetch fails', async () => {
    // Since we're mocking fetch to fail, the page should show an error
    const errorMessage = await screen.findByText('Error loading project files')
    expect(errorMessage).toBeInTheDocument()
  })
})
