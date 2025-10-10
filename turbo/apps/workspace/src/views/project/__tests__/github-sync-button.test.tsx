/**
 * Tests for GitHub sync button component
 */

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

describe('github sync button - no repository', () => {
  const projectId = 'test-project-123'

  beforeEach(async () => {
    // Mock GitHub API responses - no repository linked
    server.use(
      http.get(`*/api/projects/${projectId}/github/repository`, () => {
        return new HttpResponse(null, { status: 404 })
      }),
      http.get('*/api/github/installations', () => {
        return HttpResponse.json({
          installations: [
            {
              id: 'inst-1',
              installationId: 12_345,
              accountName: 'test-account',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })
      }),
    )

    await setupProjectPage(`/projects/${projectId}`, context, {
      projectId,
      files: [
        {
          path: 'README.md',
          hash: 'readme-hash',
          content: '# README',
        },
      ],
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('displays account selector when no repository exists', async () => {
    // Wait for page to load - check for Explorer header
    await expect(screen.findByText('Explorer')).resolves.toBeInTheDocument()

    // Should show account selector
    const selector = await screen.findByRole('combobox')
    expect(selector).toBeInTheDocument()

    // Should show create button
    const createButton = screen.getByRole('button', {
      name: /Create & Sync Repository/,
    })
    expect(createButton).toBeInTheDocument()
    expect(createButton).toBeDisabled() // Disabled until account selected
  })

  it('enables create button when account is selected', async () => {
    const userEvent = user.setup()

    await expect(screen.findByText('Explorer')).resolves.toBeInTheDocument()

    const selector = await screen.findByRole('combobox')
    const createButton = screen.getByRole('button', {
      name: /Create & Sync Repository/,
    })

    // Select account
    await userEvent.selectOptions(selector, '12345')

    // Button should be enabled
    await waitFor(() => {
      expect(createButton).toBeEnabled()
    })
  })
})

describe('github sync button - with repository', () => {
  const projectId = 'test-project-456'

  beforeEach(async () => {
    // Mock GitHub API responses - repository already linked
    server.use(
      http.get(`*/api/projects/${projectId}/github/repository`, () => {
        return HttpResponse.json({
          repository: {
            fullName: 'test-user/test-repo',
            accountName: 'test-user',
            repoName: 'test-repo',
          },
        })
      }),
    )

    await setupProjectPage(`/projects/${projectId}`, context, {
      projectId,
      files: [
        {
          path: 'README.md',
          hash: 'readme-hash',
          content: '# README',
        },
      ],
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('displays repository info and sync button', async () => {
    await expect(screen.findByText('Explorer')).resolves.toBeInTheDocument()

    // Should show repository name
    await expect(
      screen.findByText('test-user/test-repo'),
    ).resolves.toBeInTheDocument()

    // Should show sync button
    const syncButton = screen.getByRole('button', { name: /Sync to GitHub/ })
    expect(syncButton).toBeInTheDocument()
    expect(syncButton).toBeEnabled()
  })

  it('does not show account selector when repository exists', async () => {
    await expect(screen.findByText('Explorer')).resolves.toBeInTheDocument()

    // Wait for GitHub data to load
    await expect(
      screen.findByText('test-user/test-repo'),
    ).resolves.toBeInTheDocument()

    // Should NOT show account selector
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})

describe('github sync button - repository is null', () => {
  const projectId = 'test-project-null'

  beforeEach(async () => {
    // Mock API returning { repository: null } instead of 404
    // This is the edge case that caused the production bug
    server.use(
      http.get(`*/api/projects/${projectId}/github/repository`, () => {
        return HttpResponse.json({
          repository: null,
        })
      }),
      http.get('*/api/github/installations', () => {
        return HttpResponse.json({
          installations: [
            {
              id: 'inst-1',
              installationId: 99_999,
              accountName: 'test-org',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })
      }),
    )

    await setupProjectPage(`/projects/${projectId}`, context, {
      projectId,
      files: [
        {
          path: 'README.md',
          hash: 'readme-hash',
          content: '# README',
        },
      ],
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('treats null repository same as no repository', async () => {
    await expect(screen.findByText('Explorer')).resolves.toBeInTheDocument()

    // Should show account selector (same as when no repository exists)
    const selector = await screen.findByRole('combobox')
    expect(selector).toBeInTheDocument()

    // Should show create button
    const createButton = screen.getByRole('button', {
      name: /Create & Sync Repository/,
    })
    expect(createButton).toBeInTheDocument()
  })
})

describe('github sync button - no installations', () => {
  const projectId = 'test-project-789'

  beforeEach(async () => {
    // Mock GitHub API responses - no installations
    server.use(
      http.get(`*/api/projects/${projectId}/github/repository`, () => {
        return new HttpResponse(null, { status: 404 })
      }),
      http.get('*/api/github/installations', () => {
        return HttpResponse.json({
          installations: [],
        })
      }),
    )

    await setupProjectPage(`/projects/${projectId}`, context, {
      projectId,
      files: [
        {
          path: 'README.md',
          hash: 'readme-hash',
          content: '# README',
        },
      ],
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('shows message to connect GitHub account', async () => {
    await expect(screen.findByText('Explorer')).resolves.toBeInTheDocument()

    // Should show message about connecting account
    await expect(
      screen.findByText(/Please connect your GitHub account in Settings/),
    ).resolves.toBeInTheDocument()

    // Should NOT show selector or create button
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Create & Sync/ }),
    ).not.toBeInTheDocument()
  })
})
