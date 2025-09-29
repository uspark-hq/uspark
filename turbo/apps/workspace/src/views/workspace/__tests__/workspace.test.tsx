import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPage, testContext } from '../../../signals/__tests__/context'
import { getMockClerk, setupMock } from '../../../signals/test-utils'
import { clerk$ } from '../../../signals/auth'

// Setup Clerk mock
setupMock()

const context = testContext()

describe('homePage', () => {
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

    await setupPage('/', context)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders homepage basic UI structure', async () => {
    // Should show the Workspace heading
    await expect(
      screen.findByRole('heading', { name: 'Workspace' }),
    ).resolves.toBeInTheDocument()

    // Should show workspace content placeholder
    expect(
      screen.getByText('Your workspace content will appear here.'),
    ).toBeInTheDocument()
  })
})
