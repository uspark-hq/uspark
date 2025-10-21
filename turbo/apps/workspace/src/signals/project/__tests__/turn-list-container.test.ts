/**
 * Tests for turn list container element management
 */

import { delay } from 'signal-timers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testContext } from '../../__tests__/context'
import { setupProjectPage } from '../../../views/project/test-helpers'
import { setupMock } from '../../test-utils'
import {
  mountTurnList$,
  triggerReloadTurn$,
  turnListContainerEl$,
} from '../project'

// Setup Clerk mock
setupMock()

const context = testContext()

describe('turn list container', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('should set container element when mounted', () => {
    const mockElement = document.createElement('div')

    const cleanup = context.store.set(mountTurnList$, mockElement)

    const result = context.store.get(turnListContainerEl$)
    expect(result).toBe(mockElement)

    cleanup?.()
  })

  it('should return null initially', () => {
    const result = context.store.get(turnListContainerEl$)
    expect(result).toBeNull()
  })

  it('should clear container element on unmount', () => {
    const mockElement = document.createElement('div')

    const cleanup = context.store.set(mountTurnList$, mockElement)

    // Verify it's set
    let result = context.store.get(turnListContainerEl$)
    expect(result).toBe(mockElement)

    // Cleanup (unmount)
    cleanup?.()

    // Verify it's cleared
    result = context.store.get(turnListContainerEl$)
    expect(result).toBeNull()
  })

  it('should handle multiple mount/unmount cycles', () => {
    const element1 = document.createElement('div')
    const element2 = document.createElement('div')

    // Mount first element
    const cleanup1 = context.store.set(mountTurnList$, element1)
    expect(context.store.get(turnListContainerEl$)).toBe(element1)

    // Unmount first element
    cleanup1?.()
    expect(context.store.get(turnListContainerEl$)).toBeNull()

    // Mount second element
    const cleanup2 = context.store.set(mountTurnList$, element2)
    expect(context.store.get(turnListContainerEl$)).toBe(element2)

    // Unmount second element
    cleanup2?.()
    expect(context.store.get(turnListContainerEl$)).toBeNull()
  })

  it('should not set element when null is passed', () => {
    const result = context.store.set(mountTurnList$, null)

    expect(result).toBeUndefined()
    expect(context.store.get(turnListContainerEl$)).toBeNull()
  })
})

describe('triggerReloadTurn$', () => {
  const mockProjectId = 'test-project-123'
  const mockSessionId = 'sess_test123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reload turns and scroll to bottom when auto-scroll is enabled', async () => {
    await setupProjectPage(
      `/projects/${mockProjectId}?sessionId=${mockSessionId}`,
      context,
      {
        projectId: mockProjectId,
        files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
        sessions: [{ id: mockSessionId, title: 'Test Session' }],
        turns: {
          [mockSessionId]: [
            {
              id: 'turn_1',
              userMessage: 'test message',
              assistantMessage: 'response',
              status: 'completed',
            },
          ],
        },
      },
    )

    // Wait for the container element to be mounted by SessionChatArea
    // (SessionChatArea only mounts the container after selectedSession$ resolves)
    let containerEl: HTMLElement | null = null
    let attempts = 0
    while (!containerEl && attempts < 50) {
      await delay(10, { signal: context.signal })
      containerEl = context.store.get(turnListContainerEl$)
      attempts++
    }
    expect(containerEl).toBeTruthy()

    // Set scrollHeight and scrollTop properties on the real element
    let scrollTopValue = 0
    Object.defineProperty(containerEl, 'scrollHeight', {
      value: 1000,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(containerEl, 'scrollTop', {
      get() {
        return scrollTopValue
      },
      set(value: number) {
        scrollTopValue = value
      },
      configurable: true,
    })

    // Verify initial state
    expect(containerEl.scrollTop).toBe(0)
    expect(containerEl.scrollHeight).toBe(1000)

    // Trigger reload with auto-scroll enabled (default)
    await context.store.set(triggerReloadTurn$, context.signal)

    // Verify scroll happened
    expect(containerEl.scrollTop).toBe(1000)
  })

  it.skip('should not scroll when auto-scroll is disabled', async () => {
    // TODO: Implement this test when we export a command to toggle auto-scroll
    // For now, skipping until the toggle command is available
  })

  it('should not throw error when no container element is mounted', async () => {
    await setupProjectPage(
      `/projects/${mockProjectId}?sessionId=${mockSessionId}`,
      context,
      {
        projectId: mockProjectId,
        files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
        sessions: [{ id: mockSessionId, title: 'Test Session' }],
        turns: {
          [mockSessionId]: [
            {
              id: 'turn_1',
              userMessage: 'test message',
              assistantMessage: 'response',
              status: 'completed',
            },
          ],
        },
      },
    )

    // Don't mount any container element

    // Should not throw
    await expect(
      context.store.set(triggerReloadTurn$, context.signal),
    ).resolves.toBeUndefined()
  })

  it('should handle abort signal', async () => {
    await setupProjectPage(
      `/projects/${mockProjectId}?sessionId=${mockSessionId}`,
      context,
      {
        projectId: mockProjectId,
        files: [{ path: 'test.md', hash: 'hash1', content: 'test' }],
        sessions: [{ id: mockSessionId, title: 'Test Session' }],
        turns: {},
      },
    )

    const abortController = new AbortController()
    abortController.abort()

    await expect(
      context.store.set(triggerReloadTurn$, abortController.signal),
    ).rejects.toThrow('signal is aborted')
  })
})
