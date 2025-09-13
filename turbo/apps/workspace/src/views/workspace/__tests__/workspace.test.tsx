import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPage, testContext } from '../../../signals/__tests__/context'

const context = testContext()

describe('homePage', () => {
  beforeEach(async () => {
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
