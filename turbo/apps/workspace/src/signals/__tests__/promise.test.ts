import { describe, expect, it } from 'vitest'
import { createDeferredPromise } from '../utils'

describe('promise', () => {
  it('createDeferred', async () => {
    const defer = createDeferredPromise<number>(AbortSignal.any([]))

    expect(defer.settled()).toBeFalsy()

    defer.resolve(42)
    expect(defer.settled()).toBeTruthy()

    await expect(defer.promise).resolves.toBe(42)
  })
})
