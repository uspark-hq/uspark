import { screen, waitFor } from '@testing-library/react'
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

  it('renders CodeMirror editor for markdown files', async () => {
    // Wait for file tree to load
    await expect(screen.findByText('Explorer')).resolves.toBeInTheDocument()

    // Verify CodeMirror editor is rendered by checking for its root element
    await waitFor(() => {
      const editorElement = document.querySelector('.cm-editor')
      expect(editorElement).toBeInTheDocument()
    })
  })

  it('displays markdown content in CodeMirror editor', async () => {
    // Wait for file to load
    await expect(screen.findByText('Explorer')).resolves.toBeInTheDocument()

    // CodeMirror renders content in .cm-content
    const editorElement = document.querySelector('.cm-editor')
    expect(editorElement).toBeInTheDocument()

    // Verify the content is in the editor
    const contentElement = document.querySelector('.cm-content')
    expect(contentElement).toBeInTheDocument()
    expect(contentElement?.textContent).toContain('Test Markdown')
  })
})
