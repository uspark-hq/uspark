import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPage, testContext } from '../../../signals/__tests__/context'

const context = testContext()

describe('homePage', () => {
  beforeEach(async () => {
    await setupPage('/workspace', context)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders homepage basic UI structure', async () => {
    await expect(
      screen.findByText('Workspace Page'),
    ).resolves.toBeInTheDocument()
  })
})
