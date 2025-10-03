import { screen, waitFor } from '@testing-library/react'
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

describe('projectPage - file content display', () => {
  const projectId = 'test-project-123'
  const fileContent = '# Test README\n\nThis is a test document'

  beforeEach(async () => {
    await setupProjectPage(`/projects/${projectId}`, context, {
      projectId,
      files: [
        {
          path: 'README.md',
          hash: 'readme-hash-123',
          content: fileContent,
        },
      ],
    })
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

    // Wait for files to load
    await expect(screen.findByText('📄 README.md')).resolves.toBeInTheDocument()

    // Click on README.md
    const readmeFile = screen.getByText('📄 README.md')
    await userEvent.click(readmeFile)

    // Verify README content is displayed
    await expect(
      screen.findByText(/Main documentation/),
    ).resolves.toBeInTheDocument()

    // Verify README.md is selected (has blue background)
    await waitFor(() => {
      const readmeDiv = readmeFile.closest('div')
      expect(readmeDiv).toHaveClass('bg-blue-100')
    })

    // Click on guide.md (get all matches and take the last one which is the file, not directory)
    const guideFiles = screen.getAllByText('📄 guide.md')
    const guideFile = guideFiles[guideFiles.length - 1]
    await userEvent.click(guideFile)

    // Verify guide content is displayed
    await expect(
      screen.findByText(/User guide content/),
    ).resolves.toBeInTheDocument()

    // Verify guide.md is selected
    await waitFor(() => {
      const guideDiv = guideFile.closest('div')
      expect(guideDiv).toHaveClass('bg-blue-100')
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
    await expect(screen.findByText('📄 README.md')).resolves.toBeInTheDocument()

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
    await expect(screen.findByText('📄 README.md')).resolves.toBeInTheDocument()

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
    await expect(screen.findByText('📄 README.md')).resolves.toBeInTheDocument()

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
    await expect(screen.findByText('📄 README.md')).resolves.toBeInTheDocument()

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
    await expect(screen.findByText('📄 README.md')).resolves.toBeInTheDocument()

    // Find session selector
    const sessionSelector = screen.getByRole('combobox')
    expect(sessionSelector).toBeInTheDocument()

    // Check option elements exist within select
    const options = sessionSelector.querySelectorAll('option')
    const optionTexts = Array.from(options).map((opt) => opt.textContent)

    expect(optionTexts).toContain('First Session')
    // Second session has empty title, so it shows as empty string (not "Untitled Session" since '' is truthy for ?? operator)
    expect(options).toHaveLength(3) // Select session + 2 sessions
  })

  it('switches session when selecting from dropdown', async () => {
    const userEvent = user.setup()

    // Wait for page to load
    await expect(screen.findByText('📄 README.md')).resolves.toBeInTheDocument()

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
    await expect(screen.findByText('📄 README.md')).resolves.toBeInTheDocument()

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
    await expect(screen.findByText('📄 README.md')).resolves.toBeInTheDocument()

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
    await expect(screen.findByText('📄 README.md')).resolves.toBeInTheDocument()

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
