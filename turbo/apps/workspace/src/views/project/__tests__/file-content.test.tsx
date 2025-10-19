import { screen, waitFor } from '@testing-library/react'
import user from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '../../../mocks/node'
import { testContext } from '../../../signals/__tests__/context'
import { setupMock } from '../../../signals/test-utils'
import { setupProjectPage } from '../test-helpers'

// Setup Clerk mock
setupMock()

const context = testContext()

describe('fileContent - share button', () => {
  const projectId = 'test-project-share'
  const markdownContent = '# Test\n\nTest content'

  beforeEach(async () => {
    await setupProjectPage(`/projects/${projectId}`, context, {
      projectId,
      files: [
        {
          path: 'test.md',
          hash: 'test-hash',
          content: markdownContent,
        },
      ],
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('renders share button for markdown files', async () => {
    const userEvent = user.setup()

    // Open file tree popover
    const explorerButton = await screen.findByLabelText('Open file explorer')
    await userEvent.click(explorerButton)

    // Click on test.md to open it
    const testFile = await screen.findByText('test.md')
    await userEvent.click(testFile)

    // Wait for file content to load
    await waitFor(() => {
      expect(screen.getByText(/Test content/i)).toBeInTheDocument()
    })

    // Verify share button is present
    const shareButton = screen.getByTitle('Share file')
    expect(shareButton).toBeInTheDocument()
    expect(shareButton).toHaveTextContent('Share')
  })
})
