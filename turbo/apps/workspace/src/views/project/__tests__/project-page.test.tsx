import { screen, waitFor, within } from '@testing-library/react'
import user from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '../../../mocks/node'
import { testContext } from '../../../signals/__tests__/context'
import { setupMock } from '../../../signals/test-utils'
import { setupProjectPage } from '../test-helpers'

// Setup Clerk mock
setupMock()

const context = testContext()

// Removed 'projectPage - file content display' test because files no longer auto-display.
// File selection functionality is tested in 'projectPage - file selection' below.

describe('projectPage - file selection', () => {
  const projectId = 'test-project-456'
  const readmeContent = '# README\n\nMain documentation'
  const guideContent = '# Guide\n\nUser guide content'

  beforeEach(async () => {
    await setupProjectPage(`/projects/${projectId}`, context, {
      projectId,
      files: [
        {
          path: 'README.md',
          hash: 'readme-hash',
          content: readmeContent,
        },
        {
          path: 'docs/guide.md',
          hash: 'guide-hash',
          content: guideContent,
          size: 200,
        },
      ],
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('selects file on click and displays its content', async () => {
    const userEvent = user.setup()

    // Open file tree popover
    const explorerButton = await screen.findByLabelText('Open file explorer')
    await userEvent.click(explorerButton)

    // Click on README.md
    const readmeFile = await screen.findByText('README.md')
    await userEvent.click(readmeFile)

    // Verify README content is displayed in preview mode (using <pre> tag)
    await waitFor(() => {
      const previewContent = screen.getByText(/Main documentation/i)
      expect(previewContent).toBeInTheDocument()
    })

    // Open file tree again to select another file
    await userEvent.click(explorerButton)

    // Click on guide.md (get all matches and take the last one which is the file, not directory)
    const guideFiles = screen.getAllByText('guide.md')
    const guideFile = guideFiles[guideFiles.length - 1]
    await userEvent.click(guideFile)

    // Verify guide content is displayed in preview mode
    await waitFor(() => {
      const previewContent = screen.getByText(/User guide content/i)
      expect(previewContent).toBeInTheDocument()
    })
  })
})

describe('projectPage - chat input', () => {
  const projectId = 'test-project-789'
  const sessionId = 'test-session-123'

  beforeEach(async () => {
    await setupProjectPage(
      `/projects/${projectId}?sessionId=${sessionId}`,
      context,
      {
        projectId,
        files: [
          {
            path: 'README.md',
            hash: 'readme-hash',
            content: '# README',
          },
        ],
        sessions: [
          {
            id: sessionId,
            title: 'Test Session',
          },
        ],
        turns: {},
      },
      [
        http.post(
          `*/api/projects/${projectId}/sessions/${sessionId}/turns`,
          () => {
            return HttpResponse.json({
              id: 'turn-123',
              userMessage: 'Hello',
              createdAt: new Date().toISOString(),
            })
          },
        ),
      ],
    )
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('enables send button when input has text', async () => {
    const userEvent = user.setup()

    // Wait for page to load
    await expect(
      screen.findByLabelText('Open file explorer'),
    ).resolves.toBeInTheDocument()

    // Find textarea and send button
    const textarea = screen.getByPlaceholderText(/Type a message/)
    const sendButton = screen.getByRole('button', { name: /Send/ })

    // Initially button should be disabled
    expect(sendButton).toBeDisabled()

    // Type in textarea
    await userEvent.type(textarea, 'Hello')

    // Button should be enabled
    expect(sendButton).toBeEnabled()
  })

  it('sends message and clears input on submit', async () => {
    const userEvent = user.setup()

    // Wait for page to load
    await expect(
      screen.findByLabelText('Open file explorer'),
    ).resolves.toBeInTheDocument()

    // Find textarea and send button
    const textarea = screen.getByPlaceholderText(/Type a message/)
    const sendButton = screen.getByRole('button', { name: /Send/ })

    // Type and send message
    await userEvent.type(textarea, 'Hello')
    await userEvent.click(sendButton)

    // Input should be cleared
    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  it('sends message on Enter key', async () => {
    const userEvent = user.setup()

    // Wait for page to load
    await expect(
      screen.findByLabelText('Open file explorer'),
    ).resolves.toBeInTheDocument()

    // Find textarea
    const textarea = screen.getByPlaceholderText(/Type a message/)

    // Type and press Enter
    await userEvent.type(textarea, 'Hello{Enter}')

    // Input should be cleared
    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  it('does not send message on Shift+Enter', async () => {
    const userEvent = user.setup()

    // Wait for page to load
    await expect(
      screen.findByLabelText('Open file explorer'),
    ).resolves.toBeInTheDocument()

    // Find textarea
    const textarea = screen.getByPlaceholderText(/Type a message/)

    // Type and press Shift+Enter
    await userEvent.type(textarea, 'Hello{Shift>}{Enter}{/Shift}')

    // Input should NOT be cleared (newline added instead)
    await waitFor(() => {
      expect(textarea).toHaveValue('Hello\n')
    })
  })
})

describe('projectPage - session selector', () => {
  const projectId = 'test-project-abc'
  const session1Id = 'session-111'
  const session2Id = 'session-222'

  beforeEach(async () => {
    await setupProjectPage(
      `/projects/${projectId}?sessionId=${session1Id}`,
      context,
      {
        projectId,
        files: [
          {
            path: 'README.md',
            hash: 'readme-hash',
            content: '# README',
          },
        ],
        sessions: [
          {
            id: session1Id,
            title: 'First Session',
          },
          {
            id: session2Id,
            title: '',
          },
        ],
        turns: {
          [session1Id]: [
            {
              id: 'turn-1',
              userMessage: 'First message',
              assistantMessage: 'First response',
            },
          ],
          [session2Id]: [
            {
              id: 'turn-2',
              userMessage: 'Second message',
              assistantMessage: 'Second response',
            },
          ],
        },
      },
    )
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('displays session selector with multiple sessions', async () => {
    // Wait for page to load
    await expect(
      screen.findByLabelText('Open file explorer'),
    ).resolves.toBeInTheDocument()

    // Find session selector
    const sessionSelector = screen.getByRole('combobox')
    expect(sessionSelector).toBeInTheDocument()

    // Verify session titles appear in the selector (use within to scope to select element)
    expect(
      within(sessionSelector).getByText('First Session'),
    ).toBeInTheDocument()
  })

  it('switches session when selecting from dropdown', async () => {
    const userEvent = user.setup()

    // Wait for page to load
    await expect(
      screen.findByLabelText('Open file explorer'),
    ).resolves.toBeInTheDocument()

    // Wait for first session content to load
    await expect(
      screen.findByText('First message'),
    ).resolves.toBeInTheDocument()
    expect(screen.getByText('First response')).toBeInTheDocument()

    // Select second session from dropdown
    const sessionSelector = screen.getByRole('combobox')
    await userEvent.selectOptions(sessionSelector, session2Id)

    // Wait for second session content to load
    await waitFor(() => {
      expect(screen.queryByText('First message')).not.toBeInTheDocument()
    })

    await expect(
      screen.findByText('Second message'),
    ).resolves.toBeInTheDocument()
    expect(screen.getByText('Second response')).toBeInTheDocument()
  })
})

describe('projectPage - no sessions', () => {
  const projectId = 'test-project-no-sessions'

  beforeEach(async () => {
    await setupProjectPage(`/projects/${projectId}`, context, {
      projectId,
      files: [
        {
          path: 'README.md',
          hash: 'readme-hash',
          content: '# README',
        },
      ],
      sessions: [],
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('does not show selector when no sessions exist', async () => {
    // Wait for page to load
    await expect(
      screen.findByLabelText('Open file explorer'),
    ).resolves.toBeInTheDocument()

    // Session selector should not exist
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

    // Should show "no sessions" message
    expect(screen.getByText(/No sessions yet/)).toBeInTheDocument()
  })
})

describe('projectPage - auto-create session', () => {
  const projectId = 'test-project-def'
  const newSessionId = 'new-session-123'

  beforeEach(async () => {
    // Track session creation state
    let sessionCreated = false

    await setupProjectPage(
      `/projects/${projectId}`,
      context,
      {
        projectId,
        files: [
          {
            path: 'README.md',
            hash: 'readme-hash',
            content: '# README',
          },
        ],
        sessions: [],
      },
      [
        // Dynamic session list based on creation state
        http.get(`*/api/projects/${projectId}/sessions`, () => {
          return HttpResponse.json({
            sessions: sessionCreated
              ? [
                  {
                    id: newSessionId,
                    title: '',
                    createdAt: new Date().toISOString(),
                  },
                ]
              : [],
            total: sessionCreated ? 1 : 0,
          })
        }),
        http.post(`*/api/projects/${projectId}/sessions`, () => {
          sessionCreated = true
          return HttpResponse.json({
            id: newSessionId,
            title: '',
            createdAt: new Date().toISOString(),
          })
        }),
        http.get(
          `*/api/projects/${projectId}/sessions/${newSessionId}/turns`,
          () => {
            return HttpResponse.json({ turns: [] })
          },
        ),
        http.post(
          `*/api/projects/${projectId}/sessions/${newSessionId}/turns`,
          () => {
            return HttpResponse.json({
              id: 'turn-123',
              userMessage: 'Hello',
              createdAt: new Date().toISOString(),
            })
          },
        ),
      ],
    )
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('creates session automatically when sending first message', async () => {
    const userEvent = user.setup()

    // Wait for page to load
    await expect(
      screen.findByLabelText('Open file explorer'),
    ).resolves.toBeInTheDocument()

    // Should show "no sessions" message initially
    expect(screen.getByText(/No sessions yet/)).toBeInTheDocument()

    // Type and send message
    const textarea = screen.getByPlaceholderText(/Type a message/)
    await userEvent.type(textarea, 'Hello')
    await userEvent.click(screen.getByRole('button', { name: /Send/ }))

    // Should no longer show "no sessions" message
    await waitFor(() => {
      expect(screen.queryByText(/No sessions yet/)).not.toBeInTheDocument()
    })

    // Input should be cleared
    expect(textarea).toHaveValue('')

    // Session selector should appear
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('sends message to newly created session', async () => {
    const userEvent = user.setup()
    let sessionCreated = false
    let messageSent = false

    // Track API calls
    server.use(
      http.post(`*/api/projects/${projectId}/sessions`, () => {
        sessionCreated = true
        return HttpResponse.json({
          id: newSessionId,
          title: '',
          createdAt: new Date().toISOString(),
        })
      }),
      http.post(
        `*/api/projects/${projectId}/sessions/${newSessionId}/turns`,
        () => {
          messageSent = true
          return HttpResponse.json({
            id: 'turn-123',
            userMessage: 'Hello',
            createdAt: new Date().toISOString(),
          })
        },
      ),
    )

    // Wait for page to load
    await expect(
      screen.findByLabelText('Open file explorer'),
    ).resolves.toBeInTheDocument()

    // Send message
    const textarea = screen.getByPlaceholderText(/Type a message/)
    await userEvent.type(textarea, 'Hello')
    await userEvent.click(screen.getByRole('button', { name: /Send/ }))

    // Wait for both API calls to complete
    await waitFor(() => {
      expect(sessionCreated && messageSent).toBeTruthy()
    })
  })
})

describe('projectPage - turn and blocks rendering', () => {
  const projectId = 'test-project-blocks'
  const sessionId = 'session-blocks-123'
  const turnId = 'turn-blocks-456'

  beforeEach(async () => {
    await setupProjectPage(
      `/projects/${projectId}?sessionId=${sessionId}`,
      context,
      {
        projectId,
        files: [
          {
            path: 'README.md',
            hash: 'readme-hash',
            content: '# README',
          },
        ],
        sessions: [
          {
            id: sessionId,
            title: 'Test Session',
          },
        ],
        turns: {},
      },
      [
        // Mock turn detail with blocks
        http.get(
          `*/api/projects/${projectId}/sessions/${sessionId}/turns/${turnId}`,
          () => {
            return HttpResponse.json({
              id: turnId,
              session_id: sessionId,
              user_prompt: 'Show me the files',
              status: 'completed',
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              blocks: [
                {
                  id: 'block-1',
                  turnId: turnId,
                  type: 'thinking',
                  content: { text: 'Let me check the files...' },
                  createdAt: new Date().toISOString(),
                },
                {
                  id: 'block-2',
                  turnId: turnId,
                  type: 'content',
                  content: { text: 'Here are the files in your project' },
                  createdAt: new Date().toISOString(),
                },
                {
                  id: 'block-3',
                  turnId: turnId,
                  type: 'tool_use',
                  content: {
                    tool_name: 'list_files',
                    parameters: { directory: '.' },
                    tool_use_id: 'tool-use-123',
                  },
                  createdAt: new Date().toISOString(),
                },
                {
                  id: 'block-4',
                  turnId: turnId,
                  type: 'tool_result',
                  content: {
                    tool_use_id: 'tool-use-123',
                    result: 'README.md\npackage.json',
                    error: null,
                  },
                  createdAt: new Date().toISOString(),
                },
              ],
            })
          },
        ),
        // Mock turn list
        http.get(
          `*/api/projects/${projectId}/sessions/${sessionId}/turns`,
          () => {
            return HttpResponse.json({
              turns: [
                {
                  id: turnId,
                  user_prompt: 'Show me the files',
                  status: 'completed',
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  block_count: 4,
                  block_ids: ['block-1', 'block-2', 'block-3', 'block-4'],
                },
              ],
              total: 1,
            })
          },
        ),
      ],
    )
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('fetches and displays turn with all block types', async () => {
    // Wait for turn to load - verifies turns$ signal fetches turnDetail
    await expect(
      screen.findByText('Show me the files'),
    ).resolves.toBeInTheDocument()

    // Verify all block types are rendered
    // This tests that turns$ correctly calls turnDetail and includes blocks
    await expect(
      screen.findByText('Let me check the files...'),
    ).resolves.toBeInTheDocument()
    await expect(
      screen.findByText('Here are the files in your project'),
    ).resolves.toBeInTheDocument()
    await expect(
      screen.findByText((content) => {
        return content.includes('README.md') && content.includes('package.json')
      }),
    ).resolves.toBeInTheDocument()
  })
})

describe('projectPage - turn status display', () => {
  const projectId = 'test-project-status'
  const sessionId = 'session-status-123'

  afterEach(() => {
    server.resetHandlers()
  })

  it('handles turn with running status', async () => {
    await setupProjectPage(
      `/projects/${projectId}?sessionId=${sessionId}`,
      context,
      {
        projectId,
        files: [{ path: 'test.md', hash: 'hash', content: 'test' }],
        sessions: [{ id: sessionId, title: 'Test' }],
        turns: {},
      },
      [
        http.get(
          `*/api/projects/${projectId}/sessions/${sessionId}/turns/turn-running`,
          () => {
            return HttpResponse.json({
              id: 'turn-running',
              session_id: sessionId,
              user_prompt: 'Test running status',
              status: 'running',
              started_at: new Date().toISOString(),
              completed_at: null,
              created_at: new Date().toISOString(),
              blocks: [],
            })
          },
        ),
        http.get(
          `*/api/projects/${projectId}/sessions/${sessionId}/turns`,
          () => {
            return HttpResponse.json({
              turns: [
                {
                  id: 'turn-running',
                  user_prompt: 'Test running status',
                  status: 'running',
                  started_at: new Date().toISOString(),
                  completed_at: null,
                  created_at: new Date().toISOString(),
                  block_count: 0,
                  block_ids: [],
                },
              ],
              total: 1,
            })
          },
        ),
      ],
    )

    // Verify running status shows processing indicator
    await expect(screen.findByText('Test running status')).resolves.toBeInTheDocument()
    await expect(screen.findByText('Processing...')).resolves.toBeInTheDocument()
  })

  it('handles turn with failed status', async () => {
    await setupProjectPage(
      `/projects/${projectId}?sessionId=${sessionId}`,
      context,
      {
        projectId,
        files: [{ path: 'test.md', hash: 'hash', content: 'test' }],
        sessions: [{ id: sessionId, title: 'Test' }],
        turns: {},
      },
      [
        http.get(
          `*/api/projects/${projectId}/sessions/${sessionId}/turns/turn-failed`,
          () => {
            return HttpResponse.json({
              id: 'turn-failed',
              session_id: sessionId,
              user_prompt: 'Failed message',
              status: 'failed',
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              blocks: [],
            })
          },
        ),
        http.get(
          `*/api/projects/${projectId}/sessions/${sessionId}/turns`,
          () => {
            return HttpResponse.json({
              turns: [
                {
                  id: 'turn-failed',
                  user_prompt: 'Failed message',
                  status: 'failed',
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  block_count: 0,
                  block_ids: [],
                },
              ],
              total: 1,
            })
          },
        ),
      ],
    )

    // Verify failed status shows error message
    await expect(
      screen.findByText('Failed message'),
    ).resolves.toBeInTheDocument()
    await expect(
      screen.findByText('Turn execution failed. Please try again.'),
    ).resolves.toBeInTheDocument()
  })
})
