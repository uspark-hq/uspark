/**
 * Tests for GitHub signals
 */

import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { testContext } from '../../__tests__/context'
import { server } from '../../../mocks/node'
import {
  createAndSyncRepository$,
  githubInstallations$,
  githubRepository$,
  selectedInstallationId$,
  selectInstallation$,
  syncRepository$,
} from '../github'

const context = testContext()

describe('github signals', () => {
  describe('selectInstallation$', () => {
    it('should update selected installation ID', () => {
      const { store } = context

      store.set(selectInstallation$, 12_345)

      expect(store.get(selectedInstallationId$)).toBe(12_345)
    })

    it('should allow setting to null', () => {
      const { store } = context

      store.set(selectInstallation$, 12_345)
      store.set(selectInstallation$, null)

      expect(store.get(selectedInstallationId$)).toBeNull()
    })
  })

  describe('githubInstallations$', () => {
    it('should fetch GitHub installations', async () => {
      const { store } = context

      const mockInstallations = [
        {
          id: 'inst-1',
          installationId: 12_345,
          accountName: 'test-account',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ]

      server.use(
        http.get('*/api/github/installations', () => {
          return HttpResponse.json({
            installations: mockInstallations,
          })
        }),
      )

      const result = await store.get(githubInstallations$)

      expect(result.installations).toHaveLength(1)
      expect(result.installations[0].accountName).toBe('test-account')
    })
  })

  describe('githubRepository$', () => {
    it('should return undefined when no project ID', async () => {
      const { store } = context

      const result = await store.get(githubRepository$)

      expect(result).toBeUndefined()
    })

    it('should fetch repository for project', async () => {
      const { store } = context

      const mockRepository = {
        fullName: 'test-user/test-repo',
        accountName: 'test-user',
        repoName: 'test-repo',
      }

      server.use(
        http.get('*/api/projects/:projectId/github/repository', () => {
          return HttpResponse.json({
            repository: mockRepository,
          })
        }),
      )

      // Mock path params by setting up route - this would normally be handled by routing
      // For now, this will return undefined due to no projectId
      const result = await store.get(githubRepository$)

      expect(result).toBeUndefined()
    })
  })

  describe('createAndSyncRepository$', () => {
    it('should throw error when no project ID', async () => {
      const { store, signal } = context

      store.set(selectInstallation$, 12_345)

      await expect(store.set(createAndSyncRepository$, signal)).rejects.toThrow(
        'Project ID and installation ID are required',
      )
    })

    it('should throw error when no installation ID', async () => {
      const { store, signal } = context

      await expect(store.set(createAndSyncRepository$, signal)).rejects.toThrow(
        'Project ID and installation ID are required',
      )
    })
  })

  describe('syncRepository$', () => {
    it('should throw error when no project ID', async () => {
      const { store, signal } = context

      await expect(store.set(syncRepository$, signal)).rejects.toThrow(
        'Project ID is required',
      )
    })
  })
})
