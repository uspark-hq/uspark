import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPage, testContext } from '../../../signals/__tests__/context'
import { pathname$ } from '../../../signals/route'

const context = testContext()
const user = userEvent.setup()

describe('projectPage', () => {
  beforeEach(async () => {
    await setupPage('/projects/1a2b3c4d', context)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders project page basic UI structure', async () => {
    const back = await screen.findByText('Go to Workspace')
    expect(back).toBeInTheDocument()
    await user.click(back)

    expect(context.store.get(pathname$)).toBe('/workspace')
  })
})
