import { screen, waitFor } from '@testing-library/react'
import user from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../../mocks/node'
import { testContext } from '../../../signals/__tests__/context'
import { setupMock } from '../../../signals/test-utils'
import { setupProjectPage } from '../test-helpers'

// Setup Clerk mock
setupMock()

const context = testContext()

describe('markdown editor - codemirror integration', () => {
  const projectId = 'test-project-md'
  const markdownContent = '# Test Markdown\n\n## Section\n\nContent here'

  beforeEach(async () => {
    vi.clearAllMocks()

    await setupProjectPage(`/projects/${projectId}`, context, {
      projectId,
      files: [
        {
          path: 'README.md',
          hash: 'md-hash-123',
          content: markdownContent,
        },
      ],
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('renders and displays markdown content in CodeMirror editor after clicking file', async () => {
    const userEvent = user.setup()

    // Wait for page to load by checking for the file tree button
    const explorerButton = await screen.findByLabelText('Open file explorer')
    expect(explorerButton).toBeInTheDocument()

    // Open file tree popover
    await userEvent.click(explorerButton)

    // Wait for file tree to appear and click on the markdown file
    const markdownFile = await screen.findByText('README.md')
    await userEvent.click(markdownFile)

    // File opens in Preview mode by default, switch to Edit mode
    const editButton = await screen.findByText('Edit')
    await userEvent.click(editButton)

    // Verify CodeMirror editor is rendered by checking for its root element
    await waitFor(() => {
      const editorElement = document.querySelector('.cm-editor')
      expect(editorElement).toBeInTheDocument()
    })

    // Verify the content is in the editor
    const contentElement = document.querySelector('.cm-content')
    expect(contentElement).toBeInTheDocument()
    expect(contentElement?.textContent).toContain('Test Markdown')
    expect(contentElement?.textContent).toContain('Section')
  })
})
