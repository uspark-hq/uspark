/**
 * Tests for turn list container element management
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testContext } from '../../__tests__/context'
import { setupMock } from '../../test-utils'
import { mountTurnList$, turnListContainerEl$ } from '../project'

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
