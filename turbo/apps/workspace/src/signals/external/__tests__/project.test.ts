/**
 * Tests for project external signals
 */

import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { testContext } from '../../__tests__/context'
import { server } from '../../../mocks/node'
import { createProject$ } from '../project'

const context = testContext()

describe('createProject$', () => {
  it('should create a project successfully', async () => {
    const { store, signal } = context

    const mockProject = {
      id: 'project-123',
      name: 'Test Project',
      created_at: '2024-01-01T00:00:00Z',
    }

    server.use(
      http.post('*/api/projects', async ({ request }) => {
        const body = (await request.json()) as { name: string }

        expect(body).toMatchObject({
          name: 'Test Project',
        })

        return HttpResponse.json(mockProject, { status: 201 })
      }),
    )

    // 执行 command
    const result = await store.set(
      createProject$,
      {
        name: 'Test Project',
      },
      signal,
    )

    // 验证结果
    expect(result).toStrictEqual(mockProject)
  })
})
